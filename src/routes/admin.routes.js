const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configurazione multer con memorizzazione in buffer e limite di dimensione
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

// Applica il middleware di autorizzazione Admin a tutte le rotte di questo router
router.use(requireAdmin);

/**
 * Normalizza una stringa o ritorna valore di default
 */
function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parsing flessibile di numeri decimali (es. "5,63" o "5.63")
 */
function parseNum(val, defaultVal = null) {
  if (val === null || val === undefined) return defaultVal;
  const cleaned = String(val).replace(/[^\d,\.-]/g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Helper per estrarre record da CSV o JSON
 */
function parseUploadedFile(file) {
  const rawText = file.buffer.toString('utf8');
  const filename = (file.originalname || '').toLowerCase();

  if (filename.endsWith('.json') || rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Se fallisce il parsing JSON, tenta come CSV prima di dare errore
    }
  }

  // Rilevamento delimitatore CSV (virgola o punto e virgola)
  const firstLine = rawText.split(/\r?\n/)[0] || '';
  const delimiter = (firstLine.includes(';') && (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length) ? ';' : ',';

  return parse(rawText, {
    delimiter,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true
  });
}

/**
 * POST /api/admin/upload/:dataset
 * Importa o aggiorna dataset (pharmacies, medicines, districts) da CSV o JSON
 */
router.post('/upload/:dataset', upload.single('file'), (req, res, next) => {
  const { dataset } = req.params;
  const validDatasets = ['pharmacies', 'medicines', 'districts'];

  if (!validDatasets.includes(dataset)) {
    return res.status(400).json({
      error: `Dataset non valido. Valori ammessi: ${validDatasets.join(', ')}.`
    });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      error: 'Nessun file caricato. Selezionare un file CSV o JSON tramite il campo "file".'
    });
  }

  let records;
  try {
    records = parseUploadedFile(req.file);
  } catch (err) {
    return res.status(400).json({
      error: `Impossibile analizzare il file: ${err.message || 'formato non valido'}.`
    });
  }

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      error: 'Il file non contiene record validi o è vuoto.'
    });
  }

  const db = getDb();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    if (dataset === 'districts') {
      const findStmt = db.prepare('SELECT id FROM districts WHERE LOWER(comune) = LOWER(?) AND LOWER(district_name) = LOWER(?)');
      const insertStmt = db.prepare(`
        INSERT INTO districts (comune, provincia, asl_name, district_name, district_code)
        VALUES (?, ?, ?, ?, ?)
      `);
      const updateStmt = db.prepare(`
        UPDATE districts
        SET provincia = ?, asl_name = ?, district_code = ?
        WHERE id = ?
      `);

      const tx = db.transaction((rows) => {
        for (const r of rows) {
          const comune = cleanStr(r.comune || r.Comune || r.COMUNE);
          const district_name = cleanStr(r.district_name || r.distretto || r.Distretto || r.nome_distretto);
          const provincia = cleanStr(r.provincia || r.sigla_provincia || r.Provincia).toUpperCase();
          const asl_name = cleanStr(r.asl_name || r.asl || r.ASL);
          const district_code = cleanStr(r.district_code || r.codice_distretto || r.code) || null;

          if (!comune || !district_name) {
            skipped++;
            continue;
          }

          const existing = findStmt.get(comune, district_name);
          if (existing) {
            updateStmt.run(provincia, asl_name, district_code, existing.id);
            updated++;
          } else {
            insertStmt.run(comune, provincia, asl_name, district_name, district_code);
            inserted++;
          }
        }
      });
      tx(records);
    } else if (dataset === 'pharmacies') {
      const findByCode = db.prepare('SELECT id FROM pharmacies WHERE ministry_code = ?');
      const findByNameAndComune = db.prepare('SELECT id FROM pharmacies WHERE LOWER(name) = LOWER(?) AND LOWER(comune) = LOWER(?) AND LOWER(address) = LOWER(?)');
      const findDistrictByComune = db.prepare('SELECT id FROM districts WHERE LOWER(comune) = LOWER(?) LIMIT 1');

      const insertStmt = db.prepare(`
        INSERT INTO pharmacies (ministry_code, name, type, address, comune, provincia, cap, lat, lng, district_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updateStmt = db.prepare(`
        UPDATE pharmacies
        SET name = ?, type = ?, address = ?, comune = ?, provincia = ?, cap = ?, lat = ?, lng = ?, district_id = ?
        WHERE id = ?
      `);

      const tx = db.transaction((rows) => {
        for (const r of rows) {
          const ministry_code = cleanStr(r.ministry_code || r.cod_farmacia || r.codice_identificativo_sito || r.codice) || null;
          const name = cleanStr(r.name || r.descrizione_farmacia || r.sito_logistico || r.denominazione);
          const rawType = cleanStr(r.type || r.descrizione_tipologia || r.tipo).toLowerCase();
          const type = rawType.includes('parafarmacia') ? 'parafarmacia' : 'farmacia';
          const address = cleanStr(r.address || r.indirizzo);
          const comune = cleanStr(r.comune || r.Comune);
          const provincia = cleanStr(r.provincia || r.sigla_provincia).toUpperCase();
          const cap = cleanStr(r.cap || r.CAP) || null;

          const lat = parseNum(r.lat !== undefined ? r.lat : r.latitudine, null);
          const lng = parseNum(r.lng !== undefined ? r.lng : r.longitudine, null);

          if (!name || !address || !comune) {
            skipped++;
            continue;
          }

          // Ricerca distretto associato al comune
          let district_id = parseNum(r.district_id, null);
          if (!district_id && comune) {
            const distRow = findDistrictByComune.get(comune);
            if (distRow) district_id = distRow.id;
          }

          let existing = null;
          if (ministry_code) {
            existing = findByCode.get(ministry_code);
          }
          if (!existing) {
            existing = findByNameAndComune.get(name, comune, address);
          }

          if (existing) {
            updateStmt.run(name, type, address, comune, provincia, cap, lat, lng, district_id, existing.id);
            updated++;
          } else {
            insertStmt.run(ministry_code, name, type, address, comune, provincia, cap, lat, lng, district_id);
            inserted++;
          }
        }
      });
      tx(records);
    } else if (dataset === 'medicines') {
      const findByAic = db.prepare('SELECT id FROM medicines WHERE aic_code = ?');
      const insertStmt = db.prepare(`
        INSERT INTO medicines (aic_code, commercial_name, active_ingredient, atc_code, holder, price, is_generic, prescription_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updateStmt = db.prepare(`
        UPDATE medicines
        SET commercial_name = ?, active_ingredient = ?, atc_code = ?, holder = ?, price = ?, is_generic = ?, prescription_required = ?
        WHERE id = ?
      `);

      const tx = db.transaction((rows) => {
        for (const r of rows) {
          const aic_code = cleanStr(r.aic_code || r.AIC || r.aic);
          const commercial_name = cleanStr(r.commercial_name || r.Farmaco || r.farmaco || r.nome);
          const active_ingredient = cleanStr(r.active_ingredient || r['Principio attivo'] || r.principio_attivo);
          const atc_code = cleanStr(r.atc_code || r.ATC || r.atc) || null;
          const holder = cleanStr(r.holder || r.Ditta || r.ditta || r.titolare) || null;
          const price = parseNum(r.price !== undefined ? r.price : (r['Prezzo Pubblico 16 novembre 2026'] || r['Prezzo riferimento SSN'])) || null;

          let is_generic = 0;
          if (r.is_generic !== undefined) {
            is_generic = Number(r.is_generic) === 1 || String(r.is_generic).toLowerCase() === 'true' ? 1 : 0;
          } else if (r['Differenza'] !== undefined) {
            const diff = parseNum(r['Differenza'], 0.0);
            is_generic = diff === 0.0 ? 1 : 0;
          }

          let prescription_required = 1;
          if (r.prescription_required !== undefined) {
            prescription_required = Number(r.prescription_required) === 0 || String(r.prescription_required).toLowerCase() === 'false' ? 0 : 1;
          }

          if (!aic_code || !commercial_name || !active_ingredient) {
            skipped++;
            continue;
          }

          const existing = findByAic.get(aic_code);
          if (existing) {
            updateStmt.run(commercial_name, active_ingredient, atc_code, holder, price, is_generic, prescription_required, existing.id);
            updated++;
          } else {
            insertStmt.run(aic_code, commercial_name, active_ingredient, atc_code, holder, price, is_generic, prescription_required);
            inserted++;
          }
        }
      });
      tx(records);
    }

    return res.status(200).json({
      success: true,
      dataset,
      inserted,
      updated,
      skipped,
      total: inserted + updated + skipped
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/reports
 * Recupera tutte le segnalazioni con filtri opzionali e dettagli utente e presidio
 */
router.get('/reports', (req, res, next) => {
  const { status } = req.query;
  const db = getDb();

  const validStatuses = ['pending', 'approved', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Parametro status non valido. Valori ammessi: ${validStatuses.join(', ')}.`
    });
  }

  try {
    let sql = `
      SELECT 
        r.id,
        r.user_id,
        u.name AS user_name,
        u.email AS user_email,
        r.pharmacy_id,
        p.name AS pharmacy_name,
        p.comune AS pharmacy_comune,
        p.address AS pharmacy_address,
        p.type AS pharmacy_type,
        r.medicine_name,
        r.category,
        r.message,
        r.status,
        r.created_at,
        r.updated_at
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN pharmacies p ON r.pharmacy_id = p.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const reports = db.prepare(sql).all(...params);
    return res.status(200).json({ reports });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/admin/reports/:id/status
 * Aggiorna lo stato di moderazione di una segnalazione ('approved' o 'rejected')
 */
router.patch('/reports/:id/status', (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body || {};

  const allowed = ['approved', 'rejected'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      error: `Stato non valido. Valori ammessi: ${allowed.join(', ')}.`
    });
  }

  const db = getDb();
  try {
    const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Segnalazione non trovata.' });
    }

    db.prepare(`
      UPDATE reports
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    const updated = db.prepare(`
      SELECT 
        r.id,
        r.user_id,
        u.name AS user_name,
        u.email AS user_email,
        r.pharmacy_id,
        p.name AS pharmacy_name,
        r.medicine_name,
        r.category,
        r.message,
        r.status,
        r.created_at,
        r.updated_at
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN pharmacies p ON r.pharmacy_id = p.id
      WHERE r.id = ?
    `).get(id);

    return res.status(200).json({
      success: true,
      report: updated
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
