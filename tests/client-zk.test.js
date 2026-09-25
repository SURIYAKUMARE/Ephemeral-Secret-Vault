const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-client-zk.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');

describe('Client-Side Zero-Knowledge Mode Tests', () => {
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

  test('Validation: rejects client_encrypted request if ciphertext, iv, or auth_tag is missing', async () => {
    const res = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_encrypted: true,
        ciphertext: 'abcdef'
        // missing iv and auth_tag
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /iv is required/);
  });

  test('Happy Path: In-browser pre-encrypted secret is stored zero-knowledge and decrypted client-side', async () => {
    const plaintext = 'TOP SECRET ZERO-KNOWLEDGE CLIENT PAYLOAD - THE SERVER NEVER SEES THIS!';
    
    // Simulate client-side key generation (256-bit AES key)
    const clientKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    // Client-side AES-256-GCM encryption
    const cipher = crypto.createCipheriv('aes-256-gcm', clientKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 1. Post encrypted payload to vault
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_encrypted: true,
        ciphertext: ciphertext.toString('hex'),
        iv: iv.toString('hex'),
        auth_tag: authTag.toString('hex'),
        ttl_seconds: 3600,
        max_views: 1
      })
    });

    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    assert.ok(createBody.id);
    assert.equal(createBody.client_encrypted, true);

    const secretId = createBody.id;
    // In actual client UI, the URL has #key=<hex> appended
    const clientDecryptionUrl = `${createBody.view_url}#key=${clientKey.toString('hex')}`;
    assert.ok(clientDecryptionUrl.includes(secretId));

    // 2. Fetch landing page (server returns HTML shell with client_encrypted flag)
    const viewRes = await fetch(`${baseUrl}/view/${secretId}`);
    assert.equal(viewRes.status, 200);
    const viewHtml = await viewRes.text();
    assert.ok(viewHtml.includes('Ephemeral Secret Vault'));

    // 3. Burn secret (server returns ciphertext and auth tag WITHOUT server-side decryption)
    const burnRes = await fetch(`${baseUrl}/api/secret/${secretId}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    assert.equal(burnRes.status, 200);
    const burnBody = await burnRes.json();
    assert.equal(burnBody.client_encrypted, true);
    assert.equal(burnBody.burned, true);
    assert.equal(burnBody.views_remaining, 0);
    assert.equal(burnBody.ciphertext, ciphertext.toString('hex'));
    assert.equal(burnBody.iv, iv.toString('hex'));
    assert.equal(burnBody.auth_tag, authTag.toString('hex'));

    // 4. Client-side decryption using client's fragment key
    const decipher = crypto.createDecipheriv('aes-256-gcm', clientKey, Buffer.from(burnBody.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(burnBody.auth_tag, 'hex'));
    let decrypted = decipher.update(Buffer.from(burnBody.ciphertext, 'hex'), null, 'utf8');
    decrypted += decipher.final('utf8');

    assert.equal(decrypted, plaintext);

    // 5. Subsequent burn attempt fails with 404
    const secondBurnRes = await fetch(`${baseUrl}/api/secret/${secretId}/burn`, {
      method: 'POST'
    });
    assert.equal(secondBurnRes.status, 404);
  });
});
