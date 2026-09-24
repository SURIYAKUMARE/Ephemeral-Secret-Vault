const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-file-upload.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb } = require('../src/database/db');
const app = require('../src/app');

describe('Universal File Upload & Zero-Trace Self-Destruction Tests', () => {
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

  test('Upload code file (surya.py), reveal, verify content, and confirm immediate destruction', async () => {
    const pythonCode = 'def main():\n    print("Hello from Ephemeral Secret Vault!")\n\nif __name__ == "__main__":\n    main()\n';
    const base64Data = `data:text/x-python;base64,${Buffer.from(pythonCode).toString('base64')}`;

    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'Here is the secret script requested by Surya',
        file: {
          name: 'surya.py',
          type: 'text/x-python',
          size: Buffer.byteLength(pythonCode),
          data: base64Data
        },
        ttl_seconds: 3600,
        max_views: 1
      })
    });

    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    assert.ok(createData.id);
    assert.ok(createData.view_url);

    // Burn and reveal
    const burnRes = await fetch(`${baseUrl}/api/secret/${createData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });

    assert.equal(burnRes.status, 200);
    const burnData = await burnRes.json();
    assert.equal(burnData.burned, true);
    assert.equal(burnData.views_remaining, 0);
    assert.equal(burnData.secret, 'Here is the secret script requested by Surya');
    assert.ok(burnData.file);
    assert.equal(burnData.file.name, 'surya.py');
    assert.equal(burnData.file.type, 'text/x-python');

    // Decode returned base64 and verify exact match
    const rawBase64 = burnData.file.data.split(',')[1] || burnData.file.data;
    const decodedCode = Buffer.from(rawBase64, 'base64').toString('utf8');
    assert.equal(decodedCode, pythonCode);

    // Confirm immediate permanent destruction from database
    const secondBurnRes = await fetch(`${baseUrl}/api/secret/${createData.id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(secondBurnRes.status, 404);
  });

  test('Upload binary PDF / image file with zero text note, verify burn and destruction', async () => {
    // Generate a dummy binary buffer representing a PDF
    const fakePdfBytes = Buffer.from('%PDF-1.4\n%Fake PDF binary content for testing\n%%EOF');
    const base64Pdf = `data:application/pdf;base64,${fakePdfBytes.toString('base64')}`;

    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: {
          name: 'confidential_report.pdf',
          type: 'application/pdf',
          size: fakePdfBytes.length,
          data: base64Pdf
        },
        ttl_seconds: 1800,
        max_views: 1
      })
    });

    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });

    assert.equal(burnRes.status, 200);
    const burnData = await burnRes.json();
    assert.ok(burnData.file);
    assert.equal(burnData.file.name, 'confidential_report.pdf');
    assert.equal(burnData.file.type, 'application/pdf');

    // Verify binary fidelity
    const rawPdfBase64 = burnData.file.data.split(',')[1];
    assert.deepEqual(Buffer.from(rawPdfBase64, 'base64'), fakePdfBytes);

    // Verify row destroyed
    const burnCheck = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(burnCheck.status, 404);
  });

  test('Validation: rejects file with missing name or invalid payload', async () => {
    const res1 = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: {
          name: '',
          data: 'data:text/plain;base64,aGVsbG8='
        }
      })
    });
    assert.equal(res1.status, 400);

    const res2 = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: {
          name: 'test.txt',
          data: 'A'.repeat(16 * 1024 * 1024) // Exceeds 15 MB base64 limit
        }
      })
    });
    assert.equal(res2.status, 400);
  });
});
