const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const canaryService = require('./canaryService');
const policyService = require('./policyService');

const TOKEN_TTL_SECONDS = 60; // 60 seconds short-lived token

/**
 * Creates a short-lived, single-use Reveal Authorization Token.
 * Stores only a SHA-256 hash of the token in the database.
 *
 * @param {string} vaultId - Vault identifier
 * @param {number} [now=Date.now()]
 * @param {object} [req=null]
 * @returns {{ reveal_token: string, expires_in: number, expires_at: string } | null}
 */
function createRevealToken(vaultId, now = Date.now(), req = null) {
  // Check canary trap
  const canary = canaryService.getCanary(vaultId);
  if (canary) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    return {
      reveal_token: rawToken,
      expires_in: TOKEN_TTL_SECONDS,
      expires_at: new Date(now + TOKEN_TTL_SECONDS * 1000).toISOString()
    };
  }

  // Check policy if applicable
  const policy = policyService.getPolicy(vaultId);
  if (policy && req && !policyService.validatePolicyAccess(policy, req)) {
    return null;
  }

  const db = getDb();

  // Validate vault status: exists, views_remaining > 0, unexpired, not locked out
  const checkStmt = db.prepare(`
    SELECT id, views_remaining, expires_at, failed_attempts, max_failed_attempts
    FROM secrets
    WHERE id = ? AND views_remaining > 0 AND expires_at > ?
  `);
  const vault = checkStmt.get(vaultId, now);

  if (!vault || vault.failed_attempts >= vault.max_failed_attempts) {
    return null;
  }

  // 32 cryptographically secure random bytes = 256 bits entropy
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = now + TOKEN_TTL_SECONDS * 1000;

  const insertStmt = db.prepare(`
    INSERT INTO reveal_tokens (token_hash, vault_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertStmt.run(tokenHash, vaultId, expiresAt, now);

  return {
    reveal_token: rawToken,
    expires_in: TOKEN_TTL_SECONDS,
    expires_at: new Date(expiresAt).toISOString()
  };
}

/**
 * Validates and atomically consumes a single-use Reveal Authorization Token.
 *
 * @param {string} rawToken - Plaintext reveal token from Authorization header or body
 * @param {string} vaultId - Vault identifier
 * @param {number} [now=Date.now()]
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAndConsumeToken(rawToken, vaultId, now = Date.now()) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, error: 'Unable to reveal this secret.' };
  }

  // Check canary trap
  const canary = canaryService.getCanary(vaultId);
  if (canary) {
    return { valid: true };
  }

  const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, '');
  if (cleanToken.length === 0) {
    return { valid: false, error: 'Unable to reveal this secret.' };
  }

  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  const db = getDb();

  // Atomically mark token as consumed in ONE statement
  const consumeStmt = db.prepare(`
    UPDATE reveal_tokens
    SET consumed = 1, consumed_at = ?
    WHERE token_hash = ? AND vault_id = ? AND consumed = 0 AND expires_at > ?
  `);

  const result = consumeStmt.run(now, tokenHash, vaultId, now);

  if (!result || result.changes === 0) {
    return { valid: false, error: 'Unable to reveal this secret.' };
  }

  return { valid: true };
}

module.exports = {
  createRevealToken,
  validateAndConsumeToken,
  TOKEN_TTL_SECONDS
};
