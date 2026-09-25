const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-deadman.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');
const deadmanService = require('../src/services/deadmanService');

describe("Dead Man's Switch Tests", () => {
  let server;
  let baseUrl;

  before(async () => {
    try { fs.unlinkSync(testDbPath); } catch {}
    try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
    try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}

    initDb(testDbPath);
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    closeDb();
    try { fs.unlinkSync(testDbPath); } catch {}
    try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
    try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}
  });

  test('Validation: rejects invalid checkin_interval_seconds', async () => {
    const res = await fetch(`${baseUrl}/api/secret/deadman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'confidential message',
        checkin_interval_seconds: 2 // below min 10
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /checkin_interval_seconds must be an integer between 10/);
  });

  test('Happy Path: creates dead man switch, performs valid check-in, resets deadline', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret/deadman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'BENEFICIARY PRIVATE KEY ACCESS',
        checkin_interval_seconds: 60,
        beneficiary: 'beneficiary@agency.gov'
      })
    });

    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    assert.ok(createBody.id);
    assert.ok(createBody.checkin_token);
    assert.ok(createBody.checkin_url);
    assert.equal(createBody.checkin_interval_seconds, 60);

    const switchId = createBody.id;
    const token = createBody.checkin_token;

    // 1. Check initial status
    const statusRes = await fetch(`${baseUrl}/api/deadman/${switchId}/status`);
    assert.equal(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.triggered, false);
    assert.equal(statusBody.is_overdue, false);

    // 2. Reject check-in with invalid token
    const invalidCheckinRes = await fetch(`${baseUrl}/api/deadman/${switchId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_token' })
    });
    assert.equal(invalidCheckinRes.status, 401);

    // 3. Successful check-in with valid token
    const validCheckinRes = await fetch(`${baseUrl}/api/deadman/${switchId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    assert.equal(validCheckinRes.status, 200);
    const validCheckinBody = await validCheckinRes.json();
    assert.equal(validCheckinBody.status, 'ok');
    assert.ok(validCheckinBody.next_checkin_due);
  });

  test('Automated Trigger: overdue check-in triggers switch and reveals payload to beneficiary', async () => {
    const rawSecret = 'SUPER_SECRET_EMERGENCY_DATA_PASSCODE_9981';
    const createRes = await fetch(`${baseUrl}/api/secret/deadman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: rawSecret,
        checkin_interval_seconds: 15,
        beneficiary: 'lawyer@firm.com'
      })
    });

    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // Fast-forward simulated time by 20 seconds (greater than 15s interval)
    const simulatedNow = Date.now() + 20000;
    const triggeredCount = deadmanService.checkAndTriggerOverdueSwitches(simulatedNow);
    assert.ok(triggeredCount >= 1);

    // Check status now shows triggered and contains decrypted payload
    const statusRes = await fetch(`${baseUrl}/api/deadman/${id}/status`);
    assert.equal(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.triggered, true);
    assert.equal(statusBody.revealed_payload, rawSecret);
  });
});
