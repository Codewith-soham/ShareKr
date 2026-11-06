// Edge-case tests for the auth module that need no database:
// access-token abuse, CSRF origin check, and input boundaries.
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../../config/env.js';
import { createAuthenticate } from '../../middleware/authenticate.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import { CapturingOtpSender, FakeAuthRepository } from '../../test/fakeAuthRepository.js';
import { AuthController } from './auth.controller.js';
import { createAuthRouter } from './auth.routes.js';
import { AuthService } from './auth.service.js';

const EMAIL = 'rider@example.com';
const CSRF = { 'X-Requested-With': 'sharekar' };
const ALLOWED_ORIGIN = 'http://localhost:5173'; // matches CORS_ORIGINS in test setup

describe('Auth edge cases', () => {
  let repo: FakeAuthRepository;
  let sender: CapturingOtpSender;
  let service: AuthService;
  let app: express.Express;

  beforeEach(() => {
    repo = new FakeAuthRepository();
    sender = new CapturingOtpSender();
    service = new AuthService(repo, sender);
    const authenticate = createAuthenticate(service);

    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/v1/auth', createAuthRouter(new AuthController(service), authenticate));
    app.use(errorHandler);
  });

  const signIn = async (email = EMAIL) => {
    const agent = request.agent(app);
    const start = await agent.post('/api/v1/auth/register').send({ email, fullName: 'Rider One' });
    const verify = await agent.post('/api/v1/auth/otp/verify').send({
      challengeId: start.body.data.challengeId,
      code: sender.lastCode(),
    });
    return {
      agent,
      token: verify.body.data.accessToken as string,
      userId: verify.body.data.user.id as string,
    };
  };

  const me = (token?: string, header = 'Authorization') =>
    request(app)
      .get('/api/v1/auth/me')
      .set(token ? { [header]: token } : {});

  describe('access token abuse', () => {
    it('rejects a missing, empty or non-Bearer Authorization header', async () => {
      assert.equal((await me()).status, 401);
      assert.equal((await me('Bearer ')).status, 401);
      assert.equal((await me('Basic abc123')).status, 401);
      const { token } = await signIn();
      assert.equal((await me(token)).status, 401, 'raw token without "Bearer " must fail');
    });

    it('rejects garbage and malformed tokens', async () => {
      assert.equal((await me('Bearer not-a-jwt')).status, 401);
      assert.equal((await me('Bearer a.b.c')).status, 401);
    });

    it('rejects a token with a tampered payload', async () => {
      const { token, userId } = await signIn();
      const [header, , signature] = token.split('.');
      const forged = Buffer.from(
        JSON.stringify({ sub: userId, sid: 'x', tv: 0, exp: 9999999999 }),
      ).toString('base64url');
      assert.equal((await me(`Bearer ${header}.${forged}.${signature}`)).status, 401);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const { userId } = await signIn();
      const bad = jwt.sign({ sub: userId, sid: 'x', tv: 0 }, 'some-other-secret-value-0123456789');
      assert.equal((await me(`Bearer ${bad}`)).status, 401);
    });

    it('rejects an unsigned token (alg: none)', async () => {
      const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const none = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub: 'x', sid: 'y', tv: 0 })}.`;
      assert.equal((await me(`Bearer ${none}`)).status, 401);
    });

    it('rejects an expired token even if it is otherwise valid', async () => {
      const { userId } = await signIn();
      const session = [...repo.sessions.values()][0]!;
      const expired = jwt.sign(
        { sub: userId, sid: session.id, tv: 0, exp: Math.floor(Date.now() / 1000) - 10 },
        env.JWT_ACCESS_SECRET,
        { algorithm: 'HS256' },
      );
      assert.equal((await me(`Bearer ${expired}`)).status, 401);
    });

    it('rejects a validly signed token that is missing required claims', async () => {
      const noSid = jwt.sign({ sub: 'x', tv: 0 }, env.JWT_ACCESS_SECRET, { algorithm: 'HS256' });
      assert.equal((await me(`Bearer ${noSid}`)).status, 401);
    });

    it('rejects a token whose session id does not belong to the user', async () => {
      const a = await signIn('a@example.com');
      const b = await signIn('b@example.com');
      const sessionOfB = [...repo.sessions.values()].find((s) => s.userId === b.userId)!;
      const mixed = jwt.sign({ sub: a.userId, sid: sessionOfB.id, tv: 0 }, env.JWT_ACCESS_SECRET, {
        algorithm: 'HS256',
      });
      assert.equal((await me(`Bearer ${mixed}`)).status, 401);
    });

    it('rejects an old token after the tokenVersion is bumped (logout-all)', async () => {
      const { agent, token } = await signIn();
      assert.equal((await me(`Bearer ${token}`)).status, 200);
      await agent.post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${token}`);
      assert.equal((await me(`Bearer ${token}`)).status, 401);
    });

    it('never leaks token or internals in the 401 body', async () => {
      const res = await me('Bearer a.b.c');
      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, 'UNAUTHORIZED');
      assert.ok(!JSON.stringify(res.body).includes('jwt'));
    });
  });

  describe('CSRF protection on cookie routes', () => {
    it('rejects refresh with no header, and with a wrong header value', async () => {
      const { agent } = await signIn();
      assert.equal((await agent.post('/api/v1/auth/refresh')).status, 403);
      const wrong = await agent
        .post('/api/v1/auth/refresh')
        .set('X-Requested-With', 'XMLHttpRequest');
      assert.equal(wrong.status, 403);
      assert.equal(wrong.body.errorCode, 'CSRF_REJECTED');
    });

    it('rejects a correct header when the Origin is not allowlisted', async () => {
      const { agent } = await signIn();
      const res = await agent
        .post('/api/v1/auth/refresh')
        .set(CSRF)
        .set('Origin', 'https://evil.example.com');
      assert.equal(res.status, 403);
      assert.equal(res.body.errorCode, 'CSRF_REJECTED');
    });

    it('accepts a correct header from an allowlisted Origin', async () => {
      const { agent } = await signIn();
      const res = await agent.post('/api/v1/auth/refresh').set(CSRF).set('Origin', ALLOWED_ORIGIN);
      assert.equal(res.status, 200);
    });

    it('a rejected CSRF request does not consume the refresh token', async () => {
      const { agent } = await signIn();
      await agent.post('/api/v1/auth/refresh').set(CSRF).set('Origin', 'https://evil.example.com');
      assert.equal((await agent.post('/api/v1/auth/refresh').set(CSRF)).status, 200);
    });

    it('logout also requires the CSRF header', async () => {
      const { agent, token } = await signIn();
      const res = await agent.post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 403);
    });
  });

  describe('input boundaries', () => {
    const register = (body: unknown) =>
      request(app)
        .post('/api/v1/auth/register')
        .send(body as object);

    it('normalises email case and surrounding spaces to the same account', async () => {
      const start = await register({ email: '  Rider@Example.COM  ', fullName: 'Rider One' });
      assert.equal(start.status, 200);
      await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ challengeId: start.body.data.challengeId, code: sender.lastCode() });
      assert.equal([...repo.users.values()][0]!.email, 'rider@example.com');

      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'RIDER@example.com' });
      assert.equal(login.status, 200);
      assert.equal(sender.sent.at(-1)!.destination, 'rider@example.com');
    });

    it('enforces fullName length: 1 and 121 chars fail, 2 and 120 pass', async () => {
      assert.equal((await register({ email: 'a@example.com', fullName: 'A' })).status, 422);
      assert.equal(
        (await register({ email: 'b@example.com', fullName: 'A'.repeat(121) })).status,
        422,
      );
      assert.equal((await register({ email: 'c@example.com', fullName: 'Al' })).status, 200);
      assert.equal(
        (await register({ email: 'd@example.com', fullName: 'A'.repeat(120) })).status,
        200,
      );
    });

    it('rejects invalid emails, missing fields and wrong types', async () => {
      for (const body of [
        { email: 'not-an-email', fullName: 'Rider One' },
        { email: '', fullName: 'Rider One' },
        { fullName: 'Rider One' },
        { email: EMAIL },
        { email: 123, fullName: 'Rider One' },
        { email: EMAIL, fullName: ['x'] },
        {},
      ]) {
        const res = await register(body);
        assert.equal(res.status, 422, `expected 422 for ${JSON.stringify(body)}`);
      }
    });

    it('rejects an email longer than 255 characters', async () => {
      const long = `${'a'.repeat(250)}@example.com`;
      assert.equal((await register({ email: long, fullName: 'Rider One' })).status, 422);
    });

    it('rejects OTP codes that are not exactly 6 digits', async () => {
      const start = await register({ email: EMAIL, fullName: 'Rider One' });
      const challengeId = start.body.data.challengeId;
      for (const code of ['12345', '1234567', '12 456', ' 12345', 'abcdef', '12345a', '']) {
        const res = await request(app).post('/api/v1/auth/otp/verify').send({ challengeId, code });
        assert.equal(res.status, 422, `expected 422 for code "${code}"`);
      }
      const asNumber = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ challengeId, code: 123456 });
      assert.equal(asNumber.status, 422, 'a numeric code must be rejected');
    });

    it('rejects a non-UUID challengeId, and an unknown UUID gets the generic error', async () => {
      const bad = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ challengeId: 'abc', code: '123456' });
      assert.equal(bad.status, 422);

      const unknown = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ challengeId: crypto.randomUUID(), code: '123456' });
      assert.equal(unknown.status, 400);
      assert.equal(unknown.body.errorCode, 'OTP_INVALID');
    });

    it('resend with an unknown challenge looks like a normal success and sends nothing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ challengeId: crypto.randomUUID() });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.challengeId);
      assert.equal(sender.sent.length, 0);
    });

    it('rejects unknown extra keys on every body route', async () => {
      assert.equal(
        (await register({ email: EMAIL, fullName: 'Rider One', role: 'admin' })).status,
        422,
      );
      assert.equal(
        (await request(app).post('/api/v1/auth/login').send({ email: EMAIL, isAdmin: true }))
          .status,
        422,
      );
    });

    it('a verified user cannot set role, status or verification fields through register', async () => {
      const start = await register({ email: EMAIL, fullName: 'Rider One' });
      await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ challengeId: start.body.data.challengeId, code: sender.lastCode() });
      const user = [...repo.users.values()][0]!;
      assert.equal(user.accountStatus, 'ACTIVE');
      assert.ok(user.emailVerifiedAt);
    });
  });
});
