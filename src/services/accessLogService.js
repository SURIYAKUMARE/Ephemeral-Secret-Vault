const { getDb } = require('../database/db');
const { resolveIpLocation } = require('./geoIpService');
const { reverseGeocode } = require('./reverseGeoService');
const logger = require('../utils/logger');

/**
 * Records an entry into the access_log table.
 *
 * @param {object} params
 * @param {string} params.secret_id
 * @param {string} [params.ip_address]
 * @param {string} [params.user_agent]
 * @param {number|null} [params.gps_lat]
 * @param {number|null} [params.gps_long]
 * @param {number|null} [params.gps_accuracy_m]
 * @param {'gps'|'ip_fallback'|'denied'} [params.location_source='ip_fallback']
 * @param {'revealed'|'already_burned'|'expired'} [params.result='revealed']
 * @returns {object|null} Inserted log record
 */
function recordAccessLog(params = {}, requestHeaders = {}) {
  const {
    secret_id,
    ip_address = '127.0.0.1',
    user_agent = 'Unknown',
    gps_lat = null,
    gps_long = null,
    gps_accuracy_m = null,
    location_source = 'ip_fallback',
    result = 'revealed',
    headers = requestHeaders
  } = params;

  if (!secret_id) return null;

  const db = getDb();
  const timestamp = new Date().toISOString(); // UTC ISO string

  // Resolve approximate city & country from IP with headers
  const { city, country } = resolveIpLocation(ip_address, headers);

  // Validate ENUMs
  const validLocationSources = ['gps', 'ip_fallback', 'denied'];
  const validResults = ['revealed', 'already_burned', 'expired'];

  const safeLocationSource = validLocationSources.includes(location_source) ? location_source : 'ip_fallback';
  const safeResult = validResults.includes(result) ? result : 'revealed';

  // Ensure lat/long/accuracy are valid numbers if location_source is gps
  const lat = (safeLocationSource === 'gps' && typeof gps_lat === 'number' && !isNaN(gps_lat)) ? gps_lat : null;
  const long = (safeLocationSource === 'gps' && typeof gps_long === 'number' && !isNaN(gps_long)) ? gps_long : null;
  const acc = (safeLocationSource === 'gps' && typeof gps_accuracy_m === 'number' && !isNaN(gps_accuracy_m)) ? gps_accuracy_m : null;

  try {
    const stmt = db.prepare(`
      INSERT INTO access_log (
        secret_id, timestamp, ip_address, geo_city, geo_country,
        gps_lat, gps_long, gps_accuracy_m, location_source, user_agent, result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      secret_id,
      timestamp,
      ip_address,
      city,
      country,
      lat,
      long,
      acc,
      safeLocationSource,
      user_agent,
      safeResult
    );

    // If exact GPS coordinates provided, reverse geocode to refine geo_city & geo_country
    if (lat !== null && long !== null) {
      reverseGeocode(lat, long).then((geo) => {
        if (geo && geo.city) {
          try {
            const udb = getDb();
            udb.prepare('UPDATE access_log SET geo_city = ?, geo_country = ? WHERE id = ?')
              .run(geo.city, geo.country, info.lastInsertRowid);
          } catch (_) {}
        }
      }).catch(() => {});
    }

    // Update admin_secrets status if burned or expired
    if (safeResult === 'revealed') {
      try {
        db.prepare("UPDATE admin_secrets SET views_remaining = views_remaining - 1 WHERE id = ?").run(secret_id);
      } catch (_) {}
    } else if (safeResult === 'already_burned') {
      try {
        db.prepare("UPDATE admin_secrets SET status = 'burned', views_remaining = 0 WHERE id = ?").run(secret_id);
      } catch (_) {}
    } else if (safeResult === 'expired') {
      try {
        db.prepare("UPDATE admin_secrets SET status = 'expired' WHERE id = ?").run(secret_id);
      } catch (_) {}
    }

    return {
      id: info.lastInsertRowid,
      secret_id,
      timestamp,
      ip_address,
      geo_city: city,
      geo_country: country,
      gps_lat: lat,
      gps_long: long,
      gps_accuracy_m: acc,
      location_source: safeLocationSource,
      user_agent,
      result: safeResult
    };
  } catch (err) {
    logger.warn('Failed to insert access_log entry', { error: err.message, secret_id });
    return null;
  }
}

/**
 * Auto-deletes access_log rows older than configured retention period (default 30 days).
 */
function cleanupExpiredAccessLogs() {
  const retentionDays = parseInt(process.env.ACCESS_LOG_RETENTION_DAYS, 10) || 30;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM access_log WHERE timestamp < ?').run(cutoffDate);
    if (result && result.changes > 0) {
      logger.info(`[Sweeper] Auto-deleted ${result.changes} access log(s) older than ${retentionDays} days.`);
    }
    return result.changes;
  } catch (err) {
    logger.warn('Failed to auto-delete expired access logs', { error: err.message });
    return 0;
  }
}

/**
 * Returns all access_log entries for a specific secret.
 */
function getAccessLogsBySecret(secretId) {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM access_log WHERE secret_id = ? ORDER BY timestamp DESC').all(secretId);
  } catch (err) {
    logger.warn('Failed to query access_log for secret', { error: err.message, secretId });
    return [];
  }
}

/**
 * Returns all secrets managed by the system for the admin dashboard list view.
 */
function getAllSecrets() {
  const db = getDb();
  const now = Date.now();

  try {
    // Sync any newly created secrets directly from secrets table
    db.prepare(`
      INSERT OR IGNORE INTO admin_secrets (id, created_at, expires_at, max_views, views_remaining, status)
      SELECT id, created_at, expires_at, max_views, views_remaining, 'active' FROM secrets;
    `).run();

    const rows = db.prepare(`
      SELECT 
        s.id,
        s.created_at,
        s.expires_at,
        s.max_views,
        s.views_remaining,
        s.status,
        (SELECT COUNT(*) FROM access_log a WHERE a.secret_id = s.id) AS access_count
      FROM admin_secrets s
      ORDER BY s.created_at DESC
    `).all();

    return rows.map((row) => {
      let liveStatus = row.status;
      if (liveStatus === 'active') {
        if (row.expires_at <= now) {
          liveStatus = 'expired';
        } else if (row.views_remaining <= 0) {
          liveStatus = 'burned';
        }
      }
      return {
        ...row,
        status: liveStatus
      };
    });
  } catch (err) {
    logger.warn('Failed to query admin secrets', { error: err.message });
    return [];
  }
}

/**
 * Retrieves details for a specific secret along with its access logs.
 */
function getSecretDetail(secretId) {
  const db = getDb();
  const now = Date.now();

  try {
    let secret = db.prepare('SELECT * FROM admin_secrets WHERE id = ?').get(secretId);
    if (!secret) {
      // Check if it exists in secrets table
      const secRow = db.prepare('SELECT id, created_at, expires_at, max_views, views_remaining FROM secrets WHERE id = ?').get(secretId);
      if (secRow) {
        secret = { ...secRow, status: 'active' };
      }
    }

    if (!secret) return null;

    let liveStatus = secret.status;
    if (liveStatus === 'active') {
      if (secret.expires_at <= now) {
        liveStatus = 'expired';
      } else if (secret.views_remaining <= 0) {
        liveStatus = 'burned';
      }
    }

    const logs = getAccessLogsBySecret(secretId);

    return {
      secret: {
        ...secret,
        status: liveStatus
      },
      logs
    };
  } catch (err) {
    logger.warn('Failed to query secret detail', { error: err.message, secretId });
    return null;
  }
}

/**
 * Manually burns and revokes a secret early from the admin dashboard.
 */
function burnSecretAdmin(secretId, adminUser = 'admin') {
  const db = getDb();
  const now = Date.now();

  try {
    // 1. Zero out and delete from secrets table if still present
    const row = db.prepare('SELECT ciphertext FROM secrets WHERE id = ?').get(secretId);
    if (row && Buffer.isBuffer(row.ciphertext)) {
      row.ciphertext.fill(0);
    }
    db.prepare('DELETE FROM secrets WHERE id = ?').run(secretId);

    // 2. Mark burned in admin_secrets
    db.prepare("UPDATE admin_secrets SET status = 'burned', views_remaining = 0 WHERE id = ?").run(secretId);

    // 3. Record in access_log as revoked/already_burned
    recordAccessLog({
      secret_id: secretId,
      ip_address: '127.0.0.1 (Admin)',
      user_agent: `Admin Manual Revocation by ${adminUser}`,
      location_source: 'denied',
      result: 'already_burned'
    });

    logger.info(`[Admin] Secret ${secretId} manually burned early by admin`);
    return { success: true, message: 'Secret burned and permanently revoked.' };
  } catch (err) {
    logger.error('Failed to manually burn secret', { error: err.message, secretId });
    throw err;
  }
}

/**
 * Registers a newly created secret into admin_secrets tracking table.
 */
function trackCreatedSecret(id, createdAt, expiresAt, maxViews) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO admin_secrets (id, created_at, expires_at, max_views, views_remaining, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(id, createdAt, expiresAt, maxViews, maxViews);
  } catch (_) {}
}

module.exports = {
  recordAccessLog,
  cleanupExpiredAccessLogs,
  getAccessLogsBySecret,
  getAllSecrets,
  getSecretDetail,
  burnSecretAdmin,
  trackCreatedSecret,
  resolveIpLocation
};
