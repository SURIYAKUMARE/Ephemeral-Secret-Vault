const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-geo-ip.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');

describe('Geo and IP Allow-List Security Policy Tests', () => {
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

  test('IP Allow-List: rejects unauthorized IP with 403 without revealing secret or burning it', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'OFFICE_INTERNAL_SECRET',
        allowed_ips: ['198.51.100.25', '192.168.1.0/24']
      })
    });

    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 1. Attempt from unauthorized external IP
    const rejectRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.99'
      }
    });

    assert.equal(rejectRes.status, 403);
    const rejectBody = await rejectRes.json();
    assert.equal(rejectBody.error, 'Access denied by vault security policy.');

    // 2. Attempt from authorized CIDR subnet IP (192.168.1.50)
    const successRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.50'
      }
    });

    assert.equal(successRes.status, 200);
    const successBody = await successRes.json();
    assert.equal(successBody.secret, 'OFFICE_INTERNAL_SECRET');
    assert.equal(successBody.burned, true);
  });

  test('Country Allow-List: rejects burns from disallowed countries without leaking check specifics', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'RESTRICTED_GEO_SECRET',
        allowed_countries: ['US', 'CA', 'GB']
      })
    });

    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    // 1. Attempt from unauthorized country (FR)
    const rejectRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-IPCountry': 'FR'
      }
    });

    assert.equal(rejectRes.status, 403);
    const rejectBody = await rejectRes.json();
    assert.equal(rejectBody.error, 'Access denied by vault security policy.');

    // 2. Attempt from authorized country (US)
    const successRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-IPCountry': 'US'
      }
    });

    assert.equal(successRes.status, 200);
    const successBody = await successRes.json();
    assert.equal(successBody.secret, 'RESTRICTED_GEO_SECRET');
  });
});
