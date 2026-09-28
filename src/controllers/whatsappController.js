'use strict';

const crypto      = require('node:crypto');
const db          = require('../db');
const waService   = require('../services/whatsappService');
const agent       = require('../services/whatsappDeletionAgent');
const secretService = require('../services/secretService');

/**
 * POST /api/whatsapp/send
 *
 * Creates a vault secret and delivers the link via WhatsApp.
 * Stores the wamid and schedules deletion tracking.
 */
async function sendViaWhatsApp(req, res, next) {
  try {
    if (!waService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp is not configured on this server.',
        code:  'CONFIG_MISSING',
      });
    }

    const {
      recipient,
      delete_after_seconds,
      delete_at_timestamp,
      sender_note,
      // Secret creation fields (passed through to secretService)
      secret,
      file,
      ttl_seconds,
      max_views,
      passphrase,
      client_encrypted,
      ciphertext,
      iv,
      auth_tag,
    } = req.body;

    // ── Validate recipient ────────────────────────────────────────────────
    const phoneCheck = waService.validatePhoneNumber(recipient);
    if (!phoneCheck.valid) {
      return res.status(400).json({
        error: phoneCheck.reason,
        code:  'INVALID_PHONE',
      });
    }

    // ── Validate deletion time ────────────────────────────────────────────
    let deleteAt = null;
    const now = Date.now();

    if (delete_at_timestamp) {
      deleteAt = Number(delete_at_timestamp);
      if (isNaN(deleteAt) || deleteAt <= now) {
        return res.status(400).json({
          error: 'delete_at_timestamp must be a future Unix millisecond timestamp.',
          code:  'INVALID_DELETE_TIME',
        });
      }
    } else if (delete_after_seconds) {
      const secs = Number(delete_after_seconds);
      if (isNaN(secs) || secs < 60 || secs > 7 * 24 * 3600) {
        return res.status(400).json({
          error: 'delete_after_seconds must be between 60 and 604800 (1 min–7 days).',
          code:  'INVALID_DELETE_TIME',
        });
      }
      deleteAt = now + secs * 1000;
    } else {
      // Default: 5 minutes
      deleteAt = now + 5 * 60 * 1000;
    }

    // ── Build base URL ────────────────────────────────────────────────────
    let baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      baseUrl = `${proto}://${host}`;
    }

    // ── Create the secret vault ───────────────────────────────────────────
    const vaultResult = secretService.createSecret({
      secret:           secret || '(File attached — see vault link)',
      file,
      ttlSeconds:       ttl_seconds || Math.ceil((deleteAt - now) / 1000) + 300,
      maxViews:         max_views || 1,
      passphrase,
      customBaseUrl:    baseUrl,
      client_encrypted,
      ciphertext,
      iv,
      auth_tag,
      reqIp: _getClientIp(req),
    });

    const vaultUrl = vaultResult.view_url || `${baseUrl}/view/${vaultResult.id}`;

    // ── Send the WhatsApp message ─────────────────────────────────────────
    const waRecordId = crypto.randomUUID();
    const messageText = waService.buildVaultMessage(vaultUrl, sender_note);

    // Pre-create DB record so we can track even if send fails
    db.createWhatsAppMessage({
      id:         waRecordId,
      secret_id:  vaultResult.id,
      recipient:  phoneCheck.number,
      delete_at:  deleteAt,
      vault_url:  vaultUrl,
      created_at: now,
    });

    let wamid = null;
    let sendError = null;

    try {
      const sendResult = await waService.sendTextMessage({
        to:   phoneCheck.number,
        text: messageText,
      });
      wamid = sendResult.messageId;
      db.setWhatsAppMessageId(waRecordId, wamid);
    } catch (err) {
      sendError = err.message;
      db.setWhatsAppSendFailed(waRecordId, err.message);
    }

    // ── Build response ────────────────────────────────────────────────────
    const deletion = waService.getDeletionCapability();

    if (sendError) {
      return res.status(502).json({
        success:    false,
        error:      `WhatsApp send failed: ${sendError}`,
        code:       'WHATSAPP_SEND_FAILED',
        vault_id:   vaultResult.id,
        vault_url:  vaultUrl,
        wa_record_id: waRecordId,
      });
    }

    return res.status(201).json({
      success:      true,
      vault_id:     vaultResult.id,
      vault_url:    vaultUrl,
      wa_record_id: waRecordId,
      wamid:        wamid ? wamid.slice(0, 20) + '…' : null, // partial — never expose full
      recipient:    `+${phoneCheck.number.slice(0, 2)}${'*'.repeat(phoneCheck.number.length - 4)}${phoneCheck.number.slice(-2)}`,
      sent_at:      new Date(now).toISOString(),
      delete_at:    new Date(deleteAt).toISOString(),
      deletion_scheduled: true,
      deletion_supported: deletion.supported,
      deletion_notice:    deletion.reason,
      fallback_notice:    deletion.fallback,
      expires_at:   vaultResult.expires_at
        ? new Date(vaultResult.expires_at).toISOString()
        : null,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/whatsapp/status/:waRecordId
 *
 * Returns the current deletion status for a WhatsApp delivery record.
 */
function getStatus(req, res, next) {
  try {
    const { id } = req.params;
    const record = db.getWhatsAppMessage(id);

    if (!record) {
      return res.status(404).json({ error: 'WhatsApp record not found.' });
    }

    const deletion = waService.getDeletionCapability();

    return res.status(200).json({
      id:                  record.id,
      secret_id:           record.secret_id,
      deletion_status:     record.deletion_status,
      deletion_supported:  deletion.supported,
      deletion_notice:     deletion.reason,
      fallback_notice:     deletion.fallback,
      sent_at:             record.sent_at    ? new Date(record.sent_at).toISOString()    : null,
      delete_at:           record.delete_at  ? new Date(record.delete_at).toISOString()  : null,
      deleted_at:          record.deleted_at ? new Date(record.deleted_at).toISOString() : null,
      delivery_status:     record.delivery_status,
      deletion_attempts:   record.deletion_attempts,
      last_deletion_attempt: record.last_deletion_attempt
        ? new Date(record.last_deletion_attempt).toISOString()
        : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/whatsapp/capability
 *
 * Returns API deletion capability info — always transparent.
 */
function getCapability(req, res) {
  return res.status(200).json(waService.getDeletionCapability());
}

/**
 * POST /api/whatsapp/burn/:waRecordId
 *
 * Manual burn: immediately run the deletion agent for one record.
 * Also force-expires the associated vault URL.
 */
async function manualBurn(req, res, next) {
  try {
    const { id } = req.params;
    const result = await agent.manualBurnMessage(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error, status: result.status });
    }

    return res.status(200).json({
      success:      true,
      outcome:      result.outcome,
      detail:       result.detail,
      vault_expired: result.vaultExpired,
      deletion_supported: false,
      deletion_notice: waService.DELETE_NOT_SUPPORTED_MESSAGE,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/whatsapp/cancel/:waRecordId
 *
 * Cancels a scheduled deletion (only if not yet in terminal state).
 */
function cancelDeletion(req, res, next) {
  try {
    const { id } = req.params;
    const record = db.getWhatsAppMessage(id);

    if (!record) {
      return res.status(404).json({ error: 'WhatsApp record not found.' });
    }

    db.cancelWhatsAppDeletion(id, 'Cancelled by user');
    return res.status(200).json({ success: true, status: 'cancelled' });
  } catch (err) {
    next(err);
  }
}

// ── Admin routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/whatsapp/messages
 * Admin: paginated list of all WhatsApp message records.
 */
function adminListMessages(req, res, next) {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '50', 10), 200);
    const offset = parseInt(req.query.offset || '0', 10);
    const status = req.query.status || null;

    const records = db.listWhatsAppMessages({ limit, offset, status });
    const counts  = db.countWhatsAppMessagesByStatus();

    const countMap = {};
    for (const row of counts) countMap[row.deletion_status] = row.count;

    // Mask sensitive fields before sending to admin
    const masked = records.map(r => ({
      id:                   r.id,
      secret_id:            r.secret_id,
      wamid_masked:         r.whatsapp_message_id
        ? r.whatsapp_message_id.slice(0, 10) + '…'
        : null,
      recipient_masked:     r.recipient
        ? `+${r.recipient.slice(0, 2)}${'*'.repeat(Math.max(0, r.recipient.length - 4))}${r.recipient.slice(-2)}`
        : null,
      sent_at:              r.sent_at    ? new Date(r.sent_at).toISOString()    : null,
      delete_at:            r.delete_at  ? new Date(r.delete_at).toISOString()  : null,
      deleted_at:           r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
      deletion_status:      r.deletion_status,
      deletion_attempts:    r.deletion_attempts,
      last_deletion_attempt: r.last_deletion_attempt
        ? new Date(r.last_deletion_attempt).toISOString()
        : null,
      deletion_error:       r.deletion_error,
      delivery_status:      r.delivery_status,
      created_at:           new Date(r.created_at).toISOString(),
      cancelled_at:         r.cancelled_at ? new Date(r.cancelled_at).toISOString() : null,
    }));

    return res.status(200).json({
      records: masked,
      counts:  countMap,
      pagination: { limit, offset },
      deletion_capability: waService.getDeletionCapability(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/whatsapp/retry/:id
 * Admin: retry a failed or scheduled deletion.
 */
async function adminRetry(req, res, next) {
  try {
    const { id } = req.params;
    const result = await agent.manualBurnMessage(id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/whatsapp/cancel/:id
 * Admin: cancel a scheduled deletion.
 */
function adminCancel(req, res, next) {
  try {
    const { id } = req.params;
    db.cancelWhatsAppDeletion(id, 'Cancelled by admin');
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/whatsapp/stats
 * Admin: aggregated stats.
 */
function adminStats(req, res, next) {
  try {
    const counts = db.countWhatsAppMessagesByStatus();
    const countMap = { total: 0 };
    for (const row of counts) {
      countMap[row.deletion_status] = row.count;
      countMap.total += row.count;
    }
    return res.status(200).json({
      counts: countMap,
      deletion_capability: waService.getDeletionCapability(),
    });
  } catch (err) {
    next(err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _getClientIp(req) {
  return req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : (req.ip || '127.0.0.1');
}

module.exports = {
  sendViaWhatsApp,
  getStatus,
  getCapability,
  manualBurn,
  cancelDeletion,
  adminListMessages,
  adminRetry,
  adminCancel,
  adminStats,
};
