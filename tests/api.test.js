const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-only';

const { initDatabase, closeDb } = require('../src/db/database');
const app = require('../src/app');

test.before(() => {
  initDatabase(':memory:');
});

test.after(() => {
  closeDb();
});

test('GET /api/health restituisce stato ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'PharmaPuglia OpenCare');
});
