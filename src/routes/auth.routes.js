const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_COST = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignora i byte successivi
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Confrontato quando l'email non esiste, così il tempo di risposta non lo rivela.
const DUMMY_HASH = bcrypt.hashSync('utente-inesistente', BCRYPT_COST);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validateRegistration({ name, email, password }) {
  if (!name || name.length > MAX_NAME_LENGTH) {
    return `Il nome è obbligatorio (massimo ${MAX_NAME_LENGTH} caratteri).`;
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return 'Indirizzo email non valido.';
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return `La password è troppo lunga (massimo ${MAX_PASSWORD_BYTES} byte).`;
  }
  return null;
}

router.post('/register', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    const { password } = body;

    const error = validateRegistration({ name, email, password });
    if (error) {
      return res.status(400).json({ error });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const { lastInsertRowid } = getDb()
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'cittadino')")
      .run(name, email, passwordHash);

    const user = { id: Number(lastInsertRowid), name, email, role: 'cittadino' };
    return res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Esiste già un account con questa email.' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const { password } = body;
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }

    const row = getDb()
      .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
      .get(email);
    const matches = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
    if (!row || !matches) {
      return res.status(401).json({ error: 'Email o password non corrette.' });
    }

    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    return res.json({ token: signToken(user), user });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
