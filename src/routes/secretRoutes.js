const express = require('express');
const path = require('node:path');
const secretController = require('../controllers/secretController');
const {
  validateCreateSecret,
  validateSecretId,
  validateThresholdSecret,
  validateRedeemShare
} = require('../middleware/validation');

const router = express.Router();
const publicDir = path.join(process.cwd(), 'public');

// Health check
router.get('/health', secretController.health);

// Landing / Text Secret page
router.get(['/', '/text'], (req, res) => {
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

// Safe view splash page
router.get('/view/:id', validateSecretId, secretController.getSecretView);

// Threshold view page (safe landing)
router.get('/view/threshold/:id', validateSecretId, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const viewFile = path.join(publicDir, 'view.html');
  res.sendFile(viewFile);
});

// Create secret API
router.post('/api/secret', validateCreateSecret, secretController.createSecret);

// Atomic burn API
router.post('/api/secret/:id/burn', validateSecretId, secretController.burnSecret);

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

