const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const app = require('../src/app');
const { getDb } = require('../src/database/db');
const { recordAccessLog, cleanupExpiredAccessLogs, getAccessLogsBySecret, getAllSecrets, getSecretDetail, burnSecretAdmin } = require('../src/services/accessLogService');

describe('Consent-Based Access Log & Admin Dashboard Test Suite', () => {
  let server;
  let baseUrl;
  let adminCookie = '';

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Consent Notice Front-End Requirements
  test('Viewer Flow: view.html contains exact required consent notice text', () => {
    const viewHtml = fs.readFileSync(path.join(__dirname, '../public/view.html'), 'utf8');
    const requiredNotice = "Opening this secret will log your access (timestamp, device info) for the sender's security records. We'll also ask your browser for your precise location — you can allow or deny this.";
    assert.ok(viewHtml.includes(requiredNotice), 'view.html must contain the exact consent notice text');
    assert.ok(viewHtml.includes('consent-continue-btn'), 'view.html must contain the Continue button');
    assert.ok(viewHtml.includes('consent-modal'), 'view.html must contain the consent modal container');
  });

  test('Constraint Check: Zero camera/photo capture mechanisms exist in viewer flow', () => {
    const viewJs = fs.readFileSync(path.join(__dirname, '../public/js/view.js'), 'utf8');
    const viewHtml = fs.readFileSync(path.join(__dirname, '../public/view.html'), 'utf8');
    assert.equal(viewJs.includes('getUserMedia'), false, 'view.js must NOT access camera/media devices');
    assert.equal(viewJs.includes('takePhoto'), false, 'view.js must NOT take photos');
    assert.equal(viewHtml.includes('video id="camera'), false, 'view.html must NOT contain video/camera elements');
  });

  // 2. Logging on Reveal & Geolocation Recording
  test('Logging: Precise GPS location is recorded when granted by viewer', async () => {
    // 1. Create a secret
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'CONFIDENTIAL_GPS_TEST_DATA', ttl_seconds: 3600, max_views: 1 })
    });
    const secretData = await createRes.json();
    assert.ok(secretData.id);

    // 2. Burn / reveal with GPS payload
    const burnRes = await fetch(`${baseUrl}/api/secret/${secretData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 TestBrowser' },
      body: JSON.stringify({
        location_source: 'gps',
        gps_lat: 37.7749,
        gps_long: -122.4194,
        gps_accuracy_m: 14.2
      })
    });
    assert.equal(burnRes.status, 200);
    const burnData = await burnRes.json();
    assert.equal(burnData.secret, 'CONFIDENTIAL_GPS_TEST_DATA');

    // 3. Inspect access_log entry in database
    const db = getDb();
    const log = db.prepare('SELECT * FROM access_log WHERE secret_id = ?').get(secretData.id);
    assert.ok(log, 'Access log record must exist in access_log table');
    assert.equal(log.location_source, 'gps');
    assert.equal(log.result, 'revealed');
    assert.ok(Math.abs(log.gps_lat - 37.7749) < 0.001);
    assert.ok(Math.abs(log.gps_long - (-122.4194)) < 0.001);
    assert.ok(Math.abs(log.gps_accuracy_m - 14.2) < 0.1);
    assert.ok(log.timestamp.includes('T')); // ISO UTC
  });

  test('Logging: Fallback is recorded when location is denied by viewer', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'CONFIDENTIAL_DENIED_TEST_DATA', ttl_seconds: 3600, max_views: 1 })
    });
    const secretData = await createRes.json();

    const burnRes = await fetch(`${baseUrl}/api/secret/${secretData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 TestBrowser' },
      body: JSON.stringify({
        location_source: 'denied'
      })
    });
    assert.equal(burnRes.status, 200);

    const db = getDb();
    const log = db.prepare('SELECT * FROM access_log WHERE secret_id = ?').get(secretData.id);
    assert.ok(log);
    assert.equal(log.location_source, 'denied');
    assert.equal(log.result, 'revealed');
    assert.equal(log.gps_lat, null);
    assert.equal(log.gps_long, null);
  });

  test('Logging: Fallback is recorded when location request is omitted or unsupported', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'CONFIDENTIAL_FALLBACK_TEST_DATA', ttl_seconds: 3600, max_views: 1 })
    });
    const secretData = await createRes.json();

    const burnRes = await fetch(`${baseUrl}/api/secret/${secretData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burnRes.status, 200);

    const db = getDb();
    const log = db.prepare('SELECT * FROM access_log WHERE secret_id = ?').get(secretData.id);
    assert.ok(log);
    assert.equal(log.location_source, 'ip_fallback');
    assert.equal(log.result, 'revealed');
  });

  test('Logging: Access attempt to already-burned secret records result = already_burned', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'BURN_TEST_DATA', ttl_seconds: 3600, max_views: 1 })
    });
    const secretData = await createRes.json();

    // 1st burn -> revealed
    await fetch(`${baseUrl}/api/secret/${secretData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    // 2nd burn -> 404 already burned
    const secondRes = await fetch(`${baseUrl}/api/secret/${secretData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(secondRes.status, 404);

    const logs = getAccessLogsBySecret(secretData.id);
    assert.ok(logs.length >= 2);
    const burnedAttempt = logs.find(l => l.result === 'already_burned');
    assert.ok(burnedAttempt, 'Must have recorded an access_log entry with result = already_burned');
  });

  test('Logging: Access attempt to expired secret records result = expired', async () => {
    const now = Date.now();
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'EXPIRED_TEST_DATA', ttl_seconds: 60, max_views: 1 })
    });
    const secretData = await createRes.json();
    assert.ok(secretData.id, 'Secret ID should be returned');

    // Fast-forward expiration in DB
    const db = getDb();
    db.prepare('UPDATE secrets SET expires_at = ? WHERE id = ?').run(now - 1000, secretData.id);
    db.prepare('UPDATE admin_secrets SET expires_at = ?, status = ? WHERE id = ?').run(now - 1000, 'expired', secretData.id);

    const res = await fetch(`${baseUrl}/api/secret/${secretData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 404);

    const logs = getAccessLogsBySecret(secretData.id);
    const expiredAttempt = logs.find(l => l.result === 'expired');
    assert.ok(expiredAttempt, 'Must have recorded an access_log entry with result = expired');
  });

  // 3. Auto-Deletion of Retention Sweeper
  test('Retention: cleanupExpiredAccessLogs purges logs older than retention period', () => {
    const db = getDb();
    const oldTimestamp = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days ago
    const freshTimestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO access_log (secret_id, timestamp, ip_address, geo_city, geo_country, location_source, user_agent, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('old_test_secret', oldTimestamp, '127.0.0.1', 'OldCity', 'OldCountry', 'ip_fallback', 'UA', 'revealed');

    db.prepare(`
      INSERT INTO access_log (secret_id, timestamp, ip_address, geo_city, geo_country, location_source, user_agent, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('fresh_test_secret', freshTimestamp, '127.0.0.1', 'FreshCity', 'FreshCountry', 'ip_fallback', 'UA', 'revealed');

    const purged = cleanupExpiredAccessLogs();
    assert.ok(purged >= 1, 'Should purge at least 1 old log');

    const oldRecord = db.prepare("SELECT * FROM access_log WHERE secret_id = 'old_test_secret'").get();
    const freshRecord = db.prepare("SELECT * FROM access_log WHERE secret_id = 'fresh_test_secret'").get();

    assert.equal(oldRecord, undefined, 'Log older than 30 days must be deleted');
    assert.ok(freshRecord, 'Fresh log must remain intact');
  });

  // 4. Admin Authentication & Dashboard Operations
  test('Admin Auth: Unauthenticated requests to /admin redirect to /admin/login', async () => {
    const res = await fetch(`${baseUrl}/admin`, {
      headers: { 'Accept': 'text/html' },
      redirect: 'manual'
    });
    assert.equal(res.status, 302);
    assert.ok(res.headers.get('location').includes('/admin/login'));
  });

  test('Admin Auth: Unauthenticated requests to /api/admin/secrets return 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/secrets`);
    assert.equal(res.status, 401);
  });

  test('Admin Auth: Rejects invalid password with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword123!' })
    });
    assert.equal(res.status, 401);
  });

  test('Admin Auth: Authenticates with bcrypt-hashed credentials from .env', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@Vault2026!' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);

    // Save cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('admin_token='));
    adminCookie = setCookie.split(';')[0];
  });

  test('Admin API: Retrieves list of all secrets with access counts and statuses', async () => {
    const res = await fetch(`${baseUrl}/api/admin/secrets`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.secrets));
    assert.ok(data.secrets.length > 0);
    const sample = data.secrets[0];
    assert.ok(sample.id);
    assert.ok(sample.created_at);
    assert.ok(sample.expires_at);
    assert.ok(sample.status);
  });

  test('Admin API: Retrieves detail and access logs for specific secret', async () => {
    // Create and burn with GPS
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'DETAIL_CHECK_DATA', ttl_seconds: 3600, max_views: 1 })
    });
    const sData = await createRes.json();

    await fetch(`${baseUrl}/api/secret/${sData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 GPSDetailBrowser' },
      body: JSON.stringify({
        location_source: 'gps',
        gps_lat: 40.7128,
        gps_long: -74.0060,
        gps_accuracy_m: 8.5
      })
    });

    const res = await fetch(`${baseUrl}/api/admin/secrets/${sData.id}`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.secret);
    assert.ok(Array.isArray(data.logs));
    assert.equal(data.logs.length, 1);
    assert.equal(data.logs[0].location_source, 'gps');
    assert.equal(data.logs[0].gps_lat, 40.7128);
  });

  test('Admin API: Manual "Burn Now" revokes secret early and securely', async () => {
    // Create secret
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'EARLY_REVOKE_SECRET', ttl_seconds: 3600, max_views: 1 })
    });
    const sData = await createRes.json();

    // Call Admin Burn API
    const burnRes = await fetch(`${baseUrl}/api/admin/secrets/${sData.id}/burn`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' }
    });
    assert.equal(burnRes.status, 200);
    const burnData = await burnRes.json();
    assert.equal(burnData.success, true);

    // Verify secret is physically deleted from secrets table
    const db = getDb();
    const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(sData.id);
    assert.equal(row, undefined, 'Secret must be deleted from database');

    // Verify public burn returns 404
    const publicBurn = await fetch(`${baseUrl}/api/secret/${sData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(publicBurn.status, 404);
  });

  test('Admin API: Logout invalidates session token', async () => {
    const logoutRes = await fetch(`${baseUrl}/api/admin/logout`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(logoutRes.status, 200);

    // Subsequent call with old cookie must fail with 401
    const secretsRes = await fetch(`${baseUrl}/api/admin/secrets`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(secretsRes.status, 401);
  });
});
