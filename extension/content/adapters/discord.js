/**
 * Ephemeral Secret Vault — Discord Web Platform Adapter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.DiscordAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class DiscordAdapter extends PlatformAdapter {
    constructor() {
      super('Discord');
    }

    matches() {
      return typeof location !== 'undefined' && location.hostname === 'discord.com';
    }

    getComposer() {
      const selectors = [
        'div[role="textbox"][data-slate-editor="true"]',
        'form div[role="textbox"]',
        'div[contenteditable="true"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }

      return super.getComposer();
    }
  }

  return DiscordAdapter;
});
