const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const { getDb } = require('../database/db');
const { generateId } = require('../utils/idGenerator');
const { encrypt, decrypt } = require('../crypto/encryption');
const { baseUrl } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Creates a Dead Man's Switch secret vault.
 */
function createDeadmanSwitch({ secret, checkin_interval_seconds, beneficiary = null, customBaseUrl = null }) {
  const db = getDb();
  const id = generateId();
  const now = Date.now();
  const interval = parseInt(checkin_interval_seconds, 10);
  const checkinToken = crypto.randomBytes(16).toString('hex');

  // Long TTL for the underlying vault secret (e.g. 1 year or 10x the interval)
  const ttlSeconds = Math.max(interval * 10, 31536000);
  const expiresAt = now + ttlSeconds * 1000;

  // AES-256-GCM encryption
  const { ciphertext, iv, authTag } = encrypt(secret, id);

  // Insert into secrets table
  const secretStmt = db.prepare(`
    INSERT INTO secrets (
      id, ciphertext, iv, auth_tag, max_views, views_remaining, expires_at, created_at, passphrase_hash, passphrase_salt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
  `);
  secretStmt.run(id, ciphertext, iv, authTag, 10, 10, expiresAt, now);

  // Insert into deadman_switches table
  const switchStmt = db.prepare(`
    INSERT INTO deadman_switches (
      id, checkin_token, checkin_interval_seconds, last_checkin, beneficiary, triggered, revealed_payload, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)
  `);
  switchStmt.run(id, checkinToken, interval, now, beneficiary || null, now);

  const activeBaseUrl = (customBaseUrl || baseUrl).replace(/\/+$/, '');

  logger.info('Dead man switch created', { id, interval, beneficiary });

  return {
    id,
    checkin_token: checkinToken,
    checkin_url: `${activeBaseUrl}/api/deadman/${id}/checkin?token=${checkinToken}`,
    checkin_interval_seconds: interval,
    last_checkin: new Date(now).toISOString(),
    next_checkin_due: new Date(now + interval * 1000).toISOString(),
    beneficiary: beneficiary || null
  };
}

/**
 * Performs a check-in to reset the dead man's switch timer.
 */
function performCheckin(id, token) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, checkin_token, checkin_interval_seconds, last_checkin, triggered
    FROM deadman_switches
    WHERE id = ?
  `);
  const record = stmt.get(id);
  if (!record) {
    return null;
  }

  if (record.triggered === 1) {
    return { error: 'Switch has already been triggered and dispatched.', triggered: true };
  }

  if (record.checkin_token !== token) {
    return { invalidToken: true };
  }

  const now = Date.now();
  const updateStmt = db.prepare(`
    UPDATE deadman_switches
    SET last_checkin = ?
    WHERE id = ? AND checkin_token = ?
  `);
  updateStmt.run(now, id, token);

  const nextDue = now + record.checkin_interval_seconds * 1000;

  logger.info('Dead man check-in acknowledged', { id });

  return {
    status: 'ok',
    message: 'Check-in recorded successfully. Timer reset.',
    last_checkin: new Date(now).toISOString(),
    next_checkin_due: new Date(nextDue).toISOString()
  };
}

/**
 * Retrieves public status of a dead man's switch.
 */
function getDeadmanStatus(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, checkin_interval_seconds, last_checkin, beneficiary, triggered, revealed_payload, created_at
    FROM deadman_switches
    WHERE id = ?
  `);
  const rec = stmt.get(id);
  if (!rec) return null;

  const now = Date.now();
  const nextDueMs = rec.last_checkin + rec.checkin_interval_seconds * 1000;
  const isOverdue = now > nextDueMs && rec.triggered === 0;

  return {
    id: rec.id,
    checkin_interval_seconds: rec.checkin_interval_seconds,
    last_checkin: new Date(rec.last_checkin).toISOString(),
    next_checkin_due: new Date(nextDueMs).toISOString(),
    is_overdue: isOverdue,
    triggered: Boolean(rec.triggered),
    revealed_payload: rec.revealed_payload || null,
    beneficiary: rec.beneficiary || null
  };
}

/**
 * Dispatches an automated payload delivery to the beneficiary webhook.
 */
function dispatchBeneficiaryWebhook(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return;
  if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) return;

  try {
    const parsedUrl = new URL(webhookUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const body = JSON.stringify(payload);

    const req = client.request(parsedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'EphemeralVault-DeadmanDispatch/1.0'
      },
      timeout: 5000
    });

    req.on('error', (err) => {
      logger.error('Failed to dispatch deadman payload to beneficiary', { error: err.message, webhookUrl });
    });

    req.write(body);
    req.end();
  } catch (err) {
    logger.error('Error constructing beneficiary webhook request', { error: err.message });
  }
}

/**
 * Checks all active dead man's switches and triggers any that are overdue.
 */
function checkAndTriggerOverdueSwitches(now = Date.now()) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, checkin_token, checkin_interval_seconds, last_checkin, beneficiary, triggered
    FROM deadman_switches
    WHERE triggered = 0
  `);

  const activeSwitches = stmt.all ? stmt.all() : [];
  let triggeredCount = 0;

  for (const sw of activeSwitches) {
    const deadline = sw.last_checkin + sw.checkin_interval_seconds * 1000;
    if (now >= deadline) {
      // Overdue! Decrypt and trigger
      const secretStmt = db.prepare(`
        SELECT ciphertext, iv, auth_tag
        FROM secrets
        WHERE id = ?
      `);
      const secretRow = secretStmt.get(sw.id);
      let plaintext = null;

      if (secretRow) {
        try {
          plaintext = decrypt(secretRow.ciphertext, secretRow.iv, secretRow.auth_tag, sw.id);
        } catch (err) {
          logger.error('Failed to decrypt overdue deadman switch secret', { id: sw.id, error: err.message });
        }
      }

      // Mark triggered and store revealed payload
      const triggerStmt = db.prepare(`
        UPDATE deadman_switches
        SET triggered = 1, revealed_payload = ?
        WHERE id = ?
      `);
      triggerStmt.run(plaintext || '[Payload unrecoverable]', sw.id);

      logger.warn('DEAD MAN SWITCH TRIGGERED: Overdue check-in detected', {
        id: sw.id,
        beneficiary: sw.beneficiary,
        overdueByMs: now - deadline
      });

      // Dispatch to beneficiary if webhook
      if (sw.beneficiary && (sw.beneficiary.startsWith('http://') || sw.beneficiary.startsWith('https://'))) {
        dispatchBeneficiaryWebhook(sw.beneficiary, {
          event: 'DEADMAN_SWITCH_TRIGGERED',
          id: sw.id,
          secret: plaintext,
          triggered_at: new Date(now).toISOString(),
          note: 'The creator has failed to check in within the configured interval. This secret is released to you.'
        });
      }

      triggeredCount++;
    }
  }

  return triggeredCount;
}

module.exports = {
  createDeadmanSwitch,
  performCheckin,
  getDeadmanStatus,
  checkAndTriggerOverdueSwitches
};
