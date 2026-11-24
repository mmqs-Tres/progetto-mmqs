const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-only';

const { initDatabase, closeDb } = require('../src/db/database');
const app = require('../src/app');

let adminToken;
let citizenToken;

test.before(() => {
  const db = initDatabase(':memory:');

  // Popola utenti di test
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES 
      ('Admin Test', 'admin@test.local', 'hash', 'admin'),
      ('Cittadino Test', 'user@test.local', 'hash', 'cittadino')
  `).run();

  const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
  const user = db.prepare('SELECT * FROM users WHERE role = ?').get('cittadino');

  adminToken = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET);
  citizenToken = jwt.sign({ id: user.id, email: user.email, role: 'cittadino' }, process.env.JWT_SECRET);

  // Popola distretto di test
  db.prepare(`
    INSERT INTO districts (comune, provincia, asl_name, district_name, district_code)
    VALUES ('Bari', 'BA', 'ASL BARI', 'Distretto Unico di Bari', 'DSS-BA-01')
  `).run();

  // Popola farmacia di test
  db.prepare(`
    INSERT INTO pharmacies (ministry_code, name, type, address, comune, provincia, cap, district_id)
    VALUES ('FARM001', 'Farmacia Test Bari', 'farmacia', 'Via Roma 1', 'Bari', 'BA', '70100', 1)
  `).run();

  // Popola segnalazione di test
  db.prepare(`
    INSERT INTO reports (user_id, pharmacy_id, medicine_name, category, message, status)
    VALUES (?, 1, 'Tachipirina 500', 'disponibilita', 'Farmaco disponibile', 'pending')
  `).run(user.id);
});

test.after(() => {
  closeDb();
});

test('RBAC: gli endpoint admin rifiutano richieste anonime o non admin', async () => {
  // Anonimo -> 401
  const anonRes = await request(app).get('/api/admin/reports');
  assert.equal(anonRes.status, 401);

  // Ruolo cittadino -> 403
  const userRes = await request(app)
    .get('/api/admin/reports')
    .set('Authorization', `Bearer ${citizenToken}`);
  assert.equal(userRes.status, 403);
});

test('GET /api/admin/reports restituisce la lista delle segnalazioni per admin', async () => {
  const res = await request(app)
    .get('/api/admin/reports')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.reports));
  assert.equal(res.body.reports.length, 1);
  assert.equal(res.body.reports[0].user_email, 'user@test.local');
  assert.equal(res.body.reports[0].pharmacy_name, 'Farmacia Test Bari');
});

test('GET /api/admin/reports filtra correttamente per status', async () => {
  const pendingRes = await request(app)
    .get('/api/admin/reports?status=pending')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(pendingRes.status, 200);
  assert.equal(pendingRes.body.reports.length, 1);

  const approvedRes = await request(app)
    .get('/api/admin/reports?status=approved')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(approvedRes.status, 200);
  assert.equal(approvedRes.body.reports.length, 0);

  const invalidRes = await request(app)
    .get('/api/admin/reports?status=invalido')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(invalidRes.status, 400);
});

test('PATCH /api/admin/reports/:id/status aggiorna lo stato della segnalazione', async () => {
  // Errore 400 se stato non valido
  const badStatusRes = await request(app)
    .patch('/api/admin/reports/1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'sospeso' });
  assert.equal(badStatusRes.status, 400);

  // Errore 404 se id inesistente
  const notFoundRes = await request(app)
    .patch('/api/admin/reports/999/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'approved' });
  assert.equal(notFoundRes.status, 404);

  // Approvazione valida
  const approveRes = await request(app)
    .patch('/api/admin/reports/1/status')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'approved' });
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.body.report.status, 'approved');

  // Verifica nel DB
  const checkRes = await request(app)
    .get('/api/admin/reports?status=approved')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(checkRes.body.reports.length, 1);
});

test('POST /api/admin/upload/:dataset valida dataset e gestisce upload CSV e JSON', async () => {
  // Dataset non consentito
  const invalidDatasetRes = await request(app)
    .post('/api/admin/upload/utenti')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(invalidDatasetRes.status, 400);

  // Nessun file caricato
  const noFileRes = await request(app)
    .post('/api/admin/upload/medicines')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(noFileRes.status, 400);

  // Upload CSV medicinali
  const csvContent = [
    'aic_code,commercial_name,active_ingredient,atc_code,holder,price,is_generic,prescription_required',
    '9990001,TACHIPIRINA 1000,Paracetamolo,N02BE01,ANGELINI,6.20,0,1',
    '9990002,PARACETAMOLO ZENTIVA,Paracetamolo,N02BE01,ZENTIVA,4.10,1,1'
  ].join('\n');

  const uploadCsvRes = await request(app)
    .post('/api/admin/upload/medicines')
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('file', Buffer.from(csvContent), 'medicines_test.csv');

  assert.equal(uploadCsvRes.status, 200);
  assert.equal(uploadCsvRes.body.inserted, 2);
  assert.equal(uploadCsvRes.body.updated, 0);
  assert.equal(uploadCsvRes.body.skipped, 0);

  // Aggiornamento dello stesso medicinale via JSON
  const jsonContent = JSON.stringify([
    {
      aic_code: '9990001',
      commercial_name: 'TACHIPIRINA 1000 FLASH',
      active_ingredient: 'Paracetamolo',
      atc_code: 'N02BE01',
      holder: 'ANGELINI',
      price: 6.50,
      is_generic: 0,
      prescription_required: 1
    }
  ]);

  const uploadJsonRes = await request(app)
    .post('/api/admin/upload/medicines')
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('file', Buffer.from(jsonContent), 'medicines_test.json');

  assert.equal(uploadJsonRes.status, 200);
  assert.equal(uploadJsonRes.body.inserted, 0);
  assert.equal(uploadJsonRes.body.updated, 1);

  // Upload CSV distretti
  const districtsCsv = [
    'comune,provincia,asl_name,district_name,district_code',
    'Foggia,FG,ASL FOGGIA,Distretto Socio Sanitario Foggia,DSS-FG-01'
  ].join('\n');

  const uploadDistrictsRes = await request(app)
    .post('/api/admin/upload/districts')
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('file', Buffer.from(districtsCsv), 'districts.csv');

  assert.equal(uploadDistrictsRes.status, 200);
  assert.equal(uploadDistrictsRes.body.inserted, 1);

  // Upload CSV farmacie con aggancio automatico al distretto
  const pharmaciesCsv = [
    'ministry_code,name,type,address,comune,provincia,cap,lat,lng',
    '99991,Farmacia Centrale Foggia,farmacia,Corso Garibaldi 10,Foggia,FG,71121,41.462,15.543'
  ].join('\n');

  const uploadPharmaciesRes = await request(app)
    .post('/api/admin/upload/pharmacies')
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('file', Buffer.from(pharmaciesCsv), 'pharmacies.csv');

  assert.equal(uploadPharmaciesRes.status, 200);
  assert.equal(uploadPharmaciesRes.body.inserted, 1);
});
