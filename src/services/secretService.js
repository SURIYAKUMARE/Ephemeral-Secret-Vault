const { getDb, walCheckpoint } = require('../database/db');
const { encrypt, decrypt, getFingerprint, hashPassphrase, verifyPassphrase } = require('../crypto/encryption');
const { generateId } = require('../utils/idGenerator');
const { baseUrl } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Creates and stores an encrypted secret.
 *
 * @param {object} params
 * @param {string} params.secret
 * @param {number} [params.ttlSeconds=3600]
 * @param {number} [params.maxViews=1]
 * @param {string} [params.passphrase]
 * @returns {object} { id, view_url, expires_at, views_remaining, fingerprint }
 */
function createSecret({ secret, file = null, ttlSeconds = 3600, maxViews = 1, passphrase = null, customBaseUrl = null }) {
  const db = getDb();
  const id = generateId();
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

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
  const { ciphertext, iv, authTag } = encrypt(contentToEncrypt, id);

  let passphraseHash = null;
  let passphraseSalt = null;
  if (passphrase && typeof passphrase === 'string' && passphrase.trim().length > 0) {
    const hashed = hashPassphrase(passphrase.trim());
    passphraseHash = hashed.hash;
    passphraseSalt = hashed.salt;
  }

  const stmt = db.prepare(`
    INSERT INTO secrets (
      id, ciphertext, iv, auth_tag, max_views, views_remaining, expires_at, created_at, passphrase_hash, passphrase_salt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    ciphertext,
    iv,
    authTag,
    maxViews,
    maxViews,
    expiresAt,
    now,
    passphraseHash,
    passphraseSalt
  );

  logger.info('Secret created', { id, maxViews, expiresAt });

  const activeBaseUrl = (customBaseUrl || baseUrl).replace(/\/+$/, '');

  return {
    id,
    view_url: `${activeBaseUrl}/view/${id}`,
    expires_at: new Date(expiresAt).toISOString(),
    views_remaining: maxViews,
    fingerprint: getFingerprint(contentToEncrypt)
  };
}

/**
 * Read-only retrieval of secret metadata.
 * NEVER decrypts, NEVER decrements views, NEVER deletes.
 *
 * @param {string} id
 * @param {number} [now=Date.now()]
 * @returns {object|null}
 */
function getSecretMetadata(id, now = Date.now()) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      id,
      max_views,
      views_remaining,
      expires_at,
      created_at,
      (passphrase_hash IS NOT NULL) AS has_passphrase
    FROM secrets
    WHERE id = ? AND views_remaining > 0 AND expires_at > ?
  `);

  const row = stmt.get(id, now);
  if (!row) return null;

  return {
    id: row.id,
    max_views: row.max_views,
    views_remaining: row.views_remaining,
    expires_at: row.expires_at,
    created_at: row.created_at,
    has_passphrase: Boolean(row.has_passphrase)
  };
}

/**
 * Atomically claims, decrements, and burns a secret.
 * If views reach 0, permanently deletes the database row within the same transaction.
 *
 * @param {string} id
 * @param {string} [passphrase]
 * @param {number} [now=Date.now()]
 * @returns {{ secret: string, views_remaining: number, burned: boolean } | null | { invalidPassphrase: true }}
 */
function claimAndBurnSecret(id, passphrase = null, now = Date.now()) {
  const db = getDb();

  const burnTx = db.transaction((targetId, userPassphrase, currentTime) => {
    // Check passphrase requirement if configured
    const checkStmt = db.prepare(`
      SELECT passphrase_hash, passphrase_salt
      FROM secrets
      WHERE id = ? AND views_remaining > 0 AND expires_at > ?
    `);
    const meta = checkStmt.get(targetId, currentTime);
    if (!meta) {
      return null;
    }

    if (meta.passphrase_hash) {
      if (!userPassphrase || !verifyPassphrase(userPassphrase, meta.passphrase_hash, meta.passphrase_salt)) {
        return { invalidPassphrase: true };
      }
    }

    // Single-statement atomic burn with RETURNING
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

  if (claimResult.invalidPassphrase) {
    return claimResult;
  }

  // Decrypt secret with AAD authentication
  try {
    const plaintext = decrypt(claimResult.ciphertext, claimResult.iv, claimResult.auth_tag, id);
    logger.info('Secret consumed', { id, viewsRemaining: claimResult.views_remaining, burned: claimResult.views_remaining === 0 });

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
      burned: claimResult.views_remaining === 0
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
