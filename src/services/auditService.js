const crypto = require('node:crypto');

// In-memory strictly scoped audit chains (Map<secretId, Array<Block>>)
const auditChains = new Map();

/**
 * Computes SHA-256 hash.
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hashes client IP to ensure zero IP address persistence.
 */
function hashIp(ip) {
  if (!ip) return sha256('127.0.0.1');
  const clean = String(ip).replace(/^::ffff:/, '').trim();
  return sha256(clean);
}

/**
 * Appends an action block to the secret's in-memory hash chain.
 *
 * @param {string} secretId
 * @param {string} action - e.g. 'CREATE', 'METADATA_VIEW', 'REDEEM_SHARE', 'BURN'
 * @param {string} [ip]
 */
function recordAction(secretId, action, ip = '127.0.0.1') {
  if (!secretId) return;

  if (!auditChains.has(secretId)) {
    auditChains.set(secretId, []);
  }

  const chain = auditChains.get(secretId);
  const index = chain.length;
  const timestamp = Date.now();
  const ip_hash = hashIp(ip);
  const prev_hash = index === 0
    ? '0'.repeat(64)
    : chain[index - 1].block_hash;

  const canonicalBlockString = `${index}:${timestamp}:${action}:${ip_hash}:${prev_hash}`;
  const block_hash = sha256(canonicalBlockString);

  chain.push({
    index,
    timestamp,
    action,
    ip_hash,
    prev_hash,
    block_hash
  });
}

/**
 * Computes the final chain root, returns verification summary,
 * and immediately purges the chain from memory (zero trace guarantee).
 *
 * @param {string} secretId
 * @returns {object|null} { audit_chain_root, audit_chain_length }
 */
function finalizeAndDiscard(secretId) {
  if (!secretId || !auditChains.has(secretId)) {
    return null;
  }

  const chain = auditChains.get(secretId);
  const count = chain.length;
  const root = chain[count - 1].block_hash;

  // Immediately discard from memory — zero persistence
  auditChains.delete(secretId);

  return {
    audit_chain_root: root,
    audit_chain_length: count
  };
}

/**
 * Clears an audit chain without returning root (e.g. on sweeping or deletion).
 */
function clearChain(secretId) {
  if (secretId) {
    auditChains.delete(secretId);
  }
}

module.exports = {
  recordAction,
  finalizeAndDiscard,
  clearChain
};
