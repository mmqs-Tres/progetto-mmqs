const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let dbInstance = null;

// LOWER di SQLite gestisce solo l'ASCII: fold ignora maiuscole, accenti e apostrofi,
// così "NARDÒ", "nardo" e "Nardo'" coincidono.
function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f'’`]/g, '')
    .toLowerCase();
}

function getDbPath() {
  const configuredPath = process.env.DB_PATH || './data/pharmapuglia.db';
  if (configuredPath === ':memory:') {
    return ':memory:';
  }
  return path.resolve(process.cwd(), configuredPath);
}

function initDatabase(customPath) {
  const dbPath = customPath || getDbPath();

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.function('fold', { deterministic: true }, fold);

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  dbInstance = db;
  return db;
}

function getDb() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  initDatabase,
  getDb,
  closeDb
};
