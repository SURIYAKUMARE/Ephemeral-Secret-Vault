/**
 * Ephemeral Secret Vault — Content Script Orchestrator
 * Injects platform adapters, handles context menu messages, and displays protection modal.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__EPHEMERAL_VAULT_INJECTED__) return;
  window.__EPHEMERAL_VAULT_INJECTED__ = true;

  // Initialize adapters
  const adapters = [
    typeof WhatsAppAdapter !== 'undefined' ? new WhatsAppAdapter() : null,
    typeof GmailAdapter !== 'undefined' ? new GmailAdapter() : null,
    typeof OutlookAdapter !== 'undefined' ? new OutlookAdapter() : null,
    typeof TelegramAdapter !== 'undefined' ? new TelegramAdapter() : null,
    typeof DiscordAdapter !== 'undefined' ? new DiscordAdapter() : null,
    typeof SlackAdapter !== 'undefined' ? new SlackAdapter() : null,
    typeof TeamsAdapter !== 'undefined' ? new TeamsAdapter() : null,
    typeof GenericComposerAdapter !== 'undefined' ? new GenericComposerAdapter() : null
  ].filter(Boolean);

  // Determine active platform adapter
  const currentAdapter = adapters.find(a => a.matches()) || (typeof GenericComposerAdapter !== 'undefined' ? new GenericComposerAdapter() : null);

  let floatingBubble = null;
  let serverUrl = 'http://localhost:3000';
  let autoDetectEnabled = true;

  // Fetch settings from extension storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['vault_extension_settings'], (result) => {
      const settings = result.vault_extension_settings || {};
      if (settings.serverUrl) serverUrl = settings.serverUrl;
      if (typeof settings.autoDetectSensitive === 'boolean') {
        autoDetectEnabled = settings.autoDetectSensitive;
      }
    });
  }

  /**
   * Opens the in-page modal flow
   * @param {string} [initialText='']
   * @param {Object} [sensitiveInfo=null]
   */
  function openProtectionFlow(initialText = '', sensitiveInfo = null) {
    removeFloatingBubble();

    const selected = initialText || (currentAdapter ? currentAdapter.getSelectedText() : '') || window.getSelection()?.toString()?.trim() || '';

    let detectedInfo = sensitiveInfo;
    if (!detectedInfo && selected && typeof SensitiveDetector !== 'undefined') {
      detectedInfo = SensitiveDetector.detect(selected);
    }

    if (typeof EphemeralModal !== 'undefined') {
      EphemeralModal.open({
        initialText: selected,
        sensitiveInfo: detectedInfo,
        serverUrl,
        onInsert: (vaultUrl) => {
          if (currentAdapter) {
            currentAdapter.insertSecureLink(vaultUrl);
          }
        }
      });
    }
  }

  // Listen for background service worker messages (e.g. Context Menu click)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'OPEN_PROTECT_MODAL') {
        openProtectionFlow(message.selectedText || '');
        sendResponse({ success: true });
        return true;
      }
    });
  }

  // Attempt toolbar button injection for active platform (WhatsApp, Gmail, Outlook, etc.)
  if (currentAdapter) {
    const tryInject = () => {
      try {
        currentAdapter.injectToolbarButton(() => openProtectionFlow());
      } catch (e) {}
    };

    // Retry periodically on dynamic single-page web app changes
    tryInject();
    const observer = new MutationObserver(() => tryInject());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Smart Detection Floating Badge on Text Selection
  document.addEventListener('mouseup', (e) => {
    if (!autoDetectEnabled) return;

    // Give browser time to finish selection
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (!text || text.length < 8) {
        removeFloatingBubble();
        return;
      }

      // Check if text is sensitive
      if (typeof SensitiveDetector !== 'undefined') {
        const detection = SensitiveDetector.detect(text);
        if (detection && detection.isSensitive) {
          showFloatingBubble(selection, text, detection);
          return;
        }
      }

      removeFloatingBubble();
    }, 50);
  });

  document.addEventListener('mousedown', (e) => {
    if (floatingBubble && !floatingBubble.contains(e.target)) {
      removeFloatingBubble();
    }
  });

  function showFloatingBubble(selection, text, detection) {
    removeFloatingBubble();

    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!rect || (rect.top === 0 && rect.left === 0)) return;

    floatingBubble = document.createElement('div');
    floatingBubble.className = 'ephemeral-floating-bubble';
    floatingBubble.innerHTML = `<span>🔐 Protect ${detection.type || 'Secret'}</span>`;
    floatingBubble.style.top = `${window.scrollY + rect.top - 36}px`;
    floatingBubble.style.left = `${window.scrollX + rect.left}px`;

    floatingBubble.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openProtectionFlow(text, detection);
      removeFloatingBubble();
    });

    document.body.appendChild(floatingBubble);
  }

  function removeFloatingBubble() {
    if (floatingBubble && floatingBubble.parentNode) {
      floatingBubble.parentNode.removeChild(floatingBubble);
    }
    floatingBubble = null;
  }
})();
