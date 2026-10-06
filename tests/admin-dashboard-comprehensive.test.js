'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { getDb } = require('../src/database/db');
const { evaluateRisk } = require('../src/services/riskAnalysisService');
const { cleanupExpiredPrivacyData } = require('../src/services/accessMonitorService');

describe('Security-Focused Admin Dashboard Comprehensive Test Suite', () => {
  let server;
  let baseUrl;
  let adminCookie = '';
  let testFileId = '';
  let testEventId = '';

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

  // ─── 1. Authentication & Session Management ───
  test('Admin Auth: Unauthenticated requests to /api/admin/dashboard are rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`);
    assert.equal(res.status, 401);
  });

  test('Admin Auth: Unauthenticated requests to /api/admin/files are rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/files`);
    assert.equal(res.status, 401);
  });

  test('Admin Auth: Successful login sets secure admin_token cookie', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@Vault2026!' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('admin_token='));
    adminCookie = setCookie.split(';')[0];
  });

  // ─── 2. Dashboard Overview Telemetry ───
  test('Dashboard Overview: Returns full suite of telemetry counters and distributions', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.total_files, 'number');
    assert.equal(typeof data.active_files, 'number');
    assert.equal(typeof data.expired_files, 'number');
    assert.equal(typeof data.total_views, 'number');
    assert.equal(typeof data.suspicious_accesses, 'number');
    assert.ok(Array.isArray(data.recent_events));
    assert.ok(data.risk_distribution);
  });

  // ─── 3. File Creation & Management ───
  test('File Management: Create secret and verify in admin files list', async () => {
    // Create secret via public API
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'ADMIN_MANAGED_TEST_SECRET', ttl_seconds: 7200, max_views: 3 })
    });
    assert.equal(createRes.status, 201);
    const secretData = await createRes.json();
    testFileId = secretData.id;
    assert.ok(testFileId);

    // Fetch admin files list
    const filesRes = await fetch(`${baseUrl}/api/admin/files?search=${testFileId}`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(filesRes.status, 200);
    const filesData = await filesRes.json();
    assert.equal(filesData.success, true);
    const found = filesData.files.find((f) => f.id === testFileId);
    assert.ok(found, 'Created secret must appear in admin files list');
    assert.equal(found.effective_status, 'ACTIVE');
  });

  test('File Management: Toggle file status (disable and re-enable)', async () => {
    // Disable file
    const toggleRes1 = await fetch(`${baseUrl}/api/admin/files/${testFileId}/toggle`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(toggleRes1.status, 200);
    const tData1 = await toggleRes1.json();
    assert.equal(tData1.success, true);
    assert.equal(tData1.status, 'DISABLED');

    // Re-enable file
    const toggleRes2 = await fetch(`${baseUrl}/api/admin/files/${testFileId}/toggle`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(toggleRes2.status, 200);
    const tData2 = await toggleRes2.json();
    assert.equal(tData2.success, true);
    assert.equal(tData2.status, 'ACTIVE');
  });

  test('File Management: Extend file expiration deadline', async () => {
    const extendRes = await fetch(`${baseUrl}/api/admin/files/${testFileId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ extend_seconds: 86400 })
    });
    assert.equal(extendRes.status, 200);
    const extData = await extendRes.json();
    assert.equal(extData.success, true);
    assert.ok(extData.expires_at);
  });

  test('File Management: Update file access controls (require verification & downloads disabled)', async () => {
    const ctrlRes = await fetch(`${baseUrl}/api/admin/files/${testFileId}/controls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        require_verification: true,
        disable_downloads: true,
        max_views: 5
      })
    });
    assert.equal(ctrlRes.status, 200);
    const ctrlData = await ctrlRes.json();
    assert.equal(ctrlData.success, true);
    assert.equal(ctrlData.file.require_verification, 1);
    assert.equal(ctrlData.file.disable_downloads, 1);
    assert.equal(ctrlData.file.max_views, 5);
  });

  test('File Management: Generate fresh secure access link', async () => {
    const linkRes = await fetch(`${baseUrl}/api/admin/files/${testFileId}/new-link`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(linkRes.status, 200);
    const linkData = await linkRes.json();
    assert.equal(linkData.success, true);
    assert.ok(linkData.link.includes(testFileId));
  });

  // ─── 4. Access Monitoring & Verification Recording ───
  test('Access Monitoring: Submit visitor camera verification and list records', async () => {
    testEventId = 'evt_test_' + Date.now();
    const verifRes = await fetch(`${baseUrl}/api/admin/verifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: testEventId,
        file_id: testFileId,
        camera_permission: 'GRANTED',
        image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        device_info: { browser: 'Chrome', platform: 'Win32' }
      })
    });
    assert.equal(verifRes.status, 200);
    const verifData = await verifRes.json();
    assert.equal(verifData.success, true);

    // Verify in admin list
    const listRes = await fetch(`${baseUrl}/api/admin/verifications`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.success, true);
    const foundVerif = listData.verifications.find((v) => v.file_id === testFileId);
    assert.ok(foundVerif);
    assert.equal(foundVerif.camera_permission, 'GRANTED');
  });

  // ─── 5. Suspicious Activity & Risk Analysis ───
  test('Suspicious Activity: Risk analysis flags automated bot crawlers as HIGH risk', () => {
    const risk = evaluateRisk({
      file_id: 'risk_test_file',
      ip_address: '1.2.3.4',
      country: 'US',
      access_status: 'OPENED',
      is_bot: true
    });
    assert.equal(risk.risk_level, 'HIGH');
    assert.ok(risk.risk_reason.includes('Automated crawler'));
  });

  test('Suspicious Activity: Risk analysis flags revoked file access attempts as CRITICAL risk', () => {
    const risk = evaluateRisk({
      file_id: 'revoked_test_file',
      ip_address: '1.2.3.4',
      country: 'US',
      access_status: 'REVOKED_ATTEMPT',
      is_bot: false
    });
    assert.equal(risk.risk_level, 'CRITICAL');
    assert.ok(risk.risk_reason.includes('revoked'));
  });

  // ─── 6. Immutable Audit Trail ───
  test('Audit Trail: List immutable audit logs and verify FILE_CONTROLS_UPDATED entry', async () => {
    const auditRes = await fetch(`${baseUrl}/api/admin/audit?file_id=${testFileId}`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.equal(auditData.success, true);
    const foundAudit = auditData.logs.find((l) => l.action_type === 'FILE_CONTROLS_UPDATED');
    assert.ok(foundAudit, 'Audit log must record file controls update');
  });

  // ─── 7. Settings & Privacy Retention ───
  test('Settings: Update and retrieve location retention settings', async () => {
    const updateRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ location_retention_days: '14' })
    });
    assert.equal(updateRes.status, 200);

    const getRes = await fetch(`${baseUrl}/api/admin/settings`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.settings.location_retention_days, '14');
  });

  test('Privacy Retention: Sweeper cleans up expired consented location coordinates', () => {
    const db = getDb();
    const expiredRetentionTime = Date.now() - 1000;
    db.prepare(`
      INSERT INTO location_records (id, event_id, file_id, timestamp, source, latitude, longitude, accuracy, consent_granted, retention_expires_at)
      VALUES (?, ?, ?, ?, 'BROWSER_CONSENT', 37.77, -122.41, 10, 1, ?)
    `).run('loc_expired_test', 'evt_expired', 'file_expired', Date.now() - 100000, expiredRetentionTime);

    cleanupExpiredPrivacyData();

    const record = db.prepare("SELECT * FROM location_records WHERE id = 'loc_expired_test'").get();
    assert.equal(record, undefined, 'Expired location record must be purged');
  });

  // ─── 8. Revocation & Zeroizing ───
  test('File Revocation: Admin revoke zeroes ciphertext and marks file REVOKED', async () => {
    const revokeRes = await fetch(`${baseUrl}/api/admin/files/${testFileId}/revoke`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie }
    });
    assert.equal(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.equal(revokeData.success, true);
    assert.equal(revokeData.status, 'REVOKED');

    // Verify ciphertext zeroed / removed from secrets table
    const db = getDb();
    const secretRow = db.prepare('SELECT ciphertext FROM secrets WHERE id = ?').get(testFileId);
    assert.equal(secretRow, undefined, 'Revoked secret must be zeroized and removed from active storage');
  });
});
