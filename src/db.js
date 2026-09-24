const Database = require('better-sqlite3');
const path = require('node:path');
const { verifyPassphrase } = require('./crypto');

let dbInstance = null;

/**
 * Initializes the SQLite database with WAL mode and security pragmas.
 * Performs migrations if needed.
 *
 * @param {string} [dbPath]
 * @returns {Database.Database}
 */
function initDb(dbPath = process.env.DB_PATH || 'vault.db') {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath = dbPath === ':memory:'
    ? ':memory:'
    : (path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath));
  const db = new Database(resolvedPath);

  // Enforce WAL mode, normal synchronous durability, and secure_delete
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('secure_delete = ON');

  // Create base schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      id TEXT PRIMARY KEY,
      ciphertext BLOB NOT NULL,
      iv BLOB NOT NULL,
      auth_tag BLOB NOT NULL,
      max_views INTEGER NOT NULL DEFAULT 1,
      views_remaining INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_secrets_expiry ON secrets(expires_at);
  `);

  // Migration: add passphrase_hash and passphrase_salt columns if missing
  const columns = db.pragma('table_info(secrets)');
  const columnNames = columns.map(c => c.name);
  if (!columnNames.includes('passphrase_hash')) {
    db.exec('ALTER TABLE secrets ADD COLUMN passphrase_hash TEXT;');
  }
  if (!columnNames.includes('passphrase_salt')) {
    db.exec('ALTER TABLE secrets ADD COLUMN passphrase_salt TEXT;');
  }

  dbInstance = db;
  return dbInstance;
}

/**
 * Retrieves the active database instance.
 */
function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

/**
 * Inserts a new encrypted secret record into the database.
 */
function createSecret({
  id,
  ciphertext,
  iv,
  auth_tag,
  max_views = 1,
  expires_at,
  created_at = Date.now(),
  passphrase_hash = null,
  passphrase_salt = null
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO secrets (
      id, ciphertext, iv, auth_tag, max_views, views_remaining, expires_at, created_at, passphrase_hash, passphrase_salt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    ciphertext,
    iv,
    auth_tag,
    max_views,
    max_views, // initial views_remaining == max_views
    expires_at,
    created_at,
    passphrase_hash,
    passphrase_salt
  );
}

/**
 * Read-only retrieval of secret metadata for the splash screen.
 * NEVER decrypts, NEVER decrements, and NEVER deletes.
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
 * Atomically decrements views_remaining and returns ciphertext, iv, auth_tag.
 * If views_remaining reaches 0, the row is hard DELETED immediately in the same transaction.
 *
 * @param {string} id
 * @param {string|null} [passphrase]
 * @param {number} [now]
 * @returns {object|null} { ciphertext, iv, auth_tag, views_remaining } or null or { error: 'INVALID_PASSPHRASE' }
 */
function burnSecret(id, passphrase = null, now = Date.now()) {
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
        return { error: 'INVALID_PASSPHRASE' };
      }
    }

    // Atomic burn in ONE statement with RETURNING
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

  return burnTx(id, passphrase, now);
}

/**
 * Hard deletes a secret by ID. Used for corrupt/tampered rows or manual cleanup.
 */
function deleteSecret(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM secrets WHERE id = ?');
  const result = stmt.run(id);
  return result.changes;
}

/**
 * Purges expired secrets and runs a WAL truncation checkpoint.
 *
 * @param {number} [now]
 * @returns {number} Purged count
 */
function sweepExpired(now = Date.now()) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM secrets WHERE expires_at <= ?');
  const result = stmt.run(now);
  if (result.changes > 0) {
    walCheckpoint();
  }
  return result.changes;
}

/**
 * Truncates WAL log to ensure no deleted secret residue lingers on disk.
 */
function walCheckpoint() {
  const db = getDb();
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.error('WAL checkpoint error:', err.message);
  }
}

/**
 * Closes database connection cleanly.
 */
function closeDb() {
  if (dbInstance) {
    walCheckpoint();
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  initDb,
  getDb,
  createSecret,
  getSecretMetadata,
  burnSecret,
  deleteSecret,
  sweepExpired,
  walCheckpoint,
  closeDb
};
