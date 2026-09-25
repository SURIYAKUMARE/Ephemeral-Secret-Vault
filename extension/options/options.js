/**
 * Ephemeral Secret Vault — Options Script
 */

(function () {
  'use strict';

  const inputServerUrl = document.getElementById('setting-server-url');
  const btnTestConnection = document.getElementById('btn-test-connection');
  const connectionStatus = document.getElementById('connection-status');
  const selectDefaultTtl = document.getElementById('setting-default-ttl');
  const selectDefaultViews = document.getElementById('setting-default-views');
  const checkAutoDetect = document.getElementById('setting-auto-detect');

  // Integrations checkboxes
  const intWhatsApp = document.getElementById('int-whatsapp');
  const intGmail = document.getElementById('int-gmail');
  const intOutlook = document.getElementById('int-outlook');
  const intSlack = document.getElementById('int-slack');
  const intDiscord = document.getElementById('int-discord');
  const intTeams = document.getElementById('int-teams');
  const intTelegram = document.getElementById('int-telegram');

  const btnSave = document.getElementById('btn-save-settings');
  const btnReset = document.getElementById('btn-reset-defaults');
  const saveStatus = document.getElementById('save-status');

  init();

  async function init() {
    if (!window.StorageManager) return;
    const settings = await window.StorageManager.getSettings();

    inputServerUrl.value = settings.serverUrl || 'http://localhost:3000';
    selectDefaultTtl.value = String(settings.defaultTtlSeconds || 600);
    selectDefaultViews.value = String(settings.defaultMaxViews || 1);
    checkAutoDetect.checked = settings.autoDetectSensitive !== false;

    const ints = settings.integrations || {};
    intWhatsApp.checked = ints.whatsapp !== false;
    intGmail.checked = ints.gmail !== false;
    intOutlook.checked = ints.outlook !== false;
    intSlack.checked = ints.slack !== false;
    intDiscord.checked = ints.discord !== false;
    intTeams.checked = ints.teams !== false;
    intTelegram.checked = ints.telegram !== false;

    // Test connection on load
    testConnection();

    // Event listeners
    btnTestConnection.addEventListener('click', testConnection);
    btnSave.addEventListener('click', saveSettings);
    btnReset.addEventListener('click', resetDefaults);
  }

  async function testConnection() {
    const url = inputServerUrl.value.trim() || 'http://localhost:3000';
    connectionStatus.textContent = 'Testing connection to ' + url + '...';
    connectionStatus.style.color = '#94a3b8';

    try {
      const result = await window.VaultApiClient.checkHealth(url);
      if (result.online) {
        connectionStatus.textContent = `✓ Connected to Ephemeral Secret Vault API (${result.latencyMs}ms) • Status: ${result.status}`;
        connectionStatus.style.color = '#34d399';
      } else {
        connectionStatus.textContent = `⚠ Could not connect to vault at ${url} (${result.status})`;
        connectionStatus.style.color = '#f87171';
      }
    } catch (err) {
      connectionStatus.textContent = `⚠ Connection error: ${err.message}`;
      connectionStatus.style.color = '#f87171';
    }
  }

  async function saveSettings() {
    const newSettings = {
      serverUrl: inputServerUrl.value.trim() || 'http://localhost:3000',
      defaultTtlSeconds: parseInt(selectDefaultTtl.value, 10) || 600,
      defaultMaxViews: parseInt(selectDefaultViews.value, 10) || 1,
      autoDetectSensitive: checkAutoDetect.checked,
      integrations: {
        whatsapp: intWhatsApp.checked,
        gmail: intGmail.checked,
        outlook: intOutlook.checked,
        slack: intSlack.checked,
        discord: intDiscord.checked,
        teams: intTeams.checked,
        telegram: intTelegram.checked
      }
    };

    await window.StorageManager.saveSettings(newSettings);

    saveStatus.classList.remove('hidden');
    setTimeout(() => {
      saveStatus.classList.add('hidden');
    }, 2800);
  }

  async function resetDefaults() {
    const defaults = window.StorageManager.DEFAULT_SETTINGS;
    inputServerUrl.value = defaults.serverUrl;
    selectDefaultTtl.value = String(defaults.defaultTtlSeconds);
    selectDefaultViews.value = String(defaults.defaultMaxViews);
    checkAutoDetect.checked = defaults.autoDetectSensitive;

    intWhatsApp.checked = true;
    intGmail.checked = true;
    intOutlook.checked = true;
    intSlack.checked = true;
    intDiscord.checked = true;
    intTeams.checked = true;
    intTelegram.checked = true;

    await window.StorageManager.saveSettings(defaults);
    testConnection();

    saveStatus.textContent = '✓ Reset to default settings';
    saveStatus.classList.remove('hidden');
    setTimeout(() => {
      saveStatus.textContent = '✓ Settings saved successfully';
      saveStatus.classList.add('hidden');
    }, 2800);
  }
})();
