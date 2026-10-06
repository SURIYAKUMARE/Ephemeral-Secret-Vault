'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Rate limiter: 10 login attempts per 15 minutes per IP
const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

// ─── Public Admin Auth Routes ────────────────────────────────────────────────
router.get(['/login', '/admin/login'], adminController.getAdminLoginView);
router.post(['/api/login', '/api/admin/login'], adminLoginLimiter, adminController.login);
router.post(['/api/logout', '/api/admin/logout'], adminController.logout);
router.get('/logout', (req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  return res.redirect('/admin/login');
});

// ─── Protected Admin Dashboard View ─────────────────────────────────────────
router.get('/admin', requireAdminAuth, adminController.getAdminDashboardView);

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
router.get('/api/admin/stats', requireAdminAuth, adminController.getStats);
router.get('/api/admin/dashboard', requireAdminAuth, adminController.getDashboardStats);

// ─── Files Management ────────────────────────────────────────────────────────
router.get('/api/admin/files', requireAdminAuth, adminController.listFiles);
router.get('/api/admin/files/:id', requireAdminAuth, adminController.getFileDetails);
router.post('/api/admin/files/:id/toggle', requireAdminAuth, adminController.toggleFileStatus);
router.post('/api/admin/files/:id/revoke', requireAdminAuth, adminController.revokeFile);
router.post('/api/admin/files/:id/extend', requireAdminAuth, adminController.extendFileExpiry);
router.post('/api/admin/files/:id/controls', requireAdminAuth, adminController.updateFileControls);
router.post('/api/admin/files/:id/new-link', requireAdminAuth, adminController.generateNewLink);
router.delete('/api/admin/files/:id', requireAdminAuth, adminController.deleteFile);

// ─── Legacy Secrets Endpoints (backward compat) ───────────────────────────────
router.get('/api/admin/secrets', requireAdminAuth, adminController.getAllSecrets);
router.get('/api/admin/secrets/:id', requireAdminAuth, adminController.getSecretDetail);
router.post('/api/admin/secrets/:id/burn', requireAdminAuth, adminController.burnSecretEarly);

// ─── Access Events ────────────────────────────────────────────────────────────
router.get('/api/admin/events', requireAdminAuth, adminController.listAccessEvents);
router.get('/api/admin/events/:id', requireAdminAuth, adminController.getAccessEventDetail);

// ─── Verifications ────────────────────────────────────────────────────────────
router.get('/api/admin/verifications', requireAdminAuth, adminController.listVerifications);
router.post('/api/admin/verifications', adminController.submitVerification); // Called by viewer/visitor

// ─── Locations ────────────────────────────────────────────────────────────────
router.get('/api/admin/locations', requireAdminAuth, adminController.listLocations);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/api/admin/audit', requireAdminAuth, adminController.listAuditLogs);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/api/admin/settings', requireAdminAuth, adminController.getSettings);
router.post('/api/admin/settings', requireAdminAuth, adminController.updateSettings);

// ─── Real-time Server-Sent Events Feed ───────────────────────────────────────
router.get('/api/admin/events-stream', requireAdminAuth, adminController.streamEvents);

// ─── Vaults API (unified view: secrets + file_metadata + access_log) ─────────
router.get('/api/admin/vaults', requireAdminAuth, adminController.listVaults);
router.get('/api/admin/vaults/:id', requireAdminAuth, adminController.getVaultDetail);
router.delete('/api/admin/vaults/:id', requireAdminAuth, adminController.burnVault);

module.exports = router;
