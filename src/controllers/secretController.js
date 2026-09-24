const fs = require('node:fs');
const path = require('node:path');
const secretService = require('../services/secretService');

const publicDir = path.join(process.cwd(), 'public');

/**
 * Health check endpoint.
 */
function health(req, res) {
  return res.status(200).json({ status: 'ok' });
}

/**
 * Creates a new encrypted secret.
 */
function createSecret(req, res, next) {
  try {
    const { secret, file, ttl_seconds, max_views, passphrase } = req.body;
    const result = secretService.createSecret({
      secret,
      file,
      ttlSeconds: ttl_seconds,
      maxViews: max_views,
      passphrase
    });
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Serves safe landing view page without decrypting or decrementing.
 */
function getSecretView(req, res, next) {
  try {
    const { id } = req.params;
    const meta = secretService.getSecretMetadata(id);

    if (!meta) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return res.status(404).sendFile(path.join(publicDir, '404.html'));
    }

    const templatePath = path.join(publicDir, 'view.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    const expiresIso = new Date(meta.expires_at).toISOString();
    const expiresFormatted = new Date(meta.expires_at).toLocaleString();
    const badgeClass = meta.views_remaining === 1 ? 'badge-danger' : 'badge-success';
    const passphraseClass = meta.has_passphrase ? '' : 'hidden';

    html = html
      .replace(/\{\{ID\}\}/g, id)
      .replace(/\{\{EXPIRES_AT\}\}/g, expiresFormatted)
      .replace(/\{\{EXPIRES_ISO\}\}/g, expiresIso)
      .replace(/\{\{VIEWS_REMAINING\}\}/g, String(meta.views_remaining))
      .replace(/\{\{BADGE_CLASS\}\}/g, badgeClass)
      .replace(/\{\{HAS_PASSPHRASE\}\}/g, String(meta.has_passphrase))
      .replace(/\{\{PASSPHRASE_CLASS\}\}/g, passphraseClass);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * Atomically consumes and decrypts a secret.
 */
function burnSecret(req, res, next) {
  try {
    const { id } = req.params;
    let passphrase = null;
    if (req.body && typeof req.body.passphrase === 'string') {
      passphrase = req.body.passphrase.trim();
    }

    const result = secretService.claimAndBurnSecret(id, passphrase);

    if (!result) {
      return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
    }

    if (result.invalidPassphrase) {
      return res.status(401).json({ error: 'Invalid passphrase. Secret was not destroyed.' });
    }

    return res.status(200).json({
      secret: result.secret,
      file: result.file || undefined,
      views_remaining: result.views_remaining,
      burned: result.burned
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  health,
  createSecret,
  getSecretView,
  burnSecret
};
