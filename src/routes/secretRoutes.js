const express = require('express');
const path = require('node:path');
const secretController = require('../controllers/secretController');
const {
  validateCreateSecret,
  validateSecretId,
  validateThresholdSecret,
  validateRedeemShare
} = require('../middleware/validation');
const { createRateLimiter } = require('../middleware/rateLimiter');

const apiCreateLimiter = createRateLimiter({
  windowMs: 60000,
  max: parseInt(process.env.RATE_LIMIT_CREATE_MAX, 10) || 30,
  message: 'Too many secret creation requests from this IP, please try again later.'
});

const apiBurnLimiter = createRateLimiter({
  windowMs: 60000,
  max: parseInt(process.env.RATE_LIMIT_BURN_MAX, 10) || 60,
  message: 'Too many secret reveal attempts from this IP, please try again later.'
});

const router = express.Router();
const publicDir = path.join(process.cwd(), 'public');

// Health check
router.get('/health', secretController.health);

// Landing / Text Secret page
router.get(['/', '/text', '/create', '/create.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const indexFile = path.join(publicDir, 'index.html');
  res.sendFile(indexFile);
});

// Dedicated Universal File Vault page
router.get('/file', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const filePage = path.join(publicDir, 'file.html');
  res.sendFile(filePage);
});

// Safe view splash page (supports /view/:id, /v/:id, and /vault/:id)
router.get(['/view/:id', '/v/:id', '/vault/:id'], validateSecretId, secretController.getSecretView);

// Threshold view page (safe landing)
router.get('/view/threshold/:id', validateSecretId, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const viewFile = path.join(publicDir, 'view.html');
  res.sendFile(viewFile);
});

// Create secret API
router.post('/api/secret', apiCreateLimiter, validateCreateSecret, secretController.createSecret);

// Reveal Authorization Token Flow (Two-Step Backend Enforced)
router.post(['/api/vault/:id/reveal/request', '/api/secret/:id/reveal/request'], apiBurnLimiter, validateSecretId, secretController.requestRevealToken);
router.post(['/api/vault/:id/reveal', '/api/secret/:id/reveal'], apiBurnLimiter, validateSecretId, secretController.revealSecret);

// Direct API access protection (Test B)
router.get(['/api/vault/:id/secret', '/api/secret/:id/secret'], validateSecretId, secretController.denyDirectSecretAccess);

// Atomic burn API (Backward-compatible direct burn)
router.post('/api/secret/:id/burn', apiBurnLimiter, validateSecretId, secretController.burnSecret);

// Shamir Threshold Secret Sharing APIs (Feature 1)
router.post('/api/secret/threshold', validateThresholdSecret, secretController.createThresholdSecret);
router.post('/api/secret/:id/redeem-share', validateSecretId, validateRedeemShare, secretController.redeemThresholdShare);
router.get('/api/secret/:id/threshold-status', validateSecretId, secretController.getThresholdStatus);

// Dead Man's Switch APIs (Feature 3)
router.post('/api/secret/deadman', require('../middleware/validation').validateDeadmanSwitch, secretController.createDeadmanSwitch);
router.get('/api/deadman/:id/checkin', validateSecretId, secretController.deadmanCheckin);
router.post('/api/deadman/:id/checkin', validateSecretId, secretController.deadmanCheckin);
router.get('/api/deadman/:id/status', validateSecretId, secretController.getDeadmanStatus);

// Signed Burn Receipt Verification (Feature 4)
router.get('/api/receipt/:id/verify', validateSecretId, secretController.verifyBurnReceipt);

// Canary Decoy Trap (Feature 6)
router.post('/api/canary', require('../middleware/validation').validateCanary, secretController.createCanaryTrap);

module.exports = router;

