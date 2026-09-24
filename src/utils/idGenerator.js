const crypto = require('node:crypto');

const ID_REGEX = /^[0-9a-fA-F]{12}$/;

/**
 * Generates an unpredictable, cryptographically random, URL-safe 12-hex-character ID (48 bits entropy).
 *
 * @returns {string}
 */
function generateId() {
  return crypto.randomBytes(6).toString('hex');
}

/**
 * Validates if an ID matches the required 12-hex-character format.
 *
 * @param {string} id
 * @returns {boolean}
 */
function isValidId(id) {
  if (typeof id !== 'string') return false;
  return ID_REGEX.test(id);
}

module.exports = {
  generateId,
  isValidId,
  ID_REGEX
};
