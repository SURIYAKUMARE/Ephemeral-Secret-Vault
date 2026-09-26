/**
 * Ephemeral Secret Vault — Popup Script
 * Enhanced UI/UX, Quick Server Switcher, QR Code Generator,
 * Password Generator, Strength Meter, and Offline Fallback.
 */

(function () {
  'use strict';

  // Header & Drawer Elements
  const statusIndicator = document.getElementById('vault-status');
  const statusText = document.getElementById('status-text');
  const statusLatency = document.getElementById('status-latency');
  const btnToggleServer = document.getElementById('btn-toggle-server');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const serverDrawer = document.getElementById('server-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const quickServerInput = document.getElementById('quick-server-input');
  const btnQuickPing = document.getElementById('btn-quick-ping');
  const quickPingStatus = document.getElementById('quick-ping-status');
  const quickPingIcon = document.getElementById('quick-ping-icon');

  // Tabs
  const tabProtect = document.getElementById('tab-protect');
  const tabHistory = document.getElementById('tab-history');
  const tabAbout = document.getElementById('tab-about');
  const historyBadge = document.getElementById('history-badge');

  const panelProtect = document.getElementById('panel-protect');
  const panelHistory = document.getElementById('panel-history');
  const panelAbout = document.getElementById('panel-about');

  // Creation Form Elements
  const createView = document.getElementById('create-view');
  const resultView = document.getElementById('result-view');
  const secretInput = document.getElementById('popup-secret');
  const detectionBadge = document.getElementById('detection-badge');
  const charCounter = document.getElementById('char-counter');
  const btnGenSecret = document.getElementById('btn-gen-secret');
  const btnPaste = document.getElementById('btn-paste-secret');
  const btnMask = document.getElementById('btn-mask-secret');
  const btnClearSecret = document.getElementById('btn-clear-secret');
  const selectTtl = document.getElementById('popup-ttl');
  const selectViews = document.getElementById('popup-views');
  const passphraseInput = document.getElementById('popup-passphrase');
  const btnToggleEye = document.getElementById('btn-toggle-eye');
  const btnGenPassphrase = document.getElementById('btn-gen-passphrase');
  const passStrengthContainer = document.getElementById('pass-strength-container');
  const passStrengthBar = document.getElementById('pass-strength-bar');
  const passStrengthText = document.getElementById('pass-strength-text');

  // Error Banner Elements
  const errorBox = document.getElementById('popup-error');
  const errorTitle = document.getElementById('error-title');
  const errorMessage = document.getElementById('error-message');
  const btnErrorRetry = document.getElementById('btn-error-retry');
  const btnErrorSwitch = document.getElementById('btn-error-switch');
  const btnErrorOffline = document.getElementById('btn-error-offline');

  // Action Buttons
  const btnCreate = document.getElementById('btn-create-vault');
  const btnCreateText = document.getElementById('btn-create-text');

  // Result Elements
  const linkOutput = document.getElementById('popup-link-output');
  const btnCopyLink = document.getElementById('btn-copy-popup-link');
  const copyBtnLabel = document.getElementById('copy-btn-label');
  const btnOpenLink = document.getElementById('btn-open-popup-link');
  const btnReset = document.getElementById('btn-reset-popup');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  const btnToggleQr = document.getElementById('btn-toggle-qr');
  const btnCopyFormatted = document.getElementById('btn-copy-formatted');
  const qrContainer = document.getElementById('qr-container');
  const qrFrame = document.getElementById('qr-frame');
  const resultModeTag = document.getElementById('result-mode-tag');
  const resultBurnTag = document.getElementById('result-burn-tag');

  // History Elements
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const historySearchInput = document.getElementById('history-search-input');

  // State
  let currentSettings = {
    serverUrl: 'http://localhost:3000',
    defaultTtlSeconds: 600,
    defaultMaxViews: 1,
    autoDetectSensitive: true
  };
  let qrInstance = null;
  let activeCreatedUrl = '';
  let healthPollTimer = null;
  let isMasked = false;
  let passVisible = false;

  // Initialize
  init();

  async function init() {
    setupTabSwitching();
    setupActions();
    setupTemplates();
    setupPassphraseStrength();
    setupSearchFilter();

    if (window.StorageManager) {
      currentSettings = await window.StorageManager.getSettings();
      if (selectTtl) selectTtl.value = String(currentSettings.defaultTtlSeconds || 600);
      if (selectViews) selectViews.value = String(currentSettings.defaultMaxViews || 1);
      if (quickServerInput) quickServerInput.value = currentSettings.serverUrl || 'http://localhost:3000';
    }

    await checkHealth();
    await loadHistory();

    // Auto-reconnect poll every 8 seconds if server is offline
    healthPollTimer = setInterval(() => {
      if (statusIndicator.classList.contains('offline')) {
        checkHealth(true);
      }
    }, 8000);
  }

  // Health Check
  async function checkHealth(silent = false) {
    if (!window.VaultApiClient) return;
    const targetUrl = currentSettings.serverUrl || 'http://localhost:3000';

    try {
      const health = await window.VaultApiClient.checkHealth(targetUrl);
      if (health.online) {
        statusIndicator.className = 'status-indicator-pill online';
        statusText.textContent = 'Vault Online';
        if (statusLatency) {
          statusLatency.textContent = `(${health.latencyMs}ms)`;
          statusLatency.classList.remove('hidden');
        }
        statusIndicator.title = `Connected to ${targetUrl} (${health.latencyMs}ms latency) • Click to configure`;
        // Hide error banner if it was a network error
        if (errorBox && !errorBox.classList.contains('hidden') && errorTitle.textContent.includes('Connection')) {
          hideError();
        }
      } else {
        markOffline(targetUrl);
      }
    } catch {
      markOffline(targetUrl);
    }
  }

  function markOffline(url) {
    statusIndicator.className = 'status-indicator-pill offline';
    statusText.textContent = 'Vault Offline';
    if (statusLatency) statusLatency.classList.add('hidden');
    statusIndicator.title = `Cannot reach ${url} • Click to reconnect or change server`;
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
          t.btn.setAttribute('aria-selected', 'false');
          t.panel.classList.remove('active');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        panel.classList.add('active');
        if (onOpen) onOpen();
      });
    });
  }

  function setupActions() {
    // Drawer toggles
    if (statusIndicator) {
      statusIndicator.addEventListener('click', toggleDrawer);
    }
    if (btnToggleServer) {
      btnToggleServer.addEventListener('click', toggleDrawer);
    }
    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', () => serverDrawer.classList.add('hidden'));
    }

    // Preset chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const url = chip.getAttribute('data-url');
        if (url && quickServerInput) {
          quickServerInput.value = url;
          testAndSaveQuickServer();
        }
      });
    });

    // Test & Save button
    if (btnQuickPing) {
      btnQuickPing.addEventListener('click', testAndSaveQuickServer);
    }

    // Open Options Page
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        if (chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open('../options/options.html');
        }
      });
    }

    // Mask / Peek
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

    // Clear secret button
    if (btnClearSecret) {
      btnClearSecret.addEventListener('click', () => {
        secretInput.value = '';
        updateCharCount();
        detectionBadge.classList.add('hidden');
        hideError();
        secretInput.focus();
      });
    }

    // Eye toggle for passphrase
    btnToggleEye.addEventListener('click', () => {
      passVisible = !passVisible;
      passphraseInput.type = passVisible ? 'text' : 'password';
      btnToggleEye.textContent = passVisible ? '🔒' : '👁';
    });

    // Generate random secret (24-char high-entropy string)
    if (btnGenSecret) {
      btnGenSecret.addEventListener('click', () => {
        const generated = generateSecureToken(24);
        secretInput.value = generated;
        updateCharCount();
        runSensitiveCheck(generated);
        secretInput.focus();
      });
    }

    // Generate random passphrase (16-char alphanumeric key)
    if (btnGenPassphrase) {
      btnGenPassphrase.addEventListener('click', () => {
        const generated = generatePassphraseToken(16);
        passphraseInput.value = generated;
        passphraseInput.type = 'text';
        btnToggleEye.textContent = '🔒';
        passVisible = true;
        evaluatePassphrase(generated);
      });
    }

    // Paste from clipboard
    btnPaste.addEventListener('click', async () => {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          secretInput.value = clipText;
          updateCharCount();
          runSensitiveCheck(clipText);
          secretInput.focus();
        }
      } catch (err) {
        showError('Clipboard permission required to paste.', 'Clipboard Error');
      }
    });

    // Live sensitive detection & char counter
    secretInput.addEventListener('input', () => {
      updateCharCount();
      runSensitiveCheck(secretInput.value);
    });

    // Create Vault Button
    btnCreate.addEventListener('click', handleCreateVault);

    // Error banner action buttons
    if (btnErrorRetry) {
      btnErrorRetry.addEventListener('click', () => {
        hideError();
        checkHealth().then(() => handleCreateVault());
      });
    }
    if (btnErrorSwitch) {
      btnErrorSwitch.addEventListener('click', () => {
        serverDrawer.classList.remove('hidden');
        quickServerInput.focus();
      });
    }
    if (btnErrorOffline) {
      btnErrorOffline.addEventListener('click', handleCreateOfflineVault);
    }

    // Copy Link Button
    btnCopyLink.addEventListener('click', async () => {
      if (!linkOutput.value) return;
      await navigator.clipboard.writeText(linkOutput.value);
      copyBtnLabel.textContent = '✓ Copied to Clipboard!';
      setTimeout(() => {
        copyBtnLabel.textContent = 'Copy Vault Link';
      }, 2200);
    });

    // Auto-select text on input click
    linkOutput.addEventListener('click', () => {
      linkOutput.select();
    });

    // Reset View Button
    btnReset.addEventListener('click', () => {
      secretInput.value = '';
      passphraseInput.value = '';
      updateCharCount();
      evaluatePassphrase('');
      detectionBadge.classList.add('hidden');
      if (qrContainer) qrContainer.classList.add('hidden');
      hideError();
      resultView.classList.add('hidden');
      createView.classList.remove('hidden');
      secretInput.focus();
    });

    // Toggle QR Code
    if (btnToggleQr && qrContainer && qrFrame) {
      btnToggleQr.addEventListener('click', () => {
        const isCurrentlyHidden = qrContainer.classList.contains('hidden');
        if (isCurrentlyHidden) {
          renderQrCode(activeCreatedUrl);
          qrContainer.classList.remove('hidden');
          btnToggleQr.style.borderColor = 'var(--cyan-accent)';
          btnToggleQr.style.color = '#ffffff';
        } else {
          qrContainer.classList.add('hidden');
          btnToggleQr.style.borderColor = '';
          btnToggleQr.style.color = '';
        }
      });
    }

    // 1-Click WhatsApp Share
    if (btnShareWhatsapp) {
      btnShareWhatsapp.addEventListener('click', () => {
        if (!activeCreatedUrl) return;
        const msg = encodeURIComponent(`🔐 Confidential Vault Link: ${activeCreatedUrl}\n(Self-destructs upon viewing)`);
        window.open(`https://wa.me/?text=${msg}`, '_blank');
      });
    }

    // Copy Formatted Message
    if (btnCopyFormatted) {
      btnCopyFormatted.addEventListener('click', async () => {
        if (!activeCreatedUrl) return;
        const formatted = `🔐 Confidential Secret Vault\nOpen link: ${activeCreatedUrl}\n⚠️ This secret was designed to disappear once viewed or expired.`;
        await navigator.clipboard.writeText(formatted);
        const originalText = btnCopyFormatted.querySelector('span:last-child').textContent;
        btnCopyFormatted.querySelector('span:last-child').textContent = '✓ Copied!';
        setTimeout(() => {
          btnCopyFormatted.querySelector('span:last-child').textContent = originalText;
        }, 2000);
      });
    }

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

  function toggleDrawer() {
    serverDrawer.classList.toggle('hidden');
    if (!serverDrawer.classList.contains('hidden')) {
      quickServerInput.value = currentSettings.serverUrl || 'http://localhost:3000';
      quickServerInput.focus();
    }
  }

  async function testAndSaveQuickServer() {
    const rawUrl = quickServerInput.value.trim() || 'http://localhost:3000';
    const cleanUrl = rawUrl.replace(/\/+$/, '');
    quickPingIcon.textContent = '⏳';
    quickPingStatus.textContent = `Connecting to ${cleanUrl}...`;
    quickPingStatus.style.color = '#94a3b8';

    try {
      const result = await window.VaultApiClient.checkHealth(cleanUrl);
      if (result.online) {
        quickPingIcon.textContent = '✓';
        quickPingStatus.textContent = `✓ Connected (${result.latencyMs}ms) • Saved as active vault`;
        quickPingStatus.style.color = '#34d399';

        currentSettings.serverUrl = cleanUrl;
        if (window.StorageManager) {
          await window.StorageManager.saveSettings({ serverUrl: cleanUrl });
        }

        checkHealth();
        setTimeout(() => {
          serverDrawer.classList.add('hidden');
        }, 1200);
      } else {
        quickPingIcon.textContent = '⚠';
        quickPingStatus.textContent = `⚠ Vault unreachable at ${cleanUrl}. Check port or start server.`;
        quickPingStatus.style.color = '#f87171';
        markOffline(cleanUrl);
      }
    } catch (err) {
      quickPingIcon.textContent = '⚠';
      quickPingStatus.textContent = `⚠ ${err.message}`;
      quickPingStatus.style.color = '#f87171';
      markOffline(cleanUrl);
    }
  }

  function setupTemplates() {
    document.querySelectorAll('.btn-template').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-template');
        let text = '';
        if (type === 'api') {
          text = `API_KEY=sk-live_${generateSecureToken(16)}\nAPI_SECRET=${generateSecureToken(24)}`;
        } else if (type === 'credentials') {
          text = `Username: admin\nPassword: ${generatePassphraseToken(14)}\nPortal: https://internal.company.com/login`;
        } else if (type === 'key') {
          text = `-----BEGIN PRIVATE KEY-----\n${generateSecureToken(40)}\n${generateSecureToken(40)}\n-----END PRIVATE KEY-----`;
        } else if (type === 'note') {
          text = `Confidential Note (${new Date().toLocaleDateString()}):\n- `;
        }
        secretInput.value = text;
        updateCharCount();
        runSensitiveCheck(text);
        secretInput.focus();
      });
    });
  }

  function setupPassphraseStrength() {
    passphraseInput.addEventListener('input', () => {
      evaluatePassphrase(passphraseInput.value);
    });
  }

  function evaluatePassphrase(value) {
    if (!value) {
      passStrengthContainer.classList.add('hidden');
      return;
    }

    passStrengthContainer.classList.remove('hidden');
    const len = value.length;
    let score = 0;
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    if (len < 8) {
      passStrengthBar.style.width = '20%';
      passStrengthBar.style.backgroundColor = '#ef4444';
      passStrengthText.textContent = 'Weak (minimum 8 characters)';
      passStrengthText.style.color = '#fca5a5';
    } else if (score <= 2) {
      passStrengthBar.style.width = '45%';
      passStrengthBar.style.backgroundColor = '#f59e0b';
      passStrengthText.textContent = 'Fair';
      passStrengthText.style.color = '#fbbf24';
    } else if (score <= 4) {
      passStrengthBar.style.width = '75%';
      passStrengthBar.style.backgroundColor = '#38bdf8';
      passStrengthText.textContent = 'Strong (AES-256)';
      passStrengthText.style.color = '#7dd3fc';
    } else {
      passStrengthBar.style.width = '100%';
      passStrengthBar.style.backgroundColor = '#10b981';
      passStrengthText.textContent = 'Military-Grade';
      passStrengthText.style.color = '#6ee7b7';
    }
  }

  function updateCharCount() {
    const text = secretInput.value;
    const len = text.length;
    charCounter.textContent = `${len} ${len === 1 ? 'char' : 'chars'}`;
  }

  function generateSecureToken(length = 24) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  function generatePassphraseToken(length = 16) {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%*';
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
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
      showError('Please enter secret text or credentials to protect.', 'Empty Secret');
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

      displayResult(result, false);
    } catch (err) {
      const isConnError = err.message && (
        err.message.includes('unreachable') ||
        err.message.includes('fetch') ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('Connection')
      );

      if (isConnError) {
        showError(
          `Vault server is currently offline or unreachable at ${currentSettings.serverUrl || 'http://localhost:3000'}. Start your server with 'npm start', change the URL, or click Encrypt Offline.`,
          'Vault Server Offline',
          true
        );
      } else {
        showError(err.message || 'Secret creation failed.', 'Creation Error');
      }
    } finally {
      btnCreate.disabled = false;
      btnCreateText.textContent = 'Create Secure Link';
    }
  }

  // Client-Side Offline Zero-Knowledge Fallback
  async function handleCreateOfflineVault() {
    const text = secretInput.value.trim();
    if (!text) {
      showError('Please enter secret text or credentials.', 'Empty Secret');
      return;
    }

    hideError();
    btnCreate.disabled = true;
    btnCreateText.textContent = 'Encrypting via Web Crypto...';

    try {
      const result = await window.VaultApiClient.createOfflineSecret({
        secret: text,
        passphrase: passphraseInput.value.trim(),
        serverUrl: currentSettings.serverUrl
      });

      if (window.StorageManager) {
        await window.StorageManager.addHistoryEntry({
          id: result.id,
          url: result.url,
          expires_at: result.expires_at,
          views_remaining: result.views_remaining,
          platform: 'Offline ZK Vault'
        });
      }

      displayResult(result, true);
    } catch (err) {
      showError(err.message || 'Offline encryption failed.', 'Encryption Error');
    } finally {
      btnCreate.disabled = false;
      btnCreateText.textContent = 'Create Secure Link';
    }
  }

  function displayResult(result, isOffline) {
    // Memory sanitize textarea
    secretInput.value = '';
    updateCharCount();

    activeCreatedUrl = result.url;
    linkOutput.value = result.url;
    btnOpenLink.href = result.url;

    if (isOffline) {
      resultModeTag.textContent = 'Zero-Knowledge Client Encryption (Offline)';
      resultBurnTag.textContent = '1-Time Client Decryption';
    } else {
      resultModeTag.textContent = 'AES-256-GCM Zero-Trace Vault';
      const views = selectViews.value;
      resultBurnTag.textContent = views === '1' ? 'Instant Burn (1 View)' : `${views} Views Allowed`;
    }

    createView.classList.add('hidden');
    resultView.classList.remove('hidden');
    loadHistory();
  }

  function renderQrCode(url) {
    if (!qrFrame || !url) return;
    qrFrame.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      try {
        qrInstance = new QRCode(qrFrame, {
          text: url,
          width: 140,
          height: 140,
          colorDark: '#0a0f24',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
        return;
      } catch (err) {
        console.warn('QRCode initialization error:', err);
      }
    }

    // Fallback if QRCode library is loading
    const canvas = document.createElement('canvas');
    canvas.width = 140;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0f24';
    ctx.fillRect(0, 0, 140, 140);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code Ready', 70, 70);
    qrFrame.appendChild(canvas);
  }

  function showError(msg, title = 'Error', showActions = false) {
    errorTitle.textContent = title;
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
    const actionsRow = errorBox.querySelector('.alert-actions-row');
    if (actionsRow) {
      actionsRow.style.display = showActions ? 'flex' : 'none';
    }
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBox.classList.add('hidden');
    errorMessage.textContent = '';
  }

  async function loadHistory() {
    if (!historyList || !window.StorageManager) return;
    const history = await window.StorageManager.getHistory();

    // Update count badge
    if (historyBadge) {
      if (history.length > 0) {
        historyBadge.textContent = String(history.length);
        historyBadge.classList.remove('hidden');
      } else {
        historyBadge.classList.add('hidden');
      }
    }

    renderHistoryItems(history);
  }

  function renderHistoryItems(items) {
    if (!items || !items.length) {
      historyList.innerHTML = '<div class="history-empty">No recent vaults. All created links will appear here safely (metadata only).</div>';
      return;
    }

    historyList.innerHTML = items.map((item) => {
      const createdDate = item.created_at ? formatTimeAgo(new Date(item.created_at)) : 'Recently';
      const expiresDate = item.expires_at ? new Date(item.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';

      return `
        <div class="history-card" data-id="${item.id}">
          <div class="history-top">
            <span class="history-id">${item.id}</span>
            <span class="history-meta">${item.platform || 'Direct'} • ${createdDate}</span>
          </div>
          <div class="history-meta">
            <span>Expires: ${expiresDate}</span> • <span>Views: ${item.views_remaining || 1}</span>
          </div>
          <div class="history-actions">
            <button type="button" class="btn-micro btn-copy-history" data-url="${item.url}">Copy Link</button>
            <a href="${item.url}" target="_blank" class="btn-micro" style="text-decoration:none;">Open</a>
            <button type="button" class="btn-micro-danger btn-delete-history" data-id="${item.id}" title="Remove entry">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach item listeners
    historyList.querySelectorAll('.btn-copy-history').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          await navigator.clipboard.writeText(url);
          btn.textContent = '✓ Copied';
          setTimeout(() => { btn.textContent = 'Copy Link'; }, 2000);
        }
      });
    });

    historyList.querySelectorAll('.btn-delete-history').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id && window.StorageManager && window.StorageManager.removeHistoryEntry) {
          await window.StorageManager.removeHistoryEntry(id);
          loadHistory();
        }
      });
    });
  }

  function setupSearchFilter() {
    if (!historySearchInput) return;
    historySearchInput.addEventListener('input', async () => {
      const query = historySearchInput.value.toLowerCase().trim();
      if (!window.StorageManager) return;
      const history = await window.StorageManager.getHistory();
      if (!query) {
        renderHistoryItems(history);
        return;
      }
      const filtered = history.filter(item =>
        (item.id && item.id.toLowerCase().includes(query)) ||
        (item.platform && item.platform.toLowerCase().includes(query)) ||
        (item.url && item.url.toLowerCase().includes(query))
      );
      renderHistoryItems(filtered);
    });
  }

  function formatTimeAgo(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

})();
