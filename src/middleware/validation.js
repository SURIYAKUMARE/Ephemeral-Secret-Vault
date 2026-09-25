const { isValidId } = require('../utils/idGenerator');

let commonPasswordsSet = new Set();
try {
  const commonPasswordsList = require('../config/common-passwords.json');
  commonPasswordsSet = new Set(commonPasswordsList.map(p => String(p).trim().toLowerCase()));
} catch (e) {}

function validateCreateSecret(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const {
    secret,
    file,
    ttl_seconds = 3600,
    max_views = 1,
    passphrase,
    duress_passphrase,
    cover_secret,
    client_encrypted,
    ciphertext,
    iv,
    auth_tag,
    allowed_ips,
    allowed_countries
  } = req.body;

  if (client_encrypted === true) {
    if (typeof ciphertext !== 'string' || ciphertext.trim().length === 0) {
      return res.status(400).json({ error: 'ciphertext is required when client_encrypted is true.' });
    }
    if (typeof iv !== 'string' || iv.trim().length === 0) {
      return res.status(400).json({ error: 'iv is required when client_encrypted is true.' });
    }
    if (typeof auth_tag !== 'string' || auth_tag.trim().length === 0) {
      return res.status(400).json({ error: 'auth_tag is required when client_encrypted is true.' });
    }
  } else {
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
  }

  if (allowed_ips !== undefined && allowed_ips !== null) {
    if (!Array.isArray(allowed_ips) || allowed_ips.some(ip => typeof ip !== 'string' || ip.trim().length === 0)) {
      return res.status(400).json({ error: 'allowed_ips must be an array of non-empty strings.' });
    }
  }

  if (allowed_countries !== undefined && allowed_countries !== null) {
    if (!Array.isArray(allowed_countries) || allowed_countries.some(c => typeof c !== 'string' || c.trim().length === 0)) {
      return res.status(400).json({ error: 'allowed_countries must be an array of non-empty country codes.' });
    }
  }

  const minTtl = process.env.ALLOW_SHORT_TTL === 'true' ? 1 : 10;
  if (typeof ttl_seconds !== 'number' || !Number.isInteger(ttl_seconds) || ttl_seconds < minTtl || ttl_seconds > 604800) {
    return res.status(400).json({ error: `ttl_seconds must be an integer between ${minTtl} and 604800.` });
  }

  if (typeof max_views !== 'number' || !Number.isInteger(max_views) || max_views < 1 || max_views > 10) {
    return res.status(400).json({ error: 'max_views must be an integer between 1 and 10.' });
  }

  if (passphrase !== undefined && passphrase !== null) {
    if (typeof passphrase !== 'string') {
      return res.status(400).json({ error: 'passphrase must be a string if provided.' });
    }
    const trimmed = passphrase.trim();
    if (trimmed.length > 0) {
      if (trimmed.length < 8) {
        return res.status(400).json({ error: 'Passphrase must be at least 8 characters long.' });
      }
      if (commonPasswordsSet.has(trimmed.toLowerCase())) {
        return res.status(400).json({ error: 'Passphrase is too common and easily guessable. Please choose a stronger passphrase.' });
      }
    }
  }

  if (duress_passphrase !== undefined && duress_passphrase !== null) {
    if (typeof duress_passphrase !== 'string') {
      return res.status(400).json({ error: 'duress_passphrase must be a string if provided.' });
    }
    const trimmedDuress = duress_passphrase.trim();
    if (trimmedDuress.length > 0) {
      if (trimmedDuress.length < 8) {
        return res.status(400).json({ error: 'duress_passphrase must be at least 8 characters long.' });
      }
      if (commonPasswordsSet.has(trimmedDuress.toLowerCase())) {
        return res.status(400).json({ error: 'duress_passphrase is too common and easily guessable.' });
      }
      if (passphrase && trimmedDuress === passphrase.trim()) {
        return res.status(400).json({ error: 'duress_passphrase must be different from the main passphrase.' });
      }
    }
  }

  if (cover_secret !== undefined && cover_secret !== null && typeof cover_secret !== 'string') {
    return res.status(400).json({ error: 'cover_secret must be a string if provided.' });
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

function validateThresholdSecret(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { secret, threshold_k, total_n, ttl_seconds = 3600 } = req.body;

  if (typeof secret !== 'string' || secret.trim().length === 0) {
    return res.status(400).json({ error: 'secret is required and must be a non-empty string.' });
  }

  const secretBytes = Buffer.byteLength(secret, 'utf8');
  if (secretBytes > 10240) {
    return res.status(400).json({ error: 'secret size exceeds the maximum limit of 10 KB.' });
  }

  const k = parseInt(threshold_k, 10);
  const n = parseInt(total_n, 10);

  if (!Number.isInteger(threshold_k) || !Number.isInteger(total_n) || k < 2 || n < k || n > 255) {
    return res.status(400).json({ error: 'threshold_k and total_n must be integers satisfying 2 <= threshold_k <= total_n <= 255.' });
  }

  const minTtl = process.env.ALLOW_SHORT_TTL === 'true' ? 1 : 10;
  if (typeof ttl_seconds !== 'number' || !Number.isInteger(ttl_seconds) || ttl_seconds < minTtl || ttl_seconds > 604800) {
    return res.status(400).json({ error: `ttl_seconds must be an integer between ${minTtl} and 604800.` });
  }

  next();
}

function validateRedeemShare(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { share } = req.body;
  if (typeof share !== 'string' || share.trim().length === 0) {
    return res.status(400).json({ error: 'share is required and must be a non-empty hex string.' });
  }

  next();
}

function validateDeadmanSwitch(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { secret, checkin_interval_seconds } = req.body;
  if (typeof secret !== 'string' || secret.trim().length === 0) {
    return res.status(400).json({ error: 'secret is required and must be a non-empty string.' });
  }

  const interval = parseInt(checkin_interval_seconds, 10);
  if (!Number.isInteger(interval) || interval < 10 || interval > 31536000) {
    return res.status(400).json({ error: 'checkin_interval_seconds must be an integer between 10 and 31536000 (1 year).' });
  }

  next();
}

function validateCanary(req, res, next) {
  if (req.body && typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { webhook_url, fake_secret, memo } = req.body || {};
  if (webhook_url !== undefined && webhook_url !== null) {
    if (typeof webhook_url !== 'string' || (!webhook_url.startsWith('http://') && !webhook_url.startsWith('https://'))) {
      return res.status(400).json({ error: 'webhook_url must be a valid HTTP/HTTPS URL.' });
    }
  }

  if (fake_secret !== undefined && fake_secret !== null && typeof fake_secret !== 'string') {
    return res.status(400).json({ error: 'fake_secret must be a string if provided.' });
  }

  if (memo !== undefined && memo !== null && typeof memo !== 'string') {
    return res.status(400).json({ error: 'memo must be a string if provided.' });
  }

  next();
}

module.exports = {
  validateCreateSecret,
  validateSecretId,
  validateThresholdSecret,
  validateRedeemShare,
  validateDeadmanSwitch,
  validateCanary
};

