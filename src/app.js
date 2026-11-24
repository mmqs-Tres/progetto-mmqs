const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const reportsRoutes = require('./routes/reports.routes');
const searchRoutes = require('./routes/search.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Origini esterne usate dal frontend: Leaflet (unpkg), Google Fonts e tile OpenStreetMap.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' https://unpkg.com https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://*.tile.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PharmaPuglia OpenCare',
    timestamp: new Date().toISOString()
  });
});

// Feature routers
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', searchRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API non trovato.' });
});

// Messaggi leggibili per gli errori delle librerie: il dettaglio resta nei log del server.
function describeError(err) {
  if (err.type === 'entity.parse.failed') {
    return [400, 'Il corpo della richiesta non è un JSON valido.'];
  }
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    return [413, 'I dati inviati superano la dimensione massima consentita.'];
  }
  if (err.name === 'MulterError') {
    return [400, 'Caricamento non valido: invia un solo file nel campo "file".'];
  }
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  return [status, status === 500 ? 'Errore interno del server.' : 'Richiesta non valida.'];
}

// Global error handler
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const [status, message] = describeError(err);
  if (status === 500) console.error(err);
  return res.status(status).json({ error: message });
});

module.exports = app;
