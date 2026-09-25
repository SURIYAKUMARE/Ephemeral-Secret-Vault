const crypto = require('node:crypto');
const { getDb, walCheckpoint } = require('../database/db');
const { encrypt, decrypt } = require('../crypto/encryption');
const { split, combine } = require('../crypto/shamir');
const { generateId } = require('../utils/idGenerator');
const { baseUrl } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Creates a threshold-split secret using Shamir's Secret Sharing (GF(256)).
 * The AES-256 data key is split into n shares, requiring k shares to reconstruct.
 *
 * @param {object} params
 * @param {string} params.secret
 * @param {number} params.threshold_k
 * @param {number} params.total_n
 * @param {number} [params.ttl_seconds=3600]
 * @param {string} [params.customBaseUrl]
 * @returns {object} { id, threshold_k, total_n, expires_at, share_urls, shares }
 */
function createThresholdSecret({ secret, threshold_k, total_n, ttl_seconds = 3600, customBaseUrl = null }) {
  const k = parseInt(threshold_k, 10);
  const n = parseInt(total_n, 10);
  const ttl = parseInt(ttl_seconds, 10) || 3600;

  if (k < 2 || n < k || n > 255) {
    throw new RangeError('threshold_k and total_n must satisfy 2 <= k <= n <= 255');
  }

  const db = getDb();
  const id = generateId();
  const now = Date.now();
  const expiresAt = now + ttl * 1000;

  // Generate ephemeral 32-byte AES-256 data key
  const dataKey = crypto.randomBytes(32);

  // Encrypt secret with dataKey, binding id as AAD
  const { ciphertext, iv, authTag } = encrypt(secret, id, dataKey);

  // Split dataKey into n shares with threshold k
  const shares = split(dataKey, k, n);

  const stmt = db.prepare(`
    INSERT INTO threshold_secrets (
      id, ciphertext, iv, auth_tag, threshold_k, total_n, redeemed_shares, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)
  `);

  stmt.run(
    id,
    ciphertext,
    iv,
    authTag,
    k,
    n,
    expiresAt,
    now
  );

  logger.info('Threshold secret created', { id, threshold_k: k, total_n: n, expiresAt });

  const activeBaseUrl = (customBaseUrl || baseUrl).replace(/\/+$/, '');
  const shareUrls = shares.map((share) => `${activeBaseUrl}/view/threshold/${id}?share=${share}`);

  return {
    id,
    threshold_k: k,
    total_n: n,
    expires_at: new Date(expiresAt).toISOString(),
    share_urls: shareUrls,
    shares
  };
}

/**
 * Redeems a Shamir share for a threshold secret.
 * Reconstructs the data key and decrypts the secret once k distinct shares have been redeemed.
 *
 * @param {string} id
 * @param {string} shareHex
 * @param {number} [now=Date.now()]
 * @returns {object|null}
 */
function redeemThresholdShare(id, shareHex, now = Date.now()) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, ciphertext, iv, auth_tag, threshold_k, total_n, redeemed_shares, expires_at
    FROM threshold_secrets
    WHERE id = ? AND expires_at > ?
  `);

  const row = stmt.get(id, now);
  if (!row) {
    return null;
  }

  const cleanedShare = String(shareHex || '').trim().toLowerCase();
  if (!/^[0-9a-fA-F]{66,}$/.test(cleanedShare)) {
    throw new Error('Invalid share format. Must be hex-encoded Shamir share.');
  }

  // Parse x coordinate from first byte of share
  const shareX = parseInt(cleanedShare.slice(0, 2), 16);
  if (shareX === 0) {
    throw new Error('Invalid share x coordinate.');
  }

  let redeemed = [];
  try {
    redeemed = JSON.parse(row.redeemed_shares || '[]');
  } catch {
    redeemed = [];
  }

  // Check if this exact share or a share with the same x coordinate is already redeemed
  const existingX = new Set(redeemed.map(s => parseInt(s.slice(0, 2), 16)));
  if (!existingX.has(shareX)) {
    redeemed.push(cleanedShare);
    db.prepare('UPDATE threshold_secrets SET redeemed_shares = ? WHERE id = ?')
      .run(JSON.stringify(redeemed), id);
  }

  const redeemedCount = redeemed.length;
  const thresholdK = row.threshold_k;

  if (redeemedCount < thresholdK) {
    return {
      id,
      threshold_k: thresholdK,
      total_n: row.total_n,
      redeemed_count: redeemedCount,
      remaining_needed: thresholdK - redeemedCount,
      burned: false
    };
  }

  // Threshold reached! Combine k shares to reconstruct the data key
  const keyShares = redeemed.slice(0, thresholdK);
  let recoveredKey;
  try {
    recoveredKey = combine(keyShares);
  } catch (err) {
    logger.error('Failed to reconstruct threshold key from shares', { id, error: err.message });
    throw new Error(`Failed to reconstruct secret: ${err.message}`);
  }

  // Decrypt secret using reconstructed data key
  let plaintext;
  try {
    plaintext = decrypt(row.ciphertext, row.iv, row.auth_tag, id, recoveredKey);
  } catch (err) {
    logger.error('Threshold decryption authentication failed', { id });
    throw new Error('Failed to decrypt secret: invalid or corrupt shares.');
  }

  // Hard zero-overwrite and delete row from database
  db.prepare('DELETE FROM threshold_secrets WHERE id = ?').run(id);
  walCheckpoint();

  logger.info('Threshold secret unlocked and burned', { id, threshold_k: thresholdK });

  return {
    id,
    secret: plaintext,
    threshold_k: thresholdK,
    total_n: row.total_n,
    redeemed_count: redeemedCount,
    burned: true
  };
}

/**
 * Retrieves public status of a threshold secret without exposing secrets or keys.
 *
 * @param {string} id
 * @param {number} [now=Date.now()]
 * @returns {object|null}
 */
function getThresholdStatus(id, now = Date.now()) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, threshold_k, total_n, redeemed_shares, expires_at, created_at
    FROM threshold_secrets
    WHERE id = ? AND expires_at > ?
  `);

  const row = stmt.get(id, now);
  if (!row) return null;

  let redeemed = [];
  try {
    redeemed = JSON.parse(row.redeemed_shares || '[]');
  } catch {
    redeemed = [];
  }

  return {
    id: row.id,
    threshold_k: row.threshold_k,
    total_n: row.total_n,
    redeemed_count: redeemed.length,
    remaining_needed: Math.max(0, row.threshold_k - redeemed.length),
    expires_at: new Date(row.expires_at).toISOString(),
    created_at: new Date(row.created_at).toISOString()
  };
}

module.exports = {
  createThresholdSecret,
  redeemThresholdShare,
  getThresholdStatus
};
