const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-threshold.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');

describe('Shamir Threshold Secret Sharing (k of n) Tests', () => {
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

  test('Validation: rejects threshold_k > total_n or threshold_k < 2', async () => {
    // k > n
    const res1 = await fetch(`${baseUrl}/api/secret/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'test-secret', threshold_k: 5, total_n: 3 })
    });
    assert.equal(res1.status, 400);

    // k < 2
    const res2 = await fetch(`${baseUrl}/api/secret/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'test-secret', threshold_k: 1, total_n: 5 })
    });
    assert.equal(res2.status, 400);

    // missing secret
    const res3 = await fetch(`${baseUrl}/api/secret/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold_k: 3, total_n: 5 })
    });
    assert.equal(res3.status, 400);
  });

  test('Happy Path: k=3, n=5 splits into 5 shares and reconstructs only when 3 distinct shares are redeemed', async () => {
    const rawSecret = 'CONFIDENTIAL_NUCLEAR_LAUNCH_CODES_2026';

    // 1. Create threshold secret (k=3, n=5)
    const createRes = await fetch(`${baseUrl}/api/secret/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: rawSecret,
        threshold_k: 3,
        total_n: 5,
        ttl_seconds: 3600
      })
    });

    assert.equal(createRes.status, 201);
    const data = await createRes.json();
    assert.ok(data.id, 'Must return vault ID');
    assert.equal(data.threshold_k, 3);
    assert.equal(data.total_n, 5);
    assert.equal(data.shares.length, 5);
    assert.equal(data.share_urls.length, 5);

    const secretId = data.id;
    const shares = data.shares;

    // 2. Check initial status
    const statusRes1 = await fetch(`${baseUrl}/api/secret/${secretId}/threshold-status`);
    assert.equal(statusRes1.status, 200);
    const statusData1 = await statusRes1.json();
    assert.equal(statusData1.redeemed_count, 0);
    assert.equal(statusData1.remaining_needed, 3);

    // 3. Redeem Share #1 (Index 0) -> 1/3 redeemed
    const r1 = await fetch(`${baseUrl}/api/secret/${secretId}/redeem-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: shares[0] })
    });
    assert.equal(r1.status, 200);
    const r1Data = await r1.json();
    assert.equal(r1Data.redeemed_count, 1);
    assert.equal(r1Data.remaining_needed, 2);
    assert.equal(r1Data.burned, false);
    assert.equal(r1Data.secret, undefined, 'Secret MUST NOT be revealed below threshold');

    // 4. Duplicate redemption of Share #1 -> Idempotent, doesn't increment count
    const r1Dup = await fetch(`${baseUrl}/api/secret/${secretId}/redeem-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: shares[0] })
    });
    assert.equal(r1Dup.status, 200);
    const r1DupData = await r1Dup.json();
    assert.equal(r1DupData.redeemed_count, 1);
    assert.equal(r1DupData.remaining_needed, 2);

    // 5. Redeem Share #3 (Index 2) -> 2/3 redeemed
    const r2 = await fetch(`${baseUrl}/api/secret/${secretId}/redeem-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: shares[2] })
    });
    assert.equal(r2.status, 200);
    const r2Data = await r2.json();
    assert.equal(r2Data.redeemed_count, 2);
    assert.equal(r2Data.remaining_needed, 1);
    assert.equal(r2Data.burned, false);
    assert.equal(r2Data.secret, undefined, 'Secret still MUST NOT be revealed');

    // 6. Redeem Share #5 (Index 4) -> 3/3 threshold reached! Unlocks & Burns!
    const r3 = await fetch(`${baseUrl}/api/secret/${secretId}/redeem-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: shares[4] })
    });
    assert.equal(r3.status, 200);
    const r3Data = await r3.json();
    assert.equal(r3Data.redeemed_count, 3);
    assert.equal(r3Data.burned, true);
    assert.equal(r3Data.secret, rawSecret, 'Plaintext MUST match original secret');

    // 7. Verify hard zero-trace deletion: subsequent attempt returns 404
    const r4 = await fetch(`${baseUrl}/api/secret/${secretId}/redeem-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: shares[1] })
    });
    assert.equal(r4.status, 404, 'Must return 404 once secret is burned');

    const statusFinal = await fetch(`${baseUrl}/api/secret/${secretId}/threshold-status`);
    assert.equal(statusFinal.status, 404, 'Status must return 404 after destruction');
  });

  test('Redeem share rejects malformed share payloads with 400', async () => {
    const res = await fetch(`${baseUrl}/api/secret/1234567890ab/redeem-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: '' })
    });
    assert.equal(res.status, 400);
  });
});
