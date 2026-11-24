const express = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

// Coordinate di riferimento per i principali Comuni pugliesi (usate anche come fallback locale per Nominatim)
const PUGLIA_MUNICIPALITIES_COORDS = {
  bari: { lat: 41.1171, lng: 16.8719, display_name: 'Bari, Città Metropolitana di Bari, Puglia, Italia' },
  altamura: { lat: 40.8262, lng: 16.5545, display_name: 'Altamura, Città Metropolitana di Bari, Puglia, Italia' },
  molfetta: { lat: 41.2012, lng: 16.5983, display_name: 'Molfetta, Città Metropolitana di Bari, Puglia, Italia' },
  monopoli: { lat: 40.9519, lng: 17.2984, display_name: 'Monopoli, Città Metropolitana di Bari, Puglia, Italia' },
  bitonto: { lat: 41.1084, lng: 16.6914, display_name: 'Bitonto, Città Metropolitana di Bari, Puglia, Italia' },
  putignano: { lat: 40.8492, lng: 17.1225, display_name: 'Putignano, Città Metropolitana di Bari, Puglia, Italia' },
  lecce: { lat: 40.3515, lng: 18.175, display_name: 'Lecce, Provincia di Lecce, Puglia, Italia' },
  gallipoli: { lat: 40.0559, lng: 17.9926, display_name: 'Gallipoli, Provincia di Lecce, Puglia, Italia' },
  'nardò': { lat: 40.1797, lng: 18.0315, display_name: 'Nardò, Provincia di Lecce, Puglia, Italia' },
  nardo: { lat: 40.1797, lng: 18.0315, display_name: 'Nardò, Provincia di Lecce, Puglia, Italia' },
  maglie: { lat: 40.1194, lng: 18.2989, display_name: 'Maglie, Provincia di Lecce, Puglia, Italia' },
  taranto: { lat: 40.4644, lng: 17.247, display_name: 'Taranto, Provincia di Taranto, Puglia, Italia' },
  'martina franca': { lat: 40.7042, lng: 17.3347, display_name: 'Martina Franca, Provincia di Taranto, Puglia, Italia' },
  manduria: { lat: 40.4028, lng: 17.6331, display_name: 'Manduria, Provincia di Taranto, Puglia, Italia' },
  foggia: { lat: 41.4622, lng: 15.5446, display_name: 'Foggia, Provincia di Foggia, Puglia, Italia' },
  cerignola: { lat: 41.2656, lng: 15.8995, display_name: 'Cerignola, Provincia di Foggia, Puglia, Italia' },
  manfredonia: { lat: 41.6295, lng: 15.9158, display_name: 'Manfredonia, Provincia di Foggia, Puglia, Italia' },
  'san severo': { lat: 41.6858, lng: 15.3792, display_name: 'San Severo, Provincia di Foggia, Puglia, Italia' },
  brindisi: { lat: 40.6327, lng: 17.9418, display_name: 'Brindisi, Provincia di Brindisi, Puglia, Italia' },
  ostuni: { lat: 40.7289, lng: 17.5774, display_name: 'Ostuni, Provincia di Brindisi, Puglia, Italia' },
  fasano: { lat: 40.8347, lng: 17.3597, display_name: 'Fasano, Provincia di Brindisi, Puglia, Italia' },
  barletta: { lat: 41.3196, lng: 16.2829, display_name: 'Barletta, Provincia di Barletta-Andria-Trani, Puglia, Italia' },
  andria: { lat: 41.227, lng: 16.2957, display_name: 'Andria, Provincia di Barletta-Andria-Trani, Puglia, Italia' },
  trani: { lat: 41.2775, lng: 16.4189, display_name: 'Trani, Provincia di Barletta-Andria-Trani, Puglia, Italia' }
};

// Un comune esistente si cerca per nome esatto ("Bari" non deve includere "Mola di Bari");
// altrimenti si accetta una parte del nome.
function comuneCondition(db, column, comune) {
  const exists = db
    .prepare(`SELECT 1 FROM districts WHERE fold(comune) = fold(?)
              UNION SELECT 1 FROM pharmacies WHERE fold(comune) = fold(?)`)
    .get(comune, comune);
  return exists ? `fold(${column}) = fold(?)` : `instr(fold(${column}), fold(?)) > 0`;
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function calculateHaversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raggio medio della Terra in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// GET /api/medicines?q=...&generic=...&prescription=...
router.get('/medicines', (req, res, next) => {
  try {
    const db = getDb();

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const genericFilter = req.query.generic;
    const prescriptionFilter = req.query.prescription;

    const conditions = [];
    const params = [];

    if (q) {
      const columns = ['commercial_name', 'active_ingredient', 'aic_code', 'atc_code', 'holder'];
      conditions.push(`(${columns.map((column) => `instr(fold(${column}), fold(?)) > 0`).join(' OR ')})`);
      params.push(...columns.map(() => q));
    }

    if (genericFilter === '1' || genericFilter === '0') {
      conditions.push('is_generic = ?');
      params.push(Number(genericFilter));
    }

    if (prescriptionFilter === '1' || prescriptionFilter === '0') {
      conditions.push('prescription_required = ?');
      params.push(Number(prescriptionFilter));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        id,
        aic_code,
        commercial_name,
        active_ingredient,
        atc_code,
        holder,
        price,
        is_generic,
        prescription_required
      FROM medicines
      ${whereClause}
      ORDER BY commercial_name ASC
      LIMIT 60
    `).all(...params);

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM medicines ${whereClause}`).get(...params);

    const findEquivalentsStmt = db.prepare(`
      SELECT
        id,
        aic_code,
        commercial_name,
        active_ingredient,
        atc_code,
        holder,
        price,
        is_generic,
        prescription_required
      FROM medicines
      WHERE LOWER(active_ingredient) = LOWER(?)
        AND id != ?
      ORDER BY price IS NULL, price ASC, is_generic DESC, commercial_name ASC
    `);

    const medicines = rows.map((med) => {
      const equivalents = findEquivalentsStmt.all(med.active_ingredient, med.id);
      const validPrices = equivalents
        .map((eq) => eq.price)
        .filter((p) => typeof p === 'number' && !Number.isNaN(p));
      const cheapestEquivalentPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
      const potentialSaving =
        cheapestEquivalentPrice !== null && typeof med.price === 'number' && med.price > cheapestEquivalentPrice
          ? Number((med.price - cheapestEquivalentPrice).toFixed(2))
          : 0;

      return {
        ...med,
        cheapest_equivalent_price: cheapestEquivalentPrice,
        potential_saving: potentialSaving,
        equivalents
      };
    });

    res.json({
      query: q,
      count: medicines.length,
      total,
      medicines
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/districts?comune=...&provincia=...
router.get('/districts', (req, res, next) => {
  try {
    const db = getDb();

    const comune = typeof req.query.comune === 'string' ? req.query.comune.trim() : '';
    const provincia = typeof req.query.provincia === 'string' ? req.query.provincia.trim() : '';

    const conditions = [];
    const params = [];

    if (comune) {
      conditions.push(comuneCondition(db, 'd.comune', comune));
      params.push(comune);
    }

    if (provincia) {
      conditions.push('LOWER(d.provincia) = LOWER(?)');
      params.push(provincia);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const districts = db.prepare(`
      SELECT
        d.id,
        d.comune,
        d.provincia,
        d.asl_name,
        d.district_name,
        d.district_code,
        COUNT(p.id) AS pharmacies_count
      FROM districts d
      LEFT JOIN pharmacies p
        ON p.district_id = d.id OR LOWER(p.comune) = LOWER(d.comune)
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.comune ASC
    `).all(...params);

    res.json({
      count: districts.length,
      districts
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/pharmacies?comune=...&type=...&lat=...&lng=...&radius_km=...
router.get('/pharmacies', (req, res, next) => {
  try {
    const db = getDb();

    const comune = typeof req.query.comune === 'string' ? req.query.comune.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';
    const hasLat = req.query.lat !== undefined && req.query.lat !== '';
    const hasLng = req.query.lng !== undefined && req.query.lng !== '';
    const hasRadius = req.query.radius_km !== undefined && req.query.radius_km !== '';

    let userLat = null;
    let userLng = null;
    let radiusKm = null;

    if (hasLat || hasLng) {
      userLat = Number(req.query.lat);
      userLng = Number(req.query.lng);
      if (
        Number.isNaN(userLat) ||
        Number.isNaN(userLng) ||
        userLat < -90 ||
        userLat > 90 ||
        userLng < -180 ||
        userLng > 180
      ) {
        return res.status(400).json({ error: 'Coordinate lat/lng non valide.' });
      }
    }

    if (hasRadius) {
      radiusKm = Number(req.query.radius_km);
      if (Number.isNaN(radiusKm) || radiusKm <= 0) {
        return res.status(400).json({ error: 'Parametro radius_km deve essere un numero positivo.' });
      }
    }

    const conditions = [];
    const params = [];

    if (comune) {
      conditions.push(comuneCondition(db, 'p.comune', comune));
      params.push(comune);
    }

    if (type === 'farmacia' || type === 'parafarmacia') {
      conditions.push('p.type = ?');
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        p.id,
        p.ministry_code,
        p.name,
        p.type,
        p.address,
        p.comune,
        p.provincia,
        p.cap,
        p.lat,
        p.lng,
        p.district_id,
        d.asl_name,
        d.district_name,
        d.district_code
      FROM pharmacies p
      LEFT JOIN districts d ON d.id = COALESCE(
        p.district_id,
        (SELECT MIN(id) FROM districts WHERE fold(comune) = fold(p.comune))
      )
      ${whereClause}
      ORDER BY p.comune ASC, p.name ASC
    `).all(...params);

    let pharmacies = rows.map((row) => {
      let distanceKm = null;
      if (
        userLat !== null &&
        userLng !== null &&
        typeof row.lat === 'number' &&
        typeof row.lng === 'number'
      ) {
        distanceKm = calculateHaversineKm(userLat, userLng, row.lat, row.lng);
      }
      return {
        ...row,
        distance_km: distanceKm
      };
    });

    if (userLat !== null && userLng !== null) {
      if (radiusKm !== null) {
        pharmacies = pharmacies.filter(
          (p) => typeof p.distance_km === 'number' && p.distance_km <= radiusKm
        );
      }
      pharmacies.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    res.json({
      count: pharmacies.length,
      pharmacies
    });
  } catch (err) {
    next(err);
  }
});

function resolveLocalPugliaGeocode(db, query) {
  const cleaned = query
    .toLowerCase()
    .replace(/,\s*(puglia|italia|italy|ba|le|ta|fg|br|bt)\b/gi, '')
    .trim();

  // 1. Ricerca diretta nel dizionario dei Comuni pugliesi
  if (PUGLIA_MUNICIPALITIES_COORDS[cleaned]) {
    return {
      ...PUGLIA_MUNICIPALITIES_COORDS[cleaned],
      source: 'local-puglia'
    };
  }

  for (const [key, coords] of Object.entries(PUGLIA_MUNICIPALITIES_COORDS)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return {
        ...coords,
        source: 'local-puglia'
      };
    }
  }

  // 2. Ricerca per indirizzo, CAP o Comune tra i presidi nel database SQLite
  const likeTerm = `%${cleaned}%`;
  const row = db.prepare(`
    SELECT name, address, comune, provincia, cap, lat, lng
    FROM pharmacies
    WHERE lat IS NOT NULL AND lng IS NOT NULL
      AND (
        LOWER(comune) LIKE LOWER(?)
        OR LOWER(address) LIKE LOWER(?)
        OR LOWER(name) LIKE LOWER(?)
        OR COALESCE(cap, '') LIKE ?
      )
    LIMIT 1
  `).get(likeTerm, likeTerm, likeTerm, likeTerm);

  if (row) {
    return {
      lat: Number(row.lat),
      lng: Number(row.lng),
      display_name: `${row.address}, ${row.comune} (${row.provincia}), Puglia, Italia`,
      source: 'local-db'
    };
  }

  return null;
}

// GET /api/geocode?q=...
router.get('/geocode', async (req, res, next) => {
  try {
    const db = getDb();

    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQuery) {
      return res.status(400).json({ error: "Il parametro di ricerca 'q' è obbligatorio." });
    }

    const userAgent =
      process.env.NOMINATIM_USER_AGENT || 'PharmaPugliaOpenCare/1.0 (progetto-accademico-mmqs)';
    const searchQuery = /puglia|italia/i.test(rawQuery)
      ? rawQuery
      : `${rawQuery}, Puglia, Italia`;

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '1');
    nominatimUrl.searchParams.set('countrycodes', 'it');
    nominatimUrl.searchParams.set('q', searchQuery);

    let nominatimResult = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(nominatimUrl.toString(), {
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': 'it'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload) && payload.length > 0) {
          nominatimResult = {
            lat: Number(payload[0].lat),
            lng: Number(payload[0].lon),
            display_name: payload[0].display_name,
            source: 'nominatim'
          };
        }
      }
    } catch (_networkErr) {
      // In caso di assenza di rete o timeout Nominatim, si passa al fallback locale Puglia
    }

    if (nominatimResult && !Number.isNaN(nominatimResult.lat) && !Number.isNaN(nominatimResult.lng)) {
      return res.json(nominatimResult);
    }

    const fallback = resolveLocalPugliaGeocode(db, rawQuery);
    if (fallback) {
      return res.json(fallback);
    }

    return res.status(404).json({
      error: "Nessuna località pugliese trovata per l'indirizzo o Comune specificato."
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
