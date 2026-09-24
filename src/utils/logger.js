/**
 * Structured logger for Ephemeral Secret Vault.
 * Strictly avoids logging secret contents, master keys, plaintext, or passwords.
 */

const isTest = process.env.NODE_ENV === 'test' && !process.env.DEBUG_LOGS;

const logger = {
  info(msg, meta = {}) {
    if (isTest) return;
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },

  warn(msg, meta = {}) {
    if (isTest) return;
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },

  error(msg, meta = {}) {
    if (isTest) return;
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },

  debug(msg, meta = {}) {
    if (isTest || process.env.NODE_ENV !== 'development') return;
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  }
};

module.exports = logger;
