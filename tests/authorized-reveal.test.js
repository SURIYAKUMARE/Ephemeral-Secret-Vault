const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';
process.env.ALLOW_SHORT_TTL = 'true';

const testDbPath = path.join(__dirname, 'test-authorized-reveal.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb } = require('../src/database/db');
const app = require('../src/app');

describe('Authorized Reveal & Token Flow Security Tests (Tests A through H)', () => {
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

  // Test A — Direct Vault Access
  test('Test A — Direct Vault Access: GET /vault/{vaultId} returns UI only, zero plaintext, zero keys', async () => {
    const secretContent = 'SECRET_TEST_A_CONFIDENTIAL_XYZ888';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    const vaultRes = await fetch(`${baseUrl}/vault/${data.id}`);
    assert.equal(vaultRes.status, 200);
    const html = await vaultRes.text();

    assert.ok(html.includes('🔐 SECRET VAULT'), 'Must show 🔐 SECRET VAULT');
    assert.equal(html.includes(secretContent), false, 'Plaintext secret must NEVER exist in vault UI HTML');
    assert.equal(html.includes('XYZ888'), false, 'Secret substring must NEVER exist in vault UI HTML');
    assert.equal(html.includes(process.env.VAULT_MASTER_KEY), false, 'Master key must NEVER exist in vault UI HTML');
  });

  // Test B — Direct API Access
  test('Test B — Direct API Access: GET /api/vault/{vaultId}/secret is DENIED (no undocumented plaintext leak)', async () => {
    const secretContent = 'SECRET_TEST_B_DIRECT_API_DENIED';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // 1. GET /api/vault/:id/secret
    const res1 = await fetch(`${baseUrl}/api/vault/${data.id}/secret`);
    assert.equal(res1.status, 403, 'Direct access to plaintext secret must be 403 Forbidden');
    const body1 = await res1.json();
    assert.equal(body1.secret, undefined);

    // 2. GET /api/secret/:id/secret
    const res2 = await fetch(`${baseUrl}/api/secret/${data.id}/secret`);
    assert.equal(res2.status, 403);
    const body2 = await res2.json();
    assert.equal(body2.secret, undefined);
  });

  // Test C — Reveal Without Token
  test('Test C — Reveal Without Token: POST /api/vault/{vaultId}/reveal rejected without valid Reveal Token', async () => {
    const secretContent = 'SECRET_TEST_C_NO_TOKEN';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // Attempt reveal with no authorization header and no token
    const resNoToken = await fetch(`${baseUrl}/api/vault/${data.id}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(resNoToken.status, 401, 'Request without token must receive 401 Unauthorized');
    const bodyNoToken = await resNoToken.json();
    assert.equal(bodyNoToken.secret, undefined, 'No plaintext secret may be returned');
    assert.equal(bodyNoToken.error, 'Unable to reveal this secret.');
  });

  // Test D — Expired Token
  test('Test D — Expired Token: Expired Reveal Token is DENIED', async () => {
    const secretContent = 'SECRET_TEST_D_EXPIRED_TOKEN';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // 1. Request valid token
    const tokRes = await fetch(`${baseUrl}/api/vault/${data.id}/reveal/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(tokRes.status, 200);
    const tokData = await tokRes.json();
    assert.ok(tokData.reveal_token);

    // 2. Artificially expire the token in database
    const tokenHash = crypto.createHash('sha256').update(tokData.reveal_token).digest('hex');
    getDb().prepare('UPDATE reveal_tokens SET expires_at = ? WHERE token_hash = ?').run(Date.now() - 5000, tokenHash);

    // 3. Attempt reveal with expired token
    const revealRes = await fetch(`${baseUrl}/api/vault/${data.id}/reveal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokData.reveal_token}`
      },
      body: JSON.stringify({})
    });
    assert.equal(revealRes.status, 403, 'Expired token must receive 403 Forbidden');
    const revealBody = await revealRes.json();
    assert.equal(revealBody.secret, undefined);
    assert.equal(revealBody.error, 'Unable to reveal this secret.');
  });

  // Test E — Replayed Token
  test('Test E — Replayed Token: Single-use Reveal Token cannot be reused (1st SUCCESS, 2nd DENIED)', async () => {
    const secretContent = 'SECRET_TEST_E_REPLAY_PROTECTION';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretContent, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // 1. Request token
    const tokRes = await fetch(`${baseUrl}/api/vault/${data.id}/reveal/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(tokRes.status, 200);
    const { reveal_token } = await tokRes.json();

    // 2. First authorized reveal -> SUCCESS
    const reveal1 = await fetch(`${baseUrl}/api/vault/${data.id}/reveal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${reveal_token}`
      },
      body: JSON.stringify({})
    });
    assert.equal(reveal1.status, 200);
    const body1 = await reveal1.json();
    assert.equal(body1.secret, secretContent);

    // 3. Second reveal attempt with same token -> DENIED
    const reveal2 = await fetch(`${baseUrl}/api/vault/${data.id}/reveal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${reveal_token}`
      },
      body: JSON.stringify({})
    });
    assert.equal(reveal2.status, 403, 'Replayed token must be rejected');
    const body2 = await reveal2.json();
    assert.equal(body2.secret, undefined);
  });

  // Test F — Wrong Vault
  test('Test F — Wrong Vault: Valid token for Vault A used on Vault B is DENIED', async () => {
    // Create Vault A
    const resA = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'VAULT_A_SECRET_111', ttl_seconds: 3600, max_views: 1 })
    });
    const vaultA = await resA.json();

    // Create Vault B
    const resB = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'VAULT_B_SECRET_222', ttl_seconds: 3600, max_views: 1 })
    });
    const vaultB = await resB.json();

    // Request token for Vault A
    const tokResA = await fetch(`${baseUrl}/api/vault/${vaultA.id}/reveal/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const { reveal_token: tokenA } = await tokResA.json();

    // Attempt to reveal Vault B using Token A
    const revealWrong = await fetch(`${baseUrl}/api/vault/${vaultB.id}/reveal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({})
    });
    assert.equal(revealWrong.status, 403, 'Token from wrong vault must be denied');
    const bodyWrong = await revealWrong.json();
    assert.equal(bodyWrong.secret, undefined);
  });

  // Test G — Source Inspection
  test('Test G — Source Inspection: Before reveal, frontend resources contain 0 matches of test secret', async () => {
    const uniqueTestSecret = 'VAULT_TEST_SECRET_2026_X9K7';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: uniqueTestSecret, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    const endpointsToInspect = [
      '/',
      `/vault/${data.id}`,
      `/view/${data.id}`,
      '/js/app.js',
      '/js/view.js',
      '/css/style.css'
    ];

    for (const ep of endpointsToInspect) {
      const res = await fetch(`${baseUrl}${ep}`);
      const text = await res.text();
      assert.equal(text.includes(uniqueTestSecret), false, `Resource ${ep} must contain 0 matches of test secret`);
      assert.equal(text.includes('X9K7'), false, `Resource ${ep} must contain 0 matches of test secret substring`);
    }
  });

  // Test H — Network Inspection
  test('Test H — Network Inspection: Plaintext returned ONLY in authorized reveal response with no-store headers', async () => {
    const netSecret = 'NETWORK_INSPECT_SECRET_CONFIDENTIAL_555';
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: netSecret, ttl_seconds: 3600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const data = await createRes.json();

    // 1. Before reveal: View page response does NOT contain plaintext
    const viewRes = await fetch(`${baseUrl}/vault/${data.id}`);
    const viewText = await viewRes.text();
    assert.equal(viewText.includes(netSecret), false, 'View page must not contain plaintext');

    // 2. Token request response does NOT contain plaintext
    const tokRes = await fetch(`${baseUrl}/api/vault/${data.id}/reveal/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(tokRes.status, 200);
    const tokJson = await tokRes.json();
    assert.equal(JSON.stringify(tokJson).includes(netSecret), false, 'Token response must not contain plaintext');

    // 3. Authorized reveal response contains plaintext AND no-store headers
    const revealRes = await fetch(`${baseUrl}/api/vault/${data.id}/reveal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokJson.reveal_token}`
      },
      body: JSON.stringify({})
    });
    assert.equal(revealRes.status, 200);
    const cacheControl = revealRes.headers.get('cache-control');
    assert.ok(cacheControl && cacheControl.includes('no-store'), 'Response must have Cache-Control: no-store');
    assert.equal(revealRes.headers.get('pragma'), 'no-cache');
    assert.equal(revealRes.headers.get('referrer-policy'), 'no-referrer');

    const revealBody = await revealRes.json();
    assert.equal(revealBody.secret, netSecret, 'Plaintext returned only in authorized reveal response');
  });
});
