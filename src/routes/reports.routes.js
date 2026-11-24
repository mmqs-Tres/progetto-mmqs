const express = require('express');
const { getDb } = require('../db/database');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['turno', 'disponibilita', 'disservizio', 'altro'];
const EDITABLE_FIELDS = ['pharmacy_id', 'medicine_name', 'category', 'message'];
const MAX_MESSAGE_LENGTH = 1000;
const MAX_MEDICINE_LENGTH = 200;

const SELECT_REPORT = `
  SELECT r.id, r.user_id, r.pharmacy_id, p.name AS pharmacy_name, p.comune AS pharmacy_comune,
         r.medicine_name, r.category, r.message, r.status, r.created_at, r.updated_at
  FROM reports r
  LEFT JOIN pharmacies p ON p.id = r.pharmacy_id`;

function parseId(value) {
  const isDigits = typeof value === 'string' && /^\d+$/.test(value);
  const id = isDigits ? Number(value) : value;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function findReport(id) {
  return getDb().prepare(`${SELECT_REPORT} WHERE r.id = ?`).get(id);
}

// L'autore non viene mai esposto: il testo può rivelare dati sanitari.
function toPublicReport({ user_id: userId, ...report }, user) {
  return { ...report, is_owner: Boolean(user) && user.id === userId };
}

// Restituisce { error } oppure { data } con i soli campi modificabili, normalizzati.
function validateReport(input) {
  if (!CATEGORIES.includes(input.category)) {
    return { error: `La categoria deve essere una tra: ${CATEGORIES.join(', ')}.` };
  }

  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return { error: `Il messaggio è obbligatorio (massimo ${MAX_MESSAGE_LENGTH} caratteri).` };
  }

  let medicineName = null;
  if (input.medicine_name !== undefined && input.medicine_name !== null) {
    if (typeof input.medicine_name !== 'string' || input.medicine_name.trim().length > MAX_MEDICINE_LENGTH) {
      return { error: `Il nome del farmaco deve essere un testo (massimo ${MAX_MEDICINE_LENGTH} caratteri).` };
    }
    medicineName = input.medicine_name.trim() || null;
  }

  let pharmacyId = null;
  if (input.pharmacy_id !== undefined && input.pharmacy_id !== null && input.pharmacy_id !== '') {
    pharmacyId = parseId(input.pharmacy_id);
    if (!pharmacyId || !getDb().prepare('SELECT 1 FROM pharmacies WHERE id = ?').get(pharmacyId)) {
      return { error: 'La farmacia indicata non esiste.' };
    }
  }

  return { data: { pharmacyId, medicineName, category: input.category, message } };
}

// Carica la segnalazione :id e verifica che l'utente possa modificarla.
function loadEditableReport(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Identificativo della segnalazione non valido.' });
  }
  const report = findReport(id);
  if (!report) {
    return res.status(404).json({ error: 'Segnalazione non trovata.' });
  }
  if (report.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Puoi gestire solo le tue segnalazioni.' });
  }
  req.report = report;
  return next();
}

router.get('/', optionalAuth, (req, res) => {
  // Per un ospite user_id = NULL non è mai vero: restano solo le approvate.
  const conditions = ["(r.status = 'approved' OR r.user_id = ?)"];
  const params = [req.user ? req.user.id : null];

  if (req.query.pharmacy_id) {
    const pharmacyId = parseId(req.query.pharmacy_id);
    if (!pharmacyId) {
      return res.status(400).json({ error: 'Il filtro pharmacy_id non è valido.' });
    }
    conditions.push('r.pharmacy_id = ?');
    params.push(pharmacyId);
  }
  if (req.query.category) {
    if (!CATEGORIES.includes(req.query.category)) {
      return res.status(400).json({ error: 'Il filtro category non è valido.' });
    }
    conditions.push('r.category = ?');
    params.push(req.query.category);
  }

  const rows = getDb()
    .prepare(`${SELECT_REPORT} WHERE ${conditions.join(' AND ')} ORDER BY r.created_at DESC, r.id DESC`)
    .all(...params);
  return res.json({ reports: rows.map((row) => toPublicReport(row, req.user)) });
});

router.post('/', requireAuth, (req, res) => {
  const { error, data } = validateReport(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }
  const { lastInsertRowid } = getDb()
    .prepare(`INSERT INTO reports (user_id, pharmacy_id, medicine_name, category, message, status)
              VALUES (?, ?, ?, ?, ?, 'pending')`)
    .run(req.user.id, data.pharmacyId, data.medicineName, data.category, data.message);
  return res.status(201).json({ report: toPublicReport(findReport(lastInsertRowid), req.user) });
});

router.put('/:id', requireAuth, loadEditableReport, (req, res) => {
  const body = req.body || {};
  const input = {};
  for (const field of EDITABLE_FIELDS) {
    input[field] = body[field] === undefined ? req.report[field] : body[field];
  }
  const { error, data } = validateReport(input);
  if (error) {
    return res.status(400).json({ error });
  }

  // Un testo modificato dal cittadino deve ripassare dalla moderazione.
  const status = req.user.role === 'admin' ? req.report.status : 'pending';
  getDb()
    .prepare(`UPDATE reports
              SET pharmacy_id = ?, medicine_name = ?, category = ?, message = ?, status = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`)
    .run(data.pharmacyId, data.medicineName, data.category, data.message, status, req.report.id);
  return res.json({ report: toPublicReport(findReport(req.report.id), req.user) });
});

router.delete('/:id', requireAuth, loadEditableReport, (req, res) => {
  getDb().prepare('DELETE FROM reports WHERE id = ?').run(req.report.id);
  res.json({ message: 'Segnalazione eliminata.' });
});

module.exports = router;
