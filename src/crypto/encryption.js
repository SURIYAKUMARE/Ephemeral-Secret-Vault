const crypto = require('node:crypto');
const { validateAndGetMasterKey } = require('../config/env');

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
 * Encrypts plaintext string using AES-256-GCM.
 * Binds the record id as Additional Authenticated Data (AAD) to prevent ciphertext transplant attacks.
 *
 * @param {string} plaintext - The secret string to encrypt
 * @param {string} id - The record ID used as AAD
 * @param {Buffer} [masterKey] - Optional 32-byte key override
 * @returns {{ ciphertext: Buffer, iv: Buffer, authTag: Buffer }}
 */
function encrypt(plaintext, id, masterKey = validateAndGetMasterKey()) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Plaintext must be a string');
  }
  if (!id || typeof id !== 'string') {
    throw new TypeError('Record ID must be a non-empty string');
  }

  const keyBuf = Buffer.isBuffer(masterKey) ? masterKey : validateAndGetMasterKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(Buffer.from(id, 'utf8'));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag };
}

/**
 * Decrypts AES-256-GCM ciphertext, authenticating against the record ID.
 * Throws DecryptionError on tampering, truncation, or authentication failure.
 *
 * @param {Buffer} ciphertext
 * @param {Buffer} iv
 * @param {Buffer} authTag
 * @param {string} id
 * @param {Buffer} [masterKey]
 * @returns {string} Plaintext
 */
function decrypt(ciphertext, iv, authTag, id, masterKey = validateAndGetMasterKey()) {
  if (!Buffer.isBuffer(ciphertext) || !Buffer.isBuffer(iv) || !Buffer.isBuffer(authTag)) {
    throw new TypeError('ciphertext, iv, and authTag must be Buffers');
  }
  if (!id || typeof id !== 'string') {
    throw new TypeError('Record ID must be a non-empty string');
  }
  if (iv.length !== IV_LENGTH) {
    throw new DecryptionError('Invalid IV length');
  }
  if (authTag.length !== TAG_LENGTH) {
    throw new DecryptionError('Invalid authentication tag length');
  }

  try {
    const keyBuf = Buffer.isBuffer(masterKey) ? masterKey : validateAndGetMasterKey(masterKey);
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv, { authTagLength: TAG_LENGTH });
    decipher.setAAD(Buffer.from(id, 'utf8'));
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf8');

    return plaintext;
  } catch (err) {
    throw new DecryptionError('Decryption authentication failed');
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
  encrypt,
  decrypt,
  getFingerprint,
  hashPassphrase,
  verifyPassphrase
};
