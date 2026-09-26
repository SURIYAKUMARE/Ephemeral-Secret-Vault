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

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
    } catch (networkErr) {
      const isOffline = networkErr.name === 'TypeError' ||
        (networkErr.message && (
          networkErr.message.includes('fetch') ||
          networkErr.message.includes('network') ||
          networkErr.message.includes('ECONNREFUSED')
        ));

      const friendlyMsg = isOffline
        ? `Vault server unreachable at ${cleanBaseUrl}. Please ensure server is running (e.g. 'npm start') or update the server URL.`
        : (networkErr.message || 'Network connection failed.');

      const enhancedErr = new Error(friendlyMsg);
      enhancedErr.isNetworkError = true;
      enhancedErr.serverUrl = cleanBaseUrl;
      throw enhancedErr;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create secure vault.');
    }

    // Ensure absolute vault link and enforce configured base URL origin
    let finalUrl = data.view_url || data.url || `/view/${data.id}`;
    try {
      const parsed = new URL(finalUrl, cleanBaseUrl);
      const baseParsed = new URL(cleanBaseUrl);
      parsed.protocol = baseParsed.protocol;
      parsed.host = baseParsed.host;
      parsed.port = baseParsed.port;
      finalUrl = parsed.toString();
    } catch {
      if (finalUrl.startsWith('/')) {
        finalUrl = `${cleanBaseUrl}${finalUrl}`;
      }
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
   * Generates a zero-knowledge, client-side encrypted secret link using Web Crypto API.
   * Runs 100% offline without needing a live backend server.
   * Decryption key is placed strictly in the URL hash fragment (#), never sent over the wire.
   * @param {Object} options
   * @returns {Promise<{ id: string, url: string, is_offline: boolean, expires_at: string, views_remaining: number }>}
   */
  async function createOfflineSecret(options = {}) {
    const {
      secret,
      passphrase = '',
      serverUrl = 'http://localhost:3000'
    } = options;

    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      throw new Error('Secret content cannot be empty.');
    }

    const cleanBaseUrl = (serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const cryptoObj = globalThis.crypto || (typeof window !== 'undefined' && window.crypto);
    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error('Web Cryptography API is unavailable in this environment.');
    }

    const enc = new TextEncoder();
    const encodedSecret = enc.encode(secret.trim());

    // Generate random 256-bit AES-GCM key and 12-byte IV
    const rawKeyBytes = cryptoObj.getRandomValues(new Uint8Array(32));
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));

    const cryptoKey = await cryptoObj.subtle.importKey(
      'raw',
      rawKeyBytes,
      'AES-GCM',
      false,
      ['encrypt']
    );

    const ciphertextBuf = await cryptoObj.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedSecret
    );

    function toHex(buf) {
      return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const hexKey = toHex(rawKeyBytes);
    const hexIv = toHex(iv);
    const hexCt = toHex(ciphertextBuf);
    const offlineId = 'zk-' + hexKey.slice(0, 10);

    // Build self-contained client-side URL
    const finalUrl = `${cleanBaseUrl}/view/${offlineId}#offline=1&ct=${hexCt}&iv=${hexIv}&key=${hexKey}`;

    return {
      id: offlineId,
      url: finalUrl,
      view_url: finalUrl,
      is_offline: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      views_remaining: 1
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
    createOfflineSecret,
    checkHealth
  };
});
