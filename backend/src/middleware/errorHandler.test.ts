import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler.js';

const buildApp = () => {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.post('/echo', (req, res) => {
    res.json(req.body);
  });
  app.use(errorHandler);
  return app;
};

describe('errorHandler body-parser errors', () => {
  it('returns 413 (not 500) when the body exceeds the size limit', async () => {
    const res = await request(buildApp())
      .post('/echo')
      .send({ email: 'a'.repeat(12_000) });
    assert.equal(res.status, 413);
    assert.equal(res.body.errorCode, 'PAYLOAD_TOO_LARGE');
  });

  it('returns 400 (not 500) for malformed JSON', async () => {
    const res = await request(buildApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.errorCode, 'INVALID_JSON');
  });

  it('still hides details of genuine server errors', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('secret db password');
    });
    app.use(errorHandler);
    const res = await request(app).get('/boom');
    assert.equal(res.status, 500);
    assert.ok(!JSON.stringify(res.body).includes('secret'));
  });
});
