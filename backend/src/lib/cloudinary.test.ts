import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  createProfileUploadSignature,
  parseOwnProfileImageUrl,
  profileFolder,
  signParams,
} from './cloudinary.js';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const base = `https://res.cloudinary.com/sharekar-test/image/upload`;

describe('cloudinary signing', () => {
  it('signs sorted params with sha1(params + secret)', () => {
    const expected = createHash('sha1').update('a=1&b=2secret').digest('hex');
    assert.equal(signParams({ b: 2, a: 1 }, 'secret'), expected);
  });

  it('upload signature covers the folder, formats and timestamp, and never leaks the secret', () => {
    const sig = createProfileUploadSignature(USER, new Date(1_700_000_000_000));
    assert.equal(sig.folder, `sharekar/profiles/${USER}`);
    assert.equal(sig.timestamp, 1_700_000_000);
    assert.equal(sig.maxBytes, 2 * 1024 * 1024);
    const expected = createHash('sha1')
      .update(
        `allowed_formats=jpg,jpeg,png,webp&folder=sharekar/profiles/${USER}&timestamp=1700000000test-cloudinary-secret`,
      )
      .digest('hex');
    assert.equal(sig.signature, expected);
    assert.ok(!JSON.stringify(sig).includes('test-cloudinary-secret'));
  });
});

describe('parseOwnProfileImageUrl', () => {
  const ok = (path: string) => parseOwnProfileImageUrl(`${base}/${path}`, USER);

  it("accepts an image in the user's own folder, with or without a version", () => {
    assert.equal(ok(`v1700/${profileFolder(USER)}/abc_123.jpg`), `${profileFolder(USER)}/abc_123`);
    assert.equal(ok(`${profileFolder(USER)}/abc.webp`), `${profileFolder(USER)}/abc`);
  });

  it("rejects another user's folder, other clouds, other hosts and plain http", () => {
    assert.equal(ok(`v1/${profileFolder(OTHER)}/abc.jpg`), null);
    assert.equal(
      parseOwnProfileImageUrl(
        `https://res.cloudinary.com/someone-else/image/upload/${profileFolder(USER)}/a.jpg`,
        USER,
      ),
      null,
    );
    assert.equal(parseOwnProfileImageUrl(`https://evil.example.com/a.jpg`, USER), null);
    assert.equal(
      parseOwnProfileImageUrl(
        `http://res.cloudinary.com/sharekar-test/image/upload/${profileFolder(USER)}/a.jpg`,
        USER,
      ),
      null,
    );
  });

  it('rejects path tricks, bad extensions, query strings and non-urls', () => {
    assert.equal(ok(`${profileFolder(USER)}/../${profileFolder(OTHER)}/a.jpg`), null);
    assert.equal(ok(`${profileFolder(USER)}/a.svg`), null);
    assert.equal(ok(`${profileFolder(USER)}/sub/a.jpg`), null);
    assert.equal(ok(`${profileFolder(USER)}/a.jpg?x=1`), null);
    assert.equal(parseOwnProfileImageUrl('not a url', USER), null);
  });
});
