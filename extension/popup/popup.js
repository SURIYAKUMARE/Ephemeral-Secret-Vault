/**
 * Ephemeral Secret Vault — Popup Script
 */

(function () {
  'use strict';

  // Elements
  const statusIndicator = document.getElementById('vault-status');
  const statusText = document.getElementById('status-text');
  const btnSettings = document.getElementById('btn-open-settings');

  // Tabs
  const tabProtect = document.getElementById('tab-protect');
  const tabHistory = document.getElementById('tab-history');
  const tabAbout = document.getElementById('tab-about');

  const panelProtect = document.getElementById('panel-protect');
  const panelHistory = document.getElementById('panel-history');
  const panelAbout = document.getElementById('panel-about');

  // Form Elements
  const createView = document.getElementById('create-view');
  const resultView = document.getElementById('result-view');
  const secretInput = document.getElementById('popup-secret');
  const detectionBadge = document.getElementById('detection-badge');
  const btnPaste = document.getElementById('btn-paste-secret');
  const btnMask = document.getElementById('btn-mask-secret');
  const selectTtl = document.getElementById('popup-ttl');
  const selectViews = document.getElementById('popup-views');
  const passphraseInput = document.getElementById('popup-passphrase');
  const btnToggleEye = document.getElementById('btn-toggle-eye');
  const errorBox = document.getElementById('popup-error');
  const btnCreate = document.getElementById('btn-create-vault');
  const btnCreateText = document.getElementById('btn-create-text');

  // Result Elements
  const linkOutput = document.getElementById('popup-link-output');
  const btnCopyLink = document.getElementById('btn-copy-popup-link');
  const btnOpenLink = document.getElementById('btn-open-popup-link');
  const btnReset = document.getElementById('btn-reset-popup');

  // History Elements
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Settings Cache
  let currentSettings = {
    serverUrl: 'http://localhost:3000',
    defaultTtlSeconds: 600,
    defaultMaxViews: 1,
    autoDetectSensitive: true
  };

  // Init
  init();

  async function init() {
    setupTabSwitching();
    setupActions();

    if (window.StorageManager) {
      currentSettings = await window.StorageManager.getSettings();
      if (selectTtl) selectTtl.value = String(currentSettings.defaultTtlSeconds || 600);
      if (selectViews) selectViews.value = String(currentSettings.defaultMaxViews || 1);
    }

    checkHealth();
    loadHistory();
  }

  // Health Check
  async function checkHealth() {
    if (!window.VaultApiClient) return;
    try {
      const health = await window.VaultApiClient.checkHealth(currentSettings.serverUrl);
      if (health.online) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = 'Vault Online';
      } else {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Vault Offline';
      }
    } catch {
      statusIndicator.className = 'status-indicator offline';
      statusText.textContent = 'Vault Offline';
    }
  }

  // Tab switching
  function setupTabSwitching() {
    const tabs = [
      { btn: tabProtect, panel: panelProtect },
      { btn: tabHistory, panel: panelHistory, onOpen: loadHistory },
      { btn: tabAbout, panel: panelAbout }
    ];

    tabs.forEach(({ btn, panel, onOpen }) => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.panel.classList.remove('active');
        });
        btn.classList.add('active');
        panel.classList.add('active');
        if (onOpen) onOpen();
      });
    });
  }

  function setupActions() {
    // Open Settings
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        if (chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open('../options/options.html');
        }
      });
    }

    // Mask / Peek
    let isMasked = false;
    btnMask.addEventListener('click', () => {
      isMasked = !isMasked;
      if (isMasked) {
        secretInput.classList.add('masked');
        btnMask.textContent = 'Show';
      } else {
        secretInput.classList.remove('masked');
        btnMask.textContent = 'Hide';
      }
    });

    // Eye toggle for passphrase
    let passVisible = false;
    btnToggleEye.addEventListener('click', () => {
      passVisible = !passVisible;
      passphraseInput.type = passVisible ? 'text' : 'password';
      btnToggleEye.textContent = passVisible ? '🔒' : '👁';
    });

    // Paste from clipboard
    btnPaste.addEventListener('click', async () => {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          secretInput.value = clipText;
          runSensitiveCheck(clipText);
          secretInput.focus();
        }
      } catch (err) {
        showError('Clipboard permission needed to paste.');
      }
    });

    // Live sensitive detection check
    secretInput.addEventListener('input', () => {
      runSensitiveCheck(secretInput.value);
    });

    // Create Vault Button
    btnCreate.addEventListener('click', handleCreateVault);

    // Copy Link Button
    btnCopyLink.addEventListener('click', async () => {
      if (!linkOutput.value) return;
      await navigator.clipboard.writeText(linkOutput.value);
      btnCopyLink.innerHTML = '<span>✓ Copied!</span>';
      setTimeout(() => {
        btnCopyLink.innerHTML = '<span>📋 Copy Link</span>';
      }, 2000);
    });

    // Reset View Button
    btnReset.addEventListener('click', () => {
      secretInput.value = '';
      passphraseInput.value = '';
      detectionBadge.classList.add('hidden');
      hideError();
      resultView.classList.add('hidden');
      createView.classList.remove('hidden');
      secretInput.focus();
    });

    // Clear History Button
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', async () => {
        if (window.StorageManager) {
          await window.StorageManager.clearHistory();
          loadHistory();
        }
      });
    }

    // Web link footer
    const linkWebVault = document.getElementById('link-visit-vault');
    if (linkWebVault) {
      linkWebVault.href = currentSettings.serverUrl || 'http://localhost:3000';
    }
  }

  function runSensitiveCheck(text) {
    if (!currentSettings.autoDetectSensitive || !window.SensitiveDetector) return;
    const detection = window.SensitiveDetector.detect(text);
    if (detection && detection.isSensitive) {
      detectionBadge.textContent = `⚠ ${detection.type}`;
      detectionBadge.classList.remove('hidden');
    } else {
      detectionBadge.classList.add('hidden');
    }
  }

  async function handleCreateVault() {
    const text = secretInput.value.trim();
    if (!text) {
      showError('Please enter secret text or credentials.');
      return;
    }

    hideError();
    btnCreate.disabled = true;
    btnCreateText.textContent = 'Encrypting securely...';

    try {
      let result = null;
      if (chrome.runtime && chrome.runtime.sendMessage) {
        result = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              type: 'CREATE_VAULT_SECRET',
              payload: {
                secret: text,
                ttlSeconds: selectTtl.value,
                maxViews: selectViews.value,
                passphrase: passphraseInput.value.trim(),
                serverUrl: currentSettings.serverUrl,
                platform: 'Extension Popup'
              }
            },
            (res) => {
              if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
              if (res && res.error) return reject(new Error(res.error));
              resolve(res);
            }
          );
        });
      } else if (window.VaultApiClient) {
        result = await window.VaultApiClient.createSecret({
          secret: text,
          ttlSeconds: selectTtl.value,
          maxViews: selectViews.value,
          passphrase: passphraseInput.value.trim(),
          serverUrl: currentSettings.serverUrl
        });

        if (window.StorageManager) {
          await window.StorageManager.addHistoryEntry({
            id: result.id,
            url: result.url,
            expires_at: result.expires_at,
            views_remaining: result.views_remaining,
            platform: 'Extension Popup'
          });
        }
      }

      if (!result || !result.url) {
        throw new Error('Could not generate vault link.');
      }

      // Memory sanitize textarea
      secretInput.value = '';

      linkOutput.value = result.url;
      btnOpenLink.href = result.url;

      createView.classList.add('hidden');
      resultView.classList.remove('hidden');
    } catch (err) {
      showError(err.message || 'Secret creation failed.');
    } finally {
      btnCreate.disabled = false;
      btnCreateText.textContent = 'Create Secure Link';
    }
  }

  async function loadHistory() {
    if (!historyList || !window.StorageManager) return;
    const history = await window.StorageManager.getHistory();

    if (!history.length) {
      historyList.innerHTML = '<div class="history-empty">No recent vaults. All created links will appear here safely.</div>';
      return;
    }

    historyList.innerHTML = history.map((item) => {
      const createdDate = item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Recently';
      const expiresDate = item.expires_at ? new Date(item.expires_at).toLocaleTimeString() : 'Active';
      return `
        <div class="history-card">
          <div class="history-top">
            <span class="history-id">Vault #${escapeHtml(item.id)}</span>
            <span class="history-meta">${escapeHtml(item.platform)}</span>
          </div>
          <div class="history-meta" style="display:flex;justify-content:space-between;">
            <span>Created: ${createdDate}</span>
            <span>Expires: ${expiresDate}</span>
          </div>
          <div class="history-actions">
            <button type="button" class="btn-micro" data-url="${escapeHtml(item.url)}">Copy Link</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach copy handlers
    historyList.querySelectorAll('button[data-url]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-url');
        await navigator.clipboard.writeText(url);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 1800);
      });
    });
  }

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
  }

  function hideError() {
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
