const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-validation.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');

describe('Input Validation & Error Handling Tests', () => {
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

  test('Validation: rejects empty or missing secret with 400', async () => {
    const res1 = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res1.status, 400);

    const res2 = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: '' })
    });
    assert.equal(res2.status, 400);
  });

  test('Validation: rejects oversized secret (> 10 KB) with 400', async () => {
    const oversized = 'A'.repeat(10241);
    const res = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: oversized })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /10 KB/);
  });

  test('TEST 11: Invalid TTL rejected with 400 (negative, zero, out of bounds, non-integer)', async () => {
    const cases = [-1, 0, 5, 604801, '3600', 3.14];
    for (const ttl of cases) {
      const res = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'ValidSecret', ttl_seconds: ttl })
      });
      assert.equal(res.status, 400, `Expected 400 for TTL: ${ttl}`);
    }
  });

  test('TEST 12: Invalid max_views rejected with 400 (negative, zero, > 10, non-integer)', async () => {
    const cases = [-1, 0, 11, '1', 2.5];
    for (const views of cases) {
      const res = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'ValidSecret', max_views: views })
      });
      assert.equal(res.status, 400, `Expected 400 for max_views: ${views}`);
    }
  });

  test('TEST 13: Invalid secret ID handled safely with 404 without hitting DB', async () => {
    const badIds = ['short', 'toolongid1234567890', 'invalid-chars!', '123', 'select*from'];
    for (const id of badIds) {
      const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(burnRes.status, 404);
      const data = await burnRes.json();
      assert.deepEqual(data, { error: 'Secret not found, expired, or already destroyed.' });

      const viewRes = await fetch(`${baseUrl}/view/${id}`);
      assert.equal(viewRes.status, 404);
    }
  });

  test('Validation: malformed JSON returns 400 with clean error message and no stack trace', async () => {
    const res = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this-is-not-json'
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
    assert.equal(JSON.stringify(data).includes('SyntaxError'), false);
    assert.equal(JSON.stringify(data).includes('at '), false);
  });

  test('TEST 14: Log interception confirms no plaintext secret appears in logs', async () => {
    const secretContent = 'UnleakableTestSecret-112233';
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push(args.join(' '));

    try {
      const createRes = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretContent, ttl_seconds: 600, max_views: 1 })
      });
      const { id } = await createRes.json();

      await fetch(`${baseUrl}/api/secret/${id}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const joinedLogs = logs.join('\n');
      assert.equal(joinedLogs.includes(secretContent), false, 'Plaintext secret must NEVER appear in console logs');
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });

  test('TEST 15: Custom expiresAt validation (past dates, <1m lead time, and valid ISO timestamps)', async () => {
    // 1. Past date
    const pastRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'PastSecret', expiresAt: new Date(Date.now() - 3600000).toISOString() })
    });
    assert.equal(pastRes.status, 400);
    const pastData = await pastRes.json();
    assert.match(pastData.error, /past/i);

    // 2. Invalid date string
    const malformedRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'MalformedSecret', expiresAt: 'not-a-date' })
    });
    assert.equal(malformedRes.status, 400);

    // 3. Valid future ISO timestamp
    const futureDate = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours in future
    const validRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'FutureSecret', expiresAt: futureDate.toISOString(), maxViews: 25 })
    });
    assert.equal(validRes.status, 201);
    const validData = await validRes.json();
    assert.ok(validData.id);
    assert.equal(validData.views_remaining, 25);
  });

  test('TEST 16: Custom maxViews validation (supports 25, 50, 100, 1000 and rejects invalid inputs)', async () => {
    // Valid custom views
    for (const views of [5, 10, 25, 50, 100, 500, 1000]) {
      const res = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'ValidCustomViewsSecret', maxViews: views })
      });
      assert.equal(res.status, 201, `Failed to allow valid custom view count: ${views}`);
      const data = await res.json();
      assert.equal(data.views_remaining, views);
    }

    // Invalid custom views
    for (const views of [0, -1, 1001, '25', 4.5]) {
      const res = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'InvalidCustomViewsSecret', maxViews: views })
      });
      assert.equal(res.status, 400, `Expected 400 for maxViews: ${views}`);
    }
  });
});
