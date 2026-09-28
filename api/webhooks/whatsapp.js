'use strict';

/**
 * WhatsApp Business Cloud API — Webhook Handler
 *
 * Handles two request types:
 *
 *  GET  /api/webhooks/whatsapp
 *       Webhook verification challenge (Meta calls this during setup).
 *       Validates hub.verify_token and returns hub.challenge.
 *
 *  POST /api/webhooks/whatsapp
 *       Incoming event notifications (message status updates).
 *       Verifies X-Hub-Signature-256 HMAC before processing.
 *       Updates delivery_status in whatsapp_messages table.
 *
 * Events handled:
 *   sent      → delivery_status = 'sent'
 *   delivered → delivery_status = 'delivered'
 *   read      → delivery_status = 'read'
 *   failed    → delivery_status = 'failed' (records error details)
 *
 * Security:
 *   - All POST requests MUST have a valid X-Hub-Signature-256 header.
 *   - Unsigned requests are rejected with 401 before any processing.
 *   - WHATSAPP_WEBHOOK_SECRET must match what is configured in Meta App Dashboard.
 */

require('dotenv').config();
require('../../src/db').initDb();

const db        = require('../../src/db');
const waService = require('../../src/services/whatsappService');

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
module.exports = async function whatsappWebhook(req, res) {

  // ── GET: Webhook Verification Challenge ────────────────────────────────
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!expectedToken) {
      console.error('[WAWebhook] WHATSAPP_VERIFY_TOKEN is not configured.');
      return res.status(500).send('Webhook not configured.');
    }

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WAWebhook] Verification challenge accepted.');
      return res.status(200).send(challenge);
    }

    console.warn('[WAWebhook] Verification failed — token mismatch.');
    return res.status(403).send('Forbidden');
  }

  // ── POST: Incoming Event Notification ─────────────────────────────────
  if (req.method === 'POST') {
    // Collect raw body for signature verification
    const rawBody = await _getRawBody(req);

    // Verify signature — reject all unsigned requests
    const signature = req.headers['x-hub-signature-256'] || '';
    if (!waService.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[WAWebhook] Rejected — invalid or missing X-Hub-Signature-256.');
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }

    // Process asynchronously — always return 200 quickly to Meta
    // (Meta will retry if we return non-200)
    _processWebhookPayload(payload).catch(err => {
      console.error('[WAWebhook] Processing error:', err.message);
    });

    return res.status(200).json({ status: 'ok' });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};

/**
 * Processes a verified webhook payload from Meta.
 * Updates delivery_status in whatsapp_messages table.
 * @private
 */
async function _processWebhookPayload(payload) {
  // Standard WhatsApp Cloud API webhook envelope:
  // { object: 'whatsapp_business_account', entry: [...] }
  if (payload.object !== 'whatsapp_business_account') return;

  const entries = payload.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const value    = change.value || {};
      const statuses = value.statuses || [];
      const messages = value.messages || [];

      // Handle message status updates (sent, delivered, read, failed)
      for (const status of statuses) {
        const wamid          = status.id;         // e.g. wamid.xxxxx
        const statusType     = status.status;     // sent | delivered | read | failed
        const timestamp      = status.timestamp;

        if (!wamid || !statusType) continue;

        try {
          db.updateWhatsAppDeliveryStatus(wamid, statusType);

          console.log('[WAWebhook] Status update: wamid=%s status=%s ts=%s',
            wamid.slice(0, 15) + '…', statusType, timestamp);

          // If message failed, record the error detail
          if (statusType === 'failed') {
            const errInfo = status.errors?.[0];
            if (errInfo) {
              // Update delivery_status with error context
              db.updateWhatsAppDeliveryStatus(
                wamid,
                `failed:${errInfo.code || 'unknown'}`
              );
            }
          }
        } catch (dbErr) {
          console.error('[WAWebhook] DB update error for wamid %s: %s',
            wamid.slice(0, 15) + '…', dbErr.message);
        }
      }

      // Log incoming messages (we don't need to process them for deletion)
      for (const msg of messages) {
        // Only log — never store message content
        console.log('[WAWebhook] Incoming message from %s type=%s',
          '***masked***', msg.type || 'unknown');
      }
    }
  }
}

/**
 * Reads the raw request body as a string.
 * Vercel passes the body pre-parsed in some modes; we handle both cases.
 * @private
 */
function _getRawBody(req) {
  return new Promise((resolve, reject) => {
    // If Vercel has already parsed body and attached rawBody
    if (req.rawBody) return resolve(req.rawBody);

    // If body is already a string (Vercel sometimes does this)
    if (typeof req.body === 'string') return resolve(req.body);

    // If body is already a parsed object, re-stringify it
    if (req.body && typeof req.body === 'object') {
      return resolve(JSON.stringify(req.body));
    }

    // Stream reading fallback
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end',  () => resolve(data));
    req.on('error', reject);
  });
}
