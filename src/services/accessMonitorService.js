const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const { resolveIpLocation } = require('./geoIpService');
const { parseUserAgent } = require('./deviceParserService');
const { evaluateRisk } = require('./riskAnalysisService');
const eventBus = require('./eventBus');
const logger = require('../utils/logger');

/**
 * Records an access event when a file/link is opened, revealed, or challenged.
 */
function recordAccessEvent(fileId, req, accessStatus = 'OPENED', metadata = {}) {
  const db = getDb();
  const now = Date.now();
  const eventId = 'evt_' + crypto.randomBytes(8).toString('hex');

  // Extract client IP and headers safely
  const ip = (req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1') : '127.0.0.1').split(',')[0].trim();
  const headers = req ? req.headers : {};
  const ua = headers['user-agent'] || 'Unknown';
  const referrer = headers['referer'] || headers['referrer'] || null;

  // Resolve approximate location and device
  const geo = resolveIpLocation(ip, headers);
  const device = parseUserAgent(ua);

  // Calculate previous access count from this IP/session
  let prevCount = 0;
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM access_events WHERE file_id = ? AND ip_address = ?').get(fileId, ip);
    if (row) prevCount = row.count;
  } catch (_) {}

  // Generate or retrieve session identifier
  const sessionId = req?.cookies?.vault_visitor_session || crypto.createHash('sha256').update(`${ip}-${ua}`).digest('hex').substring(0, 16);

  // Evaluate risk level & reasons
  const risk = evaluateRisk({
    file_id: fileId,
    ip_address: ip,
    country: geo.country,
    access_status: accessStatus,
    is_bot: device.is_bot,
    session_id: sessionId
  });

  const eventRecord = {
    id: eventId,
    file_id: fileId,
    timestamp: now,
    ip_address: ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    isp_asn: geo.isp_asn,
    browser: device.browser,
    os: device.os,
    device_type: device.device_type,
    user_agent: ua,
    referrer: referrer,
    access_status: accessStatus,
    session_id: sessionId,
    previous_access_count: prevCount,
    risk_level: risk.risk_level,
    risk_reason: risk.risk_reason,
    has_verification: metadata.has_verification ? 1 : 0,
    has_location: metadata.has_location ? 1 : 0
  };

  try {
    db.prepare(`
      INSERT INTO access_events (
        id, file_id, timestamp, ip_address, country, region, city, isp_asn,
        browser, os, device_type, user_agent, referrer, access_status, session_id,
        previous_access_count, risk_level, risk_reason, has_verification, has_location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventRecord.id,
      eventRecord.file_id,
      eventRecord.timestamp,
      eventRecord.ip_address,
      eventRecord.country,
      eventRecord.region,
      eventRecord.city,
      eventRecord.isp_asn,
      eventRecord.browser,
      eventRecord.os,
      eventRecord.device_type,
      eventRecord.user_agent,
      eventRecord.referrer,
      eventRecord.access_status,
      eventRecord.session_id,
      eventRecord.previous_access_count,
      eventRecord.risk_level,
      eventRecord.risk_reason,
      eventRecord.has_verification,
      eventRecord.has_location
    );

    // Increment file metadata access_count
    db.prepare('UPDATE file_metadata_records SET access_count = access_count + 1 WHERE id = ?').run(fileId);

    // Emit live SSE update
    eventBus.emitAccessEvent(eventRecord);

    // If risk is elevated, trigger high-priority alert
    if (risk.risk_level === 'HIGH' || risk.risk_level === 'CRITICAL') {
      eventBus.emitAlert({
        event_id: eventId,
        file_id: fileId,
        timestamp: now,
        ip: ip,
        location: `${geo.city}, ${geo.region}, ${geo.country}`,
        risk_level: risk.risk_level,
        reason: risk.risk_reason
      });
    }

    // Auto-record initial IP approximate location
    const locId = 'loc_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO location_records (
        id, event_id, file_id, timestamp, source, ip_country, ip_region, ip_city,
        latitude, longitude, accuracy, consent_granted, retention_expires_at
      ) VALUES (?, ?, ?, ?, 'IP_APPROXIMATE', ?, ?, ?, NULL, NULL, NULL, 0, NULL)
    `).run(locId, eventId, fileId, now, geo.country, geo.region, geo.city);

  } catch (err) {
    logger.warn('Could not record access event', { error: err.message, fileId });
  }

  return eventRecord;
}

/**
 * Records voluntarily consented browser geolocation data.
 */
function recordBrowserLocation(eventId, fileId, locationData = {}) {
  const db = getDb();
  const now = Date.now();
  const locId = 'loc_' + crypto.randomBytes(8).toString('hex');

  // Configured data retention (default 7 days)
  let retentionDays = 7;
  try {
    const setting = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get('location_retention_days');
    if (setting) retentionDays = parseInt(setting.value, 10) || 7;
  } catch (_) {}
  const retentionExpires = now + (retentionDays * 24 * 60 * 60 * 1000);

  const latitude = typeof locationData.latitude === 'number' ? locationData.latitude : null;
  const longitude = typeof locationData.longitude === 'number' ? locationData.longitude : null;
  const accuracy = typeof locationData.accuracy === 'number' ? locationData.accuracy : null;
  const consentGranted = locationData.consent_granted ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO location_records (
        id, event_id, file_id, timestamp, source, ip_country, ip_region, ip_city,
        latitude, longitude, accuracy, consent_granted, retention_expires_at
      ) VALUES (?, ?, ?, ?, 'BROWSER_CONSENT', NULL, NULL, NULL, ?, ?, ?, ?, ?)
    `).run(locId, eventId, fileId, now, latitude, longitude, accuracy, consentGranted, retentionExpires);

    db.prepare('UPDATE access_events SET has_location = 1 WHERE id = ?').run(eventId);

    // Audit log
    const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, file_id, event_id, action_type, result, details)
      VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)
    `).run(
      auditId,
      now,
      fileId,
      eventId,
      consentGranted ? 'LOCATION_PERMISSION_GRANTED' : 'LOCATION_PERMISSION_DENIED',
      JSON.stringify({ accuracy, retentionDays })
    );

    return { success: true, location_id: locId };
  } catch (err) {
    logger.warn('Failed to record browser location', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Records camera photo verification snapshot.
 */
function recordCameraVerification(eventId, fileId, verificationData = {}) {
  const db = getDb();
  const now = Date.now();
  const verifId = 'verif_' + crypto.randomBytes(8).toString('hex');

  const permission = verificationData.permission === 'GRANTED' ? 'GRANTED' : 'DENIED';
  const imageData = permission === 'GRANTED' ? String(verificationData.image_data || '') : null;
  const deviceInfo = JSON.stringify(verificationData.device_info || {});

  try {
    db.prepare(`
      INSERT INTO verification_records (
        id, event_id, file_id, timestamp, camera_permission, image_data, device_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(verifId, eventId, fileId, now, permission, imageData, deviceInfo);

    if (permission === 'GRANTED') {
      db.prepare('UPDATE access_events SET has_verification = 1 WHERE id = ?').run(eventId);
    }

    // Audit log
    const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, file_id, event_id, action_type, result, details)
      VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)
    `).run(
      auditId,
      now,
      fileId,
      eventId,
      permission === 'GRANTED' ? 'VERIFICATION_CAPTURED' : 'CAMERA_PERMISSION_DENIED',
      JSON.stringify({ permission, has_image: Boolean(imageData) })
    );

    // Real-time notification
    eventBus.emit('verification_update', {
      verif_id: verifId,
      event_id: eventId,
      file_id: fileId,
      permission,
      timestamp: now
    });

    return { success: true, verification_id: verifId };
  } catch (err) {
    logger.warn('Failed to record camera verification', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Cleans up expired location coordinates according to privacy retention policy.
 */
function cleanupExpiredPrivacyData() {
  const db = getDb();
  const now = Date.now();
  try {
    const result = db.prepare('DELETE FROM location_records WHERE retention_expires_at IS NOT NULL AND retention_expires_at <= ?').run(now);
    if (result && result.changes > 0) {
      logger.info(`[Privacy Sweep] Removed ${result.changes} expired location record(s).`);
    }
  } catch (err) {
    logger.warn('Privacy cleanup failed', { error: err.message });
  }
}

module.exports = {
  recordAccessEvent,
  recordBrowserLocation,
  recordCameraVerification,
  cleanupExpiredPrivacyData
};
