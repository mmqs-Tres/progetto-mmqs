const express = require('express');
const router = express.Router();

// TODO (branch: feat/auth-and-reports):
// - POST /api/auth/register
// - POST /api/auth/login
// - GET /api/auth/me

router.use((_req, res) => {
  res.status(501).json({ error: 'Auth endpoints in sviluppo (branch feat/auth-and-reports).' });
});

module.exports = router;
