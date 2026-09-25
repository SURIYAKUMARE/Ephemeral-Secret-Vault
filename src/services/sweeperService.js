const { sweepExpired } = require('./secretService');
const { sweeperIntervalMs: defaultInterval } = require('../config/env');
const logger = require('../utils/logger');

let timerId = null;

/**
 * Starts the background TTL sweeper.
 *
 * @param {number} [intervalMs]
 * @returns {NodeJS.Timeout}
 */
function startSweeper(intervalMs = defaultInterval) {
  if (timerId) {
    clearInterval(timerId);
  }

  timerId = setInterval(() => {
    try {
      const purged = sweepExpired(Date.now());
      if (purged > 0) {
        logger.info(`[Sweeper] Cleaned up ${purged} expired secret(s) and checkpointed WAL.`);
      }

      const { checkAndTriggerOverdueSwitches } = require('./deadmanService');
      const overdueTriggered = checkAndTriggerOverdueSwitches(Date.now());
      if (overdueTriggered > 0) {
        logger.warn(`[Sweeper] Triggered ${overdueTriggered} overdue dead man switch(es).`);
      }
    } catch (err) {
      logger.error('[Sweeper] Error running sweep', { error: err.message });
    }
  }, intervalMs);

  if (timerId.unref) {
    timerId.unref();
  }

  logger.info('Background sweeper worker started', { intervalMs });
  return timerId;
}

/**
 * Stops the background sweeper cleanly.
 */
function stopSweeper() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    logger.info('Background sweeper worker stopped');
  }
}

module.exports = {
  startSweeper,
  stopSweeper
};
