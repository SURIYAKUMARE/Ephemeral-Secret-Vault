const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';
process.env.ALLOW_SHORT_TTL = 'true';

const testDbPath = path.join(__dirname, 'test-expiry.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb } = require('../src/database/db');
const { startSweeper, stopSweeper } = require('../src/services/sweeperService');
const { sweepExpired } = require('../src/services/secretService');
const app = require('../src/app');

describe('TTL Expiration & Background Sweeper Tests', () => {
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
    stopSweeper();
    if (server) await new Promise((resolve) => server.close(resolve));
    closeDb();
    try { fs.unlinkSync(testDbPath); } catch {}
    try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
    try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}
  });

  test('TEST 6 & 7: Expired secret returns 404 and is physically removed from SQLite by sweeper', async () => {
    // 1. Start sweeper with short 200ms interval
    startSweeper(200);

    // 2. Create secret with 1-second TTL
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'ExpiringSecretPayload-999',
        ttl_seconds: 1,
        max_views: 1
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 3. Confirm row exists in DB immediately
    const db = getDb();
    const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id);
    assert.ok(row, 'Row must exist immediately after creation');

    // 4. Wait 1300ms for expiration and sweeper interval run
    await new Promise((resolve) => setTimeout(resolve, 1300));

    // 5. Attempt burn on expired secret -> must return 404
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burnRes.status, 404);
    const burnData = await burnRes.json();
    assert.equal(burnData.error, 'Secret not found, expired, or already destroyed.');

    // 6. Confirm row is physically deleted from database
    const goneRow = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id);
    assert.equal(goneRow, undefined, 'Sweeper must have permanently deleted the row from the database');
  });

  test('Manual sweepExpired purges old rows and returns count', () => {
    const db = getDb();
    const now = Date.now();

    db.prepare('INSERT INTO secrets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      'exp111111111', Buffer.from('c1'), Buffer.from('i1'), Buffer.from('t1'), 1, 1, now - 5000, now - 10000, null, null
    );
    db.prepare('INSERT INTO secrets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      'exp222222222', Buffer.from('c2'), Buffer.from('i2'), Buffer.from('t2'), 1, 1, now - 1000, now - 5000, null, null
    );

    const purged = sweepExpired(now);
    assert.ok(purged >= 2);

    const count = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE id IN (?, ?)').get('exp111111111', 'exp222222222').count;
    assert.equal(count, 0);
  });
});
