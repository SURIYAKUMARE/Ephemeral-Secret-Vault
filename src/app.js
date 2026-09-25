const express = require('express');
const path = require('node:path');
const { botGuard } = require('./middleware/botGuard');
const errorHandler = require('./middleware/errorHandler');
const secretRoutes = require('./routes/secretRoutes');

const fs = require('node:fs');

const app = express();
app.enable('trust proxy');

const publicDir = fs.existsSync(path.join(process.cwd(), 'public'))
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '..', 'public');

// Global security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  );
  next();
});

// Bot defense middleware
app.use(botGuard);

// 15 MB body limit to support encrypted file attachments (images, pdfs, docs, code)
app.use(express.json({ limit: '15mb' }));

// Static assets (CSS, JS)
app.use('/css', express.static(path.join(publicDir, 'css')));
app.use('/js', express.static(path.join(publicDir, 'js')));
// Backward compatibility for root assets
app.use(express.static(publicDir));

// Mount core routes
app.use(secretRoutes);

// Fallback 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res.status(404).sendFile(path.join(publicDir, '404.html'));
  }
  return res.status(404).json({ error: 'Route not found.' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
