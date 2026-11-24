const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const reportsRoutes = require('./routes/reports.routes');
const searchRoutes = require('./routes/search.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

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

// Global error handler
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Errore interno del server.'
  });
});

module.exports = app;
