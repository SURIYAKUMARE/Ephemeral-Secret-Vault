/**
 * Ephemeral Secret Vault — Storage Manager
 * Safely persists extension configuration and non-sensitive vault history.
 *
 * CRITICAL SECURITY ASSURANCE:
 * Plaintext secrets, encryption keys, DEKs, or passwords are NEVER persisted.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.StorageManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    serverUrl: 'http://localhost:3000',
    defaultTtlSeconds: 600, // 10 minutes
    defaultMaxViews: 1,     // 1 view
    autoDetectSensitive: true,
    integrations: {
      whatsapp: true,
      gmail: true,
      outlook: true,
      slack: true,
      discord: true,
      teams: true,
      telegram: true,
      generic: true
    }
  };

  const STORAGE_KEYS = {
    SETTINGS: 'vault_extension_settings',
    HISTORY: 'vault_safe_history'
  };

  // Mock in-memory store for test/node environments
  const memoryStore = {};

  function isExtensionEnv() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  /**
   * Get settings with defaults
   */
  async function getSettings() {
    if (isExtensionEnv()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
          resolve(Object.assign({}, DEFAULT_SETTINGS, result[STORAGE_KEYS.SETTINGS] || {}));
        });
      });
    }

    const saved = memoryStore[STORAGE_KEYS.SETTINGS];
    return Object.assign({}, DEFAULT_SETTINGS, saved || {});
  }

  /**
   * Update settings
   */
  async function saveSettings(newSettings) {
    const current = await getSettings();
    const merged = Object.assign({}, current, newSettings);

    if (isExtensionEnv()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged }, () => resolve(merged));
      });
    }

    memoryStore[STORAGE_KEYS.SETTINGS] = merged;
    return merged;
  }

  /**
   * Get safe activity history (metadata only)
   * @returns {Promise<Array<{ id: string, url: string, expires_at: string, views_remaining: number, platform: string, created_at: string }>>}
   */
  async function getHistory() {
    if (isExtensionEnv()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.HISTORY], (result) => {
          resolve(result[STORAGE_KEYS.HISTORY] || []);
        });
      });
    }

    return memoryStore[STORAGE_KEYS.HISTORY] || [];
  }

  /**
   * Record safe metadata after secret creation
   */
  async function addHistoryEntry(entry) {
    if (!entry || !entry.url) return;

    // Strict sanitization: ensure no plaintext secret or key is present
    const safeItem = {
      id: String(entry.id || '').substring(0, 32),
      url: String(entry.url || ''),
      expires_at: entry.expires_at || new Date(Date.now() + 600000).toISOString(),
      views_remaining: typeof entry.views_remaining === 'number' ? entry.views_remaining : 1,
      platform: String(entry.platform || 'Direct Share'),
      created_at: new Date().toISOString()
    };

    const history = await getHistory();
    // Keep at most 10 recent items
    const updated = [safeItem, ...history.filter(h => h.id !== safeItem.id)].slice(0, 10);

    if (isExtensionEnv()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated }, () => resolve(updated));
      });
    }

    memoryStore[STORAGE_KEYS.HISTORY] = updated;
    return updated;
  }

  /**
   * Clear history
   */
  async function clearHistory() {
    if (isExtensionEnv()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([STORAGE_KEYS.HISTORY], resolve);
      });
    }

    delete memoryStore[STORAGE_KEYS.HISTORY];
  }

  return {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    getHistory,
    addHistoryEntry,
    clearHistory
  };
});
