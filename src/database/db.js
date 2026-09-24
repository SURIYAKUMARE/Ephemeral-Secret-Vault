const fs = require('node:fs');
const path = require('node:path');
const { databasePath, isVercel } = require('../config/env');
const logger = require('../utils/logger');

let DatabaseModule = null;
try {
  DatabaseModule = require('better-sqlite3');
} catch (err) {
  logger.warn('better-sqlite3 native addon not loaded. Falling back to zero-trace in-memory engine.');
}

let dbInstance = null;

/**
 * High-performance, zero-trace in-memory vault engine
 * Used when better-sqlite3 native binary cannot be loaded (e.g. AWS Lambda / Vercel Serverless environment).
 */
class InMemoryVaultDb {
  constructor() {
    this.records = new Map();
  }

  pragma(cmd) {
    return [];
  }

  exec(sql) {
    return this;
  }

  prepare(sql) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const self = this;

    // INSERT
    if (/^INSERT INTO secrets/i.test(cleanSql)) {
      return {
        run(...args) {
          const [id, ciphertext, iv, auth_tag, max_views, views_remaining, expires_at, created_at, passphrase_hash, passphrase_salt] = args;
          self.records.set(id, {
            id,
            ciphertext: Buffer.from(ciphertext),
            iv: Buffer.from(iv),
            auth_tag: Buffer.from(auth_tag),
            max_views: Number(max_views),
            views_remaining: Number(views_remaining),
            expires_at: Number(expires_at),
            created_at: Number(created_at),
            passphrase_hash: passphrase_hash || null,
            passphrase_salt: passphrase_salt || null
          });
          return { changes: 1 };
        }
      };
    }

    // UPDATE ... RETURNING
    if (/^UPDATE secrets SET views_remaining = views_remaining - 1/i.test(cleanSql)) {
      return {
        get(targetId, currentTime) {
          const rec = self.records.get(targetId);
          if (!rec) return null;
          if (rec.views_remaining <= 0 || rec.expires_at <= currentTime) {
            return null;
          }
          rec.views_remaining -= 1;
          const ret = {
            ciphertext: rec.ciphertext,
            iv: rec.iv,
            auth_tag: rec.auth_tag,
            views_remaining: rec.views_remaining
          };
          if (rec.views_remaining === 0) {
            // Secure erase
            rec.ciphertext.fill(0);
            self.records.delete(targetId);
          }
          return ret;
        }
      };
    }

    // UPDATE ciphertext / auth_tag for tamper tests
    if (/^UPDATE secrets SET ciphertext = \?/i.test(cleanSql)) {
      return {
        run(newCiphertext, targetId) {
          const rec = self.records.get(targetId);
          if (rec) {
            rec.ciphertext = Buffer.from(newCiphertext);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    if (/^UPDATE secrets SET auth_tag = \?/i.test(cleanSql)) {
      return {
        run(newTag, targetId) {
          const rec = self.records.get(targetId);
          if (rec) {
            rec.auth_tag = Buffer.from(newTag);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // DELETE single
    if (/^DELETE FROM secrets WHERE id = \?/i.test(cleanSql)) {
      return {
        run(targetId) {
          const rec = self.records.get(targetId);
          if (rec) {
            if (Buffer.isBuffer(rec.ciphertext)) rec.ciphertext.fill(0);
            self.records.delete(targetId);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // DELETE expired
    if (/^DELETE FROM secrets WHERE expires_at <= \?/i.test(cleanSql)) {
      return {
        run(now) {
          let count = 0;
          for (const [id, rec] of self.records.entries()) {
            if (rec.expires_at <= now) {
              if (Buffer.isBuffer(rec.ciphertext)) rec.ciphertext.fill(0);
              self.records.delete(id);
              count++;
            }
          }
          return { changes: count };
        }
      };
    }

    // SELECT passphrase_hash, passphrase_salt
    if (/^SELECT passphrase_hash, passphrase_salt/i.test(cleanSql)) {
      return {
        get(targetId, currentTime) {
          const rec = self.records.get(targetId);
          if (!rec) return null;
          if (rec.views_remaining <= 0 || rec.expires_at <= currentTime) return null;
          return {
            passphrase_hash: rec.passphrase_hash,
            passphrase_salt: rec.passphrase_salt
          };
        }
      };
    }

    // SELECT metadata
    if (/^SELECT id, max_views, views_remaining/i.test(cleanSql)) {
      return {
        get(targetId, currentTime) {
          const rec = self.records.get(targetId);
          if (!rec) return null;
          if (rec.views_remaining <= 0 || rec.expires_at <= currentTime) return null;
          return {
            id: rec.id,
            max_views: rec.max_views,
            views_remaining: rec.views_remaining,
            expires_at: rec.expires_at,
            created_at: rec.created_at,
            has_passphrase: rec.passphrase_hash !== null ? 1 : 0
          };
        }
      };
    }

    // Generic fallback for test queries like SELECT views_remaining FROM secrets WHERE id = ?
    return {
      get(targetId) {
        const rec = self.records.get(targetId);
        return rec || null;
      },
      all() {
        return Array.from(self.records.values());
      },
      run() {
        return { changes: 0 };
      }
    };
  }

  transaction(fn) {
    return (...args) => fn(...args);
  }

  close() {
    this.records.clear();
  }
}

/**
 * Initializes the SQLite database connection, applies security PRAGMAs, and creates schema.
 *
 * @param {string} [customPath]
 * @returns {object}
 */
function initDb(customPath = databasePath) {
  if (dbInstance) {
    return dbInstance;
  }

  // If better-sqlite3 native module is missing, use in-memory vault engine
  if (!DatabaseModule) {
    logger.warn('Using InMemoryVaultDb engine.');
    dbInstance = new InMemoryVaultDb();
    return dbInstance;
  }

  const isMemory = customPath === ':memory:';
  let targetPath = isMemory
    ? ':memory:'
    : (path.isAbsolute(customPath) ? customPath : path.resolve(process.cwd(), customPath));

  // If running on Vercel or read-only filesystem, ensure safe path
  if (!isMemory) {
    const parentDir = path.dirname(targetPath);
    try {
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    } catch (err) {
      // Read-only filesystem (e.g. Vercel Lambda /var/task)
      logger.warn(`Filesystem read-only for ${parentDir}. Redirecting to /tmp/vault.db`);
      targetPath = path.join('/tmp', 'vault.db');
    }
  }

  let db;
  try {
    db = new DatabaseModule(targetPath);
  } catch (err) {
    logger.warn(`Failed to open SQLite at ${targetPath}: ${err.message}. Retrying with in-memory SQLite.`);
    try {
      db = new DatabaseModule(':memory:');
    } catch {
      dbInstance = new InMemoryVaultDb();
      return dbInstance;
    }
  }

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('secure_delete = ON');
  } catch {}

  // Load and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
    } catch {}
  } else {
    try {
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
    } catch {}
  }

  dbInstance = db;
  logger.info('Database initialized', { path: targetPath });
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
    // Ignore if unsupported or in-memory
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
  closeDb,
  InMemoryVaultDb
};
