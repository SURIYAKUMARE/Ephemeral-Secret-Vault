'use strict';

/**
 * WhatsApp Deletion Agent
 *
 * Processes scheduled "deletion" jobs for WhatsApp messages.
 *
 * HONEST BEHAVIOUR:
 * ─────────────────
 * The Meta WhatsApp Business Cloud API does NOT support deleting a sent
 * message from the recipient's conversation. This agent:
 *
 *   1. Claims due jobs (idempotent lock prevents duplicate runs).
 *   2. Calls whatsappService.deleteMessage() which always returns
 *      { deleted: false, reason: 'DELETE_NOT_SUPPORTED' }.
 *   3. Marks the record 'unsupported' — never 'deleted'.
 *   4. Expires the vault URL so the link becomes permanently unusable.
 *   5. Never reports deletion unless the API confirms it.
 *
 * Designed to run as a Vercel Cron job (short-lived, stateless).
 * Safe to call concurrently — DB-level locking prevents double processing.
 */

const crypto  = require('node:crypto');
const db      = require('../db');
const waService = require('./whatsappService');
const secretService = require('./secretService');

/**
 * Runs one agent cycle.
 *
 * @param {{ maxJobs?: number, dryRun?: boolean }} [opts]
 * @returns {Promise<AgentRunResult>}
 */
async function runDeletionAgent(opts = {}) {
  const { maxJobs = 50, dryRun = false } = opts;

  const lockId  = crypto.randomUUID();
  const now     = Date.now();
  const result  = {
    lockId,
    processedAt: new Date(now).toISOString(),
    claimed:     0,
    unsupported: 0,
    expired:     0,
    failed:      0,
    dryRun,
    jobs:        [],
  };

  // Claim due jobs atomically
  const jobs = db.claimDueWhatsAppMessages(lockId, now, maxJobs);
  result.claimed = jobs.length;

  if (jobs.length === 0) {
    return result;
  }

  // Process each job
  for (const job of jobs) {
    const jobResult = await _processJob(job, dryRun, now);
    result.jobs.push(jobResult);

    if (jobResult.outcome === 'unsupported') result.unsupported++;
    else if (jobResult.outcome === 'expired')     result.expired++;
    else if (jobResult.outcome === 'failed')      result.failed++;
  }

  return result;
}

/**
 * Processes a single WhatsApp message job.
 * @private
 */
async function _processJob(job, dryRun, now) {
  const jobResult = {
    id:       job.id,
    secretId: job.secret_id,
    wamid:    job.whatsapp_message_id
      ? job.whatsapp_message_id.slice(0, 20) + '…'  // masked for logs
      : null,
    outcome:  null,
    detail:   null,
  };

  try {
    // Verify the message belongs to this application (sanity check)
    if (!job.secret_id || !job.vault_url) {
      jobResult.outcome = 'failed';
      jobResult.detail  = 'Missing secret_id or vault_url — record integrity error.';
      if (!dryRun) db.recordWhatsAppDeletionAttempt(job.id, jobResult.detail);
      return jobResult;
    }

    // ── Step 1: Attempt official WhatsApp API deletion ────────────────────
    if (dryRun) {
      jobResult.outcome = 'dry_run';
      jobResult.detail  = 'Dry run — no API call made.';
      return jobResult;
    }

    // Only attempt if we have a wamid (message was successfully sent)
    if (job.whatsapp_message_id) {
      const deleteResult = await waService.deleteMessage(job.whatsapp_message_id);

      if (deleteResult.deleted === true) {
        // API confirmed deletion (would only happen if Meta adds this in future)
        db.markWhatsAppDeletionDeleted(job.id);
        jobResult.outcome = 'deleted';
        jobResult.detail  = 'WhatsApp API confirmed message deletion.';
      } else {
        // Expected path: API does not support deletion
        db.markWhatsAppDeletionUnsupported(job.id, deleteResult.explanation);
        jobResult.outcome = 'unsupported';
        jobResult.detail  = deleteResult.explanation;
      }
    } else {
      // Message was never sent (failed to send) — mark unsupported/expired
      db.markWhatsAppDeletionUnsupported(
        job.id,
        'Message was not sent successfully — no wamid available to delete.'
      );
      jobResult.outcome = 'unsupported';
      jobResult.detail  = 'No wamid — message was never dispatched.';
    }

    // ── Step 2: Expire the vault URL regardless of deletion outcome ───────
    // This is the ACTUAL security enforcement: the link becomes unusable.
    try {
      const vaultId = _extractVaultId(job.vault_url);
      if (vaultId) {
        // Force-expire the secret if it still exists
        const meta = secretService.getSecretMetadata(vaultId, now);
        if (meta) {
          secretService.deleteSecret(vaultId);
          jobResult.vaultExpired = true;
        } else {
          jobResult.vaultExpired = false; // already burned or expired
        }
      }
    } catch (vaultErr) {
      // Non-fatal — vault may already be gone
      jobResult.vaultExpired = false;
    }

  } catch (err) {
    // Classify error
    const isPermanent = _isPermanentError(err);
    if (isPermanent) {
      db.markWhatsAppDeletionUnsupported(job.id, `Permanent error: ${err.message}`);
      jobResult.outcome = 'failed';
    } else {
      db.recordWhatsAppDeletionAttempt(job.id, err.message);
      jobResult.outcome = 'failed';
    }
    jobResult.detail = err.message;
    // Never log the token, wamid in full, or secret content
    console.error('[WhatsAppAgent] Job %s error: %s (code: %s)',
      job.id, err.message, err.code || 'unknown');
  }

  return jobResult;
}

/**
 * Manually trigger deletion for a specific WhatsApp message record.
 * Used by the admin "Retry" and "Burn Message" actions.
 *
 * @param {string} whatsappRecordId - Internal DB id (not wamid)
 * @returns {Promise<ManualBurnResult>}
 */
async function manualBurnMessage(whatsappRecordId) {
  const job = db.getWhatsAppMessage(whatsappRecordId);

  if (!job) {
    return { success: false, error: 'Record not found.' };
  }

  if (['deleted', 'unsupported', 'cancelled'].includes(job.deletion_status)) {
    return {
      success: false,
      error: `Record is already in terminal state: ${job.deletion_status}.`,
      status: job.deletion_status,
    };
  }

  if (job.deletion_attempts >= 5) {
    return { success: false, error: 'Maximum retry attempts reached.' };
  }

  const jobResult = await _processJob(job, false, Date.now());

  return {
    success: true,
    outcome: jobResult.outcome,
    detail:  jobResult.detail,
    vaultExpired: jobResult.vaultExpired,
  };
}

/**
 * Extracts vault ID from a vault URL like https://host/view/abc123#key=...
 * @private
 */
function _extractVaultId(vaultUrl) {
  try {
    const u = new URL(vaultUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    // pathname: /view/abc123 or /vault/abc123
    if (parts.length >= 2 && ['view', 'vault', 'v'].includes(parts[0])) {
      return parts[1];
    }
  } catch {
    // fallback: split on last /
    const idx = vaultUrl.lastIndexOf('/');
    if (idx !== -1) {
      const candidate = vaultUrl.slice(idx + 1).split('#')[0].split('?')[0];
      if (/^[a-f0-9]{8,32}$/i.test(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Determines whether an error is permanent (stop retrying) or transient.
 * @private
 */
function _isPermanentError(err) {
  const permanentCodes = [
    'WHATSAPP_AUTH_ERROR',
    'DELETE_NOT_SUPPORTED',
    'MESSAGE_NOT_FOUND',
    'PERMANENT_ERROR',
    'CONFIG_MISSING',
  ];
  return permanentCodes.includes(err.code);
}

module.exports = {
  runDeletionAgent,
  manualBurnMessage,
};
