'use strict';

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {
  authenticateAdmin,
  createAdminSession,
  invalidateSession,
  validateSession
} = require('../services/adminAuthService');
const accessLogService = require('../services/accessLogService');
const adminFileService = require('../services/adminFileService');
const { parseCookies } = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const eventBus = require('../services/eventBus');
const { getDb } = require('../database/db');

const publicDir = fs.existsSync(path.join(process.cwd(), 'public'))
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '..', '..', 'public');

// ─── SSE Clients Store ────────────────────────────────────────────────────────
const sseClients = new Set();

// Push events to all connected SSE admin clients
function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch (_) { sseClients.delete(client); }
  }
}

// Wire up eventBus → SSE broadcast
eventBus.on('file_change', (data) => broadcastSSE('file_change', data));
eventBus.on('access_event', (data) => broadcastSSE('access_event', data));

// ─── Page Views ───────────────────────────────────────────────────────────────

function getAdminLoginView(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.admin_token) {
    const session = validateSession(cookies.admin_token, req);
    if (session) return res.redirect('/admin');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res.sendFile(path.join(publicDir, 'admin-login.html'));
}

function getAdminDashboardView(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res.sendFile(path.join(publicDir, 'admin.html'));
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function login(req, res) {
  const { username, password, totp_code } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const auth = authenticateAdmin(username, password, totp_code);
  if (!auth.success) {
    logger.warn('Failed admin login attempt', { username, ip: req.ip });
    // Write FAILED_ADMIN_LOGIN audit log
    try {
      const db = getDb();
      const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
      const ip = req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : (req.ip || '127.0.0.1');
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, admin_username, action_type, result, details)
        VALUES (?, ?, ?, 'FAILED_ADMIN_LOGIN', 'FAILURE', ?)
      `).run(auditId, Date.now(), username,
        JSON.stringify({ ip, ua: req.headers['user-agent'] || 'Unknown', reason: auth.error }));
    } catch (_) {}
    return res.status(401).json({ error: auth.error || 'Invalid credentials.', require_2fa: Boolean(auth.require_2fa) });
  }

  const session = createAdminSession(auth.user.id, req);
  res.cookie('admin_token', session.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });

  // Write ADMIN_LOGIN audit log
  try {
    const db = getDb();
    const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
    const ip = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.ip || '127.0.0.1');
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, action_type, result, details)
      VALUES (?, ?, ?, ?, 'ADMIN_LOGIN', 'SUCCESS', ?)
    `).run(auditId, Date.now(), auth.user.id, auth.user.username,
      JSON.stringify({ ip, ua: req.headers['user-agent'] || 'Unknown' }));
  } catch (_) {}

  logger.info('Admin logged in', { username: auth.user.username });
  return res.status(200).json({ success: true, token: session.sessionId, user: auth.user });
}

function logout(req, res) {
  const token = req.adminToken || parseCookies(req.headers.cookie).admin_token;
  if (token) {
    // Get session info before invalidating for audit log
    const session = validateSession(token, req);
    invalidateSession(token);
    // Write ADMIN_LOGOUT audit log
    try {
      const db = getDb();
      const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
      const ip = req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : (req.ip || '127.0.0.1');
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, admin_id, admin_username, action_type, result, details)
        VALUES (?, ?, ?, ?, 'ADMIN_LOGOUT', 'SUCCESS', ?)
      `).run(auditId, Date.now(),
        session?.adminId || 'admin',
        session?.username || 'admin',
        JSON.stringify({ ip }));
    } catch (_) {}
  } else {
    invalidateSession(token);
  }
  res.clearCookie('admin_token', { path: '/' });
  return res.status(200).json({ success: true });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

function getDashboardStats(req, res) {
  try {
    const stats = adminFileService.getDashboardStats();
    return res.json({ success: true, ...stats });
  } catch (err) {
    logger.error('getDashboardStats error', { error: err.message });
    return res.status(500).json({ error: 'Failed to load dashboard stats.' });
  }
}

/** Legacy /api/admin/stats  */
function getStats(req, res) {
  try {
    const secrets = accessLogService.getAllSecrets();
    let totalViews = 0, activeCount = 0, expiredCount = 0, burnedCount = 0;
    for (const s of secrets) {
      totalViews += (s.access_count || 0);
      if (s.status === 'active') activeCount++;
      else if (s.status === 'expired') expiredCount++;
      else if (s.status === 'burned') burnedCount++;
    }
    return res.json({
      success: true,
      stats: { totalSecrets: secrets.length, activeSecrets: activeCount, expiredSecrets: expiredCount, burnedSecrets: burnedCount, totalViews }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to calculate stats.' });
  }
}

// ─── Files ────────────────────────────────────────────────────────────────────

function listFiles(req, res) {
  try {
    const { search, status, limit = 50, offset = 0 } = req.query;
    const files = adminFileService.listFiles({ search, status, limit: +limit, offset: +offset });
    return res.json({ success: true, files, total: files.length });
  } catch (err) {
    logger.error('listFiles error', { error: err.message });
    return res.status(500).json({ error: 'Failed to list files.' });
  }
}

function getFileDetails(req, res) {
  try {
    const { id } = req.params;
    const file = adminFileService.getFileDetails(id);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    return res.json({ success: true, file });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch file details.' });
  }
}

function toggleFileStatus(req, res) {
  try {
    const result = adminFileService.toggleFileStatus(req.params.id, req.admin);
    if (!result.success) return res.status(404).json(result);
    broadcastSSE('file_change', { fileId: req.params.id, action: result.is_disabled ? 'FILE_DISABLED' : 'FILE_ENABLED', status: result.status });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Toggle failed.' });
  }
}

function revokeFile(req, res) {
  try {
    const result = adminFileService.revokeFile(req.params.id, req.admin);
    if (!result.success) return res.status(404).json(result);
    broadcastSSE('file_change', { fileId: req.params.id, action: 'FILE_REVOKED', status: 'REVOKED' });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Revocation failed.' });
  }
}

function extendFileExpiry(req, res) {
  try {
    const { extend_seconds = 86400 } = req.body || {};
    const result = adminFileService.extendFileExpiry(req.params.id, +extend_seconds, req.admin);
    if (!result.success) return res.status(404).json(result);
    broadcastSSE('file_change', { fileId: req.params.id, action: 'FILE_EXTENDED', expires_at: result.expires_at });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Extend expiry failed.' });
  }
}

function deleteFile(req, res) {
  try {
    const result = adminFileService.deleteFile(req.params.id, req.admin);
    broadcastSSE('file_change', { fileId: req.params.id, action: 'FILE_DELETED' });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Delete failed.' });
  }
}

// ─── Legacy Secrets (backward compat) ─────────────────────────────────────────

function getAllSecrets(req, res) {
  try {
    const secrets = accessLogService.getAllSecrets();
    return res.json({ success: true, secrets });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve secrets.' });
  }
}

function getSecretDetail(req, res) {
  try {
    const detail = accessLogService.getSecretDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Secret not found.' });
    return res.json({ success: true, secret: detail.secret, logs: detail.logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve secret details.' });
  }
}

function burnSecretEarly(req, res) {
  try {
    const result = accessLogService.burnSecretAdmin(req.params.id, req.admin?.username || 'admin');
    broadcastSSE('file_change', { fileId: req.params.id, action: 'FILE_BURNED', status: 'BURNED' });
    return res.json({ success: true, message: result.message });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to burn secret.' });
  }
}

// ─── Access Events ────────────────────────────────────────────────────────────

function listAccessEvents(req, res) {
  try {
    const { file_id, risk_level, status, limit = 50, offset = 0 } = req.query;
    const events = adminFileService.listAccessEvents({ file_id, risk_level, status, limit: +limit, offset: +offset });
    return res.json({ success: true, events, total: events.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list access events.' });
  }
}

function getAccessEventDetail(req, res) {
  try {
    const db = getDb();
    const event = db.prepare('SELECT * FROM access_events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const verifications = db.prepare('SELECT * FROM verification_records WHERE event_id = ?').all(req.params.id);
    const locations = db.prepare('SELECT * FROM location_records WHERE event_id = ?').all(req.params.id);
    const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE event_id = ? ORDER BY timestamp DESC').all(req.params.id);

    return res.json({ success: true, event, verifications, locations, audit_logs: auditLogs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve event detail.' });
  }
}

// ─── Verifications ────────────────────────────────────────────────────────────

function listVerifications(req, res) {
  try {
    const limit = +(req.query.limit || 30);
    const verifs = adminFileService.listVerifications(limit);
    return res.json({ success: true, verifications: verifs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list verifications.' });
  }
}

/**
 * Called by the viewer browser when they grant camera permission.
 * Stores the captured image associated with the access event.
 */
function submitVerification(req, res) {
  try {
    const { event_id, file_id, camera_permission, image_data, device_info } = req.body || {};
    if (!event_id || !file_id) {
      return res.status(400).json({ error: 'event_id and file_id are required.' });
    }

    const db = getDb();
    const id = 'verif_' + crypto.randomBytes(10).toString('hex');
    const ts = Date.now();

    // Validate camera_permission value
    const perm = (camera_permission === 'GRANTED' || camera_permission === 'granted') ? 'GRANTED' : 'DENIED';

    // Limit image_data size (max 2MB base64)
    const safeImage = (typeof image_data === 'string' && image_data.length < 2 * 1024 * 1024) ? image_data : null;

    db.prepare(`
      INSERT INTO verification_records (id, event_id, file_id, timestamp, camera_permission, image_data, device_info)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, event_id, file_id, ts, perm, safeImage, JSON.stringify(device_info || {}));

    // Audit log
    const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
    const actionType = perm === 'GRANTED' ? 'CAMERA_PERMISSION_GRANTED' : 'CAMERA_PERMISSION_DENIED';
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, file_id, event_id, action_type, result, details)
      VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)
    `).run(auditId, ts, file_id, event_id, actionType, JSON.stringify({ camera_permission: perm }));

    // Broadcast to admin dashboard
    broadcastSSE('verification', { id, event_id, file_id, camera_permission: perm, timestamp: ts });

    return res.json({ success: true, id });
  } catch (err) {
    logger.error('submitVerification error', { error: err.message });
    return res.status(500).json({ error: 'Failed to record verification.' });
  }
}

// ─── Locations ────────────────────────────────────────────────────────────────

function listLocations(req, res) {
  try {
    const limit = +(req.query.limit || 40);
    const locations = adminFileService.listLocations(limit);
    return res.json({ success: true, locations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list locations.' });
  }
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

function listAuditLogs(req, res) {
  try {
    const { action_type, file_id, limit = 50, offset = 0 } = req.query;
    const logs = adminFileService.listAuditLogs({ action_type, file_id, limit: +limit, offset: +offset });
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list audit logs.' });
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function getSettings(req, res) {
  try {
    const settings = adminFileService.getSettings();
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load settings.' });
  }
}

function updateSettings(req, res) {
  try {
    const settingsMap = req.body || {};
    if (typeof settingsMap !== 'object' || Array.isArray(settingsMap)) {
      return res.status(400).json({ error: 'Invalid settings format.' });
    }
    const result = adminFileService.updateSettings(settingsMap, req.admin);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
}

// ─── SSE Real-time Stream ─────────────────────────────────────────────────────

function streamEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); sseClients.delete(res); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
}

// ─── Unified Vaults API ───────────────────────────────────────────────────────

/**
 * GET /api/admin/vaults
 * Returns unified vault list: secrets + file_metadata + access_log IP info.
 * NEVER returns ciphertext or plaintext secret content.
 */
function listVaults(req, res) {
  try {
    const db = getDb();
    const now = Date.now();
    const { search = '', status = 'all', limit = 100, offset = 0 } = req.query;

    // Build a unified list from admin_secrets joined with access_log for IP
    let query = `
      SELECT
        s.id,
        s.created_at,
        s.expires_at,
        s.max_views,
        s.views_remaining,
        s.status,
        (SELECT COUNT(*) FROM access_log a WHERE a.secret_id = s.id) AS access_count,
        (SELECT a.ip_address FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id ASC LIMIT 1) AS creator_ip,
        (SELECT a.user_agent FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id ASC LIMIT 1) AS creator_ua,
        (SELECT a.timestamp FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id ASC LIMIT 1) AS first_access_at,
        (SELECT a.ip_address FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id DESC LIMIT 1) AS last_ip,
        (SELECT a.timestamp FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id DESC LIMIT 1) AS last_access_at,
        (SELECT a.geo_country FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id ASC LIMIT 1) AS creator_country,
        (SELECT a.geo_city FROM access_log a WHERE a.secret_id = s.id ORDER BY a.id ASC LIMIT 1) AS creator_city
      FROM admin_secrets s
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (s.id LIKE ?)';
      params.push(`%${search}%`);
    }

    if (status && status !== 'all') {
      const s = status.toLowerCase();
      if (s === 'active') {
        query += ' AND s.status = "active" AND s.expires_at > ? AND s.views_remaining > 0';
        params.push(now);
      } else if (s === 'expired') {
        query += ' AND (s.status = "expired" OR s.expires_at <= ?)';
        params.push(now);
      } else if (s === 'burned') {
        query += ' AND (s.status = "burned" OR s.views_remaining <= 0)';
      } else {
        query += ' AND s.status = ?';
        params.push(s);
      }
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    // Also sync latest from secrets table
    try {
      db.prepare(`
        INSERT OR IGNORE INTO admin_secrets (id, created_at, expires_at, max_views, views_remaining, status)
        SELECT id, created_at, expires_at, max_views, views_remaining, 'active' FROM secrets
      `).run();
    } catch (_) {}

    const rows = db.prepare(query).all(...params);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM admin_secrets
      WHERE 1=1
    `).get()?.count || 0;

    // Compute live status, mask IP partially
    const vaults = rows.map(r => {
      let liveStatus = r.status || 'active';
      if (liveStatus === 'active') {
        if (r.expires_at <= now) liveStatus = 'expired';
        else if (r.views_remaining <= 0) liveStatus = 'burned';
      }

      // Partially mask IP for display (show first 2 octets)
      const maskIp = (ip) => {
        if (!ip) return null;
        const parts = String(ip).split('.');
        if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
        return ip.length > 8 ? ip.slice(0, 8) + '…' : ip;
      };

      return {
        id: r.id,
        created_at: r.created_at,
        expires_at: r.expires_at,
        max_views: r.max_views,
        views_remaining: r.views_remaining,
        access_count: r.access_count || 0,
        status: liveStatus,
        creator_ip_masked: maskIp(r.creator_ip),
        creator_ip_full: r.creator_ip,  // full IP only in detail view
        creator_country: r.creator_country,
        creator_city: r.creator_city,
        creator_ua: r.creator_ua,
        last_ip_masked: maskIp(r.last_ip),
        last_access_at: r.last_access_at,
        first_access_at: r.first_access_at,
        time_left_seconds: Math.max(0, Math.floor((r.expires_at - now) / 1000)),
        vault_url: `/view/${r.id}`
      };
    });

    return res.json({ success: true, vaults, total });
  } catch (err) {
    logger.error('listVaults error', { error: err.message });
    return res.status(500).json({ error: 'Failed to list vaults.' });
  }
}

/**
 * GET /api/admin/vaults/:id
 * Returns full vault metadata + full IPs + access log.
 * NEVER returns ciphertext.
 */
function getVaultDetail(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const now = Date.now();

    const secret = db.prepare(`
      SELECT id, created_at, expires_at, max_views, views_remaining, status
      FROM admin_secrets WHERE id = ?
    `).get(id);

    if (!secret) {
      // Try secrets table
      const sec = db.prepare(`
        SELECT id, created_at, expires_at, max_views, views_remaining
        FROM secrets WHERE id = ?
      `).get(id);
      if (!sec) return res.status(404).json({ error: 'Vault not found.' });
      secret = { ...sec, status: 'active' };
    }

    const accessLogs = db.prepare(`
      SELECT id, timestamp, ip_address, geo_city, geo_country, user_agent, result, location_source
      FROM access_log WHERE secret_id = ?
      ORDER BY id DESC LIMIT 100
    `).all(id);

    const auditLogs = db.prepare(`
      SELECT id, timestamp, admin_username, action_type, result, details
      FROM audit_logs WHERE file_id = ?
      ORDER BY timestamp DESC LIMIT 50
    `).all(id);

    let liveStatus = secret.status;
    if (liveStatus === 'active') {
      if (secret.expires_at <= now) liveStatus = 'expired';
      else if (secret.views_remaining <= 0) liveStatus = 'burned';
    }

    return res.json({
      success: true,
      vault: {
        id: secret.id,
        created_at: secret.created_at,
        expires_at: secret.expires_at,
        max_views: secret.max_views,
        views_remaining: secret.views_remaining,
        status: liveStatus,
        vault_url: `/view/${secret.id}`
      },
      access_logs: accessLogs,
      audit_logs: auditLogs
    });
  } catch (err) {
    logger.error('getVaultDetail error', { error: err.message });
    return res.status(500).json({ error: 'Failed to get vault detail.' });
  }
}

/**
 * DELETE /api/admin/vaults/:id
 * Permanently burns a vault. Requires admin session.
 * Records ADMIN_BURN audit event. Never touches plaintext.
 */
function burnVault(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const adminUser = req.admin;
    const adminIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.ip || '127.0.0.1');
    const now = Date.now();

    // 1. Zero out and delete from encrypted secrets table
    try {
      const sec = db.prepare('SELECT ciphertext FROM secrets WHERE id = ?').get(id);
      if (sec && Buffer.isBuffer(sec.ciphertext)) sec.ciphertext.fill(0);
      db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
    } catch (_) {}

    // 2. Delete from threshold_secrets if present
    try { db.prepare('DELETE FROM threshold_secrets WHERE id = ?').run(id); } catch (_) {}

    // 3. Mark admin_secrets as burned
    db.prepare(`
      UPDATE admin_secrets SET status = 'burned', views_remaining = 0 WHERE id = ?
    `).run(id);

    // 4. Mark file_metadata as revoked/burned if present
    try {
      db.prepare(`
        UPDATE file_metadata_records SET status = 'BURNED', is_revoked = 1, revoked_at = ? WHERE id = ?
      `).run(now, id);
    } catch (_) {}

    // 5. Write immutable ADMIN_BURN audit log
    const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO audit_logs
        (id, timestamp, admin_id, admin_username, file_id, action_type, result, details)
      VALUES (?, ?, ?, ?, ?, 'ADMIN_BURN', 'SUCCESS', ?)
    `).run(
      auditId, now,
      adminUser?.adminId || 'admin',
      adminUser?.username || 'admin',
      id,
      JSON.stringify({
        vault_id: id,
        burned_by: adminUser?.username || 'admin',
        admin_ip: adminIp,
        burned_at: new Date(now).toISOString()
      })
    );

    // 6. Broadcast SSE
    broadcastSSE('file_change', { fileId: id, action: 'ADMIN_BURN', status: 'BURNED' });

    logger.info('Admin burned vault', { vault_id: id, admin: adminUser?.username, ip: adminIp });

    return res.json({
      success: true,
      message: 'Vault permanently destroyed. All encrypted records purged.',
      vault_id: id,
      burned_at: new Date(now).toISOString()
    });
  } catch (err) {
    logger.error('burnVault error', { error: err.message });
    return res.status(500).json({ error: 'Failed to burn vault.' });
  }
}

module.exports = {
  getAdminLoginView,
  getAdminDashboardView,
  login,
  logout,
  getDashboardStats,
  getStats,
  listFiles,
  getFileDetails,
  toggleFileStatus,
  revokeFile,
  extendFileExpiry,
  deleteFile,
  getAllSecrets,
  getSecretDetail,
  burnSecretEarly,
  listAccessEvents,
  getAccessEventDetail,
  listVerifications,
  submitVerification,
  listLocations,
  listAuditLogs,
  getSettings,
  updateSettings,
  streamEvents,
  // Vaults unified API
  listVaults,
  getVaultDetail,
  burnVault
};
