import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { createAuthenticate } from '../../middleware/authenticate.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { requireProfileComplete } from '../../middleware/requireProfileComplete.js';
import { CapturingOtpSender, FakeAuthRepository } from '../../test/fakeAuthRepository.js';
import { ApiError } from '../../utils/apiError.js';
import { AuthController } from './auth.controller.js';
import { createAuthRouter } from './auth.routes.js';
import { AuthService } from './auth.service.js';

const EMAIL = 'rider@example.com';
const CSRF = { 'X-Requested-With': 'sharekar' };

describe('Auth routes', () => {
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
    app.get('/api/v1/core', authenticate, requireProfileComplete, (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);
  });

  const signIn = async () => {
    const agent = request.agent(app);
    const start = await agent
      .post('/api/v1/auth/register')
      .send({ email: EMAIL, fullName: 'Rider One' });
    const verify = await agent.post('/api/v1/auth/otp/verify').send({
      challengeId: start.body.data.challengeId,
      code: sender.lastCode(),
    });
    return { agent, verify, token: verify.body.data.accessToken as string };
  };

  it('completes register -> verify and sets a hardened refresh cookie', async () => {
    const { verify } = await signIn();

    assert.equal(verify.status, 200);
    assert.ok(verify.body.data.accessToken);
    assert.equal(verify.body.data.user.email, EMAIL);
    assert.ok(!('refreshToken' in verify.body.data), 'refresh token must not be in the body');

    const cookie = (verify.headers['set-cookie'] as unknown as string[])[0]!;
    assert.match(cookie, /^sk_refresh=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Path=\/api\/v1\/auth/);
  });

  it('returns the same shape for known and unknown login emails', async () => {
    repo.addUser({ email: 'known@example.com' });
    const known = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'known@example.com' });
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com' });

    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(known.body.message, unknown.body.message);
    assert.deepEqual(Object.keys(known.body.data), Object.keys(unknown.body.data));
  });

  it('rejects invalid input with 422 and rejects unknown keys', async () => {
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 'nope' });
    assert.equal(bad.status, 422);
    assert.equal(bad.body.errorCode, 'VALIDATION_ERROR');

    const extra = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, role: 'admin' });
    assert.equal(extra.status, 422);
  });

  it('rejects a malformed OTP code before touching the service', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ challengeId: '4b0e1f0a-8a61-4c30-9f2e-3c9a6c1d2e11', code: '12ab' });
    assert.equal(res.status, 422);
  });

  it('GET /auth/me requires a valid bearer token', async () => {
    assert.equal((await request(app).get('/api/v1/auth/me')).status, 401);
    assert.equal(
      (await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer garbage')).status,
      401,
    );

    const { agent, token } = await signIn();
    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, EMAIL);
    assert.ok(!('passwordHash' in me.body.data.user));
    assert.ok(!('tokenVersion' in me.body.data.user));
  });

  it('refresh requires the CSRF header and rotates the cookie', async () => {
    const { agent } = await signIn();

    const noHeader = await agent.post('/api/v1/auth/refresh');
    assert.equal(noHeader.status, 403);
    assert.equal(noHeader.body.errorCode, 'CSRF_REJECTED');

    const badOrigin = await agent
      .post('/api/v1/auth/refresh')
      .set(CSRF)
      .set('Origin', 'https://evil.example');
    assert.equal(badOrigin.status, 403);

    const ok = await agent.post('/api/v1/auth/refresh').set(CSRF);
    assert.equal(ok.status, 200);
    assert.ok(ok.body.data.accessToken);
    assert.match((ok.headers['set-cookie'] as unknown as string[])[0]!, /^sk_refresh=/);
  });

  it('refresh without a cookie is 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').set(CSRF);
    assert.equal(res.status, 401);
    assert.equal(res.body.errorCode, 'INVALID_REFRESH_TOKEN');
  });

  it('logout revokes the session: access and refresh both stop working', async () => {
    const { agent, token } = await signIn();

    const out = await agent
      .post('/api/v1/auth/logout')
      .set(CSRF)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(out.status, 200);

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 401);
    const refresh = await request(app).post('/api/v1/auth/refresh').set(CSRF);
    assert.equal(refresh.status, 401);
  });

  it('logout-all invalidates every token immediately', async () => {
    const { agent, token } = await signIn();

    const res = await agent.post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 401);
  });

  it('a suspended user loses access on the very next request', async () => {
    const { agent, token } = await signIn();
    const user = [...repo.users.values()][0]!;
    repo.users.set(user.id, { ...user, accountStatus: 'SUSPENDED' });

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 401);
  });

  it('blocks core routes until the profile is complete', async () => {
    const { agent, token } = await signIn();

    const blocked = await agent.get('/api/v1/core').set('Authorization', `Bearer ${token}`);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.errorCode, 'PROFILE_INCOMPLETE');

    const user = [...repo.users.values()][0]!;
    repo.users.set(user.id, { ...user, profileCompletedAt: new Date() });
    const allowed = await agent.get('/api/v1/core').set('Authorization', `Bearer ${token}`);
    assert.equal(allowed.status, 200);
  });
});

describe('Rate limiter', () => {
  it('returns 429 with RATE_LIMITED after the limit is exceeded', async () => {
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, limit: 2 }));
    app.get('/ping', (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    assert.equal((await request(app).get('/ping')).status, 200);
    assert.equal((await request(app).get('/ping')).status, 200);
    const limited = await request(app).get('/ping');
    assert.equal(limited.status, 429);
    assert.equal(limited.body.errorCode, 'RATE_LIMITED');
    assert.ok(new ApiError(429).statusCode === 429);
  });
});
