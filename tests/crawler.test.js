const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

const testDbPath = path.join(__dirname, 'test-crawler.db');
process.env.DATABASE_PATH = testDbPath;
process.env.DB_PATH = testDbPath;

const { initDb, closeDb, getDb } = require('../src/database/db');
const { BOT_STATIC_SHELL } = require('../src/middleware/botGuard');
const app = require('../src/app');

describe('Scraper & Link-Preview Defense Tests', () => {
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

  test('TEST 8: Slackbot crawler GET /view/:id returns static shell, views remain untouched, subsequent human burn succeeds', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'SlackbotProtectedSecret', ttl_seconds: 600, max_views: 1 })
    });
    const { id } = await createRes.json();

    // Crawler GET
    const crawlerRes = await fetch(`${baseUrl}/view/${id}`, {
      headers: { 'User-Agent': 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' }
    });
    assert.equal(crawlerRes.status, 200);
    const body = await crawlerRes.text();
    assert.equal(body, BOT_STATIC_SHELL);

    // Verify row still exists with views_remaining = 1
    const db = getDb();
    const row = db.prepare('SELECT views_remaining FROM secrets WHERE id = ?').get(id);
    assert.equal(row.views_remaining, 1, 'Views remaining must not change after crawler GET');

    // Human burn succeeds
    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    assert.equal(burnRes.status, 200);
    const burnData = await burnRes.json();
    assert.equal(burnData.secret, 'SlackbotProtectedSecret');
    assert.equal(burnData.burned, true);
  });

  test('Major preview bots (Twitterbot, Discordbot, Facebook, WhatsApp, Telegram) receive static shell with zero DB hit', async () => {
    const crawlers = [
      'Twitterbot/1.0',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'WhatsApp/2.21.12.21 A',
      'TelegramBot (like TwitterBot)',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    ];

    for (const ua of crawlers) {
      const res = await fetch(`${baseUrl}/view/0123456789ab`, {
        headers: { 'User-Agent': ua }
      });
      assert.equal(res.status, 200, `Crawler ${ua} should receive 200`);
      const body = await res.text();
      assert.equal(body, BOT_STATIC_SHELL);
    }
  });

  test('Crawler POST /api/secret/:id/burn returns 403 Forbidden with empty body and state unchanged', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'BotPostBlocked', ttl_seconds: 600, max_views: 1 })
    });
    const { id } = await createRes.json();

    const botPost = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'User-Agent': 'Twitterbot/1.0' }
    });
    assert.equal(botPost.status, 403);
    const body = await botPost.text();
    assert.equal(body, '', 'Bot POST must receive empty response');

    // Confirm state untouched in DB
    const db = getDb();
    const row = db.prepare('SELECT views_remaining FROM secrets WHERE id = ?').get(id);
    assert.equal(row.views_remaining, 1);
  });

  test('Standard human GET /view/:id never decrements or burns across 10 requests', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'PersistentUntilBurn', ttl_seconds: 600, max_views: 1 })
    });
    const { id } = await createRes.json();

    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${baseUrl}/view/${id}`);
      assert.equal(res.status, 200);
    }

    const db = getDb();
    const row = db.prepare('SELECT views_remaining FROM secrets WHERE id = ?').get(id);
    assert.equal(row.views_remaining, 1);
  });

  test('curl User-Agent is explicitly NOT blocked', async () => {
    const createRes = await fetch(`${baseUrl}/api/secret`, {
      method: 'POST',
      headers: {
        'User-Agent': 'curl/8.4.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ secret: 'CurlWhitelistSecret', ttl_seconds: 600, max_views: 1 })
    });
    assert.equal(createRes.status, 201);
    const { id } = await createRes.json();

    const viewRes = await fetch(`${baseUrl}/view/${id}`, {
      headers: { 'User-Agent': 'curl/8.4.0' }
    });
    assert.equal(viewRes.status, 200);
    const viewHtml = await viewRes.text();
    assert.notEqual(viewHtml, BOT_STATIC_SHELL, 'curl should receive normal view splash, not bot shell');

    const burnRes = await fetch(`${baseUrl}/api/secret/${id}/burn`, {
      method: 'POST',
      headers: { 'User-Agent': 'curl/8.4.0' }
    });
    assert.equal(burnRes.status, 200);
    const data = await burnRes.json();
    assert.equal(data.secret, 'CurlWhitelistSecret');
  });
});
