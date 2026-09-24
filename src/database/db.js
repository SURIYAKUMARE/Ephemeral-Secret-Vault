const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { databasePath } = require('../config/env');
const logger = require('../utils/logger');

let dbInstance = null;

/**
 * Initializes the SQLite database connection, applies security PRAGMAs, and creates schema.
 *
 * @param {string} [customPath]
 * @returns {Database.Database}
 */
function initDb(customPath = databasePath) {
  if (dbInstance) {
    return dbInstance;
  }

  const isMemory = customPath === ':memory:';
  const targetPath = isMemory
    ? ':memory:'
    : (path.isAbsolute(customPath) ? customPath : path.resolve(process.cwd(), customPath));

  if (!isMemory) {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  const db = new Database(targetPath);

  // Enforce WAL mode, normal synchronous durability, and secure physical zeroing
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('secure_delete = ON');

  // Load and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    // Fallback schema if file not found
    db.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        ciphertext BLOB NOT NULL,
        iv BLOB NOT NULL,
        auth_tag BLOB NOT NULL,
        max_views INTEGER NOT NULL DEFAULT 1,
        views_remaining INTEGER NOT NULL DEFAULT 1,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        passphrase_hash TEXT,
        passphrase_salt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_secrets_expiry ON secrets(expires_at);
    `);
  }

  dbInstance = db;
  logger.info('Database initialized in WAL mode', { path: targetPath });
  return dbInstance;
}

/**
 * Retrieves the current database instance.
 */
function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

/**
 * Truncates WAL log to ensure no residual data remains.
 */
function walCheckpoint() {
  const db = getDb();
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    logger.error('WAL checkpoint error', { error: err.message });
  }
}

/**
 * Closes database connection cleanly.
 */
function closeDb() {
  if (dbInstance) {
    try {
      walCheckpoint();
      dbInstance.close();
    } catch (err) {
      logger.error('Error closing database', { error: err.message });
    } finally {
      dbInstance = null;
    }
  }
}

module.exports = {
  initDb,
  getDb,
  walCheckpoint,
  closeDb
};
