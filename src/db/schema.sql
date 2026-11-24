PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cittadino', 'admin')) DEFAULT 'cittadino',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comune TEXT NOT NULL,
  provincia TEXT NOT NULL,
  asl_name TEXT NOT NULL,
  district_name TEXT NOT NULL,
  district_code TEXT,
  UNIQUE(comune, district_name)
);

CREATE TABLE IF NOT EXISTS pharmacies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ministry_code TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('farmacia', 'parafarmacia')) DEFAULT 'farmacia',
  address TEXT NOT NULL,
  comune TEXT NOT NULL,
  provincia TEXT NOT NULL,
  cap TEXT,
  lat REAL,
  lng REAL,
  district_id INTEGER,
  FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aic_code TEXT NOT NULL UNIQUE,
  commercial_name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  atc_code TEXT,
  holder TEXT,
  price REAL,
  is_generic INTEGER NOT NULL DEFAULT 0 CHECK (is_generic IN (0, 1)),
  prescription_required INTEGER NOT NULL DEFAULT 0 CHECK (prescription_required IN (0, 1))
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pharmacy_id INTEGER,
  medicine_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('turno', 'disponibilita', 'disservizio', 'altro')),
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_comune ON pharmacies(comune);
CREATE INDEX IF NOT EXISTS idx_districts_comune ON districts(comune);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(commercial_name);
CREATE INDEX IF NOT EXISTS idx_medicines_ingredient ON medicines(active_ingredient);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
