const fs = require('node:fs');
const path = require('node:path');
const secretService = require('../services/secretService');
const deadmanService = require('../services/deadmanService');
const receiptService = require('../services/receiptService');
const canaryService = require('../services/canaryService');

const publicDir = fs.existsSync(path.join(process.cwd(), 'public'))
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '..', '..', 'public');

/**
 * Health check endpoint.
 */
function health(req, res) {
  return res.status(200).json({ status: 'ok' });
}

/**
 * Helper to extract client IP from headers/socket.
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1');
}

/**
 * Creates a new encrypted secret.
 */
function createSecret(req, res, next) {
  try {
    const {
      secret,
      file,
      ttl_seconds,
      max_views,
      passphrase,
      client_encrypted,
      ciphertext,
      iv,
      auth_tag,
      allowed_ips,
      allowed_countries,
      checkin_interval_seconds,
      beneficiary,
      duress_passphrase,
      cover_secret,
      max_failed_attempts
    } = req.body;

    // Auto-detect public URL from request headers (for Vercel / reverse proxies)
    let requestBaseUrl;
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      requestBaseUrl = `${proto}://${host}`;
    }

    const result = secretService.createSecret({
      secret,
      file,
      ttlSeconds: ttl_seconds,
      maxViews: max_views,
      passphrase,
      customBaseUrl: requestBaseUrl,
      client_encrypted,
      ciphertext,
      iv,
      auth_tag,
      allowed_ips,
      allowed_countries,
      checkin_interval_seconds,
      beneficiary,
      reqIp: getClientIp(req),
      duress_passphrase,
      cover_secret,
      max_failed_attempts
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
    const meta = secretService.getSecretMetadata(id, Date.now(), req);

    if (!meta) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return res.status(404).sendFile(path.join(publicDir, '404.html'));
    }

    const templatePath = path.join(publicDir, 'view.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    const createdIso = meta.created_at ? new Date(meta.created_at).toISOString() : new Date().toISOString();
    const createdFormatted = meta.created_at ? new Date(meta.created_at).toLocaleString() : 'Just now';
    const expiresIso = new Date(meta.expires_at).toISOString();
    const expiresFormatted = new Date(meta.expires_at).toLocaleString();
    const badgeClass = meta.views_remaining === 1 ? 'badge-danger' : 'badge-success';
    const passphraseClass = meta.has_passphrase ? '' : 'hidden';

    html = html
      .replace(/\{\{ID\}\}/g, id)
      .replace(/\{\{CREATED_AT\}\}/g, createdFormatted)
      .replace(/\{\{CREATED_ISO\}\}/g, createdIso)
      .replace(/\{\{EXPIRES_AT\}\}/g, expiresFormatted)
      .replace(/\{\{EXPIRES_ISO\}\}/g, expiresIso)
      .replace(/\{\{VIEWS_REMAINING\}\}/g, String(meta.views_remaining))
      .replace(/\{\{BADGE_CLASS\}\}/g, badgeClass)
      .replace(/\{\{HAS_PASSPHRASE\}\}/g, String(meta.has_passphrase))
      .replace(/\{\{PASSPHRASE_CLASS\}\}/g, passphraseClass)
      .replace(/\{\{CLIENT_ENCRYPTED\}\}/g, meta.client_encrypted ? 'true' : 'false');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * Atomically consumes and decrypts a secret.
 */
async function burnSecret(req, res, next) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const { id } = req.params;
    let passphrase = null;
    if (req.body && typeof req.body.passphrase === 'string') {
      passphrase = req.body.passphrase.trim();
    }

    const result = secretService.claimAndBurnSecret(id, passphrase, Date.now(), req);

    if (!result) {
      return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
    }

    if (result.policyDenied) {
      return res.status(403).json({ error: 'Access denied by vault security policy.' });
    }

    if (result.destroyedTooManyAttempts) {
      // 1500ms delay for 3rd failed attempt / destroyed state
      await new Promise(r => setTimeout(r, 1500));
      return res.status(410).json({ error: 'Secret permanently destroyed after too many failed attempts' });
    }

    if (result.invalidPassphrase) {
      const attempt = result.attemptNumber || 1;
      const delayMs = attempt >= 3 ? 1500 : (attempt === 2 ? 500 : 0);
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
      return res.status(401).json({
        error: 'Invalid passphrase',
        attempts_remaining: result.attempts_remaining
      });
    }

    if (result.is_duress) {
      return res.status(200).json({
        secret: result.secret,
        views_remaining: result.views_remaining,
        burned: result.burned
      });
    }

    if (result.client_encrypted) {
      return res.status(200).json({
        client_encrypted: true,
        ciphertext: result.ciphertext,
        iv: result.iv,
        auth_tag: result.auth_tag,
        views_remaining: result.views_remaining,
        burned: result.burned,
        burn_receipt: result.burn_receipt || undefined,
        audit_chain_root: result.audit_chain_root || undefined
      });
    }

    return res.status(200).json({
      secret: result.secret,
      file: result.file || undefined,
      views_remaining: result.views_remaining,
      burned: result.burned,
      burn_receipt: result.burn_receipt || undefined,
      audit_chain_root: result.audit_chain_root || undefined
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a threshold-split secret with Shamir's Secret Sharing (k of n).
 */
function createThresholdSecret(req, res, next) {
  try {
    const { secret, threshold_k, total_n, ttl_seconds } = req.body;

    let requestBaseUrl;
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      requestBaseUrl = `${proto}://${host}`;
    }

    const thresholdService = require('../services/thresholdService');
    const result = thresholdService.createThresholdSecret({
      secret,
      threshold_k,
      total_n,
      ttl_seconds,
      customBaseUrl: requestBaseUrl
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Redeems a Shamir share for a threshold secret.
 */
function redeemThresholdShare(req, res, next) {
  try {
    const { id } = req.params;
    const { share } = req.body;

    const thresholdService = require('../services/thresholdService');
    const result = thresholdService.redeemThresholdShare(id, share);
    if (!result) {
      return res.status(404).json({ error: 'Threshold secret not found, expired, or already destroyed.' });
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves threshold status.
 */
function getThresholdStatus(req, res, next) {
  try {
    const { id } = req.params;
    const thresholdService = require('../services/thresholdService');
    const result = thresholdService.getThresholdStatus(id);
    if (!result) {
      return res.status(404).json({ error: 'Threshold secret not found, expired, or already destroyed.' });
    }
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a Dead Man's Switch secret vault.
 */
function createDeadmanSwitch(req, res, next) {
  try {
    const { secret, checkin_interval_seconds, beneficiary } = req.body;

    let requestBaseUrl;
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      requestBaseUrl = `${proto}://${host}`;
    }

    const result = deadmanService.createDeadmanSwitch({
      secret,
      checkin_interval_seconds,
      beneficiary,
      customBaseUrl: requestBaseUrl
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Performs a check-in for a dead man's switch.
 */
function deadmanCheckin(req, res, next) {
  try {
    const { id } = req.params;
    const token = req.query.token || (req.body && req.body.token);

    if (!token) {
      return res.status(400).json({ error: 'token query or body parameter is required for check-in.' });
    }

    const result = deadmanService.performCheckin(id, token);
    if (!result) {
      return res.status(404).json({ error: 'Dead man switch not found or expired.' });
    }

    if (result.invalidToken) {
      return res.status(401).json({ error: 'Invalid check-in token.' });
    }

    if (result.triggered) {
      return res.status(410).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves status of a dead man's switch.
 */
function getDeadmanStatus(req, res, next) {
  try {
    const { id } = req.params;
    const result = deadmanService.getDeadmanStatus(id);
    if (!result) {
      return res.status(404).json({ error: 'Dead man switch not found or expired.' });
    }
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Cryptographically verifies an Ed25519 burn receipt.
 */
function verifyBurnReceipt(req, res, next) {
  try {
    const { id } = req.params;
    const result = receiptService.verifyBurnReceipt(id);

    if (!result) {
      return res.status(404).json({ error: 'Burn receipt not found for this secret ID.' });
    }

    if (result.valid === false) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a canary decoy trap.
 */
function createCanaryTrap(req, res, next) {
  try {
    const { webhook_url, fake_secret, memo } = req.body || {};

    let requestBaseUrl;
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      requestBaseUrl = `${proto}://${host}`;
    }

    const result = canaryService.createCanaryTrap({
      webhook_url,
      fake_secret,
      memo,
      customBaseUrl: requestBaseUrl
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  health,
  createSecret,
  getSecretView,
  burnSecret,
  createThresholdSecret,
  redeemThresholdShare,
  getThresholdStatus,
  createDeadmanSwitch,
  deadmanCheckin,
  getDeadmanStatus,
  verifyBurnReceipt,
  createCanaryTrap
};
