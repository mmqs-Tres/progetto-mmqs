const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-only-not-for-production-use';

const { initDatabase, getDb, closeDb } = require('../src/db/database');
const app = require('../src/app');
const { signToken } = require('../src/middleware/auth');
const { runSeed } = require('../data/seed');

const SEED_PASSWORDS = {
  SEED_ADMIN_PASSWORD: 'password-admin-di-prova',
  SEED_CITTADINO_PASSWORD: 'password-cittadino-di-prova'
};

test.beforeEach(() => {
  initDatabase(':memory:');
});

test.afterEach(() => {
  closeDb();
});

function addDistrict(comune, name = `Distretto ${comune}`) {
  return Number(getDb()
    .prepare("INSERT INTO districts (comune, provincia, asl_name, district_name) VALUES (?, 'BA', 'ASL Prova', ?)")
    .run(comune, name).lastInsertRowid);
}

function addPharmacy(code, comune, extra = {}) {
  getDb()
    .prepare(`INSERT INTO pharmacies (ministry_code, name, type, address, comune, provincia, lat, lng, district_id)
              VALUES (?, ?, 'farmacia', 'Via Finta 1', ?, 'BA', ?, ?, ?)`)
    .run(code, `Farmacia ${code}`, comune, extra.lat ?? null, extra.lng ?? null, extra.districtId ?? null);
}

function addMedicine(aic, name, ingredient, price) {
  getDb()
    .prepare('INSERT INTO medicines (aic_code, commercial_name, active_ingredient, price) VALUES (?, ?, ?, ?)')
    .run(aic, name, ingredient, price);
}

async function get(path) {
  const res = await request(app).get(path);
  assert.equal(res.status, 200, path);
  return res.body;
}

function pharmacyNames(body) {
  return body.pharmacies.map((pharmacy) => pharmacy.name);
}

// --- Ricerca ---

test('la ricerca non inserisce dati d\'esempio in un DB vuoto', async () => {
  for (const path of ['/api/medicines', '/api/pharmacies', '/api/districts']) {
    assert.equal((await get(path)).count, 0, path);
  }
  for (const table of ['medicines', 'pharmacies', 'districts']) {
    assert.equal(getDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
  }
});

test('la ricerca per comune ignora maiuscole, accenti e apostrofi', async () => {
  addDistrict("Nardo'");
  addPharmacy('N1', "Nardo'");
  for (const comune of ['NARDÒ', 'nardo', "Nardo'", 'Nardò']) {
    const query = `comune=${encodeURIComponent(comune)}`;
    assert.equal((await get(`/api/pharmacies?${query}`)).count, 1, comune);
    assert.equal((await get(`/api/districts?${query}`)).count, 1, comune);
  }
});

test('un comune esistente si cerca per nome esatto, altrimenti per parte del nome', async () => {
  for (const comune of ['Bari', 'Mola Di Bari']) {
    addDistrict(comune);
    addPharmacy(comune, comune);
  }
  assert.deepEqual(pharmacyNames(await get('/api/pharmacies?comune=bari')), ['Farmacia Bari']);
  assert.equal((await get('/api/districts?comune=Bari')).count, 1);
  assert.deepEqual(pharmacyNames(await get('/api/pharmacies?comune=mola')), ['Farmacia Mola Di Bari']);
});

test('una farmacia non si ripete se il comune ha più distretti', async () => {
  const first = addDistrict('Bari', 'Distretto 1');
  const second = addDistrict('Bari', 'Distretto 2');
  addPharmacy('A', 'Bari');
  addPharmacy('B', 'Bari', { districtId: second });
  const { pharmacies } = await get('/api/pharmacies?comune=Bari');
  assert.deepEqual(
    pharmacies.map((pharmacy) => [pharmacy.name, pharmacy.district_name]),
    [['Farmacia A', 'Distretto 1'], ['Farmacia B', 'Distretto 2']]
  );
  assert.ok(first < second);
});

test('la ricerca per raggio filtra e ordina per distanza', async () => {
  addPharmacy('lontana', 'Lecce', { lat: 40.35, lng: 18.17 });
  addPharmacy('media', 'Bari', { lat: 41.15, lng: 16.87 });
  addPharmacy('vicina', 'Bari', { lat: 41.12, lng: 16.87 });
  addPharmacy('senza coordinate', 'Bari');
  const body = await get('/api/pharmacies?lat=41.117&lng=16.87&radius_km=10');
  assert.deepEqual(pharmacyNames(body), ['Farmacia vicina', 'Farmacia media']);
  assert.equal((await request(app).get('/api/pharmacies?lat=abc&lng=1')).status, 400);
});

test('gli equivalenti senza prezzo restano in fondo', async () => {
  addMedicine('1', 'Brand', 'Paracetamolo', 5);
  addMedicine('2', 'Senza prezzo', 'PARACETAMOLO', null);
  addMedicine('3', 'Generico', 'paracetamolo', 3);
  addMedicine('4', 'Altro', 'Ibuprofene', 1);
  const { medicines } = await get('/api/medicines?q=brand');
  assert.deepEqual(medicines[0].equivalents.map((item) => item.commercial_name), ['Generico', 'Senza prezzo']);
  assert.equal(medicines[0].potential_saving, 2);
});

test('medicines indica il totale oltre al numero di schede restituite', async () => {
  for (let i = 0; i < 65; i += 1) addMedicine(`A${i}`, `Farmaco ${i}`, `Principio ${i}`, 1);
  const body = await get('/api/medicines');
  assert.equal(body.count, 60);
  assert.equal(body.total, 65);
});

test('i caratteri jolly di SQL sono cercati alla lettera', async () => {
  addMedicine('1', 'Farmaco', 'Principio', 1);
  for (const q of ['%', '_', "' OR 1=1 --"]) {
    assert.equal((await get(`/api/medicines?q=${encodeURIComponent(q)}`)).total, 0, q);
  }
});

// --- Seed ---

test('il seed si ferma se mancano le password e non modifica il DB', (t) => {
  t.after(() => Object.keys(SEED_PASSWORDS).forEach((name) => delete process.env[name]));
  for (const [name, value] of [['SEED_ADMIN_PASSWORD', ''], ['SEED_CITTADINO_PASSWORD', 'corta']]) {
    Object.assign(process.env, SEED_PASSWORDS, { [name]: value });
    assert.throws(() => runSeed(getDb()), new RegExp(name));
  }
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
});

test('il seed usa le password dell\'ambiente ed è ripetibile', async (t) => {
  t.after(() => Object.keys(SEED_PASSWORDS).forEach((name) => delete process.env[name]));
  t.mock.method(console, 'log', () => {});
  Object.assign(process.env, SEED_PASSWORDS);
  const counts = () => ['users', 'districts', 'pharmacies', 'medicines', 'reports']
    .map((table) => getDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);

  runSeed(getDb());
  const first = counts();
  assert.ok(first.every((n) => n > 0));
  runSeed(getDb());
  assert.deepEqual(counts(), first);

  const admin = getDb().prepare("SELECT * FROM users WHERE role = 'admin'").get();
  assert.ok(bcrypt.compareSync(SEED_PASSWORDS.SEED_ADMIN_PASSWORD, admin.password_hash));
});

// --- Flusso completo e caricamento dataset ---

async function adminToken() {
  getDb().prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('A', 'admin@pharmapuglia.test', 'x', 'admin')").run();
  const admin = getDb().prepare("SELECT * FROM users WHERE role = 'admin'").get();
  return signToken(admin);
}

test('una segnalazione diventa pubblica dopo l\'approvazione e torna in attesa se modificata', async () => {
  const admin = await adminToken();
  const { body } = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Mario', email: 'mario@pharmapuglia.test', password: 'password-di-prova' });
  const citizen = { Authorization: `Bearer ${body.token}` };
  const created = await request(app).post('/api/reports').set(citizen).send({ category: 'turno', message: 'Aperta' });
  const { id } = created.body.report;
  const publicCount = async () => (await get('/api/reports')).reports.length;

  assert.equal(await publicCount(), 0);
  const approved = await request(app)
    .patch(`/api/admin/reports/${id}/status`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ status: 'approved' });
  assert.equal(approved.status, 200);
  assert.equal(await publicCount(), 1);

  await request(app).put(`/api/reports/${id}`).set(citizen).send({ message: 'Chiusa' });
  assert.equal(await publicCount(), 0);
});

test('un nuovo caricamento conserva il collegamento tra segnalazione e farmacia', async () => {
  const admin = await adminToken();
  addPharmacy('F1', 'Bari');
  const { id } = getDb().prepare('SELECT id FROM pharmacies').get();
  getDb().prepare("INSERT INTO reports (user_id, pharmacy_id, category, message) VALUES (1, ?, 'altro', 'm')").run(id);
  const res = await request(app)
    .post('/api/admin/upload/pharmacies')
    .set('Authorization', `Bearer ${admin}`)
    .attach('file', Buffer.from('ministry_code,name,address,comune\nF1,Nuovo nome,Via Finta 2,Bari\n'), 'p.csv');
  assert.equal(res.body.updated, 1);
  assert.equal(getDb().prepare('SELECT pharmacy_id FROM reports').get().pharmacy_id, id);
});

test('un farmaco caricato senza prezzo non risulta gratuito', async () => {
  const admin = await adminToken();
  await request(app)
    .post('/api/admin/upload/medicines')
    .set('Authorization', `Bearer ${admin}`)
    .attach('file', Buffer.from('aic_code,commercial_name,active_ingredient,price\n1,Farmaco,Principio,\n'), 'm.csv');
  assert.equal(getDb().prepare('SELECT price FROM medicines').get().price, null);
});

// --- Errori e intestazioni ---

test('gli errori interni non espongono dettagli', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  getDb().exec('DROP TABLE reports');
  const res = await request(app).get('/api/reports');
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'Errore interno del server.' });
  assert.equal(log.mock.callCount(), 1);
});

test('gli errori di formato e di caricamento hanno messaggi in italiano', async () => {
  const json = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{rotto');
  assert.equal(json.status, 400);
  assert.match(json.body.error, /JSON valido/);

  const admin = await adminToken();
  const big = await request(app)
    .post('/api/admin/upload/medicines')
    .set('Authorization', `Bearer ${admin}`)
    .attach('file', Buffer.alloc(20 * 1024 * 1024 + 1), 'grande.csv');
  assert.equal(big.status, 413);
  const wrongField = await request(app)
    .post('/api/admin/upload/medicines')
    .set('Authorization', `Bearer ${admin}`)
    .attach('altro', Buffer.from('a'), 'a.csv');
  assert.equal(wrongField.status, 400);
});

test('la pagina ha una CSP senza script inline e Leaflet con integrity', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-security-policy'], /script-src 'self' https:\/\/unpkg\.com;/);
  assert.doesNotMatch(res.headers['content-security-policy'], /unsafe-inline/);
  assert.equal(res.text.match(/integrity="sha256-/g).length, 2);
  assert.doesNotMatch(res.text, /<script>|\sstyle="|\son\w+="/);
});
