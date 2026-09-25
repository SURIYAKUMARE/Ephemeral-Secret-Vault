/**
 * Ephemeral Secret Vault — Telegram Web Platform Adapter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.TelegramAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class TelegramAdapter extends PlatformAdapter {
    constructor() {
      super('Telegram Web');
    }

    matches() {
      return typeof location !== 'undefined' && location.hostname === 'web.telegram.org';
    }

    getComposer() {
      const selectors = [
        'div.input-message-input',
        'div#editable-message-text',
        'div[contenteditable="true"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }

      return super.getComposer();
    }
  }

  return TelegramAdapter;
});
