const { port, baseUrl } = require('./config/env');
const { initDb, closeDb } = require('./database/db');
const { startSweeper, stopSweeper } = require('./services/sweeperService');
const logger = require('./utils/logger');
const app = require('./app');

// Initialize database
initDb();

// Start background sweeper
startSweeper();

const server = app.listen(port, () => {
  logger.info(`Vault server running at ${baseUrl}`);
});

// Graceful shutdown handling
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down cleanly...`);
  stopSweeper();
  server.close(() => {
    closeDb();
    logger.info('Vault server stopped cleanly.');
    process.exit(0);
  });

  // Force close if graceful timeout exceeded
  setTimeout(() => {
    closeDb();
    process.exit(1);
  }, 5000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
