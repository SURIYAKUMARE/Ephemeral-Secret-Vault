const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const logger = require('../utils/logger');
const eventBus = require('./eventBus');

/**
 * Returns aggregated statistics for the Admin Dashboard overview.
 */
function getDashboardStats() {
  const db = getDb();
  const now = Date.now();

  const totalFiles = db.prepare('SELECT COUNT(*) as count FROM file_metadata_records').get()?.count || 0;
  const activeFiles = db.prepare(`
    SELECT COUNT(*) as count FROM file_metadata_records
    WHERE status = 'ACTIVE' AND is_revoked = 0 AND is_disabled = 0 AND expires_at > ? AND views_remaining > 0
  `).get(now)?.count || 0;

  const expiredFiles = db.prepare(`
    SELECT COUNT(*) as count FROM file_metadata_records
    WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at <= ?)
  `).get(now)?.count || 0;

  const burnedFiles = db.prepare("SELECT COUNT(*) as count FROM file_metadata_records WHERE status = 'BURNED'").get()?.count || 0;
  const revokedFiles = db.prepare('SELECT COUNT(*) as count FROM file_metadata_records WHERE is_revoked = 1').get()?.count || 0;

  const totalViews = db.prepare('SELECT SUM(access_count) as total FROM file_metadata_records').get()?.total || 0;
  const totalAccessEvents = db.prepare('SELECT COUNT(*) as count FROM access_events').get()?.count || 0;

  const suspiciousAccesses = db.prepare("SELECT COUNT(*) as count FROM access_events WHERE risk_level IN ('HIGH', 'CRITICAL')").get()?.count || 0;
  const verificationCount = db.prepare("SELECT COUNT(*) as count FROM verification_records WHERE camera_permission = 'GRANTED'").get()?.count || 0;

  // Recent 10 activity records
  const recentEvents = db.prepare(`
    SELECT e.*, f.file_name
    FROM access_events e
    LEFT JOIN file_metadata_records f ON e.file_id = f.id
    ORDER BY e.timestamp DESC
    LIMIT 10
  `).all() || [];

  // Risk distribution
  const riskRows = db.prepare(`
    SELECT risk_level, COUNT(*) as count
    FROM access_events
    GROUP BY risk_level
  `).all() || [];
  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of riskRows) {
    if (riskDistribution[r.risk_level] !== undefined) {
      riskDistribution[r.risk_level] = r.count;
    }
  }

  // Device distribution
  const deviceRows = db.prepare(`
    SELECT device_type, COUNT(*) as count
    FROM access_events
    GROUP BY device_type
  `).all() || [];

  return {
    total_files: totalFiles,
    active_files: activeFiles,
    expired_files: expiredFiles,
    burned_files: burnedFiles,
    revoked_files: revokedFiles,
    total_views: totalViews,
    total_access_attempts: totalAccessEvents,
    suspicious_accesses: suspiciousAccesses,
    verification_count: verificationCount,
    recent_events: recentEvents,
    risk_distribution: riskDistribution,
    device_distribution: deviceRows
  };
}

/**
 * Lists all managed files with filtering, search, and pagination.
 */
function listFiles(filters = {}) {
  const db = getDb();
  const now = Date.now();
  const { search, status, limit = 50, offset = 0 } = filters;

  let query = 'SELECT * FROM file_metadata_records WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (id LIKE ? OR file_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status && status !== 'all') {
    const s = status.toUpperCase();
    if (s === 'ACTIVE') {
      query += ' AND status = "ACTIVE" AND is_revoked = 0 AND is_disabled = 0 AND expires_at > ? AND views_remaining > 0';
      params.push(now);
    } else if (s === 'EXPIRED') {
      query += ' AND (status = "EXPIRED" OR expires_at <= ?)';
      params.push(now);
    } else if (s === 'REVOKED') {
      query += ' AND is_revoked = 1';
    } else if (s === 'DISABLED') {
      query += ' AND is_disabled = 1';
    } else {
      query += ' AND status = ?';
      params.push(s);
    }
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(query).all(...params);

  // Compute live dynamic status
  return rows.map(r => {
    let effectiveStatus = r.status;
    if (r.is_revoked === 1) effectiveStatus = 'REVOKED';
    else if (r.is_disabled === 1) effectiveStatus = 'DISABLED';
    else if (r.views_remaining <= 0) effectiveStatus = 'BURNED';
    else if (r.expires_at <= now) effectiveStatus = 'EXPIRED';

    return {
      ...r,
      effective_status: effectiveStatus,
      is_active: effectiveStatus === 'ACTIVE',
      time_left_seconds: Math.max(0, Math.floor((r.expires_at - now) / 1000))
    };
  });
}

/**
 * Retrieves comprehensive details for a single file including access timeline.
 */
function getFileDetails(fileId) {
  const db = getDb();
  const now = Date.now();
  const file = db.prepare('SELECT * FROM file_metadata_records WHERE id = ?').get(fileId);
  if (!file) return null;

  const accessEvents = db.prepare(`
    SELECT * FROM access_events WHERE file_id = ? ORDER BY timestamp DESC LIMIT 50
  `).all(fileId);

  const verifications = db.prepare(`
    SELECT * FROM verification_records WHERE file_id = ? ORDER BY timestamp DESC
  `).all(fileId);

  const locations = db.prepare(`
    SELECT * FROM location_records WHERE file_id = ? ORDER BY timestamp DESC
  `).all(fileId);

  const auditLogs = db.prepare(`
    SELECT * FROM audit_logs WHERE file_id = ? ORDER BY timestamp DESC
  `).all(fileId);

  let effectiveStatus = file.status;
  if (file.is_revoked === 1) effectiveStatus = 'REVOKED';
  else if (file.is_disabled === 1) effectiveStatus = 'DISABLED';
  else if (file.views_remaining <= 0) effectiveStatus = 'BURNED';
  else if (file.expires_at <= now) effectiveStatus = 'EXPIRED';

  return {
    ...file,
    effective_status: effectiveStatus,
    access_events: accessEvents,
    verifications: verifications,
    locations: locations,
    audit_logs: auditLogs
  };
}

/**
 * Toggles enabled / disabled status for a file without deleting it.
 */
function toggleFileStatus(fileId, adminUser) {
  const db = getDb();
  const file = db.prepare('SELECT * FROM file_metadata_records WHERE id = ?').get(fileId);
  if (!file) return { success: false, error: 'File not found.' };

  const newDisabled = file.is_disabled === 1 ? 0 : 1;
  const newStatus = newDisabled === 1 ? 'DISABLED' : (file.views_remaining <= 0 ? 'BURNED' : (file.expires_at <= Date.now() ? 'EXPIRED' : 'ACTIVE'));

  db.prepare('UPDATE file_metadata_records SET is_disabled = ?, status = ? WHERE id = ?').run(newDisabled, newStatus, fileId);

  // Audit log
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  const action = newDisabled === 1 ? 'FILE_DISABLED' : 'FILE_ENABLED';
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, file_id, action_type, result, details)
    VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
  `).run(auditId, Date.now(), adminUser?.adminId || 'admin', adminUser?.username || 'admin', fileId, action, JSON.stringify({ newDisabled }));

  eventBus.emitFileChange({ fileId, action, newStatus });

  return { success: true, is_disabled: Boolean(newDisabled), status: newStatus };
}

/**
 * Immediately revokes a file access link and safely zeroizes its ciphertext.
 */
function revokeFile(fileId, adminUser) {
  const db = getDb();
  const now = Date.now();
  const file = db.prepare('SELECT * FROM file_metadata_records WHERE id = ?').get(fileId);
  if (!file) return { success: false, error: 'File not found.' };

  // Set revoked in metadata
  db.prepare('UPDATE file_metadata_records SET is_revoked = 1, status = "REVOKED", revoked_at = ? WHERE id = ?').run(now, fileId);

  // Securely delete from core secrets table (Zero-Trace)
  try {
    const secret = db.prepare('SELECT ciphertext FROM secrets WHERE id = ?').get(fileId);
    if (secret && Buffer.isBuffer(secret.ciphertext)) {
      secret.ciphertext.fill(0);
    }
    db.prepare('DELETE FROM secrets WHERE id = ?').run(fileId);
  } catch (_) {}

  // Audit log
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, file_id, action_type, result, details)
    VALUES (?, ?, ?, ?, 'FILE_REVOKED', 'SUCCESS', ?)
  `).run(auditId, now, adminUser?.adminId || 'admin', adminUser?.username || 'admin', fileId, JSON.stringify({ revoked_at: now }));

  eventBus.emitFileChange({ fileId, action: 'FILE_REVOKED', status: 'REVOKED' });

  return { success: true, status: 'REVOKED' };
}

/**
 * Extends the expiration deadline of a file.
 */
function extendFileExpiry(fileId, extendSeconds = 3600, adminUser) {
  const db = getDb();
  const file = db.prepare('SELECT * FROM file_metadata_records WHERE id = ?').get(fileId);
  if (!file) return { success: false, error: 'File not found.' };

  const addedMs = Number(extendSeconds) * 1000;
  const currentExpiry = Math.max(Date.now(), file.expires_at);
  const newExpiry = currentExpiry + addedMs;

  db.prepare('UPDATE file_metadata_records SET expires_at = ?, status = "ACTIVE" WHERE id = ?').run(newExpiry, fileId);

  try {
    db.prepare('UPDATE secrets SET expires_at = ? WHERE id = ?').run(newExpiry, fileId);
  } catch (_) {}

  // Audit log
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, file_id, action_type, result, details)
    VALUES (?, ?, ?, ?, 'FILE_EXTENDED', 'SUCCESS', ?)
  `).run(auditId, Date.now(), adminUser?.adminId || 'admin', adminUser?.username || 'admin', fileId, JSON.stringify({ extendSeconds, newExpiry }));

  eventBus.emitFileChange({ fileId, action: 'FILE_EXTENDED', newExpiry });

  return { success: true, expires_at: newExpiry, formatted: new Date(newExpiry).toISOString() };
}

/**
 * Permanently deletes a file record and wipes its storage.
 */
function deleteFile(fileId, adminUser) {
  const db = getDb();
  const now = Date.now();

  // Securely erase from secrets table
  try {
    const sec = db.prepare('SELECT ciphertext FROM secrets WHERE id = ?').get(fileId);
    if (sec && Buffer.isBuffer(sec.ciphertext)) sec.ciphertext.fill(0);
    db.prepare('DELETE FROM secrets WHERE id = ?').run(fileId);
  } catch (_) {}

  // Mark pruned or delete from metadata
  db.prepare('DELETE FROM file_metadata_records WHERE id = ?').run(fileId);

  // Audit log
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, file_id, action_type, result, details)
    VALUES (?, ?, ?, ?, 'FILE_DELETED', 'SUCCESS', ?)
  `).run(auditId, now, adminUser?.adminId || 'admin', adminUser?.username || 'admin', fileId, JSON.stringify({ deleted_at: now }));

  eventBus.emitFileChange({ fileId, action: 'FILE_DELETED' });

  return { success: true };
}

/**
 * Lists access events with search, filter, and pagination.
 */
function listAccessEvents(filters = {}) {
  const db = getDb();
  const { file_id, risk_level, status, limit = 50, offset = 0 } = filters;

  let query = 'SELECT * FROM access_events WHERE 1=1';
  const params = [];

  if (file_id) {
    query += ' AND file_id = ?';
    params.push(file_id);
  }
  if (risk_level && risk_level !== 'all') {
    query += ' AND risk_level = ?';
    params.push(risk_level.toUpperCase());
  }
  if (status && status !== 'all') {
    query += ' AND access_status = ?';
    params.push(status.toUpperCase());
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  return db.prepare(query).all(...params);
}

/**
 * Lists audit logs with filter and pagination.
 */
function listAuditLogs(filters = {}) {
  const db = getDb();
  const { action_type, file_id, limit = 50, offset = 0 } = filters;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action_type && action_type !== 'all') {
    query += ' AND action_type = ?';
    params.push(action_type.toUpperCase());
  }
  if (file_id) {
    query += ' AND file_id = ?';
    params.push(file_id);
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  return db.prepare(query).all(...params);
}

/**
 * Lists verification records with photos.
 */
function listVerifications(limit = 30) {
  const db = getDb();
  return db.prepare(`
    SELECT v.*, a.ip_address, a.country, a.city, a.browser, a.os
    FROM verification_records v
    LEFT JOIN access_events a ON v.event_id = a.id
    ORDER BY v.timestamp DESC
    LIMIT ?
  `).all(Number(limit));
}

/**
 * Lists location records.
 */
function listLocations(limit = 40) {
  const db = getDb();
  return db.prepare(`
    SELECT l.*, a.browser, a.os, a.device_type, a.access_status
    FROM location_records l
    LEFT JOIN access_events a ON l.event_id = a.id
    ORDER BY l.timestamp DESC
    LIMIT ?
  `).all(Number(limit));
}

/**
 * Retrieves security settings.
 */
function getSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM admin_settings').all() || [];
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

/**
 * Updates admin security settings.
 */
function updateSettings(settingsMap = {}, adminUser) {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  for (const [key, val] of Object.entries(settingsMap)) {
    stmt.run(String(key), String(val), now);
  }

  // Audit log
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, action_type, result, details)
    VALUES (?, ?, ?, ?, 'SETTINGS_UPDATED', 'SUCCESS', ?)
  `).run(auditId, now, adminUser?.adminId || 'admin', adminUser?.username || 'admin', JSON.stringify(settingsMap));

  return { success: true, settings: getSettings() };
}

module.exports = {
  getDashboardStats,
  listFiles,
  getFileDetails,
  toggleFileStatus,
  revokeFile,
  extendFileExpiry,
  deleteFile,
  listAccessEvents,
  listAuditLogs,
  listVerifications,
  listLocations,
  getSettings,
  updateSettings
};
