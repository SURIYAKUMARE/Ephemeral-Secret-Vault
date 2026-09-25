/**
 * Ephemeral Secret Vault — Generic Platform Adapter (Fallback)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.GenericComposerAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class GenericComposerAdapter extends PlatformAdapter {
    constructor() {
      super('Generic Composer');
    }

    matches() {
      return true; // Universal fallback
    }

    getComposer() {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'INPUT' ||
        active.isContentEditable ||
        active.getAttribute('contenteditable') === 'true'
      )) {
        return active;
      }

      // Check for common input/composer elements in view
      const visible = document.querySelector('textarea, [contenteditable="true"]');
      return visible || null;
    }
  }

  return GenericComposerAdapter;
});
