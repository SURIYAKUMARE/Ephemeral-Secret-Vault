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
    this.thresholdRecords = new Map();
    this.deadmanRecords = new Map();
    this.receiptRecords = new Map();
    this.canaryRecords = new Map();
    this.policyRecords = new Map();
    this.revealTokenRecords = new Map();
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

    // INSERT INTO threshold_secrets
    if (/^INSERT INTO threshold_secrets/i.test(cleanSql)) {
      return {
        run(id, ciphertext, iv, auth_tag, threshold_k, total_n, expires_at, created_at) {
          self.thresholdRecords.set(id, {
            id,
            ciphertext: Buffer.from(ciphertext),
            iv: Buffer.from(iv),
            auth_tag: Buffer.from(auth_tag),
            threshold_k: Number(threshold_k),
            total_n: Number(total_n),
            redeemed_shares: '[]',
            expires_at: Number(expires_at),
            created_at: Number(created_at)
          });
          return { changes: 1 };
        }
      };
    }

    // SELECT FROM threshold_secrets
    if (/^SELECT .+ FROM threshold_secrets WHERE id = \?/i.test(cleanSql)) {
      return {
        get(targetId, currentTime) {
          const rec = self.thresholdRecords.get(targetId);
          if (!rec) return null;
          if (currentTime && rec.expires_at <= currentTime) return null;
          return { ...rec };
        }
      };
    }

    // UPDATE threshold_secrets
    if (/^UPDATE threshold_secrets SET redeemed_shares = \? WHERE id = \?/i.test(cleanSql)) {
      return {
        run(redeemedJson, targetId) {
          const rec = self.thresholdRecords.get(targetId);
          if (rec) {
            rec.redeemed_shares = redeemedJson;
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // DELETE FROM threshold_secrets WHERE id = ?
    if (/^DELETE FROM threshold_secrets WHERE id = \?/i.test(cleanSql)) {
      return {
        run(targetId) {
          const rec = self.thresholdRecords.get(targetId);
          if (rec) {
            if (Buffer.isBuffer(rec.ciphertext)) rec.ciphertext.fill(0);
            self.thresholdRecords.delete(targetId);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // INSERT INTO secret_policies
    if (/^INSERT INTO secret_policies/i.test(cleanSql)) {
      return {
        run(id, allowed_ips, allowed_countries, client_encrypted, created_at) {
          self.policyRecords.set(id, {
            id,
            allowed_ips,
            allowed_countries,
            client_encrypted: Number(client_encrypted),
            created_at: Number(created_at)
          });
          return { changes: 1 };
        }
      };
    }

    // SELECT FROM secret_policies
    if (/^SELECT .+ FROM secret_policies WHERE id = \?/i.test(cleanSql)) {
      return {
        get(targetId) {
          const rec = self.policyRecords.get(targetId);
          return rec ? { ...rec } : null;
        }
      };
    }

    // DELETE FROM secret_policies
    if (/^DELETE FROM secret_policies WHERE id = \?/i.test(cleanSql)) {
      return {
        run(targetId) {
          const deleted = self.policyRecords.delete(targetId);
          return { changes: deleted ? 1 : 0 };
        }
      };
    }

    // INSERT INTO burn_receipts
    if (/^INSERT INTO burn_receipts/i.test(cleanSql)) {
      return {
        run(id, burned_at, requester_ip_hash, signature, public_key, created_at) {
          self.receiptRecords.set(id, {
            id,
            burned_at,
            requester_ip_hash,
            signature,
            public_key,
            created_at: Number(created_at)
          });
          return { changes: 1 };
        }
      };
    }

    // SELECT FROM burn_receipts
    if (/^SELECT .+ FROM burn_receipts WHERE id = \?/i.test(cleanSql)) {
      return {
        get(targetId) {
          const rec = self.receiptRecords.get(targetId);
          return rec ? { ...rec } : null;
        }
      };
    }

    // INSERT INTO deadman_switches
    if (/^INSERT INTO deadman_switches/i.test(cleanSql)) {
      return {
        run(id, checkin_token, checkin_interval_seconds, last_checkin, beneficiary, triggered, revealed_payload, created_at) {
          self.deadmanRecords.set(id, {
            id,
            checkin_token,
            checkin_interval_seconds: Number(checkin_interval_seconds),
            last_checkin: Number(last_checkin),
            beneficiary,
            triggered: Number(triggered),
            revealed_payload,
            created_at: Number(created_at)
          });
          return { changes: 1 };
        }
      };
    }

    // SELECT FROM deadman_switches WHERE id = ?
    if (/^SELECT .+ FROM deadman_switches WHERE id = \?/i.test(cleanSql)) {
      return {
        get(targetId) {
          const rec = self.deadmanRecords.get(targetId);
          return rec ? { ...rec } : null;
        }
      };
    }

    // SELECT active deadman_switches
    if (/^SELECT .+ FROM deadman_switches WHERE triggered = 0/i.test(cleanSql)) {
      return {
        all() {
          const list = [];
          for (const rec of self.deadmanRecords.values()) {
            if (rec.triggered === 0) list.push({ ...rec });
          }
          return list;
        }
      };
    }

    // UPDATE deadman_switches checkin
    if (/^UPDATE deadman_switches SET last_checkin = \?/i.test(cleanSql)) {
      return {
        run(now, targetId, token) {
          const rec = self.deadmanRecords.get(targetId);
          if (rec && (!token || rec.checkin_token === token)) {
            rec.last_checkin = Number(now);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // UPDATE deadman_switches triggered
    if (/^UPDATE deadman_switches SET triggered = 1/i.test(cleanSql)) {
      return {
        run(payload, targetId) {
          const rec = self.deadmanRecords.get(targetId);
          if (rec) {
            rec.triggered = 1;
            rec.revealed_payload = payload;
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // INSERT INTO canary_traps
    if (/^INSERT INTO canary_traps/i.test(cleanSql)) {
      return {
        run(id, fake_secret, webhook_url, memo, created_at, triggered_count, last_triggered_at) {
          self.canaryRecords.set(id, {
            id,
            fake_secret,
            webhook_url,
            memo,
            created_at: Number(created_at),
            triggered_count: Number(triggered_count || 0),
            last_triggered_at: last_triggered_at ? Number(last_triggered_at) : null
          });
          return { changes: 1 };
        }
      };
    }

    // SELECT FROM canary_traps WHERE id = ?
    if (/^SELECT .+ FROM canary_traps WHERE id = \?/i.test(cleanSql)) {
      return {
        get(targetId) {
          const rec = self.canaryRecords.get(targetId);
          return rec ? { ...rec } : null;
        }
      };
    }

    // UPDATE canary_traps trigger count
    if (/^UPDATE canary_traps SET triggered_count = triggered_count \+ 1/i.test(cleanSql)) {
      return {
        run(now, targetId) {
          const rec = self.canaryRecords.get(targetId);
          if (rec) {
            rec.triggered_count = (rec.triggered_count || 0) + 1;
            rec.last_triggered_at = Number(now);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // INSERT INTO reveal_tokens
    if (/^INSERT INTO reveal_tokens/i.test(cleanSql)) {
      return {
        run(token_hash, vault_id, expires_at, created_at) {
          self.revealTokenRecords.set(token_hash, {
            token_hash,
            vault_id,
            expires_at: Number(expires_at),
            consumed: 0,
            consumed_at: null,
            created_at: Number(created_at)
          });
          return { changes: 1 };
        }
      };
    }

    // UPDATE reveal_tokens SET consumed = 1
    if (/^UPDATE reveal_tokens SET consumed = 1/i.test(cleanSql)) {
      return {
        run(consumed_at, token_hash, vault_id, now) {
          const rec = self.revealTokenRecords.get(token_hash);
          if (rec && rec.vault_id === vault_id && rec.consumed === 0 && rec.expires_at > now) {
            rec.consumed = 1;
            rec.consumed_at = Number(consumed_at);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }

    // INSERT
    if (/^INSERT INTO secrets/i.test(cleanSql)) {
      return {
        run(...args) {
          const [
            id, ciphertext, iv, auth_tag, max_views, views_remaining, expires_at, created_at,
            passphrase_hash, passphrase_salt, failed_attempts, max_failed_attempts,
            duress_hash, duress_salt, cover_secret
          ] = args;
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
            passphrase_salt: passphrase_salt || null,
            failed_attempts: Number(failed_attempts || 0),
            max_failed_attempts: Number(max_failed_attempts || 3),
            duress_hash: duress_hash || null,
            duress_salt: duress_salt || null,
            cover_secret: cover_secret || null
          });
          return { changes: 1 };
        }
      };
    }

    // UPDATE failed_attempts ... RETURNING
    if (/^UPDATE secrets SET failed_attempts = failed_attempts \+ 1/i.test(cleanSql)) {
      return {
        get(targetId, currentTime) {
          const rec = self.records.get(targetId);
          if (!rec) return null;
          if (rec.views_remaining <= 0 || (currentTime && rec.expires_at <= currentTime)) {
            return null;
          }
          if (rec.failed_attempts >= rec.max_failed_attempts) {
            return null;
          }
          rec.failed_attempts += 1;
          const ret = {
            failed_attempts: rec.failed_attempts,
            max_failed_attempts: rec.max_failed_attempts
          };
          if (rec.failed_attempts >= rec.max_failed_attempts) {
            if (Buffer.isBuffer(rec.ciphertext)) rec.ciphertext.fill(0);
            self.records.delete(targetId);
          }
          return ret;
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
    if (/^SELECT passphrase_hash/i.test(cleanSql)) {
      return {
        get(targetId, currentTime) {
          const rec = self.records.get(targetId);
          if (!rec) return null;
          if (rec.views_remaining <= 0 || (currentTime && rec.expires_at <= currentTime)) return null;
          return {
            passphrase_hash: rec.passphrase_hash,
            passphrase_salt: rec.passphrase_salt,
            duress_hash: rec.duress_hash || null,
            duress_salt: rec.duress_salt || null,
            cover_secret: rec.cover_secret || null,
            failed_attempts: rec.failed_attempts || 0,
            max_failed_attempts: rec.max_failed_attempts || 3
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
          passphrase_salt TEXT,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          max_failed_attempts INTEGER NOT NULL DEFAULT 3,
          duress_hash TEXT,
          duress_salt TEXT,
          cover_secret TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_secrets_expiry ON secrets(expires_at);
      `);
    } catch {}
  }

  // Safe migrations for existing databases
  try { db.exec('ALTER TABLE secrets ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE secrets ADD COLUMN max_failed_attempts INTEGER NOT NULL DEFAULT 3;'); } catch {}
  try { db.exec('ALTER TABLE secrets ADD COLUMN duress_hash TEXT;'); } catch {}
  try { db.exec('ALTER TABLE secrets ADD COLUMN duress_salt TEXT;'); } catch {}
  try { db.exec('ALTER TABLE secrets ADD COLUMN cover_secret TEXT;'); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reveal_tokens (
        token_hash TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0,
        consumed_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reveal_tokens_vault ON reveal_tokens(vault_id);
      CREATE INDEX IF NOT EXISTS idx_reveal_tokens_expiry ON reveal_tokens(expires_at);
    `);
  } catch {}

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
