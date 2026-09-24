const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { encrypt, decrypt, getFingerprint, hashPassphrase } = require('./crypto');
const { createSecret, getSecretMetadata, burnSecret, deleteSecret, walCheckpoint } = require('./db');

const ID_REGEX = /^[0-9a-fA-F]{12}$/;

// Pre-read templates
const publicDir = path.join(__dirname, '..', 'public');
const createHtml = fs.readFileSync(path.join(publicDir, 'create.html'), 'utf8');
const viewHtmlTemplate = fs.readFileSync(path.join(publicDir, 'view.html'), 'utf8');
const page404Html = fs.readFileSync(path.join(publicDir, '404.html'), 'utf8');

async function vaultRoutes(fastify, options) {
  const rateLimitCreate = process.env.DISABLE_RATE_LIMIT === 'true' ? false : {
    max: parseInt(process.env.RATE_LIMIT_CREATE_MAX, 10) || 30,
    timeWindow: '1 minute'
  };

  const rateLimitBurn = process.env.DISABLE_RATE_LIMIT === 'true' ? false : {
    max: parseInt(process.env.RATE_LIMIT_BURN_MAX, 10) || 60,
    timeWindow: '1 minute'
  };

  // Health check
  fastify.get('/health', async (request, reply) => {
    return reply.code(200).send({ status: 'ok' });
  });

  // Create page
  fastify.get('/', async (request, reply) => {
    return reply
      .code(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .header('X-Robots-Tag', 'noindex, nofollow, noarchive')
      .send(createHtml);
  });

  // View splash page (READ ONLY - NEVER DECREMENTS OR DELETES)
  fastify.get('/view/:id', async (request, reply) => {
    const { id } = request.params;
    if (!ID_REGEX.test(id)) {
      return reply
        .code(404)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .header('X-Robots-Tag', 'noindex, nofollow, noarchive')
        .send(page404Html);
    }

    const meta = getSecretMetadata(id);
    if (!meta) {
      return reply
        .code(404)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .header('X-Robots-Tag', 'noindex, nofollow, noarchive')
        .send(page404Html);
    }

    const expiresIso = new Date(meta.expires_at).toISOString();
    const expiresFormatted = new Date(meta.expires_at).toLocaleString();
    const badgeClass = meta.views_remaining === 1 ? 'badge-danger' : 'badge-success';
    const passphraseClass = meta.has_passphrase ? '' : 'hidden';

    const rendered = viewHtmlTemplate
      .replace(/\{\{ID\}\}/g, id)
      .replace(/\{\{EXPIRES_AT\}\}/g, expiresFormatted)
      .replace(/\{\{EXPIRES_ISO\}\}/g, expiresIso)
      .replace(/\{\{VIEWS_REMAINING\}\}/g, String(meta.views_remaining))
      .replace(/\{\{BADGE_CLASS\}\}/g, badgeClass)
      .replace(/\{\{HAS_PASSPHRASE\}\}/g, String(meta.has_passphrase))
      .replace(/\{\{PASSPHRASE_CLASS\}\}/g, passphraseClass);

    return reply
      .code(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .header('X-Robots-Tag', 'noindex, nofollow, noarchive')
      .send(rendered);
  });

  // POST /api/secret - Create secret
  fastify.post('/api/secret', {
    config: {
      rateLimit: rateLimitCreate
    }
  }, async (request, reply) => {
    if (!request.body || typeof request.body !== 'object') {
      return reply.code(400).send({ error: 'Request body must be a JSON object.' });
    }

    const { secret, ttl_seconds = 3600, max_views = 1, passphrase } = request.body;

    if (typeof secret !== 'string' || secret.length === 0) {
      return reply.code(400).send({ error: 'secret is required and must be a non-empty string.' });
    }

    const secretBytes = Buffer.byteLength(secret, 'utf8');
    if (secretBytes > 10240) {
      return reply.code(400).send({ error: 'secret size exceeds the 10 KB maximum limit.' });
    }

    const minTtl = (process.env.NODE_ENV === 'test' || process.env.ALLOW_SHORT_TTL === 'true') ? 1 : 10;
    if (typeof ttl_seconds !== 'number' || !Number.isInteger(ttl_seconds) || ttl_seconds < minTtl || ttl_seconds > 604800) {
      return reply.code(400).send({ error: `ttl_seconds must be an integer between ${minTtl} and 604800.` });
    }

    if (typeof max_views !== 'number' || !Number.isInteger(max_views) || max_views < 1 || max_views > 10) {
      return reply.code(400).send({ error: 'max_views must be an integer between 1 and 10.' });
    }

    let passphraseHash = null;
    let passphraseSalt = null;
    if (passphrase !== undefined && passphrase !== null) {
      if (typeof passphrase !== 'string') {
        return reply.code(400).send({ error: 'passphrase must be a string if provided.' });
      }
      const trimmedPass = passphrase.trim();
      if (trimmedPass.length > 0) {
        const hashed = hashPassphrase(trimmedPass);
        passphraseHash = hashed.hash;
        passphraseSalt = hashed.salt;
      }
    }

    const id = crypto.randomBytes(6).toString('hex'); // 12 hex chars (48-bit URL-safe)
    const now = Date.now();
    const expiresAt = now + ttl_seconds * 1000;

    const { ciphertext, iv, tag } = encrypt(secret, id);

    createSecret({
      id,
      ciphertext,
      iv,
      auth_tag: tag,
      max_views,
      expires_at: expiresAt,
      created_at: now,
      passphrase_hash: passphraseHash,
      passphrase_salt: passphraseSalt
    });

    const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const fingerprint = getFingerprint(secret);

    return reply.code(201).send({
      id,
      view_url: `${baseUrl}/view/${id}`,
      expires_at: new Date(expiresAt).toISOString(),
      views_remaining: max_views,
      fingerprint
    });
  });

  // POST /api/secret/:id/burn - Atomic reveal and burn
  fastify.post('/api/secret/:id/burn', {
    config: {
      rateLimit: rateLimitBurn
    }
  }, async (request, reply) => {
    const { id } = request.params;
    if (!ID_REGEX.test(id)) {
      return reply.code(404).send({ error: 'Secret not found, expired, or already destroyed.' });
    }

    let passphrase = null;
    if (request.body && typeof request.body === 'object' && typeof request.body.passphrase === 'string') {
      passphrase = request.body.passphrase.trim();
    }

    const burnResult = burnSecret(id, passphrase);
    if (!burnResult) {
      return reply.code(404).send({ error: 'Secret not found, expired, or already destroyed.' });
    }

    if (burnResult.error === 'INVALID_PASSPHRASE') {
      return reply.code(401).send({ error: 'Invalid passphrase. Secret was not destroyed.' });
    }

    try {
      const plaintext = decrypt(burnResult.ciphertext, burnResult.iv, burnResult.auth_tag, id);
      return reply.code(200).send({
        secret: plaintext,
        views_remaining: burnResult.views_remaining,
        burned: burnResult.views_remaining === 0
      });
    } catch (err) {
      // Auth failure / tampering: hard-delete corrupt row and return clean 404
      deleteSecret(id);
      walCheckpoint();
      return reply.code(404).send({ error: 'Secret not found, expired, or already destroyed.' });
    }
  });
}

module.exports = vaultRoutes;
