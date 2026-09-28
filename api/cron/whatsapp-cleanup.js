'use strict';

/**
 * Vercel Cron Endpoint — WhatsApp Deletion Cleanup
 *
 * Triggered by Vercel's scheduler (see vercel.json).
 * Runs short-lived, stateless, safe for concurrent invocations.
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header.
 * The CRON_SECRET environment variable must be set in Vercel dashboard.
 *
 * Behaviour:
 *  1. Authenticates the request.
 *  2. Runs the deletion agent (claims due jobs, processes them).
 *  3. For each job: attempts official WhatsApp deletion (always unsupported),
 *     marks the record accordingly, expires the vault URL.
 *  4. Returns a concise summary — no sensitive data in the response.
 *  5. Finishes quickly (Vercel Functions max 10s on Hobby, 300s on Pro).
 */

require('dotenv').config();

// Ensure the DB is initialised before any DB calls.
require('../../src/db').initDb();

const agent = require('../../src/services/whatsappDeletionAgent');

/**
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
module.exports = async function whatsappCleanupCron(req, res) {
  // ── 1. Method guard ────────────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // ── 2. Authenticate the cron request ──────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If CRON_SECRET is not set, reject in production; allow in development.
    if (process.env.NODE_ENV === 'production') {
      console.error('[CronAuth] CRON_SECRET is not configured — rejecting request.');
      return res.status(500).json({ error: 'Cron not configured correctly.' });
    }
    console.warn('[CronAuth] CRON_SECRET not set — allowing in development mode.');
  } else {
    const authHeader = req.headers.authorization || '';
    const provided   = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (req.query.secret || '');

    if (provided !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
  }

  // ── 3. Run the agent ───────────────────────────────────────────────────
  const startMs = Date.now();

  try {
    const result = await agent.runDeletionAgent({
      maxJobs: 50,
      dryRun:  req.query.dry_run === 'true',
    });

    const elapsed = Date.now() - startMs;

    // Safe summary — no wamids, no phone numbers, no secrets
    const summary = {
      ok:             true,
      processed_at:   result.processedAt,
      elapsed_ms:     elapsed,
      dry_run:        result.dryRun,
      claimed:        result.claimed,
      unsupported:    result.unsupported,
      expired:        result.expired,
      failed:         result.failed,
      // Per-job outcomes without sensitive fields
      jobs: result.jobs.map(j => ({
        id:       j.id,
        outcome:  j.outcome,
        vault_expired: j.vaultExpired ?? false,
      })),
    };

    console.log('[WhatsAppCron] Run complete:', JSON.stringify({
      ...summary, jobs: undefined,  // don't log individual jobs
      claimed: result.claimed,
    }));

    return res.status(200).json(summary);

  } catch (err) {
    const elapsed = Date.now() - startMs;
    console.error('[WhatsAppCron] Agent error:', err.message);

    return res.status(500).json({
      ok:           false,
      error:        'Agent run failed.',
      elapsed_ms:   elapsed,
    });
  }
};
