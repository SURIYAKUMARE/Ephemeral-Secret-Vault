const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-burn-receipt.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');
const receiptService = require('../src/services/receiptService');

describe('Ed25519 Signed Burn Receipt Tests', () => {
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

  test('Happy Path: burning a secret produces an Ed25519 signed receipt verifiable via API and crypto primitives', async () => {
    // 1. Create a single-view secret
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'CONFIDENTIAL_DOC_TO_BE_PROVEN_DESTROYED' })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 2. Burn the secret
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.42'
      }
    });

    assert.equal(burnRes.status, 200);
    const burnBody = await burnRes.json();
    assert.equal(burnBody.burned, true);
    assert.ok(burnBody.burn_receipt, 'Burn response must contain burn_receipt');

    const receipt = burnBody.burn_receipt;
    assert.equal(receipt.id, id);
    assert.ok(receipt.burned_at);
    assert.ok(receipt.requester_ip_hash);
    assert.ok(receipt.signature);
    assert.ok(receipt.public_key);

    // Verify requester IP hash matches SHA-256 of 198.51.100.42
    const expectedIpHash = crypto.createHash('sha256').update('198.51.100.42').digest('hex');
    assert.equal(receipt.requester_ip_hash, expectedIpHash);

    // 3. Cryptographic verification using public key directly in Node
    const canonicalPayload = JSON.stringify({
      id: receipt.id,
      burned_at: receipt.burned_at,
      requester_ip_hash: receipt.requester_ip_hash
    });
    const publicKey = crypto.createPublicKey(receipt.public_key);
    const valid = crypto.verify(null, Buffer.from(canonicalPayload, 'utf8'), publicKey, Buffer.from(receipt.signature, 'hex'));
    assert.equal(valid, true, 'Cryptographic Ed25519 signature must verify');

    // 4. Verification via server endpoint GET /api/receipt/:id/verify
    const verifyRes = await fetch(`${baseUrl}/api/receipt/${id}/verify`);
    assert.equal(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.equal(verifyBody.valid, true);
    assert.equal(verifyBody.receipt.id, id);
  });

  test('Tamper Detection: modified burn receipt fails cryptographic verification', async () => {
    const fakeReceipt = {
      id: '0123456789abcdef',
      burned_at: new Date().toISOString(),
      requester_ip_hash: 'abcdef',
      signature: 'deadbeef'.repeat(16),
      public_key: receiptService.getServerKeyPair().publicKeyPem
    };

    const result = receiptService.verifyBurnReceipt(fakeReceipt);
    assert.equal(result.valid, false);
  });
});
