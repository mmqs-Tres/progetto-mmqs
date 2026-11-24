require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDatabase, closeDb } = require('../src/db/database');

/**
 * Seed script per PharmaPuglia OpenCare
 * Popola il database SQLite con:
 * - Utenti di prova inventati (admin e cittadino con dominio .test)
 * - Distretti socio-sanitari e ASL pugliesi (data/raw/districts.json)
 * - Presidi sanitari: farmacie e parafarmacie della Puglia (data/raw/pharmacies.json)
 * - Prontuario medicinali AIFA con equivalenti (data/raw/medicines.json)
 * - Segnalazioni di test per verificare moderazione e flusso segnalazioni
 */
function runSeed(dbInstance) {
  const db = dbInstance || initDatabase();
  console.log('--- Avvio Seed Database PharmaPuglia OpenCare ---');

  const rawDir = path.join(__dirname, 'raw');

  // 1. Utenti di test
  console.log('1. Inserimento utenti di test...');
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin123!', salt);
  const cittadinoHash = bcrypt.hashSync('Cittadino123!', salt);

  const insertUserStmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = excluded.role
  `);

  insertUserStmt.run('Amministratore Puglia', 'admin@pharmapuglia.test', adminHash, 'admin');
  insertUserStmt.run('Mario Rossi', 'cittadino@pharmapuglia.test', cittadinoHash, 'cittadino');

  const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@pharmapuglia.test');
  const cittadinoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('cittadino@pharmapuglia.test');

  // 2. Distretti
  console.log('2. Inserimento distretti socio-sanitari e ASL...');
  const districtsPath = path.join(rawDir, 'districts.json');
  let districtCount = 0;

  if (fs.existsSync(districtsPath)) {
    const districtsData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    const insertDistrict = db.prepare(`
      INSERT INTO districts (comune, provincia, asl_name, district_name, district_code)
      VALUES (@comune, @provincia, @asl_name, @district_name, @district_code)
      ON CONFLICT(comune, district_name) DO UPDATE SET
        provincia = excluded.provincia,
        asl_name = excluded.asl_name,
        district_code = excluded.district_code
    `);

    const insertManyDistricts = db.transaction((rows) => {
      for (const row of rows) {
        insertDistrict.run({
          comune: row.comune,
          provincia: row.provincia,
          asl_name: row.asl_name,
          district_name: row.district_name,
          district_code: row.district_code || null
        });
        districtCount++;
      }
    });

    insertManyDistricts(districtsData);
  }
  console.log(`   Distretti inseriti/aggiornati: ${districtCount}`);

  // Mappa comune -> district_id per associazione rapida alle farmacie
  const districtRows = db.prepare('SELECT id, LOWER(comune) as comune_low FROM districts').all();
  const districtMap = new Map();
  for (const d of districtRows) {
    districtMap.set(d.comune_low, d.id);
  }

  // 3. Presidi Sanitari (Farmacie e Parafarmacie)
  console.log('3. Inserimento farmacie e parafarmacie pugliesi...');
  const pharmaciesPath = path.join(rawDir, 'pharmacies.json');
  let pharmacyCount = 0;

  if (fs.existsSync(pharmaciesPath)) {
    const pharmaciesData = JSON.parse(fs.readFileSync(pharmaciesPath, 'utf8'));
    const insertPharmacy = db.prepare(`
      INSERT INTO pharmacies (ministry_code, name, type, address, comune, provincia, cap, lat, lng, district_id)
      VALUES (@ministry_code, @name, @type, @address, @comune, @provincia, @cap, @lat, @lng, @district_id)
      ON CONFLICT(ministry_code) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        address = excluded.address,
        comune = excluded.comune,
        provincia = excluded.provincia,
        cap = excluded.cap,
        lat = excluded.lat,
        lng = excluded.lng,
        district_id = excluded.district_id
    `);

    const insertManyPharmacies = db.transaction((rows) => {
      for (const row of rows) {
        const distId = districtMap.get((row.comune || '').toLowerCase()) || null;
        insertPharmacy.run({
          ministry_code: row.ministry_code,
          name: row.name,
          type: row.type || 'farmacia',
          address: row.address,
          comune: row.comune,
          provincia: row.provincia,
          cap: row.cap || null,
          lat: row.lat !== undefined ? row.lat : null,
          lng: row.lng !== undefined ? row.lng : null,
          district_id: distId
        });
        pharmacyCount++;
      }
    });

    insertManyPharmacies(pharmaciesData);
  }
  console.log(`   Presidi sanitari inseriti/aggiornati: ${pharmacyCount}`);

  // 4. Prontuario medicinali
  console.log('4. Inserimento prontuario medicinali AIFA...');
  const medicinesPath = path.join(rawDir, 'medicines.json');
  let medicineCount = 0;

  if (fs.existsSync(medicinesPath)) {
    const medicinesData = JSON.parse(fs.readFileSync(medicinesPath, 'utf8'));
    const insertMedicine = db.prepare(`
      INSERT INTO medicines (aic_code, commercial_name, active_ingredient, atc_code, holder, price, is_generic, prescription_required)
      VALUES (@aic_code, @commercial_name, @active_ingredient, @atc_code, @holder, @price, @is_generic, @prescription_required)
      ON CONFLICT(aic_code) DO UPDATE SET
        commercial_name = excluded.commercial_name,
        active_ingredient = excluded.active_ingredient,
        atc_code = excluded.atc_code,
        holder = excluded.holder,
        price = excluded.price,
        is_generic = excluded.is_generic,
        prescription_required = excluded.prescription_required
    `);

    const insertManyMedicines = db.transaction((rows) => {
      for (const row of rows) {
        insertMedicine.run({
          aic_code: row.aic_code,
          commercial_name: row.commercial_name,
          active_ingredient: row.active_ingredient,
          atc_code: row.atc_code || null,
          holder: row.holder || null,
          price: typeof row.price === 'number' ? row.price : parseFloat(row.price) || 0,
          is_generic: row.is_generic ? 1 : 0,
          prescription_required: row.prescription_required !== undefined ? (row.prescription_required ? 1 : 0) : 1
        });
        medicineCount++;
      }
    });

    insertManyMedicines(medicinesData);
  }
  console.log(`   Medicinali inseriti/aggiornati: ${medicineCount}`);

  // 5. Segnalazioni di test (se non già presenti)
  console.log('5. Inserimento segnalazioni di prova...');
  const existingReports = db.prepare('SELECT COUNT(*) as count FROM reports').get().count;
  if (existingReports === 0 && cittadinoUser) {
    const samplePharmacy = db.prepare('SELECT id FROM pharmacies WHERE comune = ? LIMIT 1').get('Bari')
      || db.prepare('SELECT id FROM pharmacies LIMIT 1').get();

    const insertReportStmt = db.prepare(`
      INSERT INTO reports (user_id, pharmacy_id, medicine_name, category, message, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertReportStmt.run(
      cittadinoUser.id,
      samplePharmacy ? samplePharmacy.id : null,
      'Paracetamolo 1000mg',
      'disponibilita',
      'Farmaco esaurito al momento della visita, comunicato riassortimento nel pomeriggio.',
      'pending'
    );

    insertReportStmt.run(
      cittadinoUser.id,
      samplePharmacy ? samplePharmacy.id : null,
      null,
      'turno',
      'Turno notturno confermato e aperto regolarmente.',
      'approved'
    );

    insertReportStmt.run(
      cittadinoUser.id,
      samplePharmacy ? samplePharmacy.id : null,
      'Amoxicillina Zentiva',
      'disservizio',
      'Segnalazione di prova chiusa e respinta.',
      'rejected'
    );

    console.log('   3 segnalazioni di prova inserite (pending, approved, rejected).');
  } else {
    console.log(`   Segnalazioni già presenti (${existingReports}).`);
  }

  console.log('--- Seed completato con successo! ---');

  if (!dbInstance) {
    closeDb();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
