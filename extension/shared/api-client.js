/**
 * Ephemeral Secret Vault — Secure API Client
 * Interfaces with the backend /api/secret and /health endpoints.
 * Never logs plaintext secrets or exposes sensitive tokens.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.VaultApiClient = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Creates a self-destructing secret on the backend.
   * @param {Object} options
   * @param {string} options.secret - plaintext secret payload
   * @param {number} [options.ttlSeconds=600] - expiration in seconds (default 10m)
   * @param {number} [options.maxViews=1] - view allowance (default 1)
   * @param {string} [options.passphrase] - optional decryption passphrase
   * @param {string} [options.serverUrl='http://localhost:3000'] - backend origin
   * @returns {Promise<{ id: string, url: string, expires_at: string, views_remaining: number }>}
   */
  async function createSecret(options = {}) {
    const {
      secret,
      ttlSeconds = 600,
      maxViews = 1,
      passphrase = '',
      serverUrl = 'http://localhost:3000'
    } = options;

    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      throw new Error('Secret content cannot be empty.');
    }

    const cleanBaseUrl = (serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const endpoint = `${cleanBaseUrl}/api/secret`;

    const bodyPayload = {
      secret: secret,
      ttl_seconds: parseInt(ttlSeconds, 10) || 600,
      max_views: parseInt(maxViews, 10) || 1
    };

    if (passphrase && typeof passphrase === 'string' && passphrase.trim()) {
      bodyPayload.passphrase = passphrase.trim();
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create secure vault.');
    }

    // Ensure absolute vault link (backend returns view_url)
    let finalUrl = data.view_url || data.url;
    if (finalUrl && finalUrl.startsWith('/')) {
      finalUrl = `${cleanBaseUrl}${finalUrl}`;
    }

    return {
      id: data.id,
      url: finalUrl,
      view_url: finalUrl,
      expires_at: data.expires_at,
      views_remaining: data.views_remaining
    };
  }

  /**
   * Health check for vault service.
   * @param {string} serverUrl
   * @returns {Promise<{ online: boolean, status: string, latencyMs: number }>}
   */
  async function checkHealth(serverUrl = 'http://localhost:3000') {
    const cleanBaseUrl = (serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const start = Date.now();

    try {
      const response = await fetch(`${cleanBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        const json = await response.json();
        return {
          online: true,
          status: json.status || 'ok',
          latencyMs
        };
      }
      return { online: false, status: `HTTP ${response.status}`, latencyMs };
    } catch (err) {
      return { online: false, status: 'Connection unavailable', latencyMs: Date.now() - start };
    }
  }

  return {
    createSecret,
    checkHealth
  };
});
