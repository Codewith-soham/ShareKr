import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { app } from '../../app.js';
import { deleteAccountSchema, updateProfileSchema } from './users.schemas.js';

describe('updateProfileSchema', () => {
  it('accepts a partial update', () => {
    assert.ok(updateProfileSchema.safeParse({ fullName: 'Asha Patil' }).success);
    assert.ok(updateProfileSchema.safeParse({ gender: 'FEMALE' }).success);
  });

  it('rejects an empty body and unknown keys', () => {
    assert.equal(updateProfileSchema.safeParse({}).success, false);
    assert.equal(updateProfileSchema.safeParse({ role: 'admin' }).success, false);
    assert.equal(
      updateProfileSchema.safeParse({ fullName: 'Asha', email: 'x@y.com' }).success,
      false,
    );
  });

  it('validates phone format, gender and name length', () => {
    for (const phone of ['9876543210', '+0123456789', '+91 98765 43210', '+12', '']) {
      assert.equal(updateProfileSchema.safeParse({ phone }).success, false, phone);
    }
    assert.ok(updateProfileSchema.safeParse({ phone: '+919876543210' }).success);
    assert.equal(updateProfileSchema.safeParse({ gender: 'ROBOT' }).success, false);
    assert.equal(updateProfileSchema.safeParse({ fullName: 'A' }).success, false);
    assert.equal(updateProfileSchema.safeParse({ fullName: 'A'.repeat(121) }).success, false);
  });

  it('requires an https-style url for the image', () => {
    assert.equal(updateProfileSchema.safeParse({ profileImageUrl: 'nope' }).success, false);
  });
});

describe('deleteAccountSchema', () => {
  it('only accepts the exact word DELETE', () => {
    assert.ok(deleteAccountSchema.safeParse({ confirm: 'DELETE' }).success);
    assert.equal(deleteAccountSchema.safeParse({ confirm: 'delete' }).success, false);
    assert.equal(deleteAccountSchema.safeParse({}).success, false);
  });
});

describe('/users routes without a token', () => {
  it('every route answers 401', async () => {
    assert.equal((await request(app).get('/api/v1/users/me')).status, 401);
    assert.equal(
      (await request(app).patch('/api/v1/users/me').send({ fullName: 'Asha' })).status,
      401,
    );
    assert.equal(
      (await request(app).post('/api/v1/users/me/profile-image/upload-signature')).status,
      401,
    );
    assert.equal(
      (await request(app).delete('/api/v1/users/me').send({ confirm: 'DELETE' })).status,
      401,
    );
  });
});
