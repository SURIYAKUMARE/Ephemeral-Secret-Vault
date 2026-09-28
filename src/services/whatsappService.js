'use strict';

/**
 * WhatsApp Business Cloud API Service
 *
 * IMPORTANT — API DELETION CAPABILITY FINDING:
 * ─────────────────────────────────────────────
 * As of September 2026, the official Meta WhatsApp Business Cloud API
 * does NOT support deleting a sent message from a recipient's chat.
 *
 * The /PHONE_NUMBER_ID/messages endpoint only supports:
 *   POST  → send a message
 *   PUT   → mark an incoming message as read
 *
 * There is NO DELETE verb, NO unsend endpoint, NO recall-for-recipient
 * operation in the Cloud API. This is confirmed by:
 *   - Meta Developer Community threads (June 2024, July 2025)
 *   - Official Cloud API reference: developers.facebook.com/docs/whatsapp/cloud-api/reference
 *   - The /services/message/gc endpoint (On-Premises only) only deletes
 *     from the BUSINESS database, not from the recipient's device.
 *
 * Therefore:
 *   • deletion_status will always be set to 'unsupported' by the agent.
 *   • The system NEVER reports deletion unless the API confirms it.
 *   • The secure vault URL expiry is the enforced protection mechanism.
 */

const https = require('node:https');
const crypto = require('node:crypto');

// ─── Constants ───────────────────────────────────────────────────────────────
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';
const BASE_HOST   = 'graph.facebook.com';

/**
 * Error codes for structured error handling.
 */
const WA_ERRORS = {
  INVALID_PHONE:        'INVALID_PHONE',
  AUTH_ERROR:           'WHATSAPP_AUTH_ERROR',
  API_ERROR:            'WHATSAPP_API_ERROR',
  MESSAGE_NOT_FOUND:    'MESSAGE_NOT_FOUND',
  DELETE_NOT_SUPPORTED: 'DELETE_NOT_SUPPORTED',
  RATE_LIMITED:         'RATE_LIMITED',
  TEMPORARY_ERROR:      'TEMPORARY_ERROR',
  PERMANENT_ERROR:      'PERMANENT_ERROR',
  CONFIG_MISSING:       'CONFIG_MISSING',
};

/**
 * Returns true if WhatsApp env vars are configured.
 */
function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/**
 * Validates and normalises an E.164 phone number.
 * Accepts formats: +91XXXXXXXXXX, 91XXXXXXXXXX, 0091XXXXXXXXXX
 * Returns { valid: true, number: '91XXXXXXXXXX' } or { valid: false, reason }
 */
function validatePhoneNumber(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, reason: 'Phone number is required.' };
  }

  // Strip whitespace, dashes, parentheses
  let cleaned = raw.replace(/[\s\-().]/g, '');

  // Remove leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);

  // Remove leading 00 (international dialling prefix)
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);

  // Must be digits only, 7–15 chars (E.164 range)
  if (!/^\d{7,15}$/.test(cleaned)) {
    return {
      valid: false,
      reason: `Invalid phone number format. Use E.164 format, e.g. +91XXXXXXXXXX.`
    };
  }

  return { valid: true, number: cleaned };
}

/**
 * Makes an HTTPS request to the Meta Graph API.
 * Returns { data, status } or throws a structured WhatsApp error.
 * @private
 */
function graphApiRequest({ method = 'POST', path, body }) {
  return new Promise((resolve, reject) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      const err = new Error('WHATSAPP_ACCESS_TOKEN is not configured.');
      err.code = WA_ERRORS.CONFIG_MISSING;
      return reject(err);
    }

    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: BASE_HOST,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

        if (res.statusCode === 200 || res.statusCode === 201) {
          return resolve({ data: parsed, status: res.statusCode });
        }

        // Map HTTP status to structured error codes
        const errData = parsed.error || {};
        let code = WA_ERRORS.API_ERROR;
        if (res.statusCode === 401 || res.statusCode === 403) code = WA_ERRORS.AUTH_ERROR;
        else if (res.statusCode === 404)                       code = WA_ERRORS.MESSAGE_NOT_FOUND;
        else if (res.statusCode === 429)                       code = WA_ERRORS.RATE_LIMITED;
        else if (res.statusCode >= 500)                        code = WA_ERRORS.TEMPORARY_ERROR;

        const err = new Error(
          errData.message || `WhatsApp API error ${res.statusCode}`
        );
        err.code      = code;
        err.httpStatus = res.statusCode;
        err.apiError  = errData;
        reject(err);
      });
    });

    req.on('error', (netErr) => {
      const err = new Error(`Network error: ${netErr.message}`);
      err.code = WA_ERRORS.TEMPORARY_ERROR;
      reject(err);
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Sends a WhatsApp text message via the Cloud API.
 *
 * @param {object} opts
 * @param {string} opts.to          - Recipient number (E.164 without +)
 * @param {string} opts.text        - Message body
 * @param {string} [opts.previewUrl] - Whether to show URL preview
 * @returns {Promise<{ messageId: string, rawResponse: object }>}
 */
async function sendTextMessage({ to, text, previewUrl = false }) {
  if (!isConfigured()) {
    const err = new Error('WhatsApp credentials are not configured.');
    err.code = WA_ERRORS.CONFIG_MISSING;
    throw err;
  }

  const phoneValidation = validatePhoneNumber(to);
  if (!phoneValidation.valid) {
    const err = new Error(phoneValidation.reason);
    err.code = WA_ERRORS.INVALID_PHONE;
    throw err;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phoneValidation.number,
    type: 'text',
    text: {
      preview_url: previewUrl,
      body: text,
    },
  };

  const { data } = await graphApiRequest({
    method: 'POST',
    path:   `/${API_VERSION}/${phoneNumberId}/messages`,
    body:   payload,
  });

  // Extract wamid from response
  // Official response shape: { messages: [{ id: 'wamid.xxx' }] }
  const messageId = data?.messages?.[0]?.id;
  if (!messageId) {
    const err = new Error('WhatsApp API did not return a message ID.');
    err.code = WA_ERRORS.API_ERROR;
    throw err;
  }

  return { messageId, rawResponse: data };
}

/**
 * Builds the ephemeral vault message text sent to the recipient.
 * The secret itself is NEVER included — only the secure vault URL.
 */
function buildVaultMessage(vaultUrl, senderNote) {
  const lines = [
    '🔐 *You received an Ephemeral Secret*',
    '',
    'Someone has shared a confidential message or file with you securely.',
    'Open the link below to reveal it — the secret will be permanently',
    'destroyed after you view it or when the timer expires.',
    '',
    `🔗 *Secure Vault:* ${vaultUrl}`,
  ];

  if (senderNote) {
    lines.push('');
    lines.push(`📝 *Note:* ${senderNote}`);
  }

  lines.push(
    '',
    '_Powered by Ephemeral Secret Vault — zero-trace encrypted sharing._',
    '_This link expires automatically. Do not share it with others._'
  );

  return lines.join('\n');
}

/**
 * Attempts to delete a sent WhatsApp message using the official Cloud API.
 *
 * ─── IMPORTANT ────────────────────────────────────────────────────────────
 * As of September 2026, the Meta WhatsApp Business Cloud API does NOT
 * support deleting a sent message from the recipient's conversation.
 *
 * This function will always return:
 *   { deleted: false, reason: 'DELETE_NOT_SUPPORTED', ... }
 *
 * Per the project requirement: "Do NOT show 'Message Deleted' unless the
 * WhatsApp API confirms the deletion." — This function never confirms deletion
 * because the API does not support it.
 *
 * If Meta adds this capability in a future API version, update this function
 * to call the new endpoint and return { deleted: true } only on API confirmation.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * @param {string} _whatsappMessageId - The wamid (unused — no endpoint exists)
 * @returns {{ deleted: boolean, reason: string, explanation: string }}
 */
async function deleteMessage(_whatsappMessageId) {
  return {
    deleted: false,
    reason: WA_ERRORS.DELETE_NOT_SUPPORTED,
    explanation:
      'The Meta WhatsApp Business Cloud API does not support deleting a ' +
      'sent message from the recipient\'s conversation. No DELETE endpoint ' +
      'exists for /PHONE_NUMBER_ID/messages. The vault URL will expire ' +
      'automatically per the configured TTL, rendering it permanently unusable.',
  };
}

/**
 * Returns a structured description of the deletion capability.
 * Used by the frontend and admin panel to show accurate status.
 */
function getDeletionCapability() {
  return {
    supported: false,
    reason: DELETE_NOT_SUPPORTED_MESSAGE,
    fallback:
      'The secret vault URL expires automatically. Once expired, ' +
      'the vault URL is permanently inaccessible and the ciphertext ' +
      'is purged from the server.',
    apiReference: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference',
  };
}

const DELETE_NOT_SUPPORTED_MESSAGE =
  'WhatsApp message deletion is not supported by the official Meta ' +
  'WhatsApp Business Cloud API. The configured deletion time has passed ' +
  'and the vault URL has been expired. The WhatsApp message itself ' +
  'cannot be removed from the recipient\'s chat via any official API.';

/**
 * Verifies a WhatsApp webhook signature from the X-Hub-Signature-256 header.
 * @param {string} rawBody  - Raw request body string
 * @param {string} signature - Value of X-Hub-Signature-256 header
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return false;

  if (!signature || !signature.startsWith('sha256=')) return false;

  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

module.exports = {
  isConfigured,
  validatePhoneNumber,
  sendTextMessage,
  buildVaultMessage,
  deleteMessage,
  getDeletionCapability,
  verifyWebhookSignature,
  WA_ERRORS,
  DELETE_NOT_SUPPORTED_MESSAGE,
};
