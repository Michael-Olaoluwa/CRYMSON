const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/server');

test('GET /api/health returns status payload', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(typeof response.body.db, 'object');
});

test('GET /api/auth/session without token is rejected', async () => {
  const response = await request(app).get('/api/auth/session');

  assert.equal(response.status, 401);
  assert.match(String(response.body.message || ''), /authorization header/i);
});

test('Unknown routes return 404 payload', async () => {
  const response = await request(app).get('/api/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Not found.');
});
