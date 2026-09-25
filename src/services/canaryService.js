const http = require('node:http');
const https = require('node:https');
const { getDb } = require('../database/db');
const { generateId } = require('../utils/idGenerator');
const { baseUrl } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Creates a decoy canary secret trap to detect ID enumeration / guessing attacks.
 */
function createCanaryTrap({ webhook_url = null, fake_secret = null, memo = 'Decoy Honeytoken', customBaseUrl = null }) {
  const db = getDb();
  const id = generateId();
  const now = Date.now();

  const defaultFakeSecret = 'AKIA' + Math.random().toString(36).substring(2, 10).toUpperCase() + 'PROD' +
    ':wJalrXUtnFEMI/K7MDENG/bPxRfiCY' + Math.random().toString(36).substring(2, 12) + 'KEY';

  const secretPayload = (fake_secret && typeof fake_secret === 'string' && fake_secret.trim().length > 0)
    ? fake_secret.trim()
    : defaultFakeSecret;

  const stmt = db.prepare(`
    INSERT INTO canary_traps (id, fake_secret, webhook_url, memo, created_at, triggered_count, last_triggered_at)
    VALUES (?, ?, ?, ?, ?, 0, NULL)
  `);

  stmt.run(id, secretPayload, webhook_url || null, memo || 'Decoy Honeytoken', now);

  const activeBaseUrl = (customBaseUrl || baseUrl).replace(/\/+$/, '');

  logger.warn('Canary trap primed', { id, memo });

  return {
    canary_id: id,
    decoy_url: `${activeBaseUrl}/view/${id}`,
    memo,
    created_at: new Date(now).toISOString()
  };
}

/**
 * Looks up a canary trap by ID.
 */
function getCanary(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, fake_secret, webhook_url, memo, created_at, triggered_count, last_triggered_at
    FROM canary_traps
    WHERE id = ?
  `);
  return stmt.get(id);
}

/**
 * Dispatches an asynchronous alert webhook when a canary is triggered.
 */
function dispatchWebhookAlert(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return;

  try {
    const parsedUrl = new URL(webhookUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const body = JSON.stringify(payload);

    const req = client.request(parsedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'EphemeralVault-CanaryAlert/1.0'
      },
      timeout: 5000
    });

    req.on('error', (err) => {
      logger.error('Failed to dispatch canary webhook alert', { error: err.message, webhookUrl });
    });

    req.write(body);
    req.end();
  } catch (err) {
    logger.error('Error formulating canary webhook alert', { error: err.message });
  }
}

/**
 * Triggers a canary trap, records telemetry, fires background webhook, and returns fake secret.
 */
function triggerCanary(id, req) {
  const db = getDb();
  const canary = getCanary(id);
  if (!canary) return null;

  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE canary_traps
    SET triggered_count = triggered_count + 1, last_triggered_at = ?
    WHERE id = ?
  `);
  stmt.run(now, id);

  const clientIp = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1');

  logger.warn('SECURITY ALERT: Canary trap tripped!', {
    id,
    memo: canary.memo,
    clientIp,
    userAgent: req.headers['user-agent']
  });

  if (canary.webhook_url) {
    dispatchWebhookAlert(canary.webhook_url, {
      event: 'CANARY_TRIP_DETECTED',
      canary_id: id,
      memo: canary.memo,
      detected_at: new Date(now).toISOString(),
      requester_ip: clientIp,
      user_agent: req.headers['user-agent'] || 'unknown',
      triggered_count: (canary.triggered_count || 0) + 1
    });
  }

  return {
    secret: canary.fake_secret,
    views_remaining: 0,
    burned: true,
    is_canary: true
  };
}

module.exports = {
  createCanaryTrap,
  getCanary,
  triggerCanary
};
