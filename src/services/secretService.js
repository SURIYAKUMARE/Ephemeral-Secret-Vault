const { getDb, walCheckpoint } = require('../database/db');
const { encrypt, decrypt, getFingerprint, hashPassphrase, verifyPassphrase } = require('../crypto/encryption');
const { generateId } = require('../utils/idGenerator');
const { baseUrl } = require('../config/env');
const logger = require('../utils/logger');
const policyService = require('./policyService');
const receiptService = require('./receiptService');
const auditService = require('./auditService');
const canaryService = require('./canaryService');
const deadmanService = require('./deadmanService');

function parseCryptoBuffer(val) {
  if (Buffer.isBuffer(val)) return val;
  if (typeof val === 'string') {
    if (/^[0-9a-fA-F]+$/.test(val) && val.length % 2 === 0) {
      return Buffer.from(val, 'hex');
    }
    return Buffer.from(val, 'base64');
  }
  return Buffer.alloc(0);
}

/**
 * Creates and stores an encrypted secret.
 */
function createSecret({
  secret,
  file = null,
  ttlSeconds = 3600,
  maxViews = 1,
  passphrase = null,
  customBaseUrl = null,
  client_encrypted = false,
  ciphertext = null,
  iv = null,
  auth_tag = null,
  allowed_ips = null,
  allowed_countries = null,
  checkin_interval_seconds = null,
  beneficiary = null,
  reqIp = '127.0.0.1',
  duress_passphrase = null,
  cover_secret = null,
  max_failed_attempts = 3
}) {
  const db = getDb();
  const id = generateId();
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  let cipherBuf;
  let ivBuf;
  let tagBuf;
  let fingerprint;

  if (client_encrypted) {
    cipherBuf = parseCryptoBuffer(ciphertext);
    ivBuf = parseCryptoBuffer(iv);
    tagBuf = parseCryptoBuffer(auth_tag);
    fingerprint = require('node:crypto').createHash('sha256').update(cipherBuf).digest('hex').substring(0, 16);
  } else {
    let contentToEncrypt;
    if (file && typeof file === 'object' && file.data) {
      contentToEncrypt = JSON.stringify({
        __vault_payload: true,
        text: typeof secret === 'string' ? secret : '',
        file: {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: file.data
        }
      });
    } else {
      contentToEncrypt = secret;
    }

    // AES-256-GCM encryption with record ID bound as AAD
    const enc = encrypt(contentToEncrypt, id);
    cipherBuf = enc.ciphertext;
    ivBuf = enc.iv;
    tagBuf = enc.authTag;
    fingerprint = getFingerprint(contentToEncrypt);
  }

  let passphraseHash = null;
  let passphraseSalt = null;
  if (passphrase && typeof passphrase === 'string' && passphrase.trim().length > 0) {
    const hashed = hashPassphrase(passphrase.trim());
    passphraseHash = hashed.hash;
    passphraseSalt = hashed.salt;
  }

  let duressHash = null;
  let duressSalt = null;
  if (duress_passphrase && typeof duress_passphrase === 'string' && duress_passphrase.trim().length > 0) {
    const hashedDuress = hashPassphrase(duress_passphrase.trim());
    duressHash = hashedDuress.hash;
    duressSalt = hashedDuress.salt;
  }

  const stmt = db.prepare(`
    INSERT INTO secrets (
      id, ciphertext, iv, auth_tag, max_views, views_remaining, expires_at, created_at,
      passphrase_hash, passphrase_salt, failed_attempts, max_failed_attempts,
      duress_hash, duress_salt, cover_secret
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    cipherBuf,
    ivBuf,
    tagBuf,
    maxViews,
    maxViews,
    expiresAt,
    now,
    passphraseHash,
    passphraseSalt,
    0,
    max_failed_attempts || 3,
    duressHash,
    duressSalt,
    cover_secret || null
  );

  // Save security policies (client ZK, allowed IPs/countries)
  if (client_encrypted || (allowed_ips && allowed_ips.length > 0) || (allowed_countries && allowed_countries.length > 0)) {
    policyService.savePolicy(id, {
      allowed_ips,
      allowed_countries,
      client_encrypted: Boolean(client_encrypted)
    });
  }

  // Record creation in in-memory hash chain
  auditService.recordAction(id, 'CREATE', reqIp);

  // Dead man switch setup if requested
  let deadmanInfo = null;
  if (checkin_interval_seconds) {
    const interval = parseInt(checkin_interval_seconds, 10);
    if (!isNaN(interval) && interval >= 10) {
      const checkinToken = require('node:crypto').randomBytes(16).toString('hex');
      const deadmanStmt = db.prepare(`
        INSERT INTO deadman_switches (
          id, checkin_token, checkin_interval_seconds, last_checkin, beneficiary, triggered, revealed_payload, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)
      `);
      deadmanStmt.run(id, checkinToken, interval, now, beneficiary || null, now);
      const activeBase = (customBaseUrl || baseUrl).replace(/\/+$/, '');
      deadmanInfo = {
        checkin_token: checkinToken,
        checkin_url: `${activeBase}/api/deadman/${id}/checkin?token=${checkinToken}`,
        checkin_interval_seconds: interval,
        next_checkin_due: new Date(now + interval * 1000).toISOString()
      };
    }
  }

  logger.info('Secret created', { id, maxViews, expiresAt, client_encrypted });

  const activeBaseUrl = (customBaseUrl || baseUrl).replace(/\/+$/, '');

  const responsePayload = {
    id,
    view_url: `${activeBaseUrl}/view/${id}`,
    expires_at: new Date(expiresAt).toISOString(),
    views_remaining: maxViews,
    fingerprint,
    has_file: Boolean(file && file.name),
    file_name: file ? file.name : null,
    file_size: file ? (file.size || 0) : null,
    file_type: file ? (file.type || 'application/octet-stream') : null
  };

  if (client_encrypted) {
    responsePayload.client_encrypted = true;
  }
  if (deadmanInfo) {
    responsePayload.deadman = deadmanInfo;
  }

  return responsePayload;
}

/**
 * Read-only retrieval of secret metadata.
 * NEVER decrypts, NEVER decrements views, NEVER deletes.
 *
 * @param {string} id
 * @param {number} [now=Date.now()]
 * @param {object} [req=null]
 * @returns {object|null}
 */
function getSecretMetadata(id, now = Date.now(), req = null) {
  // Check canary trap first
  const canary = canaryService.getCanary(id);
  if (canary) {
    return {
      id: canary.id,
      max_views: 1,
      views_remaining: 1,
      expires_at: now + 86400000,
      created_at: canary.created_at,
      has_passphrase: false,
      client_encrypted: false,
      is_canary: true
    };
  }

  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      id,
      max_views,
      views_remaining,
      expires_at,
      created_at,
      failed_attempts,
      max_failed_attempts,
      (passphrase_hash IS NOT NULL) AS has_passphrase
    FROM secrets
    WHERE id = ? AND views_remaining > 0 AND expires_at > ?
  `);

  const row = stmt.get(id, now);
  if (!row) return null;
  if (row.failed_attempts >= row.max_failed_attempts) return null;

  const reqIp = req ? (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1') : '127.0.0.1';
  auditService.recordAction(id, 'VIEW_METADATA', reqIp);

  const policy = policyService.getPolicy(id);

  return {
    id: row.id,
    max_views: row.max_views,
    views_remaining: row.views_remaining,
    expires_at: row.expires_at,
    created_at: row.created_at,
    has_passphrase: Boolean(row.has_passphrase),
    client_encrypted: Boolean(policy && policy.client_encrypted)
  };
}

function dispatchDuressWebhook(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return;
  try {
    const parsed = new URL(webhookUrl);
    const client = parsed.protocol === 'https:' ? require('node:https') : require('node:http');
    const body = JSON.stringify(payload);
    const req = client.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'EphemeralVault-DuressAlert/1.0'
      },
      timeout: 5000
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch {}
}

/**
 * Atomically claims, decrements, and burns a secret.
 * If views reach 0 or failed attempts reach max, permanently deletes the database row within the same transaction.
 *
 * @param {string} id
 * @param {string} [passphrase]
 * @param {number} [now=Date.now()]
 * @param {object} [req=null]
 * @returns {{ secret: string, views_remaining: number, burned: boolean } | null | { invalidPassphrase: true, attempts_remaining: number } | { destroyedTooManyAttempts: true } | { policyDenied: true }}
 */
function claimAndBurnSecret(id, passphrase = null, now = Date.now(), req = null) {
  // 1. Canary trap check
  const canary = canaryService.getCanary(id);
  if (canary) {
    return canaryService.triggerCanary(id, req || { headers: {} });
  }

  // 2. Policy enforcement (Geo/IP allow-list)
  const policy = policyService.getPolicy(id);
  if (policy && req && !policyService.validatePolicyAccess(policy, req)) {
    return { policyDenied: true };
  }

  const reqIp = req ? (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1') : '127.0.0.1';
  auditService.recordAction(id, 'BURN_ATTEMPT', reqIp);

  const db = getDb();

  const burnTx = db.transaction((targetId, userPassphrase, currentTime) => {
    // Check passphrase requirement if configured
    const checkStmt = db.prepare(`
      SELECT passphrase_hash, passphrase_salt, duress_hash, duress_salt, cover_secret, failed_attempts, max_failed_attempts
      FROM secrets
      WHERE id = ? AND views_remaining > 0 AND expires_at > ?
    `);
    const meta = checkStmt.get(targetId, currentTime);
    if (!meta) {
      return null;
    }

    if (meta.failed_attempts >= meta.max_failed_attempts) {
      return { destroyedTooManyAttempts: true, attempts: meta.failed_attempts };
    }

    // Check duress passphrase
    if (meta.duress_hash && userPassphrase && verifyPassphrase(userPassphrase, meta.duress_hash, meta.duress_salt)) {
      const updateStmt = db.prepare(`
        UPDATE secrets
        SET views_remaining = views_remaining - 1
        WHERE id = ? AND views_remaining > 0 AND expires_at > ?
        RETURNING views_remaining;
      `);
      const result = updateStmt.get(targetId, currentTime);
      if (result && result.views_remaining === 0) {
        db.prepare('DELETE FROM secrets WHERE id = ?').run(targetId);
      }
      return {
        duress: true,
        cover_secret: meta.cover_secret || 'Access granted. No confidential records found.',
        views_remaining: result ? result.views_remaining : 0
      };
    }

    // Check normal passphrase if set
    if (meta.passphrase_hash) {
      const isCorrect = userPassphrase && verifyPassphrase(userPassphrase, meta.passphrase_hash, meta.passphrase_salt);
      if (!isCorrect) {
        // Wrong passphrase! Atomically increment failed_attempts in ONE UPDATE statement
        const incStmt = db.prepare(`
          UPDATE secrets
          SET failed_attempts = failed_attempts + 1
          WHERE id = ? AND views_remaining > 0 AND expires_at > ? AND failed_attempts < max_failed_attempts
          RETURNING failed_attempts, max_failed_attempts;
        `);
        const incResult = incStmt.get(targetId, currentTime);

        if (!incResult) {
          return { destroyedTooManyAttempts: true, attempts: meta.max_failed_attempts };
        }

        const remaining = incResult.max_failed_attempts - incResult.failed_attempts;
        if (remaining <= 0) {
          // Hard DELETE in the same atomic statement/transaction
          db.prepare('DELETE FROM secrets WHERE id = ?').run(targetId);
          return {
            destroyedTooManyAttempts: true,
            attempts: incResult.failed_attempts
          };
        }

        return {
          invalidPassphrase: true,
          attempts_remaining: remaining,
          attemptNumber: incResult.failed_attempts
        };
      }
    }

    // Passphrase verified or none needed: Single-statement atomic burn with RETURNING
    const updateStmt = db.prepare(`
      UPDATE secrets
      SET views_remaining = views_remaining - 1
      WHERE id = ? AND views_remaining > 0 AND expires_at > ?
      RETURNING ciphertext, iv, auth_tag, views_remaining;
    `);

    const result = updateStmt.get(targetId, currentTime);
    if (!result) {
      return null;
    }

    // Hard DELETE immediately if views_remaining reached 0
    if (result.views_remaining === 0) {
      db.prepare('DELETE FROM secrets WHERE id = ?').run(targetId);
    }

    return result;
  });

  const claimResult = burnTx(id, passphrase, now);
  if (!claimResult) {
    return null;
  }

  if (claimResult.destroyedTooManyAttempts) {
    walCheckpoint();
    policyService.deletePolicy(id);
    auditService.finalizeAndDiscard(id);
    return claimResult;
  }

  if (claimResult.invalidPassphrase) {
    return claimResult;
  }

  if (claimResult.duress) {
    if (claimResult.views_remaining === 0) {
      walCheckpoint();
      policyService.deletePolicy(id);
      auditService.finalizeAndDiscard(id);
    }
    const webhookUrl = process.env.DURESS_WEBHOOK_URL;
    if (webhookUrl) {
      dispatchDuressWebhook(webhookUrl, {
        event: 'DURESS_TRIGGERED',
        id: id,
        timestamp: new Date().toISOString()
      });
    }
    logger.warn('Duress passphrase activated', { id });
    return {
      secret: claimResult.cover_secret,
      views_remaining: claimResult.views_remaining,
      burned: claimResult.views_remaining === 0,
      is_duress: true
    };
  }

  const isBurned = claimResult.views_remaining === 0;

  // On burn/consumption:
  let receipt = null;
  let auditInfo = null;

  if (isBurned) {
    receipt = receiptService.generateBurnReceipt(id, reqIp);
    auditInfo = auditService.finalizeAndDiscard(id);
    policyService.deletePolicy(id);
  } else {
    auditService.recordAction(id, 'VIEW_CONSUMED', reqIp);
  }

  // If client-side zero-knowledge encrypted:
  if (policy && policy.client_encrypted) {
    logger.info('Client ZK secret consumed', { id, viewsRemaining: claimResult.views_remaining, burned: isBurned });
    return {
      client_encrypted: true,
      ciphertext: claimResult.ciphertext.toString('hex'),
      iv: claimResult.iv.toString('hex'),
      auth_tag: claimResult.auth_tag.toString('hex'),
      views_remaining: claimResult.views_remaining,
      burned: isBurned,
      burn_receipt: receipt || undefined,
      audit_chain_root: auditInfo ? auditInfo.audit_chain_root : undefined
    };
  }

  // Decrypt secret with AAD authentication
  try {
    const plaintext = decrypt(claimResult.ciphertext, claimResult.iv, claimResult.auth_tag, id);
    logger.info('Secret consumed', { id, viewsRemaining: claimResult.views_remaining, burned: isBurned });

    let finalSecret = plaintext;
    let finalFile = null;

    if (typeof plaintext === 'string' && plaintext.startsWith('{"__vault_payload":true,')) {
      try {
        const parsed = JSON.parse(plaintext);
        finalSecret = parsed.text || (parsed.file ? `[Attached File: ${parsed.file.name}]` : '');
        finalFile = parsed.file || null;
      } catch {}
    }

    return {
      secret: finalSecret,
      file: finalFile,
      views_remaining: claimResult.views_remaining,
      burned: isBurned,
      burn_receipt: receipt || undefined,
      audit_chain_root: auditInfo ? auditInfo.audit_chain_root : undefined
    };
  } catch (err) {
    // Tamper/corruption detected: hard-delete row to eliminate corrupted residue
    deleteSecret(id);
    walCheckpoint();
    logger.error('Tampered secret detected and purged', { id });
    return null;
  }
}

/**
 * Permanently deletes a secret by ID.
 *
 * @param {string} id
 * @returns {number} Deleted rows count
 */
function deleteSecret(id) {
  policyService.deletePolicy(id);
  auditService.clearChain(id);
  const db = getDb();
  const result = db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
  return result.changes;
}

/**
 * Sweeps all expired secrets and checkpoints the WAL.
 *
 * @param {number} [now=Date.now()]
 * @returns {number} Purged count
 */
function sweepExpired(now = Date.now()) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM secrets WHERE expires_at <= ?');
  const result = stmt.run(now);
  if (result.changes > 0) {
    walCheckpoint();
    logger.info('Sweeper purged expired secrets', { count: result.changes });
  }
  return result.changes;
}

module.exports = {
  createSecret,
  getSecretMetadata,
  claimAndBurnSecret,
  deleteSecret,
  sweepExpired
};
