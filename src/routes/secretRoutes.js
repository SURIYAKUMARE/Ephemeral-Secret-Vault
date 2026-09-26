const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
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

// Landing SaaS page
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Dedicated Create Secret page
router.get(['/create', '/create.html', '/text'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'create.html'));
});

// Dedicated Universal File Vault page
router.get('/file', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'file.html'));
});

// Dedicated Share Center
router.get('/share/:id', validateSecretId, secretController.getShareView);

// Safe view splash page (supports /view/:id, /v/:id, and /vault/:id)
router.get(['/view/:id', '/v/:id', '/vault/:id'], validateSecretId, secretController.getSecretView);

// Expired Secret page
router.get('/expired', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'expired.html'));
});

// Destroyed Secret page
router.get('/destroyed', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'destroyed.html'));
});

// Dedicated Browser Extension landing page
router.get('/extension', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'extension.html'));
});

// Dedicated Extension Download & Instructions page
router.get('/download', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'download.html'));
});

// Direct Extension ZIP download
router.get(['/api/extension/download', '/download/extension.zip'], (req, res) => {
  const zipPath = path.join(publicDir, 'downloads', 'ephemeral-vault-extension.zip');
  if (fs.existsSync(zipPath)) {
    return res.download(zipPath, 'ephemeral-secret-vault-extension.zip');
  }
  return res.status(404).json({ error: 'Extension archive not found' });
});

// Dedicated Security Architecture page
router.get('/security', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'security.html'));
});

// Dedicated How It Works page
router.get('/how-it-works', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'how-it-works.html'));
});

// Dedicated Creator Dashboard page
router.get('/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

// Development Security Test Center page
router.get('/test-center', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'test-center.html'));
});

// Development Benchmark page
router.get('/benchmark', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.sendFile(path.join(publicDir, 'benchmark.html'));
});

// Public Safe Metadata API
router.get(['/api/vault/:id/metadata', '/api/secret/:id/metadata'], validateSecretId, secretController.getVaultMetadata);

// Threshold view page (safe landing)
router.get('/view/threshold/:id', validateSecretId, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const viewFile = path.join(publicDir, 'view.html');
  res.sendFile(viewFile);
});

// Create secret API
router.post('/api/secret', apiCreateLimiter, validateCreateSecret, secretController.createSecret);

// Emergency vault destruction API
router.post(['/api/vault/:id/destroy', '/api/secret/:id/destroy'], validateSecretId, secretController.emergencyDestroySecret);

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

