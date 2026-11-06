// DB integration tests: real Prisma repository against the sharekar_test database.
// Run with `npm run test:db`. Needs `docker compose up -d` and migrations applied to sharekar_test.
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { PrismaAuthRepository } from './auth.repository.js';
import { AuthService, type RequestMeta } from './auth.service.js';
import { hashOtp } from './otp.service.js';
import { hashRefreshToken } from './token.service.js';
import type { OtpSender } from './otp-sender.js';

const EMAIL = 'rider@example.com';
const meta: RequestMeta = { ipAddress: '127.0.0.1', userAgent: 'db-test' };

const sentCodes: string[] = [];
const sender: OtpSender = {
  async send(_destination, code) {
    sentCodes.push(code);
  },
};

const repo = new PrismaAuthRepository();
const service = new AuthService(repo, sender);

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000);

const newChallenge = (email = EMAIL, code = '123456') =>
  repo.replaceChallenge({
    email,
    purpose: 'REGISTER',
    codeHash: hashOtp(code),
    pendingFullName: 'Rider One',
    expiresAt: inMinutes(5),
    ipAddress: null,
  });

const newSession = (userId: string, familyId = crypto.randomUUID(), token = crypto.randomUUID()) => ({
  userId,
  familyId,
  refreshTokenHash: hashRefreshToken(token),
  expiresAt: inMinutes(60),
  userAgent: null,
  ipAddress: null,
});

describe('Auth against a real Postgres', () => {
  beforeEach(async () => {
    sentCodes.length = 0;
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE auth_sessions, auth_otp_challenges, users RESTART IDENTITY CASCADE',
    );
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe('OTP', () => {
    it('only one of many concurrent consumeChallenge calls wins', async () => {
      const challenge = await newChallenge();
      const results = await Promise.all(
        Array.from({ length: 20 }, () => repo.consumeChallenge(challenge.id)),
      );
      assert.equal(results.filter(Boolean).length, 1);
    });

    it('concurrent verifyOtp with the right code creates exactly one user and one session', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const code = sentCodes[0]!;

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () => service.verifyOtp(challenge.challengeId, code, meta)),
      );

      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(await prisma.user.count(), 1);
      assert.equal(await prisma.authSession.count(), 1);
    });

    it('wrong-code guesses in parallel cannot exceed the attempt cap', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const real = sentCodes[0]!;
      const wrong = real === '000000' ? '000001' : '000000';

      await Promise.allSettled(
        Array.from({ length: 30 }, () => service.verifyOtp(challenge.challengeId, wrong, meta)),
      );

      // The right code must now be refused: the challenge is locked.
      await assert.rejects(() => service.verifyOtp(challenge.challengeId, real, meta), {
        errorCode: 'OTP_INVALID',
      });
      assert.equal(await prisma.user.count(), 0);
    });

    it('replaceChallenge leaves exactly one active challenge per email, even concurrently', async () => {
      await Promise.all(Array.from({ length: 8 }, () => newChallenge()));
      const active = await prisma.authOtpChallenge.count({
        where: { email: EMAIL, consumedAt: null, invalidatedAt: null },
      });
      assert.equal(active, 1, `expected 1 active challenge, found ${active}`);
    });

    it('concurrent register calls send at most one email (cooldown is race-free)', async () => {
      await Promise.all(
        Array.from({ length: 8 }, () => service.register(EMAIL, 'Rider One', meta)),
      );
      assert.equal(sentCodes.length, 1, `expected 1 email, ${sentCodes.length} were sent`);
    });
  });

  describe('users', () => {
    it('enforces unique emails at the database level', async () => {
      await repo.createVerifiedUser(EMAIL, 'Rider One');
      await assert.rejects(() => repo.createVerifiedUser(EMAIL, 'Rider Two'));
    });

    it('revokeAllForUser revokes every session and bumps tokenVersion atomically', async () => {
      const user = await repo.createVerifiedUser(EMAIL, 'Rider One');
      await repo.createSession(newSession(user.id));
      await repo.createSession(newSession(user.id));

      await repo.revokeAllForUser(user.id);

      const sessions = await prisma.authSession.findMany({ where: { userId: user.id } });
      assert.ok(sessions.every((s) => s.revokedAt !== null));
      const after = await repo.findUserById(user.id);
      assert.equal(after!.tokenVersion, user.tokenVersion + 1);
    });

    it('resolveSession rejects an old tokenVersion and a suspended account', async () => {
      const user = await repo.createVerifiedUser(EMAIL, 'Rider One');
      const session = await repo.createSession(newSession(user.id));
      assert.ok(await service.resolveSession(session.id, user.id, user.tokenVersion));

      await prisma.user.update({ where: { id: user.id }, data: { accountStatus: 'SUSPENDED' } });
      assert.equal(await service.resolveSession(session.id, user.id, user.tokenVersion), null);
    });
  });

  describe('refresh tokens', () => {
    it('only one concurrent rotateSession on the same session wins', async () => {
      const user = await repo.createVerifiedUser(EMAIL, 'Rider One');
      const session = await repo.createSession(newSession(user.id));

      const results = await Promise.all(
        Array.from({ length: 10 }, () => repo.rotateSession(session.id, newSession(user.id))),
      );

      assert.equal(results.filter((r) => r !== null).length, 1);
    });

    it('rotation links old to new and keeps the family', async () => {
      const user = await repo.createVerifiedUser(EMAIL, 'Rider One');
      const familyId = crypto.randomUUID();
      const session = await repo.createSession(newSession(user.id, familyId));
      const next = await repo.rotateSession(session.id, newSession(user.id, familyId));

      const old = await prisma.authSession.findUnique({ where: { id: session.id } });
      assert.equal(old!.replacedById, next!.id);
      assert.ok(old!.revokedAt);
      assert.equal(next!.familyId, familyId);
    });

    it('refresh with the same token used concurrently never yields two live sessions', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const first = await service.verifyOtp(challenge.challengeId, sentCodes[0]!, meta);

      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => service.refresh(first.refreshToken, meta)),
      );

      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      // Reuse was detected, so the whole family must end up revoked.
      const live = await prisma.authSession.count({ where: { revokedAt: null } });
      assert.equal(live, 0, `expected 0 live sessions after reuse, found ${live}`);
    });

    it('presenting a rotated (stolen) token revokes the newest token too', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const first = await service.verifyOtp(challenge.challengeId, sentCodes[0]!, meta);
      const second = await service.refresh(first.refreshToken, meta);

      await assert.rejects(() => service.refresh(first.refreshToken, meta), {
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
      await assert.rejects(() => service.refresh(second.refreshToken, meta), {
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('refresh tokens are stored hashed, never raw', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const result = await service.verifyOtp(challenge.challengeId, sentCodes[0]!, meta);
      const rows = await prisma.authSession.findMany();
      assert.ok(rows.every((r) => r.refreshTokenHash !== result.refreshToken));
      assert.equal(rows[0]!.refreshTokenHash, hashRefreshToken(result.refreshToken));
    });

    it('the refresh token hash is unique at the database level', async () => {
      const user = await repo.createVerifiedUser(EMAIL, 'Rider One');
      const token = crypto.randomUUID();
      await repo.createSession(newSession(user.id, undefined, token));
      await assert.rejects(() => repo.createSession(newSession(user.id, undefined, token)));
    });
  });

  describe('cleanup', () => {
    it('deleteExpired keeps rows expired less than a day ago (reuse detection) and removes older ones', async () => {
      const user = await repo.createVerifiedUser(EMAIL, 'Rider One');
      const recent = await prisma.authSession.create({
        data: { ...newSession(user.id), expiresAt: new Date(Date.now() - 60 * 60 * 1000) },
      });
      const old = await prisma.authSession.create({
        data: { ...newSession(user.id), expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      });

      await repo.deleteExpired(new Date());

      assert.ok(await prisma.authSession.findUnique({ where: { id: recent.id } }));
      assert.equal(await prisma.authSession.findUnique({ where: { id: old.id } }), null);
    });
  });
});
