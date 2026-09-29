const crypto = require('node:crypto');
const { getDb } = require('../database/db');
const logger = require('../utils/logger');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Derives a secure password hash using scrypt.
 */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Constant-time password verification.
 */
function verifyPassword(password, salt, storedHash) {
  try {
    const computedHash = hashPassword(password, salt);
    const bufA = Buffer.from(computedHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    return false;
  }
}

const bcrypt = require('bcryptjs');

const inMemorySessions = new Map();

/**
 * Authenticates an admin user.
 * Supports bcrypt hash from .env (ADMIN_PASSWORD_HASH) or SQLite admin_users table.
 */
function authenticateAdmin(username, password, totpCode = null) {
  if (!username || !password) {
    return { success: false, error: 'Username and password are required.' };
  }

  const envUser = process.env.ADMIN_USERNAME || 'admin';
  const envHash = process.env.ADMIN_PASSWORD_HASH;

  // 1. Check .env credentials with bcrypt
  if (username === envUser && envHash) {
    try {
      if (bcrypt.compareSync(password, envHash)) {
        return {
          success: true,
          user: {
            id: 'admin_env',
            username: envUser,
            role: 'superadmin',
            two_factor_enabled: false
          }
        };
      }
    } catch (e) {
      logger.warn('Bcrypt verification failed for env admin', { error: e.message });
    }
  }

  // 1b. Fallback check for plain ADMIN_PASSWORD in .env if hash not set
  if (username === envUser && !envHash && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    return {
      success: true,
      user: {
        id: 'admin_env',
        username: envUser,
        role: 'superadmin',
        two_factor_enabled: false
      }
    };
  }

  // 2. Check admin_users table in SQLite
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) {
      return { success: false, error: 'Invalid username or password.' };
    }

    let isValidPw = false;
    if (user.password_hash && (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$'))) {
      isValidPw = bcrypt.compareSync(password, user.password_hash);
    } else {
      isValidPw = verifyPassword(password, user.password_salt, user.password_hash);
    }

    if (!isValidPw) {
      return { success: false, error: 'Invalid username or password.' };
    }

    // 2FA check if enabled
    if (user.two_factor_enabled === 1) {
      if (!totpCode) {
        return { success: false, error: 'Two-factor authentication code required.', require_2fa: true };
      }
      const isValidTotp = verifyTotp(user.totp_secret, totpCode);
      if (!isValidTotp) {
        return { success: false, error: 'Invalid two-factor authentication code.' };
      }
    }

    // Update last login
    const now = Date.now();
    try {
      db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now, user.id);
    } catch (_) {}

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        two_factor_enabled: Boolean(user.two_factor_enabled)
      }
    };
  } catch (err) {
    return { success: false, error: 'Authentication service unavailable.' };
  }
}

/**
 * Creates an authenticated session for an admin.
 */
function createAdminSession(adminId, req) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim() : '127.0.0.1';
  const ua = req ? (req.headers['user-agent'] || 'Unknown') : 'Unknown';
  const username = adminId === 'admin_env' ? (process.env.ADMIN_USERNAME || 'admin') : 'admin';

  // Always keep in in-memory session cache for resilient fast lookup
  inMemorySessions.set(sessionId, {
    sessionId,
    adminId,
    username,
    role: 'superadmin',
    twoFactorEnabled: false,
    expiresAt,
    lastActivityAt: now
  });

  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO admin_sessions (session_id, admin_id, ip_address, user_agent, created_at, expires_at, last_activity_at, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(sessionId, adminId, ip, ua, now, expiresAt, now);
  } catch (_) {}

  return { sessionId, expiresAt };
}

/**
 * Validates an admin session token.
 */
function validateSession(sessionId, req) {
  if (!sessionId || typeof sessionId !== 'string') return null;
  const now = Date.now();

  // 1. Check inMemorySessions first
  const memSession = inMemorySessions.get(sessionId);
  if (memSession && memSession.expiresAt > now) {
    memSession.lastActivityAt = now;
    return {
      sessionId: memSession.sessionId,
      adminId: memSession.adminId,
      username: memSession.username,
      role: memSession.role,
      twoFactorEnabled: memSession.twoFactorEnabled,
      expiresAt: memSession.expiresAt
    };
  }

  // 2. Query SQLite admin_sessions
  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, COALESCE(u.username, 'admin') as username, COALESCE(u.role, 'superadmin') as role, COALESCE(u.two_factor_enabled, 0) as two_factor_enabled
      FROM admin_sessions s
      LEFT JOIN admin_users u ON s.admin_id = u.id
      WHERE s.session_id = ? AND s.is_valid = 1 AND s.expires_at > ?
    `).get(sessionId, now);

    if (!session) return null;

    try {
      db.prepare('UPDATE admin_sessions SET last_activity_at = ? WHERE session_id = ?').run(now, sessionId);
    } catch (_) {}

    return {
      sessionId: session.session_id,
      adminId: session.admin_id,
      username: session.username || 'admin',
      role: session.role || 'superadmin',
      twoFactorEnabled: Boolean(session.two_factor_enabled),
      expiresAt: session.expires_at
    };
  } catch (err) {
    return null;
  }
}

/**
 * Invalidates an admin session (Logout).
 */
function invalidateSession(sessionId) {
  if (!sessionId) return;
  inMemorySessions.delete(sessionId);
  try {
    const db = getDb();
    db.prepare('UPDATE admin_sessions SET is_valid = 0 WHERE session_id = ?').run(sessionId);
  } catch (_) {}
}

/**
 * Lightweight RFC 6238 TOTP verification (standard 30s window, HMAC-SHA1).
 */
function verifyTotp(secret, token, window = 1) {
  if (!secret || !token) return false;
  const cleanToken = String(token).trim();
  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let error = -window; error <= window; error++) {
    const step = currentStep + error;
    if (generateTotpCode(secret, step) === cleanToken) {
      return true;
    }
  }
  return false;
}

function generateTotpCode(secret, step) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(step), 0);
  const key = Buffer.from(secret, 'utf8');
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, '0');
}

/**
 * Generates new 2FA setup secret.
 */
function generateTotpSetup(username) {
  const secret = crypto.randomBytes(16).toString('hex').toUpperCase();
  const otpauthUrl = `otpauth://totp/EphemeralSecretVault:${username}?secret=${secret}&issuer=EphemeralVault`;
  return { secret, otpauthUrl };
}

module.exports = {
  hashPassword,
  verifyPassword,
  authenticateAdmin,
  createAdminSession,
  validateSession,
  invalidateSession,
  verifyTotp,
  generateTotpSetup
};
