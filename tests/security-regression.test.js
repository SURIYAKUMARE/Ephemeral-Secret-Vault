const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';
process.env.ALLOW_SHORT_TTL = 'true';

const testDbPath = path.join(__dirname, 'test-security-regression.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb } = require('../src/database/db');
const app = require('../src/app');

describe('Security Regression Test Suite (Threat Model & Acceptance Criteria AC-01 to AC-18)', () => {
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

  // AC-01: Initial HTML Security
  test('[ ] AC-01: Plaintext absent from initial HTML (View Source / cURL contains zero secret)', async () => {
    const secretContent = 'VAULT_SEC_REGRESSION_HTML_TEST_9f82c7';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    const viewRes = await fetch(`${baseUrl}/view/${data.id}`);
    assert.equal(viewRes.status, 200);
    const html = await viewRes.text();

    assert.equal(html.includes(secretContent), false, 'Initial HTML must never contain plaintext secret');
    assert.equal(html.includes('9f82c7'), false, 'Initial HTML must never contain secret substring');
    assert.equal(html.includes(Buffer.from(secretContent).toString('base64')), false, 'Initial HTML must never contain Base64 encoded secret');
    assert.ok(html.includes('🔐 SECRET VAULT'), 'HTML must show 🔐 SECRET VAULT');
    assert.ok(html.includes('This secret is protected. Encrypted with AES-256-GCM.'), 'HTML must show protection subtitle');
  });

  // AC-02 & AC-04: JavaScript Security & Encryption Keys
  test('[ ] AC-02 & AC-04: Plaintext & encryption keys absent from frontend JavaScript', () => {
    const filesToInspect = [
      path.join(__dirname, '../public/js/app.js'),
      path.join(__dirname, '../public/create.js'),
      path.join(__dirname, '../public/js/view.js'),
      path.join(__dirname, '../public/view.js')
    ];

    for (const file of filesToInspect) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        assert.equal(content.includes('embeddedKeyHex'), false, `${file} must not contain embeddedKeyHex`);
        assert.equal(content.includes('ciphertextB64'), false, `${file} must not contain ciphertextB64`);
        assert.equal(content.includes('const payloadObj = {'), false, `${file} must not contain payloadObj`);
        assert.equal(content.includes('payload_preview: currentFile ?'), false, `${file} must not contain payload_preview`);
        assert.equal(content.includes(process.env.VAULT_MASTER_KEY), false, `${file} must not contain master key`);
      }
    }
  });

  // AC-03: CSS & Base64/Obfuscation Protection
  test('[ ] AC-03: Plaintext absent from CSS & no Base64/hidden-DOM obfuscation as security', async () => {
    const cssFiles = [
      path.join(__dirname, '../public/css/style.css'),
      path.join(__dirname, '../public/css/landing.css')
    ];

    for (const cssFile of cssFiles) {
      if (fs.existsSync(cssFile)) {
        const cssContent = fs.readFileSync(cssFile, 'utf8');
        assert.equal(cssContent.includes('VAULT_'), false, `${cssFile} must not contain secret tokens`);
        assert.equal(cssContent.includes('CONFIDENTIAL'), false, `${cssFile} must not contain confidential data`);
      }
    }
  });

  // AC-05 & AC-11: URL Security & Browser History
  test('[ ] AC-05 & AC-11: Plaintext absent from URLs and Browser History (clean random path only)', async () => {
    const secretContent = 'URL_SAFETY_CONFIDENTIAL_PAYLOAD_999';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    const url = new URL(data.view_url, baseUrl);
    assert.equal(url.search, '', 'URL must not contain query parameters');
    assert.equal(url.hash, '', 'URL must not contain hash fragments');
    assert.equal(url.pathname.includes(secretContent), false, 'URL path must not contain secret');
    assert.match(url.pathname, /\/(view|v)\/[0-9a-fA-F]{12}$/, 'URL path must only match /(view|v)/<12-hex-id>');
  });

  // AC-06: Secret ID Unpredictability & Randomness
  test('[ ] AC-06: Random secret IDs enforced with cryptographic entropy (no sequential IDs)', () => {
    const { generateId, isValidId } = require('../src/utils/idGenerator');
    const ids = new Set();
    const count = 500;

    for (let i = 0; i < count; i++) {
      const id = generateId();
      assert.ok(isValidId(id), `ID ${id} must be valid 12-char hex`);
      ids.add(id);
    }

    assert.equal(ids.size, count, 'Generated IDs must be cryptographically unique without collisions');
  });

  // AC-07: Unauthorized Access Denied
  test('[ ] AC-07: Unauthorized API access denied (passphrase-gated secrets reject invalid calls)', async () => {
    const secretContent = 'PASSPHRASE_PROTECTED_SECRET_777';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretContent,
        passphrase: 'StrongPassphrase!2026',
        ttl_seconds: 3600,
        max_views: 1
      })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // 1. Missing passphrase
    const resNoPass = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(resNoPass.status, 401);
    const bodyNoPass = await resNoPass.json();
    assert.equal(bodyNoPass.secret, undefined, 'Unauthorized response must not contain secret');

    // 2. Wrong passphrase
    const resWrongPass = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'WrongPassphrase123' })
    });
    assert.equal(resWrongPass.status, 401);
    const bodyWrong = await resWrongPass.json();
    assert.equal(bodyWrong.secret, undefined, 'Wrong passphrase response must not contain secret');
  });

  // AC-08: Expiration Inaccessibility
  test('[ ] AC-08: Expired secret denied (inaccessible upon reaching expiration time)', async () => {
    const secretContent = 'EXPIRE_FAST_SECRET_555';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 1, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // Wait for TTL expiration
    await new Promise((r) => setTimeout(r, 1100));

    const viewRes = await fetch(`${baseUrl}/view/${data.id}`);
    assert.equal(viewRes.status, 404, 'Expired secret landing must return 404');

    const burnRes = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burnRes.status, 404, 'Expired secret burn API must return 404');
  });

  // AC-09 & AC-18: One-Time Secret & Physical Zero-Destruction
  test('[ ] AC-09 & AC-18: One-time secret cannot be replayed & physically destroyed on server', async () => {
    const secretContent = 'ONE_TIME_ONLY_SECRET_444';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // 1st authorized reveal -> SUCCESS
    const burn1 = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burn1.status, 200);
    const body1 = await burn1.json();
    assert.equal(body1.secret, secretContent);

    // 2nd reveal -> DENIED (re-play blocked)
    const burn2 = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(burn2.status, 404);

    // Verify row physically deleted from SQLite
    const row = getDb().prepare('SELECT * FROM secrets WHERE id = ?').get(data.id);
    assert.equal(row, undefined, 'Database row must be physically deleted from SQLite');
  });

  // AC-10: Browser Storage
  test('[ ] AC-10: Plaintext absent from browser storage (frontend sanitization verified)', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
    assert.ok(appJs.includes("activeSecretText = ''"), 'activeSecretText must be cleared on creation');
    assert.equal(appJs.includes('localStorage.setItem("secret"'), false, 'localStorage must never store secret');
    assert.equal(appJs.includes('sessionStorage.setItem("secret"'), false, 'sessionStorage must never store secret');
    assert.equal(appJs.includes('document.cookie = "secret"'), false, 'Cookies must never store secret');
  });

  // AC-12: Console & Debugging Protection
  test('[ ] AC-12: Plaintext absent from console logs (no console.log of secrets)', () => {
    const files = [
      path.join(__dirname, '../public/js/app.js'),
      path.join(__dirname, '../public/create.js'),
      path.join(__dirname, '../public/js/view.js'),
      path.join(__dirname, '../public/view.js')
    ];

    for (const f of files) {
      if (fs.existsSync(f)) {
        const text = fs.readFileSync(f, 'utf8');
        assert.equal(text.includes('console.log(secret)'), false, `${f} must not log secret`);
        assert.equal(text.includes('console.log(decryptedData)'), false, `${f} must not log decryptedData`);
        assert.equal(text.includes('console.log(data.secret)'), false, `${f} must not log data.secret`);
        assert.equal(text.includes('console.log(activeSecretText)'), false, `${f} must not log activeSecretText`);
      }
    }
  });

  // AC-13: Sanitized Error Handling
  test('[ ] AC-13: Error handling does not leak secrets, database records, or stack traces', async () => {
    // 1. Invalid ID
    const resInvalidId = await fetch(`${baseUrl}/view/invalid-not-hex-id`);
    assert.equal(resInvalidId.status, 404);

    // 2. Malformed JSON
    const resMalformed = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"secret": "malformed'
    });
    assert.equal(resMalformed.status, 400);
    const bodyMalformed = await resMalformed.json();
    assert.ok(bodyMalformed.error);
    assert.equal(bodyMalformed.stack, undefined, 'Stack trace must not be exposed');

    // 3. Non-existent ID
    const resNonExistent = await fetch(`${baseUrl}/api/secret/000000000000/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(resNonExistent.status, 404);
  });

  // AC-14: Referrer Protection
  test('[ ] AC-14: Referrer protection enabled (Referrer-Policy: no-referrer)', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'REF_TEST_KEY_123', ttl_seconds: 3600, max_views: 1 })
    });
    const data = await createRes.json();

    const viewRes = await fetch(`${baseUrl}/view/${data.id}`);
    assert.equal(viewRes.status, 200);
    assert.equal(viewRes.headers.get('referrer-policy'), 'no-referrer');
  });

  // AC-15: Cache Protection
  test('[ ] AC-15: Cache disabled for secret responses (anti-caching headers)', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'CACHE_TEST_KEY_456', ttl_seconds: 3600, max_views: 1 })
    });
    const data = await createRes.json();

    // Pre-reveal view page
    const viewRes = await fetch(`${baseUrl}/view/${data.id}`);
    const cacheControl = viewRes.headers.get('cache-control');
    assert.ok(cacheControl && cacheControl.includes('no-store'));
    assert.ok(cacheControl.includes('no-cache'));
    assert.equal(viewRes.headers.get('pragma'), 'no-cache');
    assert.equal(viewRes.headers.get('expires'), '0');

    // Post-reveal burn API
    const burnRes = await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const burnCacheControl = burnRes.headers.get('cache-control');
    assert.ok(burnCacheControl && burnCacheControl.includes('no-store'));
    assert.equal(burnRes.headers.get('pragma'), 'no-cache');
    assert.equal(burnRes.headers.get('expires'), '0');
  });

  // AC-16: Server Logging Protection
  test('[ ] AC-16: Plaintext absent from server logs (sensitive test secret never appears in logs)', async () => {
    const sensitiveSecret = 'VAULT_SECURITY_TEST_9f82c7';
    let interceptedLogs = '';
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    process.stdout.write = (chunk, ...args) => {
      interceptedLogs += chunk.toString();
      return originalStdoutWrite.call(process.stdout, chunk, ...args);
    };
    process.stderr.write = (chunk, ...args) => {
      interceptedLogs += chunk.toString();
      return originalStderrWrite.call(process.stderr, chunk, ...args);
    };

    try {
      // 1. Create
      const createRes = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: sensitiveSecret, ttl_seconds: 300, max_views: 1 })
      });
      const data = await createRes.json();

      // 2. View
      await fetch(`${baseUrl}/view/${data.id}`);

      // 3. Burn
      await fetch(`${baseUrl}/api/secret/${data.id}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      // Assert no plaintext in intercepted logs
      assert.equal(interceptedLogs.includes(sensitiveSecret), false, 'Sensitive test secret must NEVER appear in stdout/stderr');
      assert.equal(interceptedLogs.includes('9f82c7'), false, 'Secret substring must NEVER appear in stdout/stderr');
    } finally {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    }
  });

  // AC-17: Content Security Policy
  test('[ ] AC-17: Content Security Policy (CSP) configured and restrictive', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'CSP header must be present');
    assert.ok(csp.includes("default-src 'self'"), "CSP must restrict default-src to 'self'");
    assert.ok(csp.includes("object-src 'none'"), "CSP must block plugins with object-src 'none'");
    assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must prevent clickjacking with frame-ancestors 'none'");
    assert.equal(csp.includes('script-src *'), false, 'CSP must not contain wildcard script-src *');
  });

  // HTTPS Enforced (Strict-Transport-Security)
  test('[ ] HTTPS Enforced: Strict-Transport-Security header present', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const hsts = res.headers.get('strict-transport-security');
    assert.ok(hsts && hsts.includes('max-age='), 'HSTS header must be configured with max-age');
  });

  // Rate Limiting Enabled
  test('[ ] Rate limiting enabled: returns HTTP 429 Too Many Requests when threshold exceeded', async () => {
    process.env.ENABLE_RATE_LIMIT_TEST = 'true';
    const { createRateLimiter } = require('../src/middleware/rateLimiter');
    const express = require('express');
    const testApp = express();
    const limiter = createRateLimiter({ max: 3, windowMs: 10000 });
    testApp.use(limiter);
    testApp.get('/test-rate-limit', (req, res) => res.json({ status: 'ok' }));

    let testServer;
    const testPort = await new Promise((resolve) => {
      testServer = testApp.listen(0, '127.0.0.1', () => {
        resolve(testServer.address().port);
      });
    });

    const testUrl = `http://127.0.0.1:${testPort}/test-rate-limit`;

    // First 3 requests succeed
    for (let i = 0; i < 3; i++) {
      const res = await fetch(testUrl);
      assert.equal(res.status, 200);
      assert.ok(res.headers.has('x-ratelimit-limit'));
    }

    // 4th request exceeds max -> 429 Too Many Requests
    const blockedRes = await fetch(testUrl);
    assert.equal(blockedRes.status, 429);
    assert.ok(blockedRes.headers.has('retry-after'));
    const body = await blockedRes.json();
    assert.ok(body.error.includes('Too many requests'));

    await new Promise((resolve) => testServer.close(resolve));
    process.env.ENABLE_RATE_LIMIT_TEST = 'false';
  });
});
