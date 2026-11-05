import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { CapturingOtpSender, FakeAuthRepository } from '../../test/fakeAuthRepository.js';
import { AuthService } from './auth.service.js';
import { verifyAccessToken } from './token.service.js';

const meta = { ipAddress: '127.0.0.1', userAgent: 'test' };
const EMAIL = 'rider@example.com';

describe('AuthService', () => {
  let now: Date;
  let repo: FakeAuthRepository;
  let sender: CapturingOtpSender;
  let service: AuthService;

  const advance = (ms: number) => {
    now = new Date(now.getTime() + ms);
  };

  beforeEach(() => {
    now = new Date('2026-11-05T10:00:00Z');
    repo = new FakeAuthRepository(() => now);
    sender = new CapturingOtpSender();
    service = new AuthService(repo, sender, () => now);
  });

  describe('register + verify', () => {
    it('creates the user only after the OTP is verified and issues a session', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      assert.equal(repo.users.size, 0, 'no user before verification');

      const result = await service.verifyOtp(challenge.challengeId, sender.lastCode(), meta);

      assert.equal(repo.users.size, 1);
      assert.equal(result.user.email, EMAIL);
      assert.equal(result.user.fullName, 'Rider One');
      assert.equal(result.user.emailVerified, true);
      assert.equal(result.user.profileComplete, false);
      const claims = verifyAccessToken(result.accessToken);
      assert.equal(claims?.sub, result.user.id);
      assert.ok(result.refreshToken.length >= 40);
    });

    it('never stores the OTP in plaintext', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const stored = repo.challenges.get(challenge.challengeId)!;
      assert.notEqual(stored.codeHash, sender.lastCode());
      assert.equal(stored.codeHash.length, 64);
    });
  });

  describe('OTP rules', () => {
    it('rejects a wrong code without consuming the challenge', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const wrong = sender.lastCode() === '000000' ? '111111' : '000000';

      await assert.rejects(service.verifyOtp(challenge.challengeId, wrong, meta), {
        errorCode: 'OTP_INVALID',
      });
      const result = await service.verifyOtp(challenge.challengeId, sender.lastCode(), meta);
      assert.equal(result.user.email, EMAIL);
    });

    it('locks the challenge after 3 wrong attempts, even for the right code', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const wrong = sender.lastCode() === '000000' ? '111111' : '000000';

      for (let i = 0; i < 3; i++) {
        await assert.rejects(service.verifyOtp(challenge.challengeId, wrong, meta));
      }
      await assert.rejects(service.verifyOtp(challenge.challengeId, sender.lastCode(), meta), {
        errorCode: 'OTP_INVALID',
      });
    });

    it('is single-use', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const code = sender.lastCode();
      await service.verifyOtp(challenge.challengeId, code, meta);
      await assert.rejects(service.verifyOtp(challenge.challengeId, code, meta), {
        errorCode: 'OTP_INVALID',
      });
    });

    it('expires after 5 minutes', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      advance(5 * 60 * 1000 + 1000);
      await assert.rejects(service.verifyOtp(challenge.challengeId, sender.lastCode(), meta), {
        errorCode: 'OTP_INVALID',
      });
    });

    it('a resend invalidates the previous code', async () => {
      const first = await service.register(EMAIL, 'Rider One', meta);
      const firstCode = sender.lastCode();
      advance(61 * 1000);

      const second = await service.resend(first.challengeId, meta);
      assert.notEqual(second.challengeId, first.challengeId);
      assert.equal(sender.sent.length, 2);

      await assert.rejects(service.verifyOtp(first.challengeId, firstCode, meta));
      const result = await service.verifyOtp(second.challengeId, sender.lastCode(), meta);
      assert.equal(result.user.email, EMAIL);
    });

    it('enforces the resend cooldown without sending another email', async () => {
      const first = await service.register(EMAIL, 'Rider One', meta);
      advance(10 * 1000);
      const second = await service.resend(first.challengeId, meta);
      assert.equal(second.challengeId, first.challengeId);
      assert.equal(sender.sent.length, 1);
    });

    it('caps OTP sends per email per hour without revealing it', async () => {
      for (let i = 0; i < 7; i++) {
        await service.login(EMAIL, meta);
        advance(61 * 1000);
      }
      // Only the first 5 reach the inbox; later requests look identical to callers.
      assert.equal(sender.sent.length, 0, 'unknown email never receives mail');

      repo.addUser({ email: EMAIL });
      for (let i = 0; i < 7; i++) {
        const response = await service.login(EMAIL, meta);
        assert.ok(response.challengeId);
        advance(61 * 1000);
      }
      assert.equal(sender.sent.length, 5);
    });
  });

  describe('account enumeration', () => {
    it('login for an unknown email looks identical and sends nothing', async () => {
      repo.addUser({ email: 'known@example.com' });
      const known = await service.login('known@example.com', meta);
      const unknown = await service.login('ghost@example.com', meta);

      assert.deepEqual(Object.keys(known).sort(), Object.keys(unknown).sort());
      assert.equal(known.expiresInSeconds, unknown.expiresInSeconds);
      assert.equal(sender.sent.length, 1);
      assert.equal(sender.sent[0]!.destination, 'known@example.com');
    });

    it('register for an existing email sends a login code instead of failing', async () => {
      repo.addUser({ email: EMAIL });
      const challenge = await service.register(EMAIL, 'Someone Else', meta);
      assert.ok(challenge.challengeId);
      assert.equal(sender.sent.length, 1);

      const result = await service.verifyOtp(challenge.challengeId, sender.lastCode(), meta);
      assert.equal(result.user.fullName, 'Test User', 'existing profile is untouched');
    });

    it('suspended users get no code and cannot verify', async () => {
      repo.addUser({ email: EMAIL, accountStatus: 'SUSPENDED' });
      await service.login(EMAIL, meta);
      assert.equal(sender.sent.length, 0);
    });
  });

  describe('refresh tokens', () => {
    const signIn = async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      return service.verifyOtp(challenge.challengeId, sender.lastCode(), meta);
    };

    it('rotates the refresh token on every use', async () => {
      const first = await signIn();
      const second = await service.refresh(first.refreshToken, meta);
      assert.notEqual(second.refreshToken, first.refreshToken);
      assert.ok(verifyAccessToken(second.accessToken));
    });

    it('detects reuse of a rotated token and revokes the whole family', async () => {
      const first = await signIn();
      const second = await service.refresh(first.refreshToken, meta);

      await assert.rejects(service.refresh(first.refreshToken, meta), {
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
      // The legitimate holder of the newest token is logged out too.
      await assert.rejects(service.refresh(second.refreshToken, meta), {
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('rejects missing, unknown and expired tokens', async () => {
      await assert.rejects(service.refresh(undefined, meta));
      await assert.rejects(service.refresh('not-a-real-token', meta));

      const first = await signIn();
      advance(15 * 24 * 60 * 60 * 1000);
      await assert.rejects(service.refresh(first.refreshToken, meta));
    });

    it('does not extend the absolute session lifetime on rotation', async () => {
      const first = await signIn();
      const originalExpiry = [...repo.sessions.values()][0]!.expiresAt;
      advance(60 * 60 * 1000);
      await service.refresh(first.refreshToken, meta);
      const newest = [...repo.sessions.values()].find((s) => !s.revokedAt)!;
      assert.deepEqual(newest.expiresAt, originalExpiry);
    });

    it('refuses to refresh for a suspended account', async () => {
      const first = await signIn();
      const user = [...repo.users.values()][0]!;
      repo.users.set(user.id, { ...user, accountStatus: 'SUSPENDED' });
      await assert.rejects(service.refresh(first.refreshToken, meta));
    });
  });

  describe('session resolution / invalidation', () => {
    it('revokeAllForUser kills outstanding access tokens and refresh tokens', async () => {
      const challenge = await service.register(EMAIL, 'Rider One', meta);
      const auth = await service.verifyOtp(challenge.challengeId, sender.lastCode(), meta);
      const claims = verifyAccessToken(auth.accessToken)!;

      assert.ok(await service.resolveSession(claims.sid, claims.sub, claims.tv));

      await service.revokeAllForUser(auth.user.id);

      assert.equal(await service.resolveSession(claims.sid, claims.sub, claims.tv), null);
      await assert.rejects(service.refresh(auth.refreshToken, meta));
    });

    it('logout revokes only the current session', async () => {
      const a = await service.verifyOtp(
        (await service.register(EMAIL, 'Rider One', meta)).challengeId,
        sender.lastCode(),
        meta,
      );
      advance(61 * 1000);
      const b = await service.verifyOtp(
        (await service.login(EMAIL, meta)).challengeId,
        sender.lastCode(),
        meta,
      );
      const claimsA = verifyAccessToken(a.accessToken)!;
      const claimsB = verifyAccessToken(b.accessToken)!;

      await service.logout(claimsA.sid);

      assert.equal(await service.resolveSession(claimsA.sid, claimsA.sub, claimsA.tv), null);
      assert.ok(await service.resolveSession(claimsB.sid, claimsB.sub, claimsB.tv));
    });
  });
});
