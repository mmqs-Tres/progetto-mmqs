const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-only-fallback-secret';
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, getJwtSecret());
  } catch {
    req.user = null;
  }
  return next();
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autenticazione richiesta.' });
  }
  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ error: 'Token non valido o scaduto.' });
  }
}

function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
    }
    return next();
  });
}

module.exports = {
  getJwtSecret,
  optionalAuth,
  requireAuth,
  requireAdmin
};
