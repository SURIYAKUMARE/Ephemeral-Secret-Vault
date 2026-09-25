const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-platform-routes.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');

describe('Platform Routes & Dedicated Pages Tests', () => {
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

  test('GET / serves SaaS Landing Page with Hero, Floating Badges, and How It Works', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type')?.includes('text/html'), true);
    assert.equal(res.headers.get('cache-control')?.includes('no-store'), true);
    const html = await res.text();
    assert.ok(html.includes('Share sensitive information.'));
    assert.ok(html.includes('Not the secret itself.'));
    assert.ok(html.includes('WhatsApp • Link Only'));
    assert.ok(html.includes('Gmail • Auto-Expiring'));
    assert.ok(html.includes('Slack • Instant Burn'));
    assert.ok(html.includes('Create Secret Now'));
  });

  test('GET /create serves dedicated Create Secret Page', async () => {
    const res = await fetch(`${baseUrl}/create`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Create a'));
    assert.ok(html.includes('Secret Vault'));
    assert.ok(html.includes('Secret Text / Credentials'));
  });

  test('GET /share/:id serves Share Center with safe metadata and zero plaintext', async () => {
    const secretContent = 'TOP_SECRET_SHARE_CENTER_DATA_999';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    const shareRes = await fetch(`${baseUrl}/share/${data.id}`);
    assert.equal(shareRes.status, 200);
    const html = await shareRes.text();

    assert.ok(html.includes('Share Securely'));
    assert.ok(html.includes('SHARE THE LINK • NEVER THE SECRET'));
    assert.ok(html.includes(data.id), 'Must include vault ID');
    assert.equal(html.includes(secretContent), false, 'Plaintext secret must NEVER exist in Share Center HTML');

    // Safe metadata endpoint
    const metaRes = await fetch(`${baseUrl}/api/vault/${data.id}/metadata`);
    assert.equal(metaRes.status, 200);
    const meta = await metaRes.json();
    assert.equal(meta.id, data.id);
    assert.equal(meta.views_remaining, 1);
    assert.equal(meta.max_views, 1);
    assert.equal(typeof meta.expires_at, 'number');
  });

  test('GET /share/:id for non-existent secret returns 404 expired page', async () => {
    const res = await fetch(`${baseUrl}/share/000000000000`);
    assert.equal(res.status, 404);
    const html = await res.text();
    assert.ok(html.includes('Vault Link Expired') || html.includes('404'));
  });

  test('GET /expired serves dedicated Expired Secret Page', async () => {
    const res = await fetch(`${baseUrl}/expired`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Vault Link Expired'));
    assert.ok(html.includes('Zero-Trace Retention Policy'));
  });

  test('GET /destroyed serves dedicated Destroyed Secret Page', async () => {
    const res = await fetch(`${baseUrl}/destroyed`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Secret Burned &amp; Shredded') || html.includes('Secret Burned & Shredded'));
    assert.ok(html.includes('Single-Use Cryptographic Burn'));
  });

  test('GET /extension serves dedicated Browser Extension Page', async () => {
    const res = await fetch(`${baseUrl}/extension`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Secure Sharing Extension'));
    assert.ok(html.includes('Isolated Shadow DOM'));
  });

  test('GET /download serves Extension Download Instructions Page', async () => {
    const res = await fetch(`${baseUrl}/download`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Install the Browser Extension'));
    assert.ok(html.includes('Download Extension (.ZIP)'));
  });

  test('GET /api/extension/download delivers extension zip archive', async () => {
    const res = await fetch(`${baseUrl}/api/extension/download`);
    assert.equal(res.status, 200);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 10000, 'Extension zip should be valid and non-empty');
  });

  test('GET /security serves Security Architecture & Threat Model', async () => {
    const res = await fetch(`${baseUrl}/security`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Security Architecture'));
    assert.ok(html.includes('AES-256-GCM'));
    assert.ok(html.includes('T1 — Unauthorized Public URL Viewer'));
  });

  test('GET /how-it-works serves visual lifecycle explanation', async () => {
    const res = await fetch(`${baseUrl}/how-it-works`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('How Ephemeral Vaulting Works'));
    assert.ok(html.includes('Two-Step Authorized Reveal Flow'));
  });

  test('GET /dashboard serves Creator Dashboard', async () => {
    const res = await fetch(`${baseUrl}/dashboard`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Your Vault Activity'));
    assert.ok(html.includes('Zero-Plaintext'));
  });
});
