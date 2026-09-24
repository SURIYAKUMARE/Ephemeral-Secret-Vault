const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-concurrency.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb } = require('../src/database/db');
const app = require('../src/app');

describe('Atomic Concurrency & Race Condition Tests', () => {
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

  test('TEST 9 & Section 23: 20 simultaneous POST burns produce exactly 1x 200 and 19x 404 across 50 rounds', async () => {
    const rounds = 50;
    const concurrency = 20;

    for (let round = 1; round <= rounds; round++) {
      const secretText = `ConcurrentSecret-Round-${round}-${Date.now()}`;

      // 1. Create a 1-view secret
      const createRes = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretText,
          ttl_seconds: 300,
          max_views: 1
        })
      });
      assert.equal(createRes.status, 201);
      const { id } = await createRes.json();

      // 2. Fire 20 truly parallel requests
      const promises = Array.from({ length: concurrency }, () =>
        fetch(`${baseUrl}/api/secret/${id}/burn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      );

      const responses = await Promise.all(promises);
      const statuses = responses.map(r => r.status);

      const count200 = statuses.filter(s => s === 200).length;
      const count404 = statuses.filter(s => s === 404).length;

      assert.equal(count200, 1, `Round ${round}: Expected exactly 1 HTTP 200, got ${count200}`);
      assert.equal(count404, concurrency - 1, `Round ${round}: Expected exactly 19 HTTP 404s, got ${count404}`);

      // Verify the single successful response decrypts and returns plaintext
      const successRes = responses.find(r => r.status === 200);
      const successData = await successRes.json();
      assert.equal(successData.secret, secretText);
      assert.equal(successData.burned, true);

      // Verify DB row is completely deleted
      const db = getDb();
      const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id);
      assert.equal(row, undefined, `Round ${round}: Row must be completely deleted from DB`);
    }
  });

  test('Concurrency with max_views = 3 and 10 parallel requests: exactly 3 succeed, 7 return 404', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'ThreeViewSecretConcur',
        ttl_seconds: 300,
        max_views: 3
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    const promises = Array.from({ length: 10 }, () =>
      fetch(`${baseUrl}/api/secret/${id}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status);

    const count200 = statuses.filter(s => s === 200).length;
    const count404 = statuses.filter(s => s === 404).length;

    assert.equal(count200, 3, `Expected exactly 3 HTTP 200s, got ${count200}`);
    assert.equal(count404, 7, `Expected exactly 7 HTTP 404s, got ${count404}`);

    const db = getDb();
    const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id);
    assert.equal(row, undefined, 'Database row must be deleted after 3 views');
  });
});
