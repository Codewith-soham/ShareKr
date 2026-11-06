// DB integration tests for the profile and account lifecycle (real Postgres, sharekar_test).
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { app } from '../../app.js';
import { anonymizeDeletedAccounts } from '../../jobs/account-anonymize.js';
import { profileFolder } from '../../lib/cloudinary.js';
import { prisma } from '../../lib/prisma.js';
import { hashRefreshToken, signAccessToken } from '../auth/token.service.js';

const CSRF = { 'X-Requested-With': 'sharekar' };
const API = '/api/v1/users/me';

// Never hit the real Cloudinary from tests; remember what we would have called.
// HEAD requests (the size check) answer with headSize, or 404 when headSize is null.
const fetchCalls: string[] = [];
let headSize: number | null = 1000;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  fetchCalls.push(String(input instanceof Request ? input.url : input));
  if (init?.method === 'HEAD') {
    return headSize === null
      ? new Response(null, { status: 404 })
      : new Response(null, { status: 200, headers: { 'content-length': String(headSize) } });
  }
  return new Response('{}', { status: 200 });
}) as typeof fetch;

const imageUrl = (userId: string, name = 'avatar') =>
  `https://res.cloudinary.com/sharekar-test/image/upload/v1/${profileFolder(userId)}/${name}.jpg`;

const makeUser = async (email: string, data: Record<string, unknown> = {}) => {
  const user = await prisma.user.create({
    data: { email, fullName: 'Rider One', emailVerifiedAt: new Date(), ...data },
  });
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      familyId: crypto.randomUUID(),
      refreshTokenHash: hashRefreshToken(crypto.randomUUID()),
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
  const token = signAccessToken({ sub: user.id, sid: session.id, tv: user.tokenVersion });
  return { user, session, auth: { Authorization: `Bearer ${token}` } };
};

const fullProfile = (userId: string, phone = '+919876543210') => ({
  fullName: 'Asha Patil',
  phone,
  gender: 'FEMALE',
  profileImageUrl: imageUrl(userId),
});

describe('Users against a real Postgres', () => {
  beforeEach(async () => {
    fetchCalls.length = 0;
    headSize = 1000;
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE auth_sessions, auth_otp_challenges, users RESTART IDENTITY CASCADE',
    );
  });

  after(async () => {
    globalThis.fetch = realFetch;
    await prisma.$disconnect();
  });

  describe('profile completion', () => {
    it('a new user is incomplete, and partial updates keep it incomplete', async () => {
      const { auth } = await makeUser('a@example.com');
      const me = await request(app).get(API).set(auth);
      assert.equal(me.body.data.user.profileComplete, false);

      const res = await request(app).patch(API).set(auth).send({ fullName: 'New Name' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.fullName, 'New Name');
      assert.equal(res.body.data.user.profileComplete, false);
    });

    it('becomes complete once name, phone, gender and image are all present (across calls)', async () => {
      const { user, auth } = await makeUser('a@example.com');
      const body = fullProfile(user.id);
      await request(app).patch(API).set(auth).send({ phone: body.phone });
      await request(app).patch(API).set(auth).send({ gender: body.gender });
      const last = await request(app)
        .patch(API)
        .set(auth)
        .send({ profileImageUrl: body.profileImageUrl });
      assert.equal(last.status, 200);
      assert.equal(last.body.data.user.profileComplete, true);
      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.ok(row.profileCompletedAt);
    });

    it("rejects an image that is not in the user's own Cloudinary folder", async () => {
      const a = await makeUser('a@example.com');
      const b = await makeUser('b@example.com');
      for (const url of [
        'https://evil.example.com/pixel.png',
        imageUrl(b.user.id), // someone else's folder
      ]) {
        const res = await request(app).patch(API).set(a.auth).send({ profileImageUrl: url });
        assert.equal(res.status, 422, url);
        assert.equal(res.body.errorCode, 'INVALID_PROFILE_IMAGE');
      }
    });

    it('rejects an image over 2 MB and asks Cloudinary to delete it', async () => {
      const { user, auth } = await makeUser('a@example.com');
      headSize = 2 * 1024 * 1024 + 1;
      const res = await request(app)
        .patch(API)
        .set(auth)
        .send({ profileImageUrl: imageUrl(user.id, 'huge') });
      assert.equal(res.status, 422);
      assert.equal(res.body.errorCode, 'PROFILE_IMAGE_TOO_LARGE');
      await new Promise((r) => setTimeout(r, 50));
      assert.equal(fetchCalls.filter((u) => u.endsWith('/image/destroy')).length, 1);
      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(row.profileImageUrl, null);
    });

    it('accepts an image of exactly 2 MB', async () => {
      const { user, auth } = await makeUser('a@example.com');
      headSize = 2 * 1024 * 1024;
      const res = await request(app)
        .patch(API)
        .set(auth)
        .send({ profileImageUrl: imageUrl(user.id) });
      assert.equal(res.status, 200);
    });

    it('rejects a link to an image that was never uploaded', async () => {
      const { user, auth } = await makeUser('a@example.com');
      headSize = null;
      const res = await request(app)
        .patch(API)
        .set(auth)
        .send({ profileImageUrl: imageUrl(user.id, 'ghost') });
      assert.equal(res.status, 422);
      assert.equal(res.body.errorCode, 'INVALID_PROFILE_IMAGE');
    });

    it('replacing the image asks Cloudinary to delete the old one', async () => {
      const { user, auth } = await makeUser('a@example.com');
      await request(app)
        .patch(API)
        .set(auth)
        .send({ profileImageUrl: imageUrl(user.id, 'one') });
      await request(app)
        .patch(API)
        .set(auth)
        .send({ profileImageUrl: imageUrl(user.id, 'two') });
      await new Promise((r) => setTimeout(r, 50));
      assert.equal(fetchCalls.filter((u) => u.endsWith('/image/destroy')).length, 1);
    });

    it('phone cannot change after it is set, and cannot be shared', async () => {
      const a = await makeUser('a@example.com');
      const b = await makeUser('b@example.com');
      await request(app).patch(API).set(a.auth).send({ phone: '+919876543210' });

      const change = await request(app).patch(API).set(a.auth).send({ phone: '+919999999999' });
      assert.equal(change.status, 409);
      assert.equal(change.body.errorCode, 'PHONE_CHANGE_NOT_SUPPORTED');

      const taken = await request(app).patch(API).set(b.auth).send({ phone: '+919876543210' });
      assert.equal(taken.status, 409);
      assert.equal(taken.body.errorCode, 'PHONE_TAKEN');
    });

    it('two users racing for the same phone: exactly one wins', async () => {
      const a = await makeUser('a@example.com');
      const b = await makeUser('b@example.com');
      const results = await Promise.all([
        request(app).patch(API).set(a.auth).send({ phone: '+919876543210' }),
        request(app).patch(API).set(b.auth).send({ phone: '+919876543210' }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    });

    it("the upload signature is scoped to the caller's own folder", async () => {
      const { user, auth } = await makeUser('a@example.com');
      const res = await request(app).post(`${API}/profile-image/upload-signature`).set(auth);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.upload.folder, profileFolder(user.id));
      assert.ok(!JSON.stringify(res.body).includes('test-cloudinary-secret'));
    });
  });

  describe('gender change rule', () => {
    it('is allowed with no active pool, blocked with an active membership', async () => {
      const { user, auth } = await makeUser('a@example.com', { gender: 'MALE' });
      const ok = await request(app).patch(API).set(auth).send({ gender: 'FEMALE' });
      assert.equal(ok.status, 200);

      const dest = await prisma.destination.create({ data: { name: 'Dahisar Station' } });
      const creator = await makeUser('c@example.com');
      const pool = await prisma.pool.create({
        data: {
          creatorId: creator.user.id,
          destinationId: dest.id,
          departureTime: new Date(Date.now() + 86_400_000),
          joinDeadline: new Date(Date.now() + 80_000_000),
          capacity: 3,
          journeyType: 'SCHEDULED',
          pickupAddress: 'NL Complex',
          pickupLatitude: 19.25,
          pickupLongitude: 72.86,
        },
      });
      await prisma.poolMember.create({
        data: { poolId: pool.id, userId: user.id, status: 'ACTIVE' },
      });

      const blocked = await request(app).patch(API).set(auth).send({ gender: 'MALE' });
      assert.equal(blocked.status, 409);
      assert.equal(blocked.body.errorCode, 'GENDER_CHANGE_BLOCKED');
    });
  });

  describe('account deletion', () => {
    it('needs the CSRF header and the word DELETE', async () => {
      const { auth } = await makeUser('a@example.com');
      assert.equal(
        (await request(app).delete(API).set(auth).send({ confirm: 'DELETE' })).status,
        403,
      );
      assert.equal(
        (await request(app).delete(API).set(auth).set(CSRF).send({ confirm: 'no' })).status,
        422,
      );
      assert.equal((await request(app).delete(API).set(auth).set(CSRF).send({})).status, 422);
    });

    it('deactivates, revokes every session, and the old token stops working at once', async () => {
      const { user, session, auth } = await makeUser('a@example.com');
      const res = await request(app).delete(API).set(auth).set(CSRF).send({ confirm: 'DELETE' });
      assert.equal(res.status, 200);

      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(row.accountStatus, 'DEACTIVATED');
      assert.ok(row.deletedAt);
      assert.equal(row.tokenVersion, user.tokenVersion + 1);
      const s = await prisma.authSession.findUniqueOrThrow({ where: { id: session.id } });
      assert.ok(s.revokedAt);

      assert.equal((await request(app).get(API).set(auth)).status, 401);
    });

    it('a deleted account cannot log in again, and the response gives nothing away', async () => {
      const { auth } = await makeUser('gone@example.com');
      await request(app).delete(API).set(auth).set(CSRF).send({ confirm: 'DELETE' });
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'gone@example.com' });
      const unknown = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com' });
      assert.equal(login.status, unknown.status);
      assert.deepEqual(Object.keys(login.body.data).sort(), Object.keys(unknown.body.data).sort());
    });

    it('is refused while the user still has an active pool', async () => {
      const dest = await prisma.destination.create({ data: { name: 'Dahisar Station' } });
      const { user, auth } = await makeUser('a@example.com');
      await prisma.pool.create({
        data: {
          creatorId: user.id,
          destinationId: dest.id,
          departureTime: new Date(Date.now() + 86_400_000),
          joinDeadline: new Date(Date.now() + 80_000_000),
          capacity: 3,
          journeyType: 'SCHEDULED',
          pickupAddress: 'NL Complex',
          pickupLatitude: 19.25,
          pickupLongitude: 72.86,
        },
      });
      const res = await request(app).delete(API).set(auth).set(CSRF).send({ confirm: 'DELETE' });
      assert.equal(res.status, 409);
      assert.equal(res.body.errorCode, 'ACTIVE_POOL_EXISTS');
      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(row.accountStatus, 'ACTIVE');
    });

    it('double delete: the second request is simply unauthorized', async () => {
      const { auth } = await makeUser('a@example.com');
      const results = await Promise.all([
        request(app).delete(API).set(auth).set(CSRF).send({ confirm: 'DELETE' }),
        request(app).delete(API).set(auth).set(CSRF).send({ confirm: 'DELETE' }),
      ]);
      assert.ok(results.some((r) => r.status === 200));
      assert.ok(results.every((r) => r.status === 200 || r.status === 401));
    });
  });

  describe('anonymization job', () => {
    const deactivated = (email: string, daysAgo: number, phone = '+919876543210') =>
      makeUser(email, {
        phone,
        gender: 'FEMALE',
        profileImageUrl: 'https://res.cloudinary.com/sharekar-test/image/upload/a.jpg',
        accountStatus: 'DEACTIVATED',
        deletedAt: new Date(Date.now() - daysAgo * 86_400_000),
      });

    it('wipes personal data only after the retention period', async () => {
      const old = await deactivated('old@example.com', 40);
      const recent = await deactivated('recent@example.com', 5, '+912222222222');
      const count = await anonymizeDeletedAccounts(new Date(), 30);
      assert.equal(count, 1);

      const wiped = await prisma.user.findUniqueOrThrow({ where: { id: old.user.id } });
      assert.equal(wiped.email, `deleted+${old.user.id}@invalid.local`);
      assert.equal(wiped.fullName, 'Deleted user');
      assert.equal(wiped.phone, null);
      assert.equal(wiped.profileImageUrl, null);
      assert.equal(wiped.gender, null);
      assert.ok(fetchCalls.some((u) => u.includes('/resources/image/upload')));

      const kept = await prisma.user.findUniqueOrThrow({ where: { id: recent.user.id } });
      assert.equal(kept.email, 'recent@example.com');
    });

    it('is safe to run twice, never touches active users, and frees the email', async () => {
      await deactivated('old@example.com', 40);
      await makeUser('active@example.com', { phone: '+911111111111' });
      assert.equal(await anonymizeDeletedAccounts(new Date(), 30), 1);
      assert.equal(await anonymizeDeletedAccounts(new Date(), 30), 0);
      const active = await prisma.user.findUniqueOrThrow({
        where: { email: 'active@example.com' },
      });
      assert.equal(active.phone, '+911111111111');
      // The old email can now register again as a brand new account.
      assert.equal(await prisma.user.count({ where: { email: 'old@example.com' } }), 0);
    });
  });
});
