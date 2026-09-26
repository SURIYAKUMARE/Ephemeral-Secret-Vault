/**
 * Ephemeral Secret Vault — Background Service Worker (Manifest V3)
 * Manages context menus, tab messaging, and background API proxying.
 */

import '../shared/api-client.js';
import '../shared/storage-manager.js';

// Setup Context Menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // 1. When text is selected
    chrome.contextMenus.create({
      id: 'ephemeral-protect-selection',
      title: '🔐 Protect with Ephemeral Vault',
      contexts: ['selection']
    });

    // 2. Browser action menu items
    chrome.contextMenus.create({
      id: 'ephemeral-open-vault',
      title: '🌐 Open Vault Web App',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'ephemeral-settings',
      title: '⚙ Extension Settings',
      contexts: ['action']
    });
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ephemeral-protect-selection' && tab && tab.id) {
    const selectedText = info.selectionText || '';

    try {
      // Try sending message to existing content script
      await chrome.tabs.sendMessage(tab.id, {
        type: 'OPEN_PROTECT_MODAL',
        selectedText
      });
    } catch (err) {
      // If content script was not pre-injected on this domain, inject it on-demand
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content/content.css']
        });

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            'shared/sensitive-detector.js',
            'shared/api-client.js',
            'content/adapters/adapter-base.js',
            'content/adapters/generic.js',
            'content/modal.js',
            'content/content.js'
          ]
        });

        // Retry sending message
        await chrome.tabs.sendMessage(tab.id, {
          type: 'OPEN_PROTECT_MODAL',
          selectedText
        });
      } catch (injectionErr) {
        console.warn('[Ephemeral Vault] Could not inject modal on this page:', injectionErr.message);
      }
    }
  } else if (info.menuItemId === 'ephemeral-open-vault') {
    const settings = await globalThis.StorageManager.getSettings();
    chrome.tabs.create({ url: settings.serverUrl || 'http://localhost:3000' });
  } else if (info.menuItemId === 'ephemeral-settings') {
    chrome.runtime.openOptionsPage();
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_VAULT_SECRET') {
    handleCreateSecret(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // async response
  }

  if (message.type === 'CHECK_VAULT_HEALTH') {
    handleCheckHealth(message.serverUrl)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message, online: false }));
    return true;
  }

  if (message.type === 'CREATE_OFFLINE_SECRET') {
    handleCreateOfflineSecret(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleCreateSecret(payload) {
  const settings = await globalThis.StorageManager.getSettings();
  const serverUrl = payload.serverUrl || settings.serverUrl || 'http://localhost:3000';

  const result = await globalThis.VaultApiClient.createSecret({
    secret: payload.secret,
    ttlSeconds: payload.ttlSeconds || settings.defaultTtlSeconds || 600,
    maxViews: payload.maxViews || settings.defaultMaxViews || 1,
    passphrase: payload.passphrase || '',
    serverUrl
  });

  // Store safe metadata ONLY (never plaintext secret or keys)
  await globalThis.StorageManager.addHistoryEntry({
    id: result.id,
    url: result.url,
    expires_at: result.expires_at,
    views_remaining: result.views_remaining,
    platform: payload.platform || 'Extension'
  });

  return result;
}

async function handleCreateOfflineSecret(payload) {
  const settings = await globalThis.StorageManager.getSettings();
  const serverUrl = payload.serverUrl || settings.serverUrl || 'http://localhost:3000';

  const result = await globalThis.VaultApiClient.createOfflineSecret({
    secret: payload.secret,
    passphrase: payload.passphrase || '',
    serverUrl
  });

  await globalThis.StorageManager.addHistoryEntry({
    id: result.id,
    url: result.url,
    expires_at: result.expires_at,
    views_remaining: result.views_remaining,
    platform: 'Offline ZK Vault'
  });

  return result;
}

async function handleCheckHealth(serverUrl) {
  const settings = await globalThis.StorageManager.getSettings();
  const targetUrl = serverUrl || settings.serverUrl || 'http://localhost:3000';
  return globalThis.VaultApiClient.checkHealth(targetUrl);
}
