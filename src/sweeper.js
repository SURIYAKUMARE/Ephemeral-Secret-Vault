const { sweepExpired } = require('./db');

let sweeperIntervalId = null;

/**
 * Starts the background sweeper to clean up expired secrets.
 *
 * @param {number} [intervalMs]
 * @returns {NodeJS.Timeout}
 */
function startSweeper(intervalMs = parseInt(process.env.SWEEP_INTERVAL_MS, 10) || 10000) {
  if (sweeperIntervalId) {
    clearInterval(sweeperIntervalId);
  }

  sweeperIntervalId = setInterval(() => {
    try {
      const purged = sweepExpired(Date.now());
      if (purged > 0) {
        console.log(`[Sweeper] Purged ${purged} expired secret(s) and checkpointed WAL.`);
      }
    } catch (err) {
      console.error('[Sweeper] Error during sweep:', err.message);
    }
  }, intervalMs);

  if (sweeperIntervalId.unref) {
    sweeperIntervalId.unref();
  }

  return sweeperIntervalId;
}

/**
 * Stops the background sweeper.
 */
function stopSweeper() {
  if (sweeperIntervalId) {
    clearInterval(sweeperIntervalId);
    sweeperIntervalId = null;
  }
}

module.exports = {
  startSweeper,
  stopSweeper
};
