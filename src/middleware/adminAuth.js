const { validateSession } = require('../services/adminAuthService');

/**
 * Parses cookies from cookie header.
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

/**
 * Middleware enforcing admin authentication.
 * Checks Cookie 'admin_token', Bearer header, or 'x-admin-token' header.
 */
function requireAdminAuth(req, res, next) {
  let token = null;

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check x-admin-token header
  if (!token && req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  }

  // 3. Check cookies
  if (!token && req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.admin_token) {
      token = cookies.admin_token;
    }
  }

  if (!token) {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/admin/login');
    }
    return res.status(401).json({ error: 'Unauthorized. Admin authentication required.' });
  }

  const session = validateSession(token, req);
  if (!session) {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/admin/login');
    }
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  req.admin = session;
  req.adminToken = token;
  next();
}

module.exports = {
  requireAdminAuth,
  parseCookies
};
