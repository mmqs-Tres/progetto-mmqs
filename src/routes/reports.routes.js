const express = require('express');
const router = express.Router();

// TODO (branch: feat/auth-and-reports):
// - GET /api/reports
// - POST /api/reports
// - PUT /api/reports/:id
// - DELETE /api/reports/:id

router.use((_req, res) => {
  res.status(501).json({ error: 'Reports CRUD endpoints in sviluppo (branch feat/auth-and-reports).' });
});

module.exports = router;
