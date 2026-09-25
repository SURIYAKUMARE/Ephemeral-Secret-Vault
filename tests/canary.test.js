const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-canary.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');
const canaryService = require('../src/services/canaryService');

describe('Canary Decoy Trap Tests', () => {
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

  test('Happy Path: Canary trap yields plausible fake secret, trips intrusion telemetry, and records alert', async () => {
    const fakeSecret = 'AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    const memo = 'Decoy credential placed in leaked git repo';

    // 1. Create canary trap
    const createRes = await fetch(`${baseUrl}/api/canary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fake_secret: fakeSecret,
        memo
      })
    });

    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    assert.ok(createBody.canary_id);
    assert.ok(createBody.decoy_url);

    const canaryId = createBody.canary_id;

    // 2. Attacker visits view URL
    const viewRes = await fetch(`${baseUrl}/view/${canaryId}`);
    assert.equal(viewRes.status, 200);

    // 3. Attacker burns the canary secret
    const burnRes = await fetch(`${baseUrl}/api/secret/${canaryId}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.77',
        'User-Agent': 'curl/7.68.0 HackerScan'
      }
    });

    assert.equal(burnRes.status, 200);
    const burnBody = await burnRes.json();
    assert.equal(burnBody.secret, fakeSecret);
    assert.equal(burnBody.burned, true);

    // 4. Verify telemetry recorded
    const canaryRecord = canaryService.getCanary(canaryId);
    assert.ok(canaryRecord);
    assert.equal(canaryRecord.triggered_count, 1);
    assert.ok(canaryRecord.last_triggered_at > 0);
  });
});
