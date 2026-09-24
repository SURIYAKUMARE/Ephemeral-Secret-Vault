const { isValidId } = require('../utils/idGenerator');

function validateCreateSecret(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { secret, file, ttl_seconds = 3600, max_views = 1, passphrase } = req.body;

  const hasSecret = typeof secret === 'string' && secret.length > 0;
  const hasFile = file && typeof file === 'object' && typeof file.data === 'string' && file.data.length > 0;

  if (!hasSecret && !hasFile) {
    return res.status(400).json({ error: 'secret is required and must be a non-empty string.' });
  }

  if (hasSecret && !hasFile) {
    const secretBytes = Buffer.byteLength(secret, 'utf8');
    if (secretBytes > 10240) {
      return res.status(400).json({ error: 'secret size exceeds the maximum limit of 10 KB.' });
    }
  }

  if (hasFile) {
    if (typeof file.name !== 'string' || file.name.trim().length === 0) {
      return res.status(400).json({ error: 'file.name is required when uploading a file.' });
    }
    const sanitizedName = require('node:path').basename(file.name.trim());
    if (sanitizedName.length === 0 || sanitizedName.length > 255) {
      return res.status(400).json({ error: 'Invalid file.name.' });
    }
    file.name = sanitizedName;

    // Max 15 MB payload for base64 file data
    if (file.data.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 10 MB.' });
    }
  }

  const minTtl = process.env.ALLOW_SHORT_TTL === 'true' ? 1 : 10;
  if (typeof ttl_seconds !== 'number' || !Number.isInteger(ttl_seconds) || ttl_seconds < minTtl || ttl_seconds > 604800) {
    return res.status(400).json({ error: `ttl_seconds must be an integer between ${minTtl} and 604800.` });
  }

  if (typeof max_views !== 'number' || !Number.isInteger(max_views) || max_views < 1 || max_views > 10) {
    return res.status(400).json({ error: 'max_views must be an integer between 1 and 10.' });
  }

  if (passphrase !== undefined && passphrase !== null && typeof passphrase !== 'string') {
    return res.status(400).json({ error: 'passphrase must be a string if provided.' });
  }

  next();
}

function validateSecretId(req, res, next) {
  const { id } = req.params;
  if (!isValidId(id)) {
    // Return 404 immediately without hitting the database
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return res.status(404).sendFile(require('path').join(process.cwd(), 'public', '404.html'));
    }
    return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
  }
  next();
}

module.exports = {
  validateCreateSecret,
  validateSecretId
};
