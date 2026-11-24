const express = require('express');
const router = express.Router();

// TODO (branch: feat/data-ingestion-admin):
// - POST /api/admin/upload/:dataset (pharmacies | medicines | districts)
// - GET /api/admin/reports?status=...
// - PATCH /api/admin/reports/:id/status

router.use((_req, res) => {
  res.status(501).json({ error: 'Admin endpoints in sviluppo (branch feat/data-ingestion-admin).' });
});

module.exports = router;
