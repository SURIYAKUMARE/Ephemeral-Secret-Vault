const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits standard for AES-GCM
const TAG_LENGTH = 16; // 128 bits authentication tag

class DecryptionError extends Error {
  constructor(message = 'Decryption failed: authentication tag mismatch or corrupted ciphertext') {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Validates and retrieves the 256-bit master key from environment variables.
 * Exits the process if missing or invalid.
 */
function getMasterKey(envKey = process.env.VAULT_MASTER_KEY) {
  if (!envKey) {
    throw new Error('FATAL: VAULT_MASTER_KEY environment variable is missing. Generate a key using: node scripts/gen-key.js');
  }
  const keyStr = envKey.trim();
  if (keyStr.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    throw new Error('FATAL: VAULT_MASTER_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }
  return Buffer.from(keyStr, 'hex');
}

/**
 * Validates master key at application startup.
 */
function validateMasterKey() {
  try {
    getMasterKey();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Binds the record id as Additional Authenticated Data (AAD) to prevent ciphertext transplant attacks.
 *
 * @param {string} plaintext - The secret string to encrypt
 * @param {string} id - The record ID used as AAD
 * @param {Buffer} [masterKey] - Optional 32-byte key override
 * @returns {{ ciphertext: Buffer, iv: Buffer, tag: Buffer }}
 */
function encrypt(plaintext, id, masterKey = getMasterKey()) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Plaintext must be a string');
  }
  if (!id || typeof id !== 'string') {
    throw new TypeError('Record ID must be a non-empty string');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(Buffer.from(id, 'utf8'));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return { ciphertext, iv, tag };
}

/**
 * Decrypts AES-256-GCM ciphertext, authenticating against the record ID.
 * Throws DecryptionError on tampering or authentication failure.
 *
 * @param {Buffer} ciphertext
 * @param {Buffer} iv
 * @param {Buffer} tag
 * @param {string} id
 * @param {Buffer} [masterKey]
 * @returns {string} Plaintext
 */
function decrypt(ciphertext, iv, tag, id, masterKey = getMasterKey()) {
  if (!Buffer.isBuffer(ciphertext) || !Buffer.isBuffer(iv) || !Buffer.isBuffer(tag)) {
    throw new TypeError('ciphertext, iv, and tag must be Buffers');
  }
  if (!id || typeof id !== 'string') {
    throw new TypeError('Record ID must be a non-empty string');
  }
  if (iv.length !== IV_LENGTH) {
    throw new DecryptionError('Invalid IV length');
  }
  if (tag.length !== TAG_LENGTH) {
    throw new DecryptionError('Invalid authentication tag length');
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
    decipher.setAAD(Buffer.from(id, 'utf8'));
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf8');

    return plaintext;
  } catch (err) {
    throw new DecryptionError(err.message);
  }
}

/**
 * Computes SHA-256 audit fingerprint of secret.
 */
function getFingerprint(secret) {
  return crypto.createHash('sha256').update(secret, 'utf8').digest('hex');
}

/**
 * Hashes an optional passphrase using scrypt with a unique 16-byte salt.
 */
function hashPassphrase(passphrase, salt = crypto.randomBytes(16)) {
  const derivedKey = crypto.scryptSync(passphrase, salt, 32);
  return {
    hash: derivedKey.toString('hex'),
    salt: salt.toString('hex')
  };
}

/**
 * Verifies passphrase against stored scrypt hash and salt in constant time.
 */
function verifyPassphrase(passphrase, hashHex, saltHex) {
  if (!passphrase || !hashHex || !saltHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const targetHash = Buffer.from(hashHex, 'hex');
    const derivedKey = crypto.scryptSync(passphrase, salt, 32);
    if (targetHash.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(targetHash, derivedKey);
  } catch {
    return false;
  }
}

module.exports = {
  ALGORITHM,
  IV_LENGTH,
  TAG_LENGTH,
  DecryptionError,
  getMasterKey,
  validateMasterKey,
  encrypt,
  decrypt,
  getFingerprint,
  hashPassphrase,
  verifyPassphrase
};
