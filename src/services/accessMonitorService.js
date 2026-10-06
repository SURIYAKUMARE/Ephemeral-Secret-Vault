const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const { resolveIpLocation, lookupIpApiAsync } = require('./geoIpService');
const { reverseGeocode } = require('./reverseGeoService');
const { parseUserAgent } = require('./deviceParserService');
const { evaluateRisk } = require('./riskAnalysisService');
const eventBus = require('./eventBus');
const logger = require('../utils/logger');

/**
 * Safely extracts visitor client IP from various proxy and edge headers.
 */
function extractClientIp(req) {
  if (!req) return '127.0.0.1';
  const headers = req.headers || {};
  const xForwardedFor = headers['x-forwarded-for'];
  if (xForwardedFor) {
    const first = String(xForwardedFor).split(',')[0].trim();
    if (first) return first.replace(/^::ffff:/, '');
  }
  const raw = headers['x-real-ip'] ||
    headers['x-vercel-forwarded-for'] ||
    headers['cf-connecting-ip'] ||
    headers['fastly-client-ip'] ||
    headers['x-cluster-client-ip'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
  return String(raw).replace(/^::ffff:/, '').trim();
}

/**
 * Records an access event when a file/link is opened, revealed, or challenged.
 */
function recordAccessEvent(fileId, req, accessStatus = 'OPENED', metadata = {}) {
  const db = getDb();
  const now = Date.now();
  const eventId = 'evt_' + crypto.randomBytes(8).toString('hex');

  // Extract client IP and headers safely
  const ip = extractClientIp(req);
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

  // Extract GPS / Browser Consented Geolocation data if provided
  const gpsLat = typeof metadata.gps_lat === 'number' ? metadata.gps_lat : (typeof req?.body?.gps_lat === 'number' ? req.body.gps_lat : null);
  const gpsLong = typeof metadata.gps_long === 'number' ? metadata.gps_long : (typeof req?.body?.gps_long === 'number' ? req.body.gps_long : null);
  const gpsAccuracy = typeof metadata.gps_accuracy_m === 'number' ? metadata.gps_accuracy_m : (typeof req?.body?.gps_accuracy_m === 'number' ? req.body.gps_accuracy_m : null);
  const locationSource = metadata.location_source || req?.body?.location_source || (gpsLat !== null ? 'gps' : 'ip_fallback');
  const hasGps = gpsLat !== null && gpsLong !== null;
  const hasLocation = hasGps || Boolean(metadata.has_location) || Boolean(geo.latitude && geo.longitude);

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
    has_location: hasLocation ? 1 : 0,
    latitude: hasGps ? gpsLat : (geo.latitude || null),
    longitude: hasGps ? gpsLong : (geo.longitude || null),
    accuracy: hasGps ? gpsAccuracy : null,
    location_source: locationSource,
    exact_address: metadata.exact_address || null
  };

  try {
    db.prepare(`
      INSERT INTO access_events (
        id, file_id, timestamp, ip_address, country, region, city, isp_asn,
        browser, os, device_type, user_agent, referrer, access_status, session_id,
        previous_access_count, risk_level, risk_reason, has_verification, has_location,
        latitude, longitude, accuracy, location_source, exact_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      eventRecord.has_location,
      eventRecord.latitude,
      eventRecord.longitude,
      eventRecord.accuracy,
      eventRecord.location_source,
      eventRecord.exact_address
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
      ) VALUES (?, ?, ?, ?, 'IP_APPROXIMATE', ?, ?, ?, ?, ?, NULL, 0, NULL)
    `).run(locId, eventId, fileId, now, geo.country, geo.region, geo.city, geo.latitude || null, geo.longitude || null);

    // If consented browser GPS was provided, record BROWSER_CONSENT record and reverse-geocode exact physical address
    if (hasGps) {
      const gpsLocId = 'loc_' + crypto.randomBytes(8).toString('hex');
      let retentionDays = 7;
      try {
        const setting = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get('location_retention_days');
        if (setting) retentionDays = parseInt(setting.value, 10) || 7;
      } catch (_) {}
      const retentionExpires = now + (retentionDays * 24 * 60 * 60 * 1000);

      db.prepare(`
        INSERT INTO location_records (
          id, event_id, file_id, timestamp, source, ip_country, ip_region, ip_city,
          latitude, longitude, accuracy, consent_granted, retention_expires_at
        ) VALUES (?, ?, ?, ?, 'BROWSER_CONSENT', ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(gpsLocId, eventId, fileId, now, geo.country, geo.region, geo.city, gpsLat, gpsLong, gpsAccuracy, retentionExpires);

      // Audit log
      const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, file_id, event_id, action_type, result, details)
        VALUES (?, ?, ?, ?, 'LOCATION_PERMISSION_GRANTED', 'SUCCESS', ?)
      `).run(auditId, now, fileId, eventId, JSON.stringify({ accuracy: gpsAccuracy, latitude: gpsLat, longitude: gpsLong }));

      // Reverse geocode exact physical street address
      reverseGeocode(gpsLat, gpsLong).then((addr) => {
        if (addr && addr.formatted) {
          try {
            const updateDb = getDb();
            updateDb.prepare(`
              UPDATE access_events
              SET exact_address = ?,
                  city = COALESCE(?, city),
                  region = COALESCE(?, region),
                  country = COALESCE(?, country)
              WHERE id = ?
            `).run(addr.formatted, addr.city, addr.state, addr.country, eventId);

            updateDb.prepare(`
              UPDATE location_records
              SET exact_address = ?,
                  ip_city = COALESCE(?, ip_city),
                  ip_region = COALESCE(?, ip_region),
                  ip_country = COALESCE(?, ip_country)
              WHERE event_id = ?
            `).run(addr.formatted, addr.city, addr.state, addr.country, eventId);

            updateDb.prepare(`
              UPDATE access_log
              SET geo_city = COALESCE(?, geo_city),
                  geo_country = COALESCE(?, geo_country)
              WHERE secret_id = ? AND ip_address = ?
            `).run(addr.city, addr.country, fileId, ip);
          } catch (_) {}
        }
      }).catch(() => {});
    }

    // Background asynchronous IP geolocation refinement (for Indian / public IPs)
    if (geo.city === 'City Unknown' || geo.city === 'Approximate Location' || geo.region === 'Region Unknown' || !hasGps) {
      lookupIpApiAsync(ip, (updated) => {
        try {
          const updateDb = getDb();
          updateDb.prepare(`
            UPDATE access_events
            SET country = ?, region = ?, city = ?, isp_asn = ?,
                latitude = COALESCE(latitude, ?),
                longitude = COALESCE(longitude, ?)
            WHERE id = ? AND location_source != 'gps'
          `).run(updated.country, updated.region, updated.city, updated.isp_asn, updated.latitude, updated.longitude, eventId);

          updateDb.prepare(`
            UPDATE location_records
            SET ip_country = ?, ip_region = ?, ip_city = ?,
                latitude = COALESCE(latitude, ?),
                longitude = COALESCE(longitude, ?)
            WHERE event_id = ? AND source = 'IP_APPROXIMATE'
          `).run(updated.country, updated.region, updated.city, updated.latitude, updated.longitude, eventId);

          updateDb.prepare(`
            UPDATE access_log
            SET geo_country = ?, geo_city = ?
            WHERE secret_id = ? AND ip_address = ? AND location_source != 'gps'
          `).run(updated.country, updated.city, fileId, ip);
        } catch (_) {}
      });
    }

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

/**
 * Records exact device GPS coordinates voluntarily transmitted by the visitor.
 * Performs reverse geocoding into street/neighborhood/city/postcode.
 */
async function recordPreciseCoordinates(fileId, req, data = {}) {
  const db = getDb();
  const now = Date.now();
  const ip = extractClientIp(req);
  const lat = typeof data.latitude === 'number' ? data.latitude : (typeof data.gps_lat === 'number' ? data.gps_lat : null);
  const lon = typeof data.longitude === 'number' ? data.longitude : (typeof data.gps_long === 'number' ? data.gps_long : null);
  const accuracy = typeof data.accuracy === 'number' ? data.accuracy : (typeof data.gps_accuracy_m === 'number' ? data.gps_accuracy_m : null);

  if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
    return { success: false, error: 'Invalid coordinates' };
  }

  // Reverse geocode to exact street address
  let addressInfo = null;
  try {
    addressInfo = await reverseGeocode(lat, lon);
  } catch (_) {}

  const exactAddress = addressInfo?.formatted || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  const city = addressInfo?.city || null;
  const region = addressInfo?.state || null;
  const country = addressInfo?.country || null;

  let retentionDays = 7;
  try {
    const setting = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get('location_retention_days');
    if (setting) retentionDays = parseInt(setting.value, 10) || 7;
  } catch (_) {}
  const retentionExpires = now + (retentionDays * 24 * 60 * 60 * 1000);

  // 1. Find the most recent access event for this file and IP
  let eventId = null;
  try {
    const row = db.prepare('SELECT id FROM access_events WHERE file_id = ? AND ip_address = ? ORDER BY timestamp DESC LIMIT 1').get(fileId, ip);
    if (row) eventId = row.id;
  } catch (_) {}

  if (!eventId) {
    try {
      const row = db.prepare('SELECT id FROM access_events WHERE file_id = ? ORDER BY timestamp DESC LIMIT 1').get(fileId);
      if (row) eventId = row.id;
    } catch (_) {}
  }

  if (eventId) {
    try {
      db.prepare(`
        UPDATE access_events
        SET latitude = ?, longitude = ?, accuracy = ?,
            location_source = 'gps', has_location = 1,
            exact_address = ?,
            city = COALESCE(?, city),
            region = COALESCE(?, region),
            country = COALESCE(?, country)
        WHERE id = ?
      `).run(lat, lon, accuracy, exactAddress, city, region, country, eventId);
    } catch (_) {}
  }

  // 2. Insert into location_records
  const locId = 'loc_' + crypto.randomBytes(8).toString('hex');
  try {
    db.prepare(`
      INSERT INTO location_records (
        id, event_id, file_id, timestamp, source, ip_country, ip_region, ip_city,
        latitude, longitude, accuracy, exact_address, consent_granted, retention_expires_at
      ) VALUES (?, ?, ?, ?, 'BROWSER_CONSENT', ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(locId, eventId, fileId, now, country, region, city, lat, lon, accuracy, exactAddress, retentionExpires);
  } catch (_) {}

  // 3. Update access_log
  try {
    db.prepare(`
      UPDATE access_log
      SET gps_lat = ?, gps_long = ?, gps_accuracy_m = ?,
          location_source = 'gps',
          geo_city = COALESCE(?, geo_city),
          geo_country = COALESCE(?, geo_country)
      WHERE secret_id = ?
    `).run(lat, lon, accuracy, city, country, fileId);
  } catch (_) {}

  // 4. Audit log
  try {
    const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, file_id, event_id, action_type, result, details)
      VALUES (?, ?, ?, ?, 'LOCATION_PERMISSION_GRANTED', 'SUCCESS', ?)
    `).run(auditId, now, fileId, eventId, JSON.stringify({ accuracy, latitude: lat, longitude: lon, exact_address: exactAddress }));
  } catch (_) {}

  // 5. Broadcast live SSE update
  try {
    eventBus.emitAccessEvent({
      id: eventId || locId,
      file_id: fileId,
      latitude: lat,
      longitude: lon,
      accuracy,
      location_source: 'gps',
      exact_address: exactAddress,
      city: city || 'Verified Location',
      region: region || '',
      country: country || '',
      google_maps_url: `https://www.google.com/maps?q=${lat},${lon}`
    });
  } catch (_) {}

  return {
    success: true,
    exact_address: exactAddress,
    latitude: lat,
    longitude: lon,
    accuracy,
    city,
    region,
    country,
    google_maps_url: `https://www.google.com/maps?q=${lat},${lon}`
  };
}

/**
 * Retrieves safe access activity history for a specific vault link (for creator).
 */
function getFileAccessActivity(fileId) {
  const db = getDb();
  let events = [];
  try {
    events = db.prepare(`
      SELECT
        ae.id, ae.timestamp, ae.ip_address, ae.country, ae.region, ae.city, ae.isp_asn,
        ae.browser, ae.os, ae.device_type, ae.access_status, ae.has_location,
        COALESCE(ae.exact_address, lr.exact_address) AS exact_address,
        COALESCE(ae.latitude, lr.latitude, al.gps_lat) AS latitude,
        COALESCE(ae.longitude, lr.longitude, al.gps_long) AS longitude,
        COALESCE(ae.accuracy, lr.accuracy, al.gps_accuracy_m) AS accuracy,
        COALESCE(ae.location_source, al.location_source, 'ip_fallback') AS location_source
      FROM access_events ae
      LEFT JOIN location_records lr ON lr.event_id = ae.id AND (lr.exact_address IS NOT NULL OR lr.latitude IS NOT NULL)
      LEFT JOIN access_log al ON al.secret_id = ae.file_id AND al.gps_lat IS NOT NULL
      WHERE ae.file_id = ?
      ORDER BY ae.timestamp DESC
      LIMIT 20
    `).all(fileId) || [];
  } catch (_) {
    try {
      events = db.prepare(`
        SELECT id, timestamp, ip_address, country, region, city, isp_asn, browser, os, device_type, access_status,
               exact_address, latitude, longitude, accuracy, location_source
        FROM access_events
        WHERE file_id = ?
        ORDER BY timestamp DESC
        LIMIT 20
      `).all(fileId) || [];
    } catch (_) {}
  }

  // Fallback to access_log if empty
  if (events.length === 0) {
    try {
      const logs = db.prepare(`
        SELECT id, timestamp, ip_address, geo_city as city, geo_country as country, user_agent, result as access_status,
               gps_lat as latitude, gps_long as longitude, gps_accuracy_m as accuracy, location_source
        FROM access_log
        WHERE secret_id = ?
        ORDER BY id DESC
        LIMIT 20
      `).all(fileId) || [];
      events = logs.map(l => ({
        id: 'log_' + l.id,
        timestamp: !isNaN(Date.parse(l.timestamp)) ? Date.parse(l.timestamp) : Date.now(),
        ip_address: l.ip_address || 'Unknown',
        country: l.country || 'Unknown',
        region: 'Unknown',
        city: l.city || 'Unknown',
        isp_asn: 'Unknown',
        browser: 'Browser',
        os: 'OS',
        device_type: 'Desktop',
        access_status: l.access_status ? l.access_status.toUpperCase() : 'OPENED',
        latitude: l.latitude || null,
        longitude: l.longitude || null,
        accuracy: l.accuracy || null,
        location_source: l.location_source || 'ip_fallback',
        exact_address: null
      }));
    } catch (_) {}
  }

  // Enrich each event with human-friendly location string and Google Maps URL
  const enrichedEvents = events.map(ev => {
    const city = ev.city && ev.city !== 'City Unknown' && ev.city !== 'Unknown' && ev.city !== 'Approximate Location' ? ev.city : '';
    const region = ev.region && ev.region !== 'Region Unknown' && ev.region !== 'Unknown' && ev.region !== 'Unassigned' ? ev.region : '';
    const country = ev.country && ev.country !== 'Unknown' && ev.country !== 'International' ? ev.country : (ev.country || '');

    const locationParts = [city, region, country].filter(Boolean);
    const locationDisplay = ev.exact_address || (locationParts.length > 0 ? locationParts.join(', ') : (city || country || 'Approximate Location'));

    let googleMapsUrl = null;
    if (typeof ev.latitude === 'number' && typeof ev.longitude === 'number' && !isNaN(ev.latitude) && !isNaN(ev.longitude)) {
      googleMapsUrl = `https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`;
    }

    return {
      ...ev,
      location_display: locationDisplay,
      exact_address: ev.exact_address || null,
      google_maps_url: googleMapsUrl
    };
  });

  const latest = enrichedEvents.length > 0 ? enrichedEvents[0] : null;

  return {
    file_id: fileId,
    total_events: enrichedEvents.length,
    latest_access: latest,
    events: enrichedEvents
  };
}

module.exports = {
  recordAccessEvent,
  recordPreciseCoordinates,
  recordBrowserLocation,
  recordCameraVerification,
  cleanupExpiredPrivacyData,
  getFileAccessActivity,
  extractClientIp
};
