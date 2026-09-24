const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-tamper.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb, walCheckpoint } = require('../src/database/db');
const { encrypt, decrypt, DecryptionError } = require('../src/crypto/encryption');
const app = require('../src/app');

describe('Tamper Protection & Zero-Trace Database Tests', () => {
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

  test('Database verification: plaintext NEVER appears in raw .db or -wal file bytes (zero trace)', async () => {
    const sensitivePlaintext = `TOP_SECRET_PROD_KEY_${crypto.randomBytes(16).toString('hex')}_CONFIDENTIAL`;

    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: sensitivePlaintext,
        ttl_seconds: 3600,
        max_views: 1
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // Checkpoint WAL to flush all transactions to disk
    walCheckpoint();

    assert.ok(fs.existsSync(testDbPath), 'Database file must exist');
    const dbBytes = fs.readFileSync(testDbPath);
    assert.equal(
      dbBytes.includes(Buffer.from(sensitivePlaintext, 'utf8')),
      false,
      'Plaintext secret must NEVER appear in raw SQLite database bytes'
    );

    const walPath = `${testDbPath}-wal`;
    if (fs.existsSync(walPath)) {
      const walBytes = fs.readFileSync(walPath);
      assert.equal(
        walBytes.includes(Buffer.from(sensitivePlaintext, 'utf8')),
        false,
        'Plaintext secret must NEVER appear in raw SQLite WAL log bytes'
      );
    }
  });

  test('TEST 10: Tampered ciphertext directly in SQLite fails safely with clean 404, no stack trace, and corrupt row is removed', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'OriginalIntactSecret',
        ttl_seconds: 600,
        max_views: 1
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // Corrupt ciphertext directly in database
    const db = getDb();
    const row = db.prepare('SELECT ciphertext FROM secrets WHERE id = ?').get(id);
    const corrupted = Buffer.from(row.ciphertext);
    corrupted[0] ^= 0xff; // flip bits

    db.prepare('UPDATE secrets SET ciphertext = ? WHERE id = ?').run(corrupted, id);

    // Attempt burn
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(burnRes.status, 404);
    const data = await burnRes.json();
    assert.deepEqual(data, { error: 'Secret not found, expired, or already destroyed.' });

    // Ensure NO stack traces or crypto internal details leak
    const rawBody = JSON.stringify(data);
    assert.equal(rawBody.includes('DecryptionError'), false);
    assert.equal(rawBody.includes('node:crypto'), false);
    assert.equal(rawBody.includes('at '), false);

    // Corrupt row must be completely removed from DB
    const checkRow = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id);
    assert.equal(checkRow, undefined, 'Corrupt row must be permanently deleted from DB');
  });

  test('Cryptographic unit checks: modified IV, tag, truncation, or wrong AAD throws DecryptionError', () => {
    const plaintext = 'CryptoUnitTestSecret';
    const id = 'cryptoId0001';
    const { ciphertext, iv, authTag } = encrypt(plaintext, id);

    // Corrupt auth tag
    const badTag = Buffer.from(authTag);
    badTag[0] ^= 0x01;
    assert.throws(() => decrypt(ciphertext, iv, badTag, id), DecryptionError);

    // Corrupt IV
    const badIv = Buffer.from(iv);
    badIv[0] ^= 0x01;
    assert.throws(() => decrypt(ciphertext, badIv, authTag, id), DecryptionError);

    // Truncated ciphertext
    const truncated = ciphertext.subarray(0, ciphertext.length - 2);
    assert.throws(() => decrypt(truncated, iv, authTag, id), DecryptionError);

    // Wrong AAD record id (transplant attack prevention)
    assert.throws(() => decrypt(ciphertext, iv, authTag, 'wrongRecordId'), DecryptionError);
  });
});
