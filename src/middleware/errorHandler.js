const logger = require('../utils/logger');

/**
 * Centralized error handler.
 * Strips all internal stack traces, database errors, and crypto exceptions.
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error', { message: err.message, status: err.status || err.statusCode });

  // Handle body parser JSON syntax error
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON body or bad request.' });
  }

  // Handle payload too large
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(400).json({ error: 'Payload exceeds maximum limit of 16 KB.' });
  }

  const statusCode = (err.status && err.status >= 400 && err.status < 600) ? err.status : 500;
  const message = statusCode === 500 ? 'An internal server error occurred.' : (err.message || 'Error processing request.');

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
