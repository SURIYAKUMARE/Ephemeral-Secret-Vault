/**
 * Ephemeral Secret Vault — Sensitive Content Detector
 * Local-only regex heuristics for detecting credentials, tokens, and keys.
 * Zero network requests, zero logging, zero telemetry.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.SensitiveDetector = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PATTERNS = [
    {
      type: 'Private Key',
      description: 'RSA/EC/SSH cryptographic private key',
      regex: /-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----/i,
      severity: 'critical'
    },
    {
      type: 'AWS Access Key',
      description: 'Amazon Web Services IAM access key',
      regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/,
      severity: 'critical'
    },
    {
      type: 'OpenAI API Key',
      description: 'OpenAI platform secret key',
      regex: /\bsk-(proj-|live-)?[a-zA-Z0-9_-]{24,}\b/,
      severity: 'high'
    },
    {
      type: 'Google Cloud API Key',
      description: 'Google platform API credentials',
      regex: /\bAIzaSy[0-9A-Za-z_-]{30,40}\b/,
      severity: 'high'
    },
    {
      type: 'GitHub Token',
      description: 'GitHub personal access token',
      regex: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,}\b/,
      severity: 'critical'
    },
    {
      type: 'Stripe Secret Key',
      description: 'Stripe payment processor secret token',
      regex: /\b[rs]k_(live|test)_[0-9a-zA-Z]{24,}\b/,
      severity: 'critical'
    },
    {
      type: 'Slack Token',
      description: 'Slack bot or user access token',
      regex: /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/,
      severity: 'high'
    },
    {
      type: 'JSON Web Token (JWT)',
      description: 'Signed bearer access token',
      regex: /\beyJ[a-zA-Z0-9_-]{8,}\.eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/,
      severity: 'medium'
    },
    {
      type: 'Database Connection String',
      description: 'Database credentials URI',
      regex: /\b(postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp):\/\/[^\s:@]+:[^\s:@]+@[^\s]+\b/i,
      severity: 'critical'
    },
    {
      type: 'Inline Password / Credential',
      description: 'Explicit password or secret assignment',
      regex: /(?:password|passwd|secret|api[_-]?key|auth[_-]?token|client[_-]?secret)\s*[:=]\s*['"]?[^\s'";]+['"]?/i,
      severity: 'high'
    }
  ];

  /**
   * Tests if string contains sensitive tokens or high entropy credentials.
   * @param {string} text - text to inspect
   * @returns {{ isSensitive: boolean, type: string|null, description: string|null, severity: string|null }}
   */
  function detect(text) {
    if (!text || typeof text !== 'string') {
      return { isSensitive: false, type: null, description: null, severity: null };
    }

    const trimmed = text.trim();
    if (trimmed.length < 6) {
      return { isSensitive: false, type: null, description: null, severity: null };
    }

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(trimmed)) {
        return {
          isSensitive: true,
          type: pattern.type,
          description: pattern.description,
          severity: pattern.severity
        };
      }
    }

    // High entropy check for single token words length >= 16 with upper, lower, digits, symbols
    if (!trimmed.includes(' ') && trimmed.length >= 16 && trimmed.length <= 128) {
      const hasUpper = /[A-Z]/.test(trimmed);
      const hasLower = /[a-z]/.test(trimmed);
      const hasDigit = /[0-9]/.test(trimmed);
      const hasSpecial = /[^A-Za-z0-9]/.test(trimmed);
      const entropySignals = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

      if (entropySignals >= 3) {
        return {
          isSensitive: true,
          type: 'High-Entropy Secret',
          description: 'High-complexity token or random password detected',
          severity: 'medium'
        };
      }
    }

    return { isSensitive: false, type: null, description: null, severity: null };
  }

  return {
    detect,
    PATTERNS
  };
});
