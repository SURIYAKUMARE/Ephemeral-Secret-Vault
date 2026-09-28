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

  // ─── WhatsApp Message Tracking Table (Migration v2) ──────────────────────
  // Tracks messages dispatched via WhatsApp Business Cloud API.
  // Statuses: scheduled | processing | sent | delivered | read |
  //           deleted | failed | unsupported | expired | cancelled
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id                          TEXT PRIMARY KEY,
      secret_id                   TEXT NOT NULL,
      whatsapp_message_id         TEXT,
      recipient                   TEXT NOT NULL,
      sent_at                     INTEGER,
      delete_at                   INTEGER,
      deletion_status             TEXT NOT NULL DEFAULT 'scheduled',
      deletion_attempts           INTEGER NOT NULL DEFAULT 0,
      last_deletion_attempt       INTEGER,
      deleted_at                  INTEGER,
      deletion_error              TEXT,
      delivery_status             TEXT,
      processing_locked_at        INTEGER,
      processing_lock_id          TEXT,
      vault_url                   TEXT NOT NULL,
      created_at                  INTEGER NOT NULL,
      cancelled_at                INTEGER,
      cancel_reason               TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_wa_secret_id   ON whatsapp_messages(secret_id);
    CREATE INDEX IF NOT EXISTS idx_wa_status       ON whatsapp_messages(deletion_status);
    CREATE INDEX IF NOT EXISTS idx_wa_delete_at    ON whatsapp_messages(delete_at);
    CREATE INDEX IF NOT EXISTS idx_wa_wamid        ON whatsapp_messages(whatsapp_message_id);
  `);

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

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP MESSAGE DB HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a new whatsapp_messages tracking record.
 */
function createWhatsAppMessage({
  id,
  secret_id,
  recipient,
  delete_at,
  vault_url,
  created_at = Date.now()
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO whatsapp_messages
      (id, secret_id, recipient, delete_at, deletion_status, vault_url, created_at)
    VALUES (?, ?, ?, ?, 'scheduled', ?, ?)
  `).run(id, secret_id, recipient, delete_at, vault_url, created_at);
}

/**
 * Stores the WhatsApp message ID (wamid) returned by the Cloud API after send.
 */
function setWhatsAppMessageId(id, whatsapp_message_id) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET whatsapp_message_id = ?, sent_at = ?, deletion_status = 'sent'
    WHERE id = ?
  `).run(whatsapp_message_id, Date.now(), id);
}

/**
 * Marks a message as failed-to-send.
 */
function setWhatsAppSendFailed(id, error) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET deletion_status = 'failed', deletion_error = ?
    WHERE id = ?
  `).run(String(error).slice(0, 1024), id);
}

/**
 * Retrieves records whose delete_at has arrived and are not yet processed.
 * Uses a processing lock to prevent duplicate agent execution.
 */
function claimDueWhatsAppMessages(lockId, now = Date.now(), limit = 50) {
  const db = getDb();
  const lockWindow = 5 * 60 * 1000; // 5-minute lock window

  return db.transaction(() => {
    // Release stale locks (older than 5 min)
    db.prepare(`
      UPDATE whatsapp_messages
      SET processing_locked_at = NULL, processing_lock_id = NULL
      WHERE processing_locked_at IS NOT NULL
        AND processing_locked_at < ?
        AND deletion_status IN ('sent', 'scheduled', 'failed')
    `).run(now - lockWindow);

    // Find and claim due messages (max_attempts = 5)
    const rows = db.prepare(`
      SELECT * FROM whatsapp_messages
      WHERE delete_at <= ?
        AND deletion_status IN ('sent', 'scheduled', 'failed')
        AND deletion_attempts < 5
        AND (processing_locked_at IS NULL OR processing_locked_at < ?)
        AND cancelled_at IS NULL
      ORDER BY delete_at ASC
      LIMIT ?
    `).all(now, now - lockWindow, limit);

    if (rows.length === 0) return [];

    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`
      UPDATE whatsapp_messages
      SET processing_locked_at = ?, processing_lock_id = ?, deletion_status = 'processing'
      WHERE id IN (${placeholders})
    `).run(now, lockId, ...ids);

    return rows;
  })();
}

/**
 * Marks deletion as unsupported (API does not support deleting sent messages).
 */
function markWhatsAppDeletionUnsupported(id, reason) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET deletion_status = 'unsupported',
        deletion_error = ?,
        processing_locked_at = NULL,
        processing_lock_id = NULL
    WHERE id = ?
  `).run(String(reason).slice(0, 512), id);
}

/**
 * Marks deletion as confirmed-deleted (only call when API confirms).
 */
function markWhatsAppDeletionDeleted(id) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET deletion_status = 'deleted',
        deleted_at = ?,
        deletion_error = NULL,
        processing_locked_at = NULL,
        processing_lock_id = NULL
    WHERE id = ?
  `).run(Date.now(), id);
}

/**
 * Records a failed deletion attempt with retry scheduling.
 */
function recordWhatsAppDeletionAttempt(id, error) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET deletion_attempts = deletion_attempts + 1,
        last_deletion_attempt = ?,
        deletion_error = ?,
        deletion_status = CASE
          WHEN deletion_attempts + 1 >= 5 THEN 'failed'
          ELSE 'sent'
        END,
        processing_locked_at = NULL,
        processing_lock_id = NULL
    WHERE id = ?
  `).run(Date.now(), String(error).slice(0, 1024), id);
}

/**
 * Marks a scheduled deletion as expired (secret already burned or TTL elapsed).
 */
function markWhatsAppDeletionExpired(id) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET deletion_status = 'expired',
        processing_locked_at = NULL,
        processing_lock_id = NULL
    WHERE id = ?
  `).run(id);
}

/**
 * Cancels a scheduled deletion.
 */
function cancelWhatsAppDeletion(id, reason) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET deletion_status = 'cancelled',
        cancelled_at = ?,
        cancel_reason = ?,
        processing_locked_at = NULL,
        processing_lock_id = NULL
    WHERE id = ? AND deletion_status NOT IN ('deleted', 'unsupported')
  `).run(Date.now(), String(reason || '').slice(0, 256), id);
}

/**
 * Updates delivery status from webhook event.
 */
function updateWhatsAppDeliveryStatus(whatsapp_message_id, delivery_status) {
  const db = getDb();
  db.prepare(`
    UPDATE whatsapp_messages
    SET delivery_status = ?
    WHERE whatsapp_message_id = ?
  `).run(delivery_status, whatsapp_message_id);
}

/**
 * Gets a single WhatsApp message record by internal ID.
 */
function getWhatsAppMessage(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM whatsapp_messages WHERE id = ?').get(id);
}

/**
 * Gets a WhatsApp message record by secret_id.
 */
function getWhatsAppMessageBySecretId(secret_id) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM whatsapp_messages WHERE secret_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(secret_id);
}

/**
 * Admin: paginated list of all WhatsApp message records.
 */
function listWhatsAppMessages({ limit = 50, offset = 0, status = null } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare(
      'SELECT * FROM whatsapp_messages WHERE deletion_status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(status, limit, offset);
  }
  return db.prepare(
    'SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
}

/**
 * Admin: counts grouped by status.
 */
function countWhatsAppMessagesByStatus() {
  const db = getDb();
  return db.prepare(`
    SELECT deletion_status, COUNT(*) as count
    FROM whatsapp_messages
    GROUP BY deletion_status
  `).all();
}

module.exports = {
  ...module.exports,
  createWhatsAppMessage,
  setWhatsAppMessageId,
  setWhatsAppSendFailed,
  claimDueWhatsAppMessages,
  markWhatsAppDeletionUnsupported,
  markWhatsAppDeletionDeleted,
  recordWhatsAppDeletionAttempt,
  markWhatsAppDeletionExpired,
  cancelWhatsAppDeletion,
  updateWhatsAppDeliveryStatus,
  getWhatsAppMessage,
  getWhatsAppMessageBySecretId,
  listWhatsAppMessages,
  countWhatsAppMessagesByStatus
};
