const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-audit-chain.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');
const auditService = require('../src/services/auditService');

describe('Hash-Chained Audit Log Tests', () => {
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

  test('Happy Path: Secret lifecycle generates cryptographic audit hash chain root on burn and purges from memory', async () => {
    // 1. Create secret (appends CREATE block)
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.1'
      },
      body: JSON.stringify({ secret: 'AUDIT_VERIFIED_TRANSACTION' })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 2. View metadata (appends VIEW_METADATA block)
    const viewRes = await fetch(`${baseUrl}/view/${id}`, {
      headers: { 'X-Forwarded-For': '198.51.100.2' }
    });
    assert.equal(viewRes.status, 200);

    // 3. Burn secret (appends BURN_ATTEMPT block, calculates chain root, purges chain)
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.3'
      }
    });

    assert.equal(burnRes.status, 200);
    const burnBody = await burnRes.json();
    assert.equal(burnBody.burned, true);
    assert.ok(burnBody.audit_chain_root, 'Burn response must include audit_chain_root');
    assert.equal(typeof burnBody.audit_chain_root, 'string');
    assert.equal(burnBody.audit_chain_root.length, 64, 'Audit root must be a 64-character SHA-256 hex string');

    // 4. Verify in-memory audit log was completely purged upon destruction (zero persistence guarantee)
    const discardedResult = auditService.finalizeAndDiscard(id);
    assert.equal(discardedResult, null, 'Audit chain must be deleted from memory immediately upon burn');
  });
});
