const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-only-not-for-production-use';

const { initDatabase, getDb, closeDb } = require('../src/db/database');
const app = require('../src/app');
const { requireAdmin, signToken } = require('../src/middleware/auth');

const PASSWORD = 'password-di-prova';

test.beforeEach(() => {
  initDatabase(':memory:');
});

test.afterEach(() => {
  closeDb();
});

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function register(email, extra = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Utente Prova', email, password: PASSWORD, ...extra });
  assert.equal(res.status, 201);
  return res.body;
}

async function registerAdmin(email = 'admin@pharmapuglia.test') {
  const { token, user } = await register(email);
  getDb().prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  return { token, user };
}

// Esegue requireAdmin da solo: le route admin appartengono a un altro branch.
function runRequireAdmin(token) {
  const result = { status: null, passed: false };
  const res = {
    status(code) {
      result.status = code;
      return this;
    },
    json() {}
  };
  requireAdmin({ headers: { authorization: `Bearer ${token}` } }, res, () => {
    result.passed = true;
  });
  return result;
}

test('GET /api/health restituisce stato ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'PharmaPuglia OpenCare');
});

// --- Autenticazione ---

test('register crea sempre un cittadino e ignora il ruolo richiesto', async () => {
  const { token, user } = await register('Mario@PharmaPuglia.test', { role: 'admin', id: 999 });
  assert.ok(token);
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name', 'role']);
  assert.equal(user.role, 'cittadino');
  assert.equal(user.email, 'mario@pharmapuglia.test');

  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  assert.equal(row.role, 'cittadino');
  assert.notEqual(row.password_hash, PASSWORD);
});

test('register rifiuta una email già usata anche con maiuscole diverse', async () => {
  await register('mario@pharmapuglia.test');
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Altro', email: ' MARIO@pharmapuglia.test ', password: PASSWORD });
  assert.equal(res.status, 409);
  assert.ok(res.body.error);
});

test('due registrazioni simultanee creano un solo account', async () => {
  const send = () => request(app)
    .post('/api/auth/register')
    .send({ name: 'Mario', email: 'mario@pharmapuglia.test', password: PASSWORD });
  const statuses = (await Promise.all([send(), send()])).map((res) => res.status).sort();
  assert.deepEqual(statuses, [201, 409]);
});

test('register rifiuta dati non validi', async () => {
  const valid = { name: 'Mario', email: 'mario@pharmapuglia.test', password: PASSWORD };
  const invalid = [
    { name: '   ' },
    { name: 'x'.repeat(101) },
    { name: ['Mario'] },
    { email: 'non-una-email' },
    { email: { a: 1 } },
    { password: 'corta' },
    { password: 12345678 },
    { password: 'x'.repeat(73) },
    { password: 'è'.repeat(37) } // 74 byte in 37 caratteri
  ];
  for (const override of invalid) {
    const res = await request(app).post('/api/auth/register').send({ ...valid, ...override });
    assert.equal(res.status, 400, JSON.stringify(override));
    assert.ok(res.body.error);
  }
  assert.equal((await request(app).post('/api/auth/register')).status, 400);

  const limit = await request(app)
    .post('/api/auth/register')
    .send({ ...valid, password: 'x'.repeat(72) });
  assert.equal(limit.status, 201);
});

test('login accetta credenziali corrette e non espone la password', async () => {
  await register('mario@pharmapuglia.test');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'MARIO@pharmapuglia.test', password: PASSWORD });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.deepEqual(Object.keys(res.body.user).sort(), ['email', 'id', 'name', 'role']);
});

test('login dà la stessa risposta per password errata ed email inesistente', async () => {
  await register('mario@pharmapuglia.test');
  const wrongPassword = await request(app)
    .post('/api/auth/login')
    .send({ email: 'mario@pharmapuglia.test', password: 'sbagliata!' });
  const unknownEmail = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nessuno@pharmapuglia.test', password: 'sbagliata!' });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
});

test('login rifiuta campi mancanti o di tipo errato', async () => {
  const invalid = [
    {},
    { email: 'a@b.test' },
    { email: ['a@b.test'], password: PASSWORD },
    { email: 'a@b.test', password: {} }
  ];
  for (const body of invalid) {
    const res = await request(app).post('/api/auth/login').send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('GET /api/auth/me restituisce i dati dell\'utente senza password_hash', async () => {
  const { token, user } = await register('mario@pharmapuglia.test');
  const res = await request(app).get('/api/auth/me').set(bearer(token));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { user });
});

// --- Token ---

test('i token assenti, scaduti o falsificati ricevono 401', async () => {
  const { user } = await register('mario@pharmapuglia.test');
  const payload = { id: user.id, email: user.email };
  const expired = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -10 });
  const forged = jwt.sign({ ...payload, role: 'admin' }, 'dev-only-fallback-secret');
  const unsigned = jwt.sign(payload, '', { algorithm: 'none' });

  assert.equal((await request(app).get('/api/auth/me')).status, 401);
  for (const token of [expired, forged, unsigned, 'non-un-token']) {
    const res = await request(app).get('/api/auth/me').set(bearer(token));
    assert.equal(res.status, 401);
  }
});

test('il token di un utente eliminato non vale più', async () => {
  const { token, user } = await register('mario@pharmapuglia.test');
  getDb().prepare('DELETE FROM users WHERE id = ?').run(user.id);
  assert.equal((await request(app).get('/api/auth/me').set(bearer(token))).status, 401);
});

test('dopo la ricreazione del DB un vecchio token non vale per un altro utente', async () => {
  const { token, user } = await register('mario@pharmapuglia.test');
  closeDb();
  initDatabase(':memory:');
  const other = await register('lucia@pharmapuglia.test');
  assert.equal(other.user.id, user.id);
  assert.equal((await request(app).get('/api/auth/me').set(bearer(token))).status, 401);
});

test('requireAdmin usa il ruolo del DB e non quello del token', async () => {
  const citizen = await register('mario@pharmapuglia.test');
  assert.deepEqual(runRequireAdmin(citizen.token), { status: 403, passed: false });
  const claimsAdmin = jwt.sign(
    { id: citizen.user.id, email: citizen.user.email, role: 'admin' },
    process.env.JWT_SECRET
  );
  assert.deepEqual(runRequireAdmin(claimsAdmin), { status: 403, passed: false });

  const admin = await registerAdmin();
  assert.deepEqual(runRequireAdmin(admin.token), { status: null, passed: true });
  getDb().prepare("UPDATE users SET role = 'cittadino' WHERE id = ?").run(admin.user.id);
  assert.deepEqual(runRequireAdmin(admin.token), { status: 403, passed: false });
});

test('signToken include solo id ed email', () => {
  const payload = jwt.decode(
    signToken({ id: 1, name: 'M', email: 'm@x.test', role: 'admin', password_hash: 'h' })
  );
  assert.deepEqual(Object.keys(payload).sort(), ['email', 'exp', 'iat', 'id']);
});

test('l\'app non parte senza un JWT_SECRET adeguato', () => {
  for (const secret of ['', 'change-me-with-a-random-secret']) {
    const result = spawnSync(process.execPath, ['-e', "require('./src/app')"], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, JWT_SECRET: secret },
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET mancante o troppo corto/);
  }
});
