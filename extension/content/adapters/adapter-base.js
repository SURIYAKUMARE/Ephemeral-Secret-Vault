/**
 * Ephemeral Secret Vault — Platform Adapter Base Class
 * Modular foundation for messaging platform adapters.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.PlatformAdapter = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class PlatformAdapter {
    constructor(name) {
      this.name = name || 'Generic';
    }

    /**
     * Check if adapter applies to the current host
     * @returns {boolean}
     */
    matches() {
      return false;
    }

    /**
     * Find active composer element
     * @returns {HTMLElement|null}
     */
    getComposer() {
      return document.activeElement;
    }

    /**
     * Get selected text from active composer or document
     * @returns {string}
     */
    getSelectedText() {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        return selection.toString().trim();
      }

      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
          return active.value.substring(start, end).trim();
        }
      }

      return '';
    }

    /**
     * Standard message template for replacing sensitive text
     * @param {string} vaultUrl
     * @returns {string}
     */
    formatSecureMessage(vaultUrl) {
      return `🔐 Secure Secret\nOpen securely:\n${vaultUrl}`;
    }

    /**
     * Replace sensitive content with secure link inside composer
     * @param {string} vaultUrl
     * @returns {boolean}
     */
    insertSecureLink(vaultUrl) {
      const textToInsert = this.formatSecureMessage(vaultUrl);
      const active = this.getComposer();

      if (!active) return false;

      // Case 1: Standard textarea / text input
      if (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
        const start = active.selectionStart ?? active.value.length;
        const end = active.selectionEnd ?? active.value.length;
        const val = active.value;
        active.value = val.substring(0, start) + textToInsert + val.substring(end);
        active.selectionStart = active.selectionEnd = start + textToInsert.length;
        active.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      // Case 2: ContentEditable element
      if (active.isContentEditable || active.getAttribute('contenteditable') === 'true') {
        active.focus();
        try {
          const success = document.execCommand('insertText', false, textToInsert);
          if (success) return true;
        } catch (e) {}

        // Fallback for contenteditable
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(textToInsert);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          active.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      }

      return false;
    }

    /**
     * Injects a quick action button into the platform toolbar if possible
     * @param {Function} onClick
     */
    injectToolbarButton(onClick) {
      // Implemented by specific platform subclasses
    }
  }

  return PlatformAdapter;
});
