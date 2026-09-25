const { getDb } = require('../database/db');

/**
 * Normalizes an IP string (handling IPv6 mapped IPv4 like ::ffff:127.0.0.1).
 */
function normalizeIp(ip) {
  if (!ip) return '';
  let clean = ip.trim();
  if (clean.startsWith('::ffff:')) {
    clean = clean.substring(7);
  }
  if (clean === '::1') {
    clean = '127.0.0.1';
  }
  return clean;
}

/**
 * Checks if an IP is within a CIDR range or equals exact IP.
 */
function isIpMatch(clientIp, targetRule) {
  const normClient = normalizeIp(clientIp);
  const normRule = normalizeIp(targetRule);

  if (normClient === normRule) return true;

  // Simple CIDR match for IPv4 (e.g. 192.168.1.0/24)
  if (normRule.includes('/')) {
    const [rangeIp, prefixStr] = normRule.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (!isNaN(prefix) && prefix >= 0 && prefix <= 32) {
      const ipToLong = (ip) => {
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
      };

      const clientLong = ipToLong(normClient);
      const rangeLong = ipToLong(rangeIp);
      if (clientLong !== null && rangeLong !== null) {
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        return (clientLong & mask) === (rangeLong & mask);
      }
    }
  }

  return false;
}

/**
 * Saves a security policy associated with a secret ID.
 */
function savePolicy(id, { allowed_ips = null, allowed_countries = null, client_encrypted = false }) {
  const db = getDb();
  const now = Date.now();
  const ipsJson = (Array.isArray(allowed_ips) && allowed_ips.length > 0) ? JSON.stringify(allowed_ips) : null;
  const countriesJson = (Array.isArray(allowed_countries) && allowed_countries.length > 0)
    ? JSON.stringify(allowed_countries.map(c => String(c).trim().toUpperCase()))
    : null;
  const clientEncryptedInt = client_encrypted ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO secret_policies (id, allowed_ips, allowed_countries, client_encrypted, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, ipsJson, countriesJson, clientEncryptedInt, now);
}

/**
 * Retrieves the policy for a secret ID.
 */
function getPolicy(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT allowed_ips, allowed_countries, client_encrypted
    FROM secret_policies
    WHERE id = ?
  `);
  const row = stmt.get(id);
  if (!row) return null;

  return {
    allowed_ips: row.allowed_ips ? JSON.parse(row.allowed_ips) : null,
    allowed_countries: row.allowed_countries ? JSON.parse(row.allowed_countries) : null,
    client_encrypted: Boolean(row.client_encrypted)
  };
}

/**
 * Validates whether the incoming request complies with the secret's security policy.
 * Returns true if permitted, false if denied.
 */
function validatePolicyAccess(policy, req) {
  if (!policy) return true;

  // 1. IP Allow-list validation
  if (Array.isArray(policy.allowed_ips) && policy.allowed_ips.length > 0) {
    const rawIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.ip || (req.socket && req.socket.remoteAddress) || '');
    
    const matched = policy.allowed_ips.some(rule => isIpMatch(rawIp, rule));
    if (!matched) {
      return false;
    }
  }

  // 2. Country Allow-list validation
  if (Array.isArray(policy.allowed_countries) && policy.allowed_countries.length > 0) {
    const rawCountry = req.headers['cf-ipcountry'] ||
      req.headers['x-country-code'] ||
      req.headers['x-geo-country'] ||
      '';
    const country = String(rawCountry).trim().toUpperCase();

    if (!country || !policy.allowed_countries.includes(country)) {
      return false;
    }
  }

  return true;
}

/**
 * Removes the policy when secret is destroyed.
 */
function deletePolicy(id) {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM secret_policies WHERE id = ?`);
  return stmt.run(id);
}

module.exports = {
  savePolicy,
  getPolicy,
  validatePolicyAccess,
  deletePolicy
};
