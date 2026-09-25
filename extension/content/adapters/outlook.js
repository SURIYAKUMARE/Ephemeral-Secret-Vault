/**
 * Ephemeral Secret Vault — Outlook Web Platform Adapter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const PlatformAdapter = require('./adapter-base');
    module.exports = factory(PlatformAdapter);
  } else {
    root.OutlookAdapter = factory(root.PlatformAdapter);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PlatformAdapter) {
  'use strict';

  class OutlookAdapter extends PlatformAdapter {
    constructor() {
      super('Outlook Web');
    }

    matches() {
      return typeof location !== 'undefined' && (
        location.hostname.includes('outlook.live.com') ||
        location.hostname.includes('outlook.office.com') ||
        location.hostname.includes('outlook.office365.com')
      );
    }

    getComposer() {
      const selectors = [
        'div[aria-label*="Message body"]',
        'div[aria-label*="Message Body"]',
        'div[role="textbox"][contenteditable="true"]',
        'div.elementToProof[contenteditable="true"]'
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

      composer.focus();

      const htmlToInsert = `
        <div style="margin: 10px 0; padding: 12px 16px; background-color: #050816; border: 1px solid #6366f1; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="color: #38bdf8; font-weight: bold; font-size: 14px; margin-bottom: 4px;">🔐 Ephemeral Secret Vault</div>
          <div style="color: #a5b4cf; font-size: 13px; margin-bottom: 6px;">Open confidential secret:</div>
          <a href="${vaultUrl}" target="_blank" rel="noopener noreferrer" style="color: #818cf8; font-weight: bold; font-size: 14px; text-decoration: underline;">${vaultUrl}</a>
        </div>
      `;

      try {
        const success = document.execCommand('insertHTML', false, htmlToInsert);
        if (success) return true;
      } catch (e) {}

      return super.insertSecureLink(vaultUrl);
    }

    injectToolbarButton(onClick) {
      if (document.getElementById('ephemeral-outlook-btn')) return;

      const toolbar = document.querySelector('div[role="toolbar"]');
      if (!toolbar) return;

      const btn = document.createElement('button');
      btn.id = 'ephemeral-outlook-btn';
      btn.type = 'button';
      btn.title = 'Protect with Ephemeral Vault';
      btn.innerHTML = '🔐 Protect Secret';
      btn.style.cssText = 'background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; font-weight: 600; font-size: 12px; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-left: 8px;';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof onClick === 'function') onClick();
      });

      toolbar.appendChild(btn);
    }
  }

  return OutlookAdapter;
});
