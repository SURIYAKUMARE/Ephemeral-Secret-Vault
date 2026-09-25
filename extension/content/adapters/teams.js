/**
 * Ephemeral Secret Vault — Microsoft Teams Web Platform Adapter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.TeamsAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class TeamsAdapter extends PlatformAdapter {
    constructor() {
      super('Microsoft Teams');
    }

    matches() {
      return typeof location !== 'undefined' && location.hostname === 'teams.microsoft.com';
    }

    getComposer() {
      const selectors = [
        'div[data-tid="ckeditor"]',
        'div.ck-content[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }

      return super.getComposer();
    }
  }

  return TeamsAdapter;
});
