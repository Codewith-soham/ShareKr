import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toDisplayName, toPoolMember, toPoolPreview } from './users.presenters.js';

// A full database row, including fields that must never reach other riders.
const row = {
  id: 'u1',
  fullName: 'Soham Kulkarni',
  email: 'soham@example.com',
  phone: '+919876543210',
  gender: 'MALE',
  profileImageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg',
  accountStatus: 'ACTIVE',
  tokenVersion: 3,
  passwordHash: 'secret-hash',
  googleSubject: 'google-123',
} as const;

describe('toDisplayName', () => {
  it('shows first name and last initial', () => {
    assert.equal(toDisplayName('Soham Kulkarni'), 'Soham K.');
    assert.equal(toDisplayName('  asha   patil  '), 'asha P.');
  });

  it('uses the last word as the surname when there are several names', () => {
    assert.equal(toDisplayName('Ravi Kumar Sharma'), 'Ravi S.');
  });

  it('handles a single name and non-latin letters', () => {
    assert.equal(toDisplayName('Soham'), 'Soham');
    assert.equal(toDisplayName('आशा पाटिल'), 'आशा प.');
  });
});

describe('pool views', () => {
  it('preview exposes only id, short name and photo', () => {
    assert.deepEqual(toPoolPreview(row), {
      id: 'u1',
      displayName: 'Soham K.',
      profileImageUrl: row.profileImageUrl,
    });
  });

  it('member view adds full name and phone, nothing else', () => {
    assert.deepEqual(toPoolMember(row), {
      id: 'u1',
      displayName: 'Soham K.',
      profileImageUrl: row.profileImageUrl,
      fullName: 'Soham Kulkarni',
      phone: '+919876543210',
    });
  });

  it('never leaks email, gender, status, token or credential fields', () => {
    const text = JSON.stringify([toPoolPreview(row), toPoolMember(row)]);
    for (const secret of [
      'soham@example.com',
      'MALE',
      'ACTIVE',
      'secret-hash',
      'google-123',
      'tokenVersion',
    ]) {
      assert.ok(!text.includes(secret), `leaked: ${secret}`);
    }
  });

  it('the preview never contains the phone number', () => {
    assert.ok(!JSON.stringify(toPoolPreview(row)).includes('+91'));
  });
});
