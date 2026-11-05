import { prisma } from '../../lib/prisma.js';
import type { OtpPurpose, User } from '../../generated/prisma/client.js';

export interface OtpChallengeRecord {
  id: string;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  pendingFullName: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  invalidatedAt: Date | null;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface NewChallenge {
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  pendingFullName: string | null;
  expiresAt: Date;
  ipAddress: string | null;
}

export interface NewSession {
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createVerifiedUser(email: string, fullName: string): Promise<User>;
  markEmailVerified(userId: string): Promise<User>;

  countChallengesSince(email: string, since: Date): Promise<number>;
  findLatestChallenge(email: string, purpose: OtpPurpose): Promise<OtpChallengeRecord | null>;
  findChallenge(id: string): Promise<OtpChallengeRecord | null>;
  // Invalidates active challenges for the email and creates a new one atomically.
  replaceChallenge(data: NewChallenge): Promise<OtpChallengeRecord>;
  // Atomically increments and returns the new attempt count.
  incrementAttempts(id: string): Promise<number>;
  // Returns true only for the single caller that wins the consume race.
  consumeChallenge(id: string): Promise<boolean>;

  createSession(data: NewSession): Promise<SessionRecord>;
  findSessionByHash(hash: string): Promise<SessionRecord | null>;
  findSessionById(id: string): Promise<SessionRecord | null>;
  // Revokes `oldId` (only if still active) and creates the replacement.
  // Returns null if the old session was already revoked (reuse / race).
  rotateSession(oldId: string, next: NewSession): Promise<SessionRecord | null>;
  revokeSession(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  // Revokes every session and bumps tokenVersion so outstanding access tokens die.
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(now: Date): Promise<void>;
}

const sessionSelect = {
  id: true,
  userId: true,
  familyId: true,
  refreshTokenHash: true,
  expiresAt: true,
  revokedAt: true,
} as const;

export class PrismaAuthRepository implements AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  createVerifiedUser(email: string, fullName: string) {
    return prisma.user.create({
      data: { email, fullName, emailVerifiedAt: new Date() },
    });
  }

  markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  countChallengesSince(email: string, since: Date) {
    return prisma.authOtpChallenge.count({
      where: { email, createdAt: { gte: since } },
    });
  }

  findLatestChallenge(email: string, purpose: OtpPurpose) {
    return prisma.authOtpChallenge.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });
  }

  findChallenge(id: string) {
    return prisma.authOtpChallenge.findUnique({ where: { id } });
  }

  replaceChallenge(data: NewChallenge) {
    return prisma.$transaction(async (tx) => {
      await tx.authOtpChallenge.updateMany({
        where: { email: data.email, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: new Date() },
      });
      return tx.authOtpChallenge.create({ data });
    });
  }

  async incrementAttempts(id: string) {
    const updated = await prisma.authOtpChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return updated.attempts;
  }

  async consumeChallenge(id: string) {
    const result = await prisma.authOtpChallenge.updateMany({
      where: { id, consumedAt: null, invalidatedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count === 1;
  }

  createSession(data: NewSession) {
    return prisma.authSession.create({ data, select: sessionSelect });
  }

  findSessionByHash(hash: string) {
    return prisma.authSession.findUnique({
      where: { refreshTokenHash: hash },
      select: sessionSelect,
    });
  }

  findSessionById(id: string) {
    return prisma.authSession.findUnique({ where: { id }, select: sessionSelect });
  }

  rotateSession(oldId: string, next: NewSession) {
    return prisma.$transaction(async (tx) => {
      const revoked = await tx.authSession.updateMany({
        where: { id: oldId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) return null;
      const created = await tx.authSession.create({ data: next, select: sessionSelect });
      await tx.authSession.update({
        where: { id: oldId },
        data: { replacedById: created.id },
      });
      return created;
    });
  }

  async revokeSession(id: string) {
    await prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string) {
    await prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await prisma.$transaction([
      prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }

  async deleteExpired(now: Date) {
    // Keep recently expired rows for a day so reuse detection still works.
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.authOtpChallenge.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
      prisma.authSession.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    ]);
  }
}
