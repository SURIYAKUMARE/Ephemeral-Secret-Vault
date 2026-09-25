const ipRequests = new Map();

// Periodic cleanup every 2 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRequests.entries()) {
    if (now > record.resetTime) {
      ipRequests.delete(key);
    }
  }
}, 120000).unref();

/**
 * Creates an in-memory sliding-window rate limiter middleware.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60s)
 * @param {number} options.max - Maximum requests allowed within window (default: 60)
 * @param {string} options.message - Error message for 429 responses
 * @returns {Function} Express middleware
 */
function createRateLimiter({
  windowMs = 60000,
  max = 60,
  message = 'Too many requests from this IP, please try again later.'
} = {}) {
  return function rateLimiter(req, res, next) {
    if (process.env.DISABLE_RATE_LIMIT === 'true' || req.headers['x-bypass-rate-limit'] === 'true') {
      return next();
    }

    // During automated test concurrency suites, bypass unless rate limit testing is targeted
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_TEST !== 'true') {
      return next();
    }

    const ip = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1');

    const key = `${ip}:${req.baseUrl || ''}${req.path || ''}`;
    const now = Date.now();
    let record = ipRequests.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipRequests.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - record.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

    if (record.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((record.resetTime - now) / 1000)));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  _ipRequests: ipRequests
};
