/**
 * Ephemeral Secret Vault — Slack Web Platform Adapter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.SlackAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class SlackAdapter extends PlatformAdapter {
    constructor() {
      super('Slack');
    }

    matches() {
      return typeof location !== 'undefined' && location.hostname === 'app.slack.com';
    }

    getComposer() {
      const selectors = [
        'div[data-qa="message_input"]',
        'div.ql-editor',
        'div[contenteditable="true"][role="textbox"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }

      return super.getComposer();
    }
  }

  return SlackAdapter;
});
