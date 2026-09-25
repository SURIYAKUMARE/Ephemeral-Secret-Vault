const crypto = require('node:crypto');
const { getDb } = require('../database/db');

let serverKeyPair = null;

/**
 * Returns or initializes the server's Ed25519 keypair for cryptographic burn receipts.
 */
function getServerKeyPair() {
  if (!serverKeyPair) {
    if (process.env.ED25519_PRIVATE_KEY && process.env.ED25519_PUBLIC_KEY) {
      serverKeyPair = {
        privateKey: crypto.createPrivateKey(process.env.ED25519_PRIVATE_KEY),
        publicKey: crypto.createPublicKey(process.env.ED25519_PUBLIC_KEY),
        publicKeyPem: crypto.createPublicKey(process.env.ED25519_PUBLIC_KEY).export({ type: 'spki', format: 'pem' })
      };
    } else {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      serverKeyPair = {
        privateKey,
        publicKey,
        publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' })
      };
    }
  }
  return serverKeyPair;
}

/**
 * Computes SHA-256 hash of requester IP address.
 */
function hashIp(ip) {
  if (!ip) return crypto.createHash('sha256').update('127.0.0.1').digest('hex');
  const clean = String(ip).replace(/^::ffff:/, '').trim();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Generates an Ed25519 cryptographically signed receipt for a burned secret.
 *
 * @param {string} id
 * @param {string} requesterIp
 * @returns {object} Signed receipt { id, burned_at, requester_ip_hash, signature, public_key }
 */
function generateBurnReceipt(id, requesterIp) {
  const { privateKey, publicKeyPem } = getServerKeyPair();
  const burned_at = new Date().toISOString();
  const requester_ip_hash = hashIp(requesterIp);

  // Canonical message string
  const canonicalPayload = JSON.stringify({
    id,
    burned_at,
    requester_ip_hash
  });

  const message = Buffer.from(canonicalPayload, 'utf8');
  const signature = crypto.sign(null, message, privateKey).toString('hex');

  const receipt = {
    id,
    burned_at,
    requester_ip_hash,
    signature,
    public_key: publicKeyPem
  };

  // Persist receipt in SQLite
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO burn_receipts (id, burned_at, requester_ip_hash, signature, public_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, burned_at, requester_ip_hash, signature, publicKeyPem, Date.now());
  } catch (err) {
    // Non-fatal if already exists
  }

  return receipt;
}

/**
 * Cryptographically verifies an Ed25519 burn receipt.
 *
 * @param {string|object} receiptOrId
 * @returns {object|null}
 */
function verifyBurnReceipt(receiptOrId) {
  const db = getDb();
  let receipt = null;

  if (typeof receiptOrId === 'string') {
    const stmt = db.prepare(`
      SELECT id, burned_at, requester_ip_hash, signature, public_key, created_at
      FROM burn_receipts
      WHERE id = ?
    `);
    receipt = stmt.get(receiptOrId);
    if (!receipt) return null;
  } else if (typeof receiptOrId === 'object' && receiptOrId !== null) {
    receipt = receiptOrId;
  }

  if (!receipt || !receipt.id || !receipt.burned_at || !receipt.signature || !receipt.public_key) {
    return null;
  }

  try {
    const canonicalPayload = JSON.stringify({
      id: receipt.id,
      burned_at: receipt.burned_at,
      requester_ip_hash: receipt.requester_ip_hash
    });

    const message = Buffer.from(canonicalPayload, 'utf8');
    const publicKey = crypto.createPublicKey(receipt.public_key);
    const signatureBuffer = Buffer.from(receipt.signature, 'hex');

    const isValid = crypto.verify(null, message, publicKey, signatureBuffer);

    return {
      valid: isValid,
      receipt: {
        id: receipt.id,
        burned_at: receipt.burned_at,
        requester_ip_hash: receipt.requester_ip_hash
      },
      verified_at: new Date().toISOString()
    };
  } catch (err) {
    return {
      valid: false,
      error: 'Cryptographic signature verification failed: ' + err.message
    };
  }
}

module.exports = {
  getServerKeyPair,
  hashIp,
  generateBurnReceipt,
  verifyBurnReceipt
};
