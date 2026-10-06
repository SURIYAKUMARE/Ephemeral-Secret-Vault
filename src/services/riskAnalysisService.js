/**
 * Suspicious Activity Detection & Risk Scoring Service
 *
 * Rules-based risk evaluation that flags suspicious activity without
 * making unsupported claims about an individual's personal identity.
 */

const { getDb } = require('../database/db');

/**
 * Analyzes access event context against security risk rules.
 *
 * @param {object} context
 * @param {string} context.file_id
 * @param {string} context.ip_address
 * @param {string} context.country
 * @param {string} context.access_status
 * @param {boolean} context.is_bot
 * @param {string} [context.session_id]
 * @returns {{ risk_level: string, risk_reason: string }}
 */
function evaluateRisk(context) {
  const { file_id, ip_address, country, access_status, is_bot } = context;
  const db = getDb();
  const now = Date.now();
  const reasons = [];
  let riskLevel = 'LOW';

  // Rule 1: Access after revocation or expiration
  if (access_status === 'REVOKED' || access_status === 'DISABLED' || access_status === 'REVOKED_ATTEMPT') {
    reasons.push('Access attempt on an explicitly revoked/disabled file link');
    riskLevel = 'CRITICAL';
  } else if (access_status === 'EXPIRED') {
    reasons.push('Access attempt after expiration deadline');
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  }

  // Rule 2: Repeated wrong passphrases (potential brute force)
  if (access_status === 'WRONG_PASSPHRASE') {
    try {
      const recentFails = db.prepare(`
        SELECT COUNT(*) as count FROM access_events
        WHERE file_id = ? AND access_status = 'WRONG_PASSPHRASE' AND timestamp > ?
      `).get(file_id, now - 60000);

      if (recentFails && recentFails.count >= 2) {
        reasons.push(`Multiple failed passphrase attempts (${recentFails.count + 1} attempts within 1 minute)`);
        riskLevel = 'CRITICAL';
      } else {
        reasons.push('Invalid passphrase entered');
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      }
    } catch (_) {}
  }

  // Rule 3: Rapid repeated requests from same IP (Rate anomaly)
  try {
    const recentFromIp = db.prepare(`
      SELECT COUNT(*) as count FROM access_events
      WHERE ip_address = ? AND file_id = ? AND timestamp > ?
    `).get(ip_address, file_id, now - 30000);

    if (recentFromIp && recentFromIp.count >= 5) {
      reasons.push(`Rapid repeated requests from single IP (${recentFromIp.count + 1} in 30 seconds)`);
      if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
    }
  } catch (_) {}

  // Rule 4: Multiple distinct IPs accessing the same file
  try {
    const distinctIps = db.prepare(`
      SELECT COUNT(DISTINCT ip_address) as ip_count FROM access_events
      WHERE file_id = ? AND timestamp > ?
    `).get(file_id, now - 15 * 60 * 1000);

    if (distinctIps && distinctIps.ip_count >= 3) {
      reasons.push(`Link distributed across ${distinctIps.ip_count + 1} different IP addresses within 15 minutes`);
      if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
    }
  } catch (_) {}

  // Rule 5: Automated crawler or scraper request pattern
  if (is_bot) {
    reasons.push('Automated crawler or bot User-Agent detected');
    if (riskLevel === 'LOW' || riskLevel === 'MEDIUM') riskLevel = 'HIGH';
  }

  // Rule 6: Verification failed or camera denied
  if (access_status === 'VERIFICATION_DENIED' || access_status === 'CAMERA_DENIED') {
    reasons.push('Visitor declined identity or camera verification challenge');
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  }

  // Format final response
  if (reasons.length === 0) {
    return {
      risk_level: 'LOW',
      risk_reason: 'Normal expected access pattern'
    };
  }

  return {
    risk_level: riskLevel,
    risk_reason: reasons.join('; ')
  };
}

module.exports = {
  evaluateRisk
};
