const express = require('express');
const path = require('node:path');
const secretController = require('../controllers/secretController');
const { validateCreateSecret, validateSecretId } = require('../middleware/validation');

const router = express.Router();
const publicDir = path.join(process.cwd(), 'public');

// Health check
router.get('/health', secretController.health);

// Landing / Home page
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const indexFile = path.join(publicDir, 'index.html');
  res.sendFile(indexFile);
});

// Safe view splash page
router.get('/view/:id', validateSecretId, secretController.getSecretView);

// Create secret API
router.post('/api/secret', validateCreateSecret, secretController.createSecret);

// Atomic burn API
router.post('/api/secret/:id/burn', validateSecretId, secretController.burnSecret);

module.exports = router;
