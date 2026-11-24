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

// --- Segnalazioni ---

const VALID_REPORT = { category: 'turno', message: 'Sportello notturno attivo.' };

function insertPharmacy(code = 'F1') {
  const { lastInsertRowid } = getDb()
    .prepare("INSERT INTO pharmacies (ministry_code, name, address, comune, provincia) VALUES (?, 'Farmacia Prova', 'Via Finta 1', 'Bari', 'BA')")
    .run(code);
  return Number(lastInsertRowid);
}

async function createReport(token, body = VALID_REPORT) {
  const res = await request(app).post('/api/reports').set(bearer(token)).send(body);
  assert.equal(res.status, 201);
  return res.body.report;
}

function setStatus(id, status) {
  getDb().prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
}

async function listIds(token, query = '') {
  const req = request(app).get(`/api/reports${query}`);
  const res = await (token ? req.set(bearer(token)) : req);
  assert.equal(res.status, 200);
  return res.body.reports.map((report) => report.id);
}

test('POST /api/reports crea una segnalazione pending e ignora i campi riservati', async () => {
  const pharmacyId = insertPharmacy();
  const { token, user } = await register('mario@pharmapuglia.test');
  const other = await register('lucia@pharmapuglia.test');
  const report = await createReport(token, {
    ...VALID_REPORT,
    message: '  Sportello notturno attivo.  ',
    medicine_name: ' Tachipirina ',
    pharmacy_id: pharmacyId,
    status: 'approved',
    user_id: other.user.id
  });
  assert.equal(report.status, 'pending');
  assert.equal(report.is_owner, true);
  assert.equal(report.message, 'Sportello notturno attivo.');
  assert.equal(report.medicine_name, 'Tachipirina');
  assert.equal(report.pharmacy_name, 'Farmacia Prova');
  assert.equal(report.pharmacy_comune, 'Bari');

  const row = getDb().prepare('SELECT user_id FROM reports WHERE id = ?').get(report.id);
  assert.equal(row.user_id, user.id);
});

test('anche le segnalazioni create da un admin nascono pending', async () => {
  const admin = await registerAdmin();
  assert.equal((await createReport(admin.token)).status, 'pending');
});

test('POST /api/reports accetta farmacia e farmaco assenti', async () => {
  const { token } = await register('mario@pharmapuglia.test');
  const report = await createReport(token, { ...VALID_REPORT, medicine_name: ' ', pharmacy_id: null });
  assert.equal(report.pharmacy_id, null);
  assert.equal(report.medicine_name, null);
});

test('POST /api/reports rifiuta dati non validi con 400', async () => {
  const { token } = await register('mario@pharmapuglia.test');
  const invalid = [
    { category: 'inesistente' },
    { category: ['turno'] },
    { category: undefined },
    { message: '   ' },
    { message: 'x'.repeat(1001) },
    { message: { a: 1 } },
    { medicine_name: 5 },
    { medicine_name: 'x'.repeat(201) },
    { pharmacy_id: 999 },
    { pharmacy_id: true },
    { pharmacy_id: 'abc' },
    { pharmacy_id: -1 },
    { pharmacy_id: 1.5 },
    { pharmacy_id: [1] }
  ];
  for (const override of invalid) {
    const res = await request(app)
      .post('/api/reports')
      .set(bearer(token))
      .send({ ...VALID_REPORT, ...override });
    assert.equal(res.status, 400, JSON.stringify(override));
    assert.ok(res.body.error);
  }
  assert.equal((await request(app).post('/api/reports').set(bearer(token))).status, 400);
});

test('GET /api/reports mostra le approvate a tutti e le altre solo all\'autore', async () => {
  const mario = await register('mario@pharmapuglia.test');
  const lucia = await register('lucia@pharmapuglia.test');
  const admin = await registerAdmin();
  const approved = await createReport(mario.token);
  const pending = await createReport(mario.token);
  const rejected = await createReport(mario.token);
  setStatus(approved.id, 'approved');
  setStatus(rejected.id, 'rejected');

  assert.deepEqual(await listIds(null), [approved.id]);
  assert.deepEqual(await listIds('token-non-valido'), [approved.id]);
  assert.deepEqual(await listIds(lucia.token), [approved.id]);
  assert.deepEqual(await listIds(admin.token), [approved.id]);
  assert.deepEqual(await listIds(mario.token), [rejected.id, pending.id, approved.id]);
});

test('i filtri non rivelano le segnalazioni altrui non approvate', async () => {
  const pharmacyId = insertPharmacy();
  const mario = await register('mario@pharmapuglia.test');
  const lucia = await register('lucia@pharmapuglia.test');
  const pending = await createReport(mario.token, { ...VALID_REPORT, pharmacy_id: pharmacyId });
  const approved = await createReport(mario.token, { ...VALID_REPORT, pharmacy_id: pharmacyId });
  const elsewhere = await createReport(mario.token, { ...VALID_REPORT, category: 'altro' });
  setStatus(approved.id, 'approved');
  setStatus(elsewhere.id, 'approved');

  assert.deepEqual(await listIds(null, `?pharmacy_id=${pharmacyId}&category=turno`), [approved.id]);
  assert.deepEqual(await listIds(lucia.token, '?category=turno'), [approved.id]);
  assert.deepEqual(await listIds(mario.token, '?category=turno'), [approved.id, pending.id]);
  assert.deepEqual(await listIds(null, '?category=altro'), [elsewhere.id]);
});

test('GET /api/reports rifiuta filtri non validi con 400', async () => {
  const queries = ['pharmacy_id=abc', 'pharmacy_id=1&pharmacy_id=2', 'category=boh', 'category=turno&category=altro'];
  for (const query of queries) {
    assert.equal((await request(app).get(`/api/reports?${query}`)).status, 400, query);
  }
});

test('le risposte non espongono dati dell\'autore', async () => {
  const mario = await register('mario@pharmapuglia.test', { name: 'Nome Riservato' });
  const report = await createReport(mario.token);
  setStatus(report.id, 'approved');
  const res = await request(app).get('/api/reports');
  assert.equal(res.body.reports[0].is_owner, false);
  assert.ok(!('user_id' in res.body.reports[0]));
  assert.doesNotMatch(res.text, /Nome Riservato|mario@/);
});

test('la modifica del cittadino riporta sempre a pending', async () => {
  const { token } = await register('mario@pharmapuglia.test');
  const report = await createReport(token);
  for (const status of ['approved', 'rejected']) {
    setStatus(report.id, status);
    const res = await request(app)
      .put(`/api/reports/${report.id}`)
      .set(bearer(token))
      .send({ message: `Testo dopo ${status}`, status: 'approved' });
    assert.equal(res.status, 200);
    assert.equal(res.body.report.status, 'pending');
    assert.equal(res.body.report.message, `Testo dopo ${status}`);
    assert.equal(res.body.report.category, VALID_REPORT.category);
  }
  assert.deepEqual(await listIds(null), []);
});

test('PUT conserva i campi assenti, azzera quelli nulli e aggiorna updated_at', async () => {
  const pharmacyId = insertPharmacy();
  const { token } = await register('mario@pharmapuglia.test');
  const report = await createReport(token, { ...VALID_REPORT, pharmacy_id: pharmacyId, medicine_name: 'Aspirina' });
  getDb().prepare("UPDATE reports SET updated_at = '2020-01-01 00:00:00' WHERE id = ?").run(report.id);

  const put = (body) => request(app).put(`/api/reports/${report.id}`).set(bearer(token)).send(body);
  const kept = (await put({ category: 'altro' })).body.report;
  assert.equal(kept.pharmacy_id, pharmacyId);
  assert.equal(kept.medicine_name, 'Aspirina');
  assert.equal(kept.category, 'altro');
  assert.ok(kept.updated_at > '2020-01-01 00:00:00');
  assert.equal(kept.created_at, report.created_at);

  const cleared = (await put({ pharmacy_id: null, medicine_name: null })).body.report;
  assert.equal(cleared.pharmacy_id, null);
  assert.equal(cleared.medicine_name, null);
  assert.equal((await put({ message: '' })).status, 400);
});

test('la modifica dell\'admin non cambia lo stato né l\'autore', async () => {
  const mario = await register('mario@pharmapuglia.test');
  const admin = await registerAdmin();
  const report = await createReport(mario.token);
  setStatus(report.id, 'approved');
  const res = await request(app)
    .put(`/api/reports/${report.id}`)
    .set(bearer(admin.token))
    .send({ message: 'Corretto da admin', status: 'rejected' });
  assert.equal(res.status, 200);
  assert.equal(res.body.report.status, 'approved');
  assert.equal(res.body.report.is_owner, false);
  const row = getDb().prepare('SELECT user_id FROM reports WHERE id = ?').get(report.id);
  assert.equal(row.user_id, mario.user.id);
});

test('scritture senza permesso: 401, 403, 404 e 400', async () => {
  const mario = await register('mario@pharmapuglia.test');
  const lucia = await register('lucia@pharmapuglia.test');
  const report = await createReport(mario.token);

  assert.equal((await request(app).post('/api/reports').send(VALID_REPORT)).status, 401);
  for (const method of ['put', 'delete']) {
    const call = (id, token) => {
      const req = request(app)[method](`/api/reports/${id}`).send(VALID_REPORT);
      return token ? req.set(bearer(token)) : req;
    };
    assert.equal((await call(report.id)).status, 401);
    assert.equal((await call(report.id, lucia.token)).status, 403);
    assert.equal((await call(9999, mario.token)).status, 404);
    for (const id of ['abc', '0', '-1', '1.5', '1e3']) {
      assert.equal((await call(id, mario.token)).status, 400, id);
    }
  }
  assert.deepEqual(await listIds(mario.token), [report.id]);
});

test('DELETE è consentito al proprietario e all\'admin', async () => {
  const mario = await register('mario@pharmapuglia.test');
  const admin = await registerAdmin();
  const first = await createReport(mario.token);
  const second = await createReport(mario.token);
  for (const [id, token] of [[first.id, mario.token], [second.id, admin.token]]) {
    const res = await request(app).delete(`/api/reports/${id}`).set(bearer(token));
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
  }
  assert.deepEqual(await listIds(mario.token), []);
});
