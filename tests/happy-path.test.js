const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-happy-path.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb } = require('../src/database/db');
const app = require('../src/app');

describe('Happy Path & Secret Lifecycle Tests', () => {
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

  test('TEST 1: Health check GET /health returns 200 {"status":"ok"}', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: 'ok' });
  });

  test('TEST 2: Create secret returns HTTP 201 with secure URL and metadata', async () => {
    const secretContent = 'DatabasePasswordSecret-987654';
    const res = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretContent,
        ttl_seconds: 3600,
        max_views: 1
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();

    assert.ok(data.id, 'ID must be returned');
    assert.match(data.id, /^[0-9a-fA-F]{12}$/, 'ID must be 12 hex characters');
    assert.ok(data.view_url.includes(`/view/${data.id}`), 'view_url must be valid');
    assert.ok(data.expires_at, 'expires_at must be provided');
    assert.equal(data.views_remaining, 1);
    assert.ok(data.fingerprint, 'SHA-256 fingerprint must be returned');

    // TEST 3: Database contains ciphertext, IV, auth_tag, NOT plaintext
    const db = getDb();
    const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(data.id);
    assert.ok(row, 'Row must exist in SQLite');
    assert.ok(Buffer.isBuffer(row.ciphertext), 'ciphertext must be BLOB');
    assert.ok(Buffer.isBuffer(row.iv), 'iv must be BLOB');
    assert.ok(Buffer.isBuffer(row.auth_tag), 'auth_tag must be BLOB');
    assert.equal(row.ciphertext.toString('utf8').includes(secretContent), false, 'Plaintext must NEVER exist in ciphertext BLOB');

    // TEST 4: GET /view/:id does not burn, views remaining unchanged
    const viewRes = await fetch(`${baseUrl}/view/${data.id}`);
    assert.equal(viewRes.status, 200);
    const viewHtml = await viewRes.text();
    assert.ok(viewHtml.includes('SECURE SECRET'));
    assert.ok(viewHtml.includes('Reveal &amp; Destroy Secret') || viewHtml.includes('Reveal & Destroy Secret'));
    assert.equal(viewHtml.includes(secretContent), false, 'Plaintext must NEVER appear in HTML before reveal');

    // Check row views remaining is STILL 1
    const checkRow = db.prepare('SELECT views_remaining FROM secrets WHERE id = ?').get(data.id);
    assert.equal(checkRow.views_remaining, 1, 'Views remaining must not be decremented on GET');

    // TEST 5: POST /burn returns secret once, burned: true
    const burnRes1 = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burnRes1.status, 200);
    const burnData1 = await burnRes1.json();
    assert.equal(burnData1.secret, secretContent);
    assert.equal(burnData1.views_remaining, 0);
    assert.equal(burnData1.burned, true);

    // TEST 6: Second burn returns 404 and row is permanently gone from DB
    const burnRes2 = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burnRes2.status, 404);
    const burnData2 = await burnRes2.json();
    assert.equal(burnData2.error, 'Secret not found, expired, or already destroyed.');

    const goneRow = db.prepare('SELECT * FROM secrets WHERE id = ?').get(data.id);
    assert.equal(goneRow, undefined, 'Database row must be permanently deleted');
  });

  test('Multi-view secret: decrements accurately and burns when hitting 0', async () => {
    const res = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'TwoViewSecretContent',
        ttl_seconds: 3600,
        max_views: 2
      })
    });
    const { id } = await res.json();

    // Burn 1
    const b1 = await fetch(`${baseUrl}/api/secret/${id}/burn`, { method: 'POST' });
    assert.equal(b1.status, 200);
    const d1 = await b1.json();
    assert.equal(d1.views_remaining, 1);
    assert.equal(d1.burned, false);

    // Burn 2
    const b2 = await fetch(`${baseUrl}/api/secret/${id}/burn`, { method: 'POST' });
    assert.equal(b2.status, 200);
    const d2 = await b2.json();
    assert.equal(d2.views_remaining, 0);
    assert.equal(d2.burned, true);

    // Burn 3 -> 404
    const b3 = await fetch(`${baseUrl}/api/secret/${id}/burn`, { method: 'POST' });
    assert.equal(b3.status, 404);
  });
});
