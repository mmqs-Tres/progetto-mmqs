require('dotenv').config();
const { initDatabase, closeDb } = require('../src/db/database');

// TODO (branch: feat/data-ingestion-admin):
// Importare i dataset ufficiali puliti da data/raw/ (districts, pharmacies, medicines)
// e gli utenti fittizi di prova (cittadino@pharmapuglia.test, admin@pharmapuglia.test).

function runSeed() {
  initDatabase();
  console.log('Database inizializzato. Implementare import dataset in branch feat/data-ingestion-admin.');
  closeDb();
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
