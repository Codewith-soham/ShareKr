import { randomUUID } from 'node:crypto';
import type { User } from '../generated/prisma/client.js';
import type {
  AuthRepository,
  NewChallenge,
  NewSession,
  OtpChallengeRecord,
  SessionRecord,
} from '../modules/auth/auth.repository.js';
import type { OtpSender } from '../modules/auth/otp-sender.js';

export const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: randomUUID(),
    fullName: 'Test User',
    email: 'user@example.com',
    phone: null,
    passwordHash: null,
    googleSubject: null,
    gender: null,
    profileImageUrl: null,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    profileCompletedAt: null,
    tokenVersion: 0,
    accountStatus: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as User;

// In-memory AuthRepository so service and route tests need no database.
export class FakeAuthRepository implements AuthRepository {
  users = new Map<string, User>();
  challenges = new Map<string, OtpChallengeRecord>();
  sessions = new Map<string, SessionRecord>();
  private clock: () => Date;

  constructor(clock: () => Date = () => new Date()) {
    this.clock = clock;
  }

  addUser(overrides: Partial<User> = {}): User {
    const user = makeUser(overrides);
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async createVerifiedUser(email: string, fullName: string) {
    return this.addUser({ email, fullName, emailVerifiedAt: this.clock() });
  }

  async markEmailVerified(userId: string) {
    const user = { ...this.users.get(userId)!, emailVerifiedAt: this.clock() };
    this.users.set(userId, user);
    return user;
  }

  async countChallengesSince(email: string, since: Date) {
    return [...this.challenges.values()].filter((c) => c.email === email && c.createdAt >= since)
      .length;
  }

  async findLatestChallenge(email: string, purpose: OtpChallengeRecord['purpose']) {
    const matches = [...this.challenges.values()]
      .filter((c) => c.email === email && c.purpose === purpose)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0] ?? null;
  }

  async findChallenge(id: string) {
    return this.challenges.get(id) ?? null;
  }

  async replaceChallenge(data: NewChallenge) {
    for (const c of this.challenges.values()) {
      if (c.email === data.email && !c.consumedAt && !c.invalidatedAt) {
        c.invalidatedAt = this.clock();
      }
    }
    const record: OtpChallengeRecord = {
      id: randomUUID(),
      email: data.email,
      purpose: data.purpose,
      codeHash: data.codeHash,
      attempts: 0,
      pendingFullName: data.pendingFullName,
      expiresAt: data.expiresAt,
      consumedAt: null,
      invalidatedAt: null,
      createdAt: this.clock(),
    };
    this.challenges.set(record.id, record);
    return record;
  }

  async incrementAttempts(id: string) {
    const c = this.challenges.get(id)!;
    c.attempts += 1;
    return c.attempts;
  }

  async consumeChallenge(id: string) {
    const c = this.challenges.get(id)!;
    if (c.consumedAt || c.invalidatedAt) return false;
    c.consumedAt = this.clock();
    return true;
  }

  private store(data: NewSession): SessionRecord {
    const record: SessionRecord = {
      id: randomUUID(),
      userId: data.userId,
      familyId: data.familyId,
      refreshTokenHash: data.refreshTokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
    };
    this.sessions.set(record.id, record);
    return record;
  }

  async createSession(data: NewSession) {
    return this.store(data);
  }

  async findSessionByHash(hash: string) {
    return [...this.sessions.values()].find((s) => s.refreshTokenHash === hash) ?? null;
  }

  async findSessionById(id: string) {
    return this.sessions.get(id) ?? null;
  }

  async rotateSession(oldId: string, next: NewSession) {
    const old = this.sessions.get(oldId)!;
    if (old.revokedAt) return null;
    old.revokedAt = this.clock();
    return this.store(next);
  }

  async revokeSession(id: string) {
    const s = this.sessions.get(id);
    if (s && !s.revokedAt) s.revokedAt = this.clock();
  }

  async revokeFamily(familyId: string) {
    for (const s of this.sessions.values()) {
      if (s.familyId === familyId && !s.revokedAt) s.revokedAt = this.clock();
    }
  }

  async revokeAllForUser(userId: string) {
    for (const s of this.sessions.values()) {
      if (s.userId === userId && !s.revokedAt) s.revokedAt = this.clock();
    }
    const user = this.users.get(userId);
    if (user) this.users.set(userId, { ...user, tokenVersion: user.tokenVersion + 1 });
  }

  async deleteExpired() {}
}

// Captures sent codes so tests can read the OTP like a user reading their inbox.
export class CapturingOtpSender implements OtpSender {
  sent: Array<{ destination: string; code: string }> = [];

  async send(destination: string, code: string) {
    this.sent.push({ destination, code });
  }

  lastCode(): string {
    return this.sent[this.sent.length - 1]!.code;
  }
}
