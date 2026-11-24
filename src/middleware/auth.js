const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const MIN_SECRET_LENGTH = 32;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET mancante o troppo corto (minimo ${MIN_SECRET_LENGTH} caratteri). ` +
      'Copia .env.example in .env e imposta un valore generato con: ' +
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return secret;
}

// Controllo all'avvio: dentro le richieste un errore di configurazione sembrerebbe un 401.
getJwtSecret();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

// Il ruolo si legge dal DB e non dal token. L'email evita che, dopo una ricreazione
// del DB, un vecchio token valga per un altro utente con lo stesso id.
function findUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  if (!Number.isInteger(payload.id) || typeof payload.email !== 'string') {
    return null;
  }
  return getDb()
    .prepare('SELECT id, name, email, role FROM users WHERE id = ? AND email = ?')
    .get(payload.id, payload.email) || null;
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  req.user = token ? findUser(token) : null;
  return next();
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autenticazione richiesta.' });
  }
  req.user = findUser(token);
  if (!req.user) {
    return res.status(401).json({ error: 'Token non valido o scaduto.' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
    }
    return next();
  });
}

module.exports = {
  getJwtSecret,
  signToken,
  optionalAuth,
  requireAuth,
  requireAdmin
};
