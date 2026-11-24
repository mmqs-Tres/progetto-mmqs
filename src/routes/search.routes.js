const express = require('express');
const router = express.Router();

// TODO (branch: feat/search-map-ui):
// - GET /api/medicines?q=...
// - GET /api/pharmacies?comune=...&lat=...&lng=...&radius_km=...
// - GET /api/districts?comune=...
// - GET /api/geocode?q=...

router.get('/medicines', (_req, res) => {
  res.status(501).json({ error: 'Ricerca farmaci in sviluppo (branch feat/search-map-ui).' });
});

router.get('/pharmacies', (_req, res) => {
  res.status(501).json({ error: 'Ricerca farmacie in sviluppo (branch feat/search-map-ui).' });
});

router.get('/districts', (_req, res) => {
  res.status(501).json({ error: 'Ricerca distretti ASL in sviluppo (branch feat/search-map-ui).' });
});

router.get('/geocode', (_req, res) => {
  res.status(501).json({ error: 'Geocoding Nominatim in sviluppo (branch feat/search-map-ui).' });
});

module.exports = router;
