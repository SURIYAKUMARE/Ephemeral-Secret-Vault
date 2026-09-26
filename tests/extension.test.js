/**
 * Ephemeral Secret Vault — Browser Extension Integration & Security Tests
 * Verifies Manifest V3 compliance, Platform Adapters, Sensitive Content Detection,
 * API Client communication, and Zero-Plaintext Storage guarantees.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'extension');

// Load extension shared modules in Node
const SensitiveDetector = require(path.join(extDir, 'shared', 'sensitive-detector.js'));
const StorageManager = require(path.join(extDir, 'shared', 'storage-manager.js'));
const VaultApiClient = require(path.join(extDir, 'shared', 'api-client.js'));

// Load adapters
const PlatformAdapter = require(path.join(extDir, 'content', 'adapters', 'adapter-base.js'));
const WhatsAppAdapter = require(path.join(extDir, 'content', 'adapters', 'whatsapp.js'));
const GmailAdapter = require(path.join(extDir, 'content', 'adapters', 'gmail.js'));
const OutlookAdapter = require(path.join(extDir, 'content', 'adapters', 'outlook.js'));
const TelegramAdapter = require(path.join(extDir, 'content', 'adapters', 'telegram.js'));
const DiscordAdapter = require(path.join(extDir, 'content', 'adapters', 'discord.js'));
const SlackAdapter = require(path.join(extDir, 'content', 'adapters', 'slack.js'));
const TeamsAdapter = require(path.join(extDir, 'content', 'adapters', 'teams.js'));
const GenericComposerAdapter = require(path.join(extDir, 'content', 'adapters', 'generic.js'));

describe('Browser Extension Architecture & Manifest V3 Validation', () => {
  it('manifest.json is valid Manifest V3 with least-privilege permissions', () => {
    const manifestPath = path.join(extDir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
    assert.ok(manifest.name.includes('Ephemeral Secret Vault'), 'Must have proper brand name');
    assert.ok(manifest.action && manifest.action.default_popup, 'Must specify default_popup');

    // Permissions check (least privilege)
    assert.ok(manifest.permissions.includes('activeTab'));
    assert.ok(manifest.permissions.includes('contextMenus'));
    assert.ok(manifest.permissions.includes('storage'));
    assert.ok(manifest.permissions.includes('scripting'));
    assert.equal(manifest.permissions.includes('<all_urls>'), false, 'Must not request all_urls in permissions');

    // Files existence verification
    assert.ok(fs.existsSync(path.join(extDir, manifest.action.default_popup)), 'Popup HTML file must exist');
    assert.ok(fs.existsSync(path.join(extDir, manifest.background.service_worker)), 'Service worker must exist');
    assert.ok(fs.existsSync(path.join(extDir, manifest.options_ui.page)), 'Options page must exist');

    // Verify icons exist
    for (const size of ['16', '32', '48', '128']) {
      const iconPath = path.join(extDir, manifest.icons[size]);
      assert.ok(fs.existsSync(iconPath), `Icon ${size} must exist at ${iconPath}`);
    }

    // Verify all content script files exist
    for (const cs of manifest.content_scripts) {
      for (const jsFile of cs.js) {
        assert.ok(fs.existsSync(path.join(extDir, jsFile)), `Content script file ${jsFile} must exist`);
      }
      for (const cssFile of cs.css) {
        assert.ok(fs.existsSync(path.join(extDir, cssFile)), `Content CSS file ${cssFile} must exist`);
      }
    }
  });
});

describe('Smart Sensitive Content Detection Tests', () => {
  it('detects OpenAI API keys accurately without network interaction', () => {
    const res = SensitiveDetector.detect('Here is the key: sk-proj-1234567890abcdef1234567890abcdef');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'OpenAI API Key');
  });

  it('detects AWS IAM credentials', () => {
    const res = SensitiveDetector.detect('AKIAIOSFODNN7EXAMPLE');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'AWS Access Key');
  });

  it('detects Google Cloud API keys', () => {
    const res = SensitiveDetector.detect('AIzaSyD-1234567890abcdefghijklmnopqrstuv');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'Google Cloud API Key');
  });

  it('detects GitHub Personal Access Tokens', () => {
    const res = SensitiveDetector.detect('ghp_1234567890abcdefghijklmnopqrstuvwxyz12');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'GitHub Token');
  });

  it('detects Database URIs with credentials', () => {
    const res = SensitiveDetector.detect('postgres://admin:SuperSecretPassword123@db.internal:5432/production');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'Database Connection String');
  });

  it('detects cryptographic private key headers', () => {
    const res = SensitiveDetector.detect('-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'Private Key');
  });

  it('detects inline password assignments', () => {
    const res = SensitiveDetector.detect('password = "SecretPassword99!"');
    assert.equal(res.isSensitive, true);
    assert.equal(res.type, 'Inline Password / Credential');
  });

  it('does NOT trigger on innocent non-sensitive conversational messages', () => {
    const res1 = SensitiveDetector.detect('Hi team, let us meet tomorrow at 10 AM.');
    assert.equal(res1.isSensitive, false);

    const res2 = SensitiveDetector.detect('The weather is nice today in San Francisco.');
    assert.equal(res2.isSensitive, false);
  });
});

describe('Platform Adapter Architecture & Formatting Tests', () => {
  it('all platform adapters instantiate with proper names', () => {
    const wa = new WhatsAppAdapter();
    assert.equal(wa.name, 'WhatsApp Web');

    const gmail = new GmailAdapter();
    assert.equal(gmail.name, 'Gmail');

    const outlook = new OutlookAdapter();
    assert.equal(outlook.name, 'Outlook Web');

    const telegram = new TelegramAdapter();
    assert.equal(telegram.name, 'Telegram Web');

    const discord = new DiscordAdapter();
    assert.equal(discord.name, 'Discord');

    const slack = new SlackAdapter();
    assert.equal(slack.name, 'Slack');

    const teams = new TeamsAdapter();
    assert.equal(teams.name, 'Microsoft Teams');

    const generic = new GenericComposerAdapter();
    assert.equal(generic.name, 'Generic Composer');
  });

  it('formatSecureMessage creates standardized, safe replacement template', () => {
    const adapter = new PlatformAdapter('Test');
    const testUrl = 'https://vault.example.com/v/abc123xyz';
    const message = adapter.formatSecureMessage(testUrl);

    assert.ok(message.includes('🔐 Secure Secret'));
    assert.ok(message.includes('Open securely:'));
    assert.ok(message.includes(testUrl));
    assert.equal(message.includes('plaintext'), false);
  });
});

describe('Storage Manager & Zero-Plaintext Security Tests', () => {
  it('saves and retrieves extension settings safely', async () => {
    const settings = await StorageManager.getSettings();
    assert.ok(settings.serverUrl);
    assert.equal(settings.defaultTtlSeconds, 600);

    const updated = await StorageManager.saveSettings({ defaultTtlSeconds: 3600 });
    assert.equal(updated.defaultTtlSeconds, 3600);
  });

  it('addHistoryEntry stores ONLY metadata and NEVER stores plaintext secrets or keys', async () => {
    await StorageManager.clearHistory();

    const entryWithSecret = {
      id: 'vault-test-123',
      url: 'http://localhost:3000/v/vault-test-123',
      expires_at: new Date(Date.now() + 600000).toISOString(),
      views_remaining: 1,
      platform: 'WhatsApp Web',
      // Attacker or bug attempts to pass plaintext or key
      secret: 'CRITICAL_SECRET_CONTENT_DO_NOT_PERSIST',
      plaintext: 'LEAK_ATTEMPT',
      dek: '0123456789abcdef'
    };

    const history = await StorageManager.addHistoryEntry(entryWithSecret);
    assert.equal(history.length, 1);

    const saved = history[0];
    assert.equal(saved.id, 'vault-test-123');
    assert.equal(saved.url, 'http://localhost:3000/v/vault-test-123');
    assert.equal(saved.views_remaining, 1);
    assert.equal(saved.platform, 'WhatsApp Web');

    // Strict zero-plaintext verification:
    assert.equal('secret' in saved, false, 'Plaintext secret MUST NOT exist in saved history');
    assert.equal('plaintext' in saved, false, 'Plaintext field MUST NOT exist in saved history');
    assert.equal('dek' in saved, false, 'Encryption keys MUST NOT exist in saved history');
  });
});

describe('API Client Communication Tests', () => {
  let server;
  let testServerUrl = 'http://localhost:3000';
  let testDbPath;

  before(async () => {
    // If localhost:3000 is not running, spin up a test express instance dynamically
    const probe = await VaultApiClient.checkHealth('http://localhost:3000');
    if (!probe.online) {
      testDbPath = path.join(rootDir, 'tests', 'test-ext-api.db');
      try { fs.unlinkSync(testDbPath); } catch {}
      try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
      try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}

      process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      process.env.DATABASE_PATH = testDbPath;
      process.env.DB_PATH = testDbPath;

      const { initDb } = require('../src/database/db');
      const app = require('../src/app');

      initDb(testDbPath);
      await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          testServerUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    }
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      const { closeDb } = require('../src/database/db');
      closeDb();
      if (testDbPath) {
        try { fs.unlinkSync(testDbPath); } catch {}
        try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
        try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}
      }
    }
  });

  it('checkHealth connects to running vault server', async () => {
    const health = await VaultApiClient.checkHealth(testServerUrl);
    assert.equal(health.online, true);
    assert.equal(health.status, 'ok');
    assert.ok(typeof health.latencyMs === 'number');
  });

  it('checkHealth reports offline safely on unreachable port', async () => {
    const offlineHealth = await VaultApiClient.checkHealth('http://127.0.0.1:59998');
    assert.equal(offlineHealth.online, false);
    assert.ok(typeof offlineHealth.latencyMs === 'number');
  });

  it('createSecret generates secure vault link from backend', async () => {
    const result = await VaultApiClient.createSecret({
      secret: 'ConfidentialExtensionToken12345!',
      ttlSeconds: 600,
      maxViews: 1,
      serverUrl: testServerUrl
    });

    assert.ok(result.id, 'Must return vault ID');
    assert.ok(result.url.includes('/view/') || result.url.includes('/v/'), 'Must return valid view URL');
    assert.equal(result.views_remaining, 1);
    assert.ok(result.expires_at);

    // Verify link is accessible via HTTP
    const res = await fetch(result.url);
    assert.equal(res.status, 200);

    const html = await res.text();
    // Plaintext secret must NEVER be in the served HTML
    assert.equal(html.includes('ConfidentialExtensionToken12345!'), false);
  });
});
