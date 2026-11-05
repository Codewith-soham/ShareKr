import { randomUUID } from 'node:crypto';
import type { OtpPurpose, User } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/apiError.js';
import {
  PrismaAuthRepository,
  type AuthRepository,
  type SessionRecord,
} from './auth.repository.js';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
} from './otp.service.js';
import { createOtpSender, type OtpSender } from './otp-sender.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTtlMs,
  signAccessToken,
} from './token.service.js';

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface OtpChallengeResponse {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  gender: User['gender'];
  accountStatus: User['accountStatus'];
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string; // delivered via cookie only, never in the JSON body
  user: UserSummary;
}

export const toUserSummary = (user: User): UserSummary => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  gender: user.gender,
  accountStatus: user.accountStatus,
  emailVerified: user.emailVerifiedAt !== null,
  phoneVerified: user.phoneVerifiedAt !== null,
  profileComplete: user.profileCompletedAt !== null,
});

const invalidOtp = () => new ApiError(400, 'Invalid or expired code', 'OTP_INVALID');
const invalidRefresh = () =>
  new ApiError(401, 'Session expired, please log in again', 'INVALID_REFRESH_TOKEN');

const isUsable = (user: User | null): user is User =>
  user !== null && user.accountStatus === 'ACTIVE' && user.deletedAt === null;

const challengeResponse = (challengeId: string): OtpChallengeResponse => ({
  challengeId,
  expiresInSeconds: OTP_TTL_MS / 1000,
  resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
});

export class AuthService {
  constructor(
    private readonly repo: AuthRepository = new PrismaAuthRepository(),
    private readonly sender: OtpSender = createOtpSender(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ---- OTP issuance -------------------------------------------------------

  // register/login/resend return the same response shape for existing and
  // unknown emails, so they cannot be used to discover registered addresses.
  async register(
    email: string,
    fullName: string,
    meta: RequestMeta,
  ): Promise<OtpChallengeResponse> {
    const user = await this.repo.findUserByEmail(email);
    if (user) {
      // Already registered: quietly treat it as a login attempt.
      return this.issue(email, 'LOGIN', null, isUsable(user), meta);
    }
    return this.issue(email, 'REGISTER', fullName, true, meta);
  }

  async login(email: string, meta: RequestMeta): Promise<OtpChallengeResponse> {
    const user = await this.repo.findUserByEmail(email);
    return this.issue(email, 'LOGIN', null, isUsable(user), meta);
  }

  async resend(challengeId: string, meta: RequestMeta): Promise<OtpChallengeResponse> {
    const challenge = await this.repo.findChallenge(challengeId);
    if (!challenge || challenge.consumedAt) return challengeResponse(randomUUID());

    let allowed = true;
    if (challenge.purpose === 'LOGIN') {
      allowed = isUsable(await this.repo.findUserByEmail(challenge.email));
    }
    return this.issue(challenge.email, challenge.purpose, challenge.pendingFullName, allowed, meta);
  }

  private async issue(
    email: string,
    purpose: OtpPurpose,
    pendingFullName: string | null,
    allowed: boolean,
    meta: RequestMeta,
  ): Promise<OtpChallengeResponse> {
    if (!allowed) return challengeResponse(randomUUID());

    const now = this.now();

    // Cooldown: hand back the live challenge instead of sending another email.
    const latest = await this.repo.findLatestChallenge(email, purpose);
    if (
      latest &&
      !latest.consumedAt &&
      !latest.invalidatedAt &&
      now.getTime() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      return challengeResponse(latest.id);
    }

    // Hourly cap per email. Suppressed silently (not a 429) so the response
    // does not differ between registered and unregistered addresses.
    const sent = await this.repo.countChallengesSince(
      email,
      new Date(now.getTime() - 60 * 60 * 1000),
    );
    if (sent >= OTP_MAX_SENDS_PER_HOUR) return challengeResponse(randomUUID());

    const code = generateOtpCode();
    const challenge = await this.repo.replaceChallenge({
      email,
      purpose,
      codeHash: hashOtp(code),
      pendingFullName,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      ipAddress: meta.ipAddress,
    });

    // Not awaited: keeps response timing the same for real and decoy paths.
    void this.sender.send(email, code).catch((error: unknown) => {
      console.error(
        'OTP delivery failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    });

    return challengeResponse(challenge.id);
  }

  // ---- OTP verification and session issuance ------------------------------

  async verifyOtp(challengeId: string, code: string, meta: RequestMeta): Promise<AuthResult> {
    const challenge = await this.repo.findChallenge(challengeId);
    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.invalidatedAt ||
      challenge.expiresAt <= this.now() ||
      challenge.attempts >= OTP_MAX_ATTEMPTS
    ) {
      throw invalidOtp();
    }

    const attempts = await this.repo.incrementAttempts(challenge.id);
    if (attempts > OTP_MAX_ATTEMPTS || !verifyOtpHash(code, challenge.codeHash)) {
      throw invalidOtp();
    }

    // Single-use: only one concurrent request can win.
    if (!(await this.repo.consumeChallenge(challenge.id))) throw invalidOtp();

    let user = await this.repo.findUserByEmail(challenge.email);
    if (!user && challenge.purpose === 'REGISTER') {
      user = await this.repo.createVerifiedUser(
        challenge.email,
        challenge.pendingFullName ?? challenge.email.split('@')[0] ?? 'User',
      );
    }
    if (!isUsable(user)) {
      throw new ApiError(403, 'Account is not active', 'ACCOUNT_NOT_ACTIVE');
    }
    if (!user.emailVerifiedAt) {
      user = await this.repo.markEmailVerified(user.id);
    }

    return this.startSession(user, meta);
  }

  private async startSession(user: User, meta: RequestMeta): Promise<AuthResult> {
    const refreshToken = generateRefreshToken();
    const session = await this.repo.createSession({
      userId: user.id,
      familyId: randomUUID(),
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(this.now().getTime() + refreshTtlMs()),
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ipAddress: meta.ipAddress,
    });
    return this.buildResult(user, session, refreshToken);
  }

  private buildResult(user: User, session: SessionRecord, refreshToken: string): AuthResult {
    return {
      accessToken: signAccessToken({ sub: user.id, sid: session.id, tv: user.tokenVersion }),
      refreshToken,
      user: toUserSummary(user),
    };
  }

  // ---- Refresh / logout ---------------------------------------------------

  async refresh(rawToken: string | undefined, meta: RequestMeta): Promise<AuthResult> {
    if (!rawToken) throw invalidRefresh();

    const session = await this.repo.findSessionByHash(hashRefreshToken(rawToken));
    if (!session) throw invalidRefresh();

    // A revoked token presented again means it was copied: kill the whole family.
    if (session.revokedAt) {
      await this.repo.revokeFamily(session.familyId);
      throw invalidRefresh();
    }
    if (session.expiresAt <= this.now()) throw invalidRefresh();

    const user = await this.repo.findUserById(session.userId);
    if (!isUsable(user)) {
      await this.repo.revokeAllForUser(session.userId);
      throw invalidRefresh();
    }

    const nextToken = generateRefreshToken();
    const next = await this.repo.rotateSession(session.id, {
      userId: user.id,
      familyId: session.familyId,
      refreshTokenHash: hashRefreshToken(nextToken),
      expiresAt: session.expiresAt, // absolute lifetime: rotation does not extend it
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ipAddress: meta.ipAddress,
    });
    if (!next) {
      await this.repo.revokeFamily(session.familyId);
      throw invalidRefresh();
    }
    return this.buildResult(user, next, nextToken);
  }

  async logout(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId);
  }

  // Also the entry point for suspension/deactivation (admin and users modules).
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.revokeAllForUser(userId);
  }

  // Used by the authenticate middleware: returns the user only if the session
  // is live and the token version still matches.
  async resolveSession(
    sessionId: string,
    userId: string,
    tokenVersion: number,
  ): Promise<User | null> {
    const session = await this.repo.findSessionById(sessionId);
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt <= this.now()
    ) {
      return null;
    }
    const user = await this.repo.findUserById(userId);
    if (!isUsable(user) || user.tokenVersion !== tokenVersion) return null;
    return user;
  }
}

export const authService = new AuthService();
