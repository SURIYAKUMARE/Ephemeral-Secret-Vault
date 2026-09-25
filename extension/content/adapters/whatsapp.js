/**
 * Ephemeral Secret Vault — WhatsApp Web Platform Adapter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.WhatsAppAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class WhatsAppAdapter extends PlatformAdapter {
    constructor() {
      super('WhatsApp Web');
    }

    matches() {
      return typeof location !== 'undefined' && location.hostname === 'web.whatsapp.com';
    }

    getComposer() {
      // Primary WhatsApp contenteditable message box
      const selectors = [
        'footer div[contenteditable="true"]',
        'div[contenteditable="true"][data-tab="10"]',
        'div[contenteditable="true"][aria-label*="Type a message"]',
        'div[contenteditable="true"][spellcheck="true"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }

      return super.getComposer();
    }

    insertSecureLink(vaultUrl) {
      const composer = this.getComposer();
      if (!composer) return false;

      const formatted = this.formatSecureMessage(vaultUrl);
      composer.focus();

      // WhatsApp Web uses Lexical/DraftJS state.
      // document.execCommand('insertText') is the most reliable way to trigger internal state update.
      try {
        const success = document.execCommand('insertText', false, formatted);
        if (success) {
          composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: formatted }));
          return true;
        }
      } catch (e) {}

      // Fallback
      return super.insertSecureLink(vaultUrl);
    }

    injectToolbarButton(onClick) {
      if (document.getElementById('ephemeral-wa-btn')) return;

      const footer = document.querySelector('footer');
      if (!footer) return;

      // Find action buttons row in footer
      const actionRow = footer.querySelector('div[role="button"]')?.parentElement || footer;

      const btn = document.createElement('button');
      btn.id = 'ephemeral-wa-btn';
      btn.type = 'button';
      btn.title = 'Protect with Ephemeral Vault';
      btn.className = 'ephemeral-toolbar-btn';
      btn.innerHTML = '<span style="font-size:16px;">🔐</span>';
      btn.style.cssText = 'background:none;border:none;cursor:pointer;padding:6px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;opacity:0.85;transition:all 0.2s;';

      btn.addEventListener('mouseenter', () => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.15)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.opacity = '0.85';
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof onClick === 'function') onClick();
      });

      actionRow.appendChild(btn);
    }
  }

  return WhatsAppAdapter;
});
