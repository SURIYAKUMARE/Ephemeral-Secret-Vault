const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-passphrase-bruteforce.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb, walCheckpoint } = require('../src/database/db');
const app = require('../src/app');

describe('Passphrase Brute-Force Defense, Auto-Destruct & Duress Tests', () => {
  let server;
  let baseUrl;
  let duressWebhookServer;
  let duressWebhookPort;
  let duressReceivedPayloads = [];

  before(async () => {
    try { fs.unlinkSync(testDbPath); } catch {}
    try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
    try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}

    // Mock Duress Webhook Server
    duressWebhookServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          duressReceivedPayloads.push(JSON.parse(body));
        } catch {
          duressReceivedPayloads.push(body);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      });
    });

    await new Promise((resolve) => {
      duressWebhookServer.listen(0, '127.0.0.1', () => {
        duressWebhookPort = duressWebhookServer.address().port;
        process.env.DURESS_WEBHOOK_URL = `http://127.0.0.1:${duressWebhookPort}/webhook/duress`;
        resolve();
      });
    });

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
    if (duressWebhookServer) await new Promise((resolve) => duressWebhookServer.close(resolve));
    closeDb();
    try { fs.unlinkSync(testDbPath); } catch {}
    try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
    try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}
  });

  test('Passphrase Strength Gate: rejects passphrases under 8 chars or from common blocklist', async () => {
    // 1. Rejects under 8 chars
    const shortRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'Sensitive document',
        passphrase: 'short'
      })
    });
    assert.equal(shortRes.status, 400);
    const shortBody = await shortRes.json();
    assert.match(shortBody.error, /at least 8 characters/i);

    // 2. Rejects common passwords from top 100 blocklist
    const commonPasswords = ['password123', 'admin123', '12345678', 'iloveyou', 'passphrase'];
    for (const commonPwd of commonPasswords) {
      const blockRes = await fetch(`${baseUrl}/api/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'Sensitive document',
          passphrase: commonPwd
        })
      });
      assert.equal(blockRes.status, 400);
      const blockBody = await blockRes.json();
      assert.match(blockBody.error, /too common and easily guessable/i);
    }

    // 3. Accepts strong non-blocklist passphrase
    const goodRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'Sensitive document',
        passphrase: 'Correct-Horse-Battery-Staple-99!'
      })
    });
    assert.equal(goodRes.status, 201);
  });

  test('Auto-Destruct on Wrong Guesses + Progressive Delay Lifecycle', async () => {
    const rawSecret = 'CLASSIFIED_MILITARY_FLIGHT_PATH_DELTA';
    const validPassphrase = 'AlphaBravoCharlieDelta77!';

    // 1. Create secret with passphrase
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: rawSecret,
        passphrase: validPassphrase
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 2. Attempt 1: Wrong guess -> 401, attempts_remaining: 2, ~0ms added delay
    const t0 = Date.now();
    const wrongRes1 = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'WrongPasswordAttempt1!' })
    });
    const duration1 = Date.now() - t0;
    assert.equal(wrongRes1.status, 401);
    const body1 = await wrongRes1.json();
    assert.equal(body1.error, 'Invalid passphrase');
    assert.equal(body1.attempts_remaining, 2);
    assert.ok(duration1 < 400, `Attempt 1 should not have progressive delay (was ${duration1}ms)`);

    // 3. Attempt 2: Wrong guess -> 401, attempts_remaining: 1, ~500ms progressive delay
    const t1 = Date.now();
    const wrongRes2 = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'WrongPasswordAttempt2!' })
    });
    const duration2 = Date.now() - t1;
    assert.equal(wrongRes2.status, 401);
    const body2 = await wrongRes2.json();
    assert.equal(body2.error, 'Invalid passphrase');
    assert.equal(body2.attempts_remaining, 1);
    assert.ok(duration2 >= 450, `Attempt 2 must enforce ~500ms delay (was ${duration2}ms)`);

    // 4. Attempt 3: 3rd wrong guess -> 410 auto-destruct, ~1500ms progressive delay
    const t2 = Date.now();
    const wrongRes3 = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'WrongPasswordAttempt3!' })
    });
    const duration3 = Date.now() - t2;
    assert.equal(wrongRes3.status, 410);
    const body3 = await wrongRes3.json();
    assert.equal(body3.error, 'Secret permanently destroyed after too many failed attempts');
    assert.ok(duration3 >= 1400, `Attempt 3 must enforce ~1500ms delay (was ${duration3}ms)`);

    // 5. Verify physical row destruction in SQLite: row count must be 0
    const db = getDb();
    const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id);
    assert.equal(row, null || undefined, 'Database row must be completely removed');

    // 6. Verify checkpointed WAL file has zero residual data
    walCheckpoint();
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE id = ?');
    assert.equal(checkStmt.get(id).count, 0);

    // 7. Subsequent attempt with correct passphrase fails (404/410)
    const subsequentRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: validPassphrase })
    });
    assert.equal(subsequentRes.status, 404);
  });

  test('Concurrency Stress: 20 parallel wrong-passphrase requests hitting the last attempt simultaneously', async () => {
    const rawSecret = 'SUPER_CONCURRENT_VAULT_TEST_PAYLOAD';
    const validPassphrase = 'CorrectPassphraseRockSolid99!';

    // 1. Create secret with passphrase
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: rawSecret,
        passphrase: validPassphrase
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 2. Perform 2 failed attempts so exactly 1 attempt remains
    const fail1 = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'WrongGuessOne111!' })
    });
    assert.equal(fail1.status, 401);

    const fail2 = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'WrongGuessTwo222!' })
    });
    assert.equal(fail2.status, 401);

    // Now failed_attempts = 2, max_failed_attempts = 3. Next wrong guess will destroy the secret!
    // 3. Fire 20 parallel wrong-passphrase requests hitting the last attempt simultaneously
    const parallelRequests = Array.from({ length: 20 }, (_, i) => {
      return fetch(`${baseUrl}/api/secret/${id}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: `ConcurrentWrongGuess-${i}-X!` })
      });
    });

    const responses = await Promise.all(parallelRequests);
    const statusCounts = {};
    for (const r of responses) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    // Every response must be either 410 (destroyed) or 404 (already deleted)
    // No 200, no 500, no unhandled exceptions
    assert.ok(statusCounts[410] >= 1, 'At least one request must receive 410 destruction response');
    const validStatusCodes = [410, 404];
    for (const status of Object.keys(statusCounts)) {
      assert.ok(validStatusCodes.includes(Number(status)), `Unexpected status code ${status} during concurrent brute force`);
    }

    // 4. Verify database state is clean: zero rows remain
    const db = getDb();
    const remainingCount = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE id = ?').get(id).count;
    assert.equal(remainingCount, 0, 'Database row must be 100% destroyed without residue');
  });

  test('Duress Passphrase: returns decoy cover secret, burns row, and fires alert webhook with zero plaintext leakage', async () => {
    const realSecret = 'CONFIDENTIAL_FINANCIAL_ASSETS_OVERSEAS_991823';
    const coverSecret = 'System Diagnostic: All servers operational. No credentials found.';
    const normalPassphrase = 'NormalDailyPassword99!';
    const duressPassphrase = 'EmergencyCoercionPassword99!';

    duressReceivedPayloads = [];

    // 1. Create secret with duress passphrase
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: realSecret,
        passphrase: normalPassphrase,
        duress_passphrase: duressPassphrase,
        cover_secret: coverSecret
      })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 2. Burn secret with duress passphrase
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: duressPassphrase })
    });

    assert.equal(burnRes.status, 200);
    const burnBody = await burnRes.json();

    // 3. Verify cover secret returned instead of real secret
    assert.equal(burnBody.secret, coverSecret);
    assert.equal(burnBody.secret.includes('CONFIDENTIAL_FINANCIAL'), false);
    assert.equal(burnBody.burned, true);

    // 4. Verify record is physically deleted
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE id = ?').get(id).count;
    assert.equal(count, 0, 'Secret must be physically erased after duress activation');

    // 5. Verify duress webhook alert received with minimal alert details and ZERO secret leakage
    // Wait briefly for HTTP dispatch
    await new Promise(r => setTimeout(r, 200));

    assert.ok(duressReceivedPayloads.length >= 1, 'Duress webhook must receive notification');
    const alert = duressReceivedPayloads[0];
    assert.equal(alert.event, 'DURESS_TRIGGERED');
    assert.equal(alert.id, id);
    assert.ok(alert.timestamp);
    assert.equal(alert.secret, undefined, 'Webhook must NEVER contain plaintext secret');
    assert.equal(alert.passphrase, undefined, 'Webhook must NEVER contain passphrases');
  });
});
