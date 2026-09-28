'use strict';

const express    = require('express');
const ctrl       = require('../controllers/whatsappController');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { requireAdminAuth }  = require('../middleware/adminAuth');

const router = express.Router();

// Rate limiting: 10 sends per minute per IP
const waSendLimiter = createRateLimiter({
  windowMs: 60_000,
  max:      10,
  message:  'Too many WhatsApp send requests. Please try again later.',
});

// ── Public routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp/send
 * Send a vault link via WhatsApp. Stores wamid and schedules deletion tracking.
 */
router.post('/api/whatsapp/send', waSendLimiter, ctrl.sendViaWhatsApp);

/**
 * GET /api/whatsapp/status/:id
 * Poll deletion status for a WhatsApp delivery record.
 */
router.get('/api/whatsapp/status/:id', ctrl.getStatus);

/**
 * GET /api/whatsapp/capability
 * Returns honest deletion capability info.
 */
router.get('/api/whatsapp/capability', ctrl.getCapability);

/**
 * POST /api/whatsapp/burn/:id
 * Manual burn: immediately attempt deletion + expire vault.
 */
router.post('/api/whatsapp/burn/:id', ctrl.manualBurn);

/**
 * POST /api/whatsapp/cancel/:id
 * Cancel a scheduled deletion.
 */
router.post('/api/whatsapp/cancel/:id', ctrl.cancelDeletion);

// ── Admin routes (auth required) ─────────────────────────────────────────────

/**
 * GET /api/admin/whatsapp/messages
 * Admin: list all WhatsApp delivery records with masked sensitive fields.
 */
router.get('/api/admin/whatsapp/messages', requireAdminAuth, ctrl.adminListMessages);

/**
 * GET /api/admin/whatsapp/stats
 * Admin: aggregated counts by status.
 */
router.get('/api/admin/whatsapp/stats', requireAdminAuth, ctrl.adminStats);

/**
 * POST /api/admin/whatsapp/retry/:id
 * Admin: retry a failed or scheduled deletion.
 */
router.post('/api/admin/whatsapp/retry/:id', requireAdminAuth, ctrl.adminRetry);

/**
 * POST /api/admin/whatsapp/cancel/:id
 * Admin: cancel a scheduled deletion.
 */
router.post('/api/admin/whatsapp/cancel/:id', requireAdminAuth, ctrl.adminCancel);

module.exports = router;
