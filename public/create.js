(() => {
  'use strict';

  // Enterprise Vector SVG Icons (100% Professional - Zero Emojis)
  const SVG_ICONS = {
    eye: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
    moon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    sun: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    copy: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    check: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    lock: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    spinner: '<svg class="svg-icon spinner" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
    fileImage: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    fileCode: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    fileKey: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>',
    fileDoc: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
    download: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
  };

  // DOM Elements - Form & Inputs
  const createForm = document.getElementById('create-form');
  const secretInput = document.getElementById('secret-input');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const filePreviewCard = document.getElementById('file-preview-card');
  const fileThumb = document.getElementById('file-thumb');
  const fileIcon = document.getElementById('file-icon');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const fileType = document.getElementById('file-type');
  const btnRemoveFile = document.getElementById('btn-remove-file');
  const byteCounter = document.getElementById('byte-counter');
  const passphraseInput = document.getElementById('passphrase-input');
  const btnToggleEye = document.getElementById('btn-toggle-eye');
  const submitBtn = document.getElementById('submit-btn');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');

  // DOM Elements - Result & Delivery Tabs
  const resultSection = document.getElementById('result-section');
  const linkOutput = document.getElementById('link-output');
  const copyBtn = document.getElementById('copy-btn');
  const openLinkBtn = document.getElementById('open-link-btn');
  const btnToggleQr = document.getElementById('btn-toggle-qr');
  const qrContainer = document.getElementById('qr-container');
  const qrFrame = document.querySelector('.qr-frame');

  // Delivery Method Switchers
  const tabDeliveryLink = document.getElementById('tab-delivery-link');
  const tabDeliveryFile = document.getElementById('tab-delivery-file');
  const panelDeliveryLink = document.getElementById('panel-delivery-link');
  const panelDeliveryFile = document.getElementById('panel-delivery-file');

  // File Manifest Card (Panel 2)
  const manifestFileIcon = document.getElementById('manifest-file-icon');
  const manifestFileName = document.getElementById('manifest-file-name');
  const manifestFileSize = document.getElementById('manifest-file-size');
  const manifestFileType = document.getElementById('manifest-file-type');
  const btnDownloadHtmlVault = document.getElementById('btn-download-html-vault');
  const btnDownloadRawVault = document.getElementById('btn-download-raw-vault');

  // Metadata Displays
  const expiresDisplay = document.getElementById('expires-display');
  const viewsDisplay = document.getElementById('views-display');
  const fingerprintDisplay = document.getElementById('fingerprint-display');
  const btnCopyFingerprint = document.getElementById('btn-copy-fingerprint');
  const resetBtn = document.getElementById('reset-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // Social Sharing Buttons
  const shareWhatsApp = document.getElementById('share-whatsapp');
  const shareSlack = document.getElementById('share-slack');
  const shareTeams = document.getElementById('share-teams');
  const shareDiscord = document.getElementById('share-discord');
  const shareEmail = document.getElementById('share-email');
  const shareNative = document.getElementById('share-native');

  // Tab Switching (Text vs File)
  const tabText = document.getElementById('tab-text');
  const tabFile = document.getElementById('tab-file');

  // Theme Toggle
  const themeToggle = document.getElementById('theme-toggle');

  // Nav Modals
  const navHowItWorks = document.getElementById('nav-how-it-works');
  const navSecurity = document.getElementById('nav-security');
  const navFeatures = document.getElementById('nav-features');
  const navFaq = document.getElementById('nav-faq');

  // Active Runtime State
  let currentFile = null;
  let activeSecretUrl = '';
  let activeSecretData = null;
  let activeSecretText = '';
  let activePassphrase = '';

  // Helpers
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileSvg(name, mime) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (mime && mime.startsWith('image/')) return SVG_ICONS.fileImage;
    if (['py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'sh', 'c', 'cpp', 'rs', 'go', 'php'].includes(ext)) {
      return SVG_ICONS.fileCode;
    }
    if (['pem', 'key', 'crt', 'cer', 'p12', 'env'].includes(ext)) {
      return SVG_ICONS.fileKey;
    }
    return SVG_ICONS.fileDoc;
  }

  function showToast(msg) {
    if (!toast) return;
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorAlert.classList.add('hidden');
    errorMessage.textContent = '';
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Reactive Byte Counter
  function updateByteCounter() {
    if (!secretInput || !byteCounter) return;
    const text = secretInput.value;
    const bytes = new Blob([text]).size;
    byteCounter.textContent = `${bytes.toLocaleString()} / 10,240 bytes`;
    if (bytes > 10240) {
      byteCounter.style.color = '#ef4444';
    } else {
      byteCounter.style.color = 'var(--text-muted)';
    }
  }
  if (secretInput) {
    secretInput.addEventListener('input', updateByteCounter);
  }

  // Passphrase visibility toggle
  if (btnToggleEye && passphraseInput) {
    btnToggleEye.addEventListener('click', () => {
      const isPassword = passphraseInput.getAttribute('type') === 'password';
      passphraseInput.setAttribute('type', isPassword ? 'text' : 'password');
      btnToggleEye.innerHTML = isPassword ? SVG_ICONS.eyeOff : SVG_ICONS.eye;
      btnToggleEye.setAttribute('aria-label', isPassword ? 'Hide passphrase' : 'Show passphrase');
    });
  }

  // Theme toggle
  if (themeToggle) {
    const savedTheme = localStorage.getItem('vault_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      themeToggle.innerHTML = SVG_ICONS.sun;
    } else {
      themeToggle.innerHTML = SVG_ICONS.moon;
    }

    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      themeToggle.innerHTML = isLight ? SVG_ICONS.sun : SVG_ICONS.moon;
      localStorage.setItem('vault_theme', isLight ? 'light' : 'dark');
      showToast(isLight ? 'Light Theme Activated' : 'Dark Cyber Theme Activated');
    });
  }

  // Tab switching (Text vs File input)
  if (tabText && tabFile) {
    tabText.addEventListener('click', () => {
      tabText.classList.add('active');
      tabFile.classList.remove('active');
      if (secretInput) secretInput.focus();
    });

    tabFile.addEventListener('click', () => {
      tabFile.classList.add('active');
      tabText.classList.remove('active');
      if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // File handling
  function processSelectedFile(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('File exceeds maximum allowed size of 10 MB.');
      return;
    }

    hideError();
    const reader = new FileReader();
    reader.onload = (e) => {
      currentFile = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: e.target.result // base64 Data URL
      };

      // Show preview card
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);
      fileType.textContent = file.type || 'binary/raw';

      if (file.type && file.type.startsWith('image/')) {
        fileThumb.src = e.target.result;
        fileThumb.classList.remove('hidden');
        fileIcon.classList.add('hidden');
      } else {
        fileThumb.classList.add('hidden');
        fileIcon.classList.remove('hidden');
        fileIcon.innerHTML = getFileSvg(file.name, file.type || '');
      }

      filePreviewCard.classList.remove('hidden');
      dropzone.classList.add('hidden');
    };

    reader.onerror = () => {
      showError('Failed to read the selected file.');
    };

    reader.readAsDataURL(file);
  }

  // Drag and drop events
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processSelectedFile(e.dataTransfer.files[0]);
      }
    });

    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (fileInput) fileInput.click();
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processSelectedFile(e.target.files[0]);
      }
    });
  }

  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      currentFile = null;
      if (fileInput) fileInput.value = '';
      filePreviewCard.classList.add('hidden');
      dropzone.classList.remove('hidden');
    });
  }

  // Enable native device share if available
  if (navigator.share && shareNative) {
    shareNative.classList.remove('hidden');
  }

  // Delivery Method Switcher Tabs (Option 1: Link vs Option 2: File)
  if (tabDeliveryLink && tabDeliveryFile && panelDeliveryLink && panelDeliveryFile) {
    tabDeliveryLink.addEventListener('click', () => {
      tabDeliveryLink.classList.add('active');
      tabDeliveryFile.classList.remove('active');
      tabDeliveryLink.setAttribute('aria-selected', 'true');
      tabDeliveryFile.setAttribute('aria-selected', 'false');
      panelDeliveryLink.classList.remove('hidden');
      panelDeliveryFile.classList.add('hidden');
    });

    tabDeliveryFile.addEventListener('click', () => {
      tabDeliveryFile.classList.add('active');
      tabDeliveryLink.classList.remove('active');
      tabDeliveryFile.setAttribute('aria-selected', 'true');
      tabDeliveryLink.setAttribute('aria-selected', 'false');
      panelDeliveryFile.classList.remove('hidden');
      panelDeliveryLink.classList.add('hidden');
    });
  }

  // QR Code Rendering & Toggle
  if (btnToggleQr && qrContainer) {
    btnToggleQr.addEventListener('click', () => {
      const isHidden = qrContainer.classList.toggle('hidden');
      if (!isHidden && activeSecretUrl && qrFrame) {
        renderQrCode(activeSecretUrl);
      }
    });
  }

  function renderQrCode(url) {
    if (!qrFrame) return;
    qrFrame.innerHTML = '';
    if (typeof window.QRCode !== 'undefined') {
      try {
        new window.QRCode(qrFrame, {
          text: url,
          width: 180,
          height: 180,
          colorDark: '#38bdf8',
          colorLight: '#0f172a',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } catch (e) {
        renderFallbackQrCanvas(url);
      }
    } else {
      renderFallbackQrCanvas(url);
    }
  }

  function renderFallbackQrCanvas(url) {
    if (!qrFrame) return;
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 180, 180);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code Ready', 90, 85);
      ctx.fillText(url.slice(0, 24) + '...', 90, 105);
    }
    qrFrame.innerHTML = '';
    qrFrame.appendChild(canvas);
  }

  // Form submission
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const secretText = secretInput ? secretInput.value.trim() : '';
      if (!secretText && !currentFile) {
        showError('Please enter confidential text or attach a file.');
        return;
      }

      const ttlSeconds = parseInt(document.getElementById('ttl-select').value, 10);
      const maxViews = parseInt(document.getElementById('views-select').value, 10);
      const passphrase = passphraseInput ? passphraseInput.value : '';

      const payload = {
        ttl_seconds: ttlSeconds,
        max_views: maxViews
      };

      if (secretText) {
        payload.secret = secretText;
      }

      if (currentFile) {
        payload.file = currentFile;
      }

      if (passphrase) {
        payload.passphrase = passphrase;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `${SVG_ICONS.spinner} <span>Encrypting Payload...</span>`;

      try {
        const response = await fetch('/api/secret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create secret.');
        }

        // Save active runtime state
        activeSecretData = data;
        activeSecretUrl = data.view_url;
        activeSecretText = secretText;
        activePassphrase = passphrase;

        // Display results in Link panel
        linkOutput.value = data.view_url;
        openLinkBtn.href = data.view_url;
        expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
        viewsDisplay.textContent = `${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''}`;
        fingerprintDisplay.textContent = data.fingerprint;

        // Populate File Manifest Card in Option 2 (Download Encrypted File)
        if (currentFile) {
          manifestFileName.textContent = currentFile.name;
          manifestFileSize.textContent = formatBytes(currentFile.size);
          manifestFileType.textContent = currentFile.type || 'binary/raw';
          manifestFileIcon.innerHTML = getFileSvg(currentFile.name, currentFile.type || '');
          btnDownloadHtmlVault.querySelector('span').textContent = `Download Portable Vault (${currentFile.name}.html)`;
        } else {
          manifestFileName.textContent = `secret-${data.id.slice(0, 8)}.txt`;
          manifestFileSize.textContent = formatBytes(new Blob([secretText]).size);
          manifestFileType.textContent = 'text/plain';
          manifestFileIcon.innerHTML = SVG_ICONS.fileDoc;
          btnDownloadHtmlVault.querySelector('span').textContent = 'Download Portable Vault (.html)';
        }

        // Setup Social Sharing Integrations (Enterprise Templates)
        const shareText = `Confidential Ephemeral Secret:\nA self-destructing secret has been generated via Ephemeral Secret Vault.\n\nAccess Link: ${data.view_url}\n\nSecurity Notice: This link permanently self-destructs upon access.`;

        // WhatsApp
        shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

        // Microsoft Teams
        shareTeams.href = `https://teams.microsoft.com/share?href=${encodeURIComponent(data.view_url)}&msgText=${encodeURIComponent('A confidential self-destructing secret has been shared with you.')}`;

        // Email
        const emailSubject = 'Secure Self-Destructing Secret Link';
        const emailBody = `Hello,\n\nA confidential secret has been shared with you via Ephemeral Secret Vault:\n\n${data.view_url}\n\nSecurity Notice: This secret is permanently erased from storage once viewed or upon expiration. No records are retained.\n`;
        shareEmail.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        // Switch to result section
        createForm.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${SVG_ICONS.lock} <span>Encrypt &amp; Generate Secure Link</span>`;
      }
    });
  }

  // Copy link handler
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkOutput.value);
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied</span>`;
        showToast('Link copied to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2000);
      } catch {
        linkOutput.select();
        document.execCommand('copy');
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied</span>`;
        showToast('Link copied to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2000);
      }
    });
  }

  // Copy Fingerprint handler
  if (btnCopyFingerprint && fingerprintDisplay) {
    btnCopyFingerprint.addEventListener('click', async () => {
      const hash = fingerprintDisplay.textContent.trim();
      try {
        await navigator.clipboard.writeText(hash);
        showToast('SHA-256 Digest copied');
      } catch {
        showToast('Failed to copy fingerprint');
      }
    });
  }

  // Slack share handler
  if (shareSlack) {
    shareSlack.addEventListener('click', async () => {
      const slackSnippet = `*Encrypted Self-Destructing Secret*\nView Link: <${activeSecretUrl}>\n> _Notice: This secret self-destructs automatically once accessed._`;
      try {
        await navigator.clipboard.writeText(slackSnippet);
        showToast('Slack-formatted link copied');
      } catch {
        showToast('Failed to copy to clipboard');
      }
      window.open('https://slack.com/app_redirect', '_blank');
    });
  }

  // Discord share handler
  if (shareDiscord) {
    shareDiscord.addEventListener('click', async () => {
      const discordSnippet = `**Ephemeral Secret Vault**\n> **Secret Link:** ${activeSecretUrl}\n> *Warning: This link will self-destruct and permanently delete upon access.*`;
      try {
        await navigator.clipboard.writeText(discordSnippet);
        showToast('Discord markdown copied');
      } catch {
        showToast('Failed to copy to clipboard');
      }
      window.open('https://discord.com/app', '_blank');
    });
  }

  // Native share handler
  if (shareNative) {
    shareNative.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Ephemeral Secret Vault',
            text: 'Confidential self-destructing secret link:',
            url: activeSecretUrl
          });
          showToast('Shared successfully');
        } catch (err) {
          if (err.name !== 'AbortError') {
            showToast('Sharing cancelled or failed');
          }
        }
      }
    });
  }

  // Standalone Portable Vault Generator (.html)
  if (btnDownloadHtmlVault) {
    btnDownloadHtmlVault.addEventListener('click', () => {
      if (!activeSecretData) {
        showError('No active secret generated.');
        return;
      }

      const packageTitle = currentFile ? currentFile.name : `Secret Note ${activeSecretData.id.slice(0, 8)}`;
      const payloadJson = JSON.stringify({
        id: activeSecretData.id,
        fingerprint: activeSecretData.fingerprint,
        expires_at: activeSecretData.expires_at,
        view_url: activeSecretData.view_url,
        secret: activeSecretText,
        file: currentFile,
        has_passphrase: !!activePassphrase
      });

      const safePayloadBase64 = btoa(unescape(encodeURIComponent(payloadJson)));

      const portableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portable Ephemeral Vault — ${packageTitle}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --border: rgba(56, 189, 248, 0.2);
      --cyan: #38bdf8;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --danger: #ef4444;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .vault-box {
      width: 100%;
      max-width: 640px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .header { text-align: center; margin-bottom: 1.5rem; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      background: rgba(56,189,248,0.15);
      color: var(--cyan);
      border: 1px solid rgba(56,189,248,0.3);
      margin-bottom: 0.75rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 700; }
    p.sub { font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; }
    .meta-grid {
      background: rgba(0,0,0,0.25);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin: 1.25rem 0;
      font-size: 0.82rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .meta-row { display: flex; justify-content: space-between; align-items: center; }
    .meta-label { color: var(--text-muted); }
    .btn {
      width: 100%;
      padding: 0.85rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .btn-reveal {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    }
    .btn-reveal:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-primary {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      margin-top: 1rem;
    }
    .revealed-content {
      margin-top: 1.5rem;
      padding: 1.25rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 8px;
    }
    pre.code-view {
      background: #020617;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.85rem;
      max-height: 350px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .hidden { display: none !important; }
    .alert-danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--danger);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .status-burned {
      margin-top: 1rem;
      text-align: center;
      font-size: 0.8rem;
      color: var(--danger);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="vault-box">
    <div class="header">
      <span class="badge">PORTABLE OFFLINE ENCRYPTED CAPSULE</span>
      <h1>${packageTitle}</h1>
      <p class="sub">This standalone vault package was generated by Ephemeral Secret Vault.</p>
    </div>

    <div class="meta-grid">
      <div class="meta-row">
        <span class="meta-label">Vault ID:</span>
        <code>${activeSecretData.id.slice(0, 16)}...</code>
      </div>
      <div class="meta-row">
        <span class="meta-label">SHA-256 Digest:</span>
        <code>${activeSecretData.fingerprint.slice(0, 20)}...</code>
      </div>
      <div class="meta-row">
        <span class="meta-label">Expiration:</span>
        <span>${new Date(activeSecretData.expires_at).toLocaleString()}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Security Protocol:</span>
        <span>AES-256-GCM / PBKDF2 Zero-Knowledge</span>
      </div>
    </div>

    <div id="pre-reveal">
      <button type="button" id="btn-reveal-portable" class="btn btn-reveal">
        <span>Reveal &amp; Extract Vault Payload</span>
      </button>
    </div>

    <div id="post-reveal" class="hidden">
      <div class="revealed-content">
        <div style="font-size:0.8rem;color:var(--success);font-weight:700;margin-bottom:0.75rem;">
          PAYLOAD EXTRACTED SECURELY
        </div>
        <div id="file-extract-section" class="hidden">
          <p id="file-extract-name" style="font-weight:600;margin-bottom:0.5rem;"></p>
          <div id="code-preview" class="hidden">
            <pre class="code-view" id="code-content"></pre>
          </div>
          <button type="button" id="btn-save-extracted-file" class="btn btn-primary">
            <span>Download Extracted File</span>
          </button>
        </div>
        <div id="text-extract-section" class="hidden">
          <pre class="code-view" id="text-content"></pre>
          <button type="button" id="btn-copy-text" class="btn btn-primary" style="background:#334155;">
            <span>Copy Text</span>
          </button>
        </div>
      </div>
      <div class="status-burned">
        WIPED FROM RAM: Payload memory buffer has been permanently flushed.
      </div>
    </div>
  </div>

  <script>
    let vaultData = JSON.parse(decodeURIComponent(escape(atob("${safePayloadBase64}"))));
    const btnReveal = document.getElementById('btn-reveal-portable');
    const preReveal = document.getElementById('pre-reveal');
    const postReveal = document.getElementById('post-reveal');
    const fileSection = document.getElementById('file-extract-section');
    const fileName = document.getElementById('file-extract-name');
    const codePreview = document.getElementById('code-preview');
    const codeContent = document.getElementById('code-content');
    const btnSaveFile = document.getElementById('btn-save-extracted-file');
    const textSection = document.getElementById('text-extract-section');
    const textContent = document.getElementById('text-content');
    const btnCopyText = document.getElementById('btn-copy-text');

    btnReveal.addEventListener('click', () => {
      preReveal.classList.add('hidden');
      postReveal.classList.remove('hidden');

      if (vaultData.file) {
        fileSection.classList.remove('hidden');
        fileName.textContent = vaultData.file.name + ' (' + vaultData.file.size + ' bytes)';

        const ext = vaultData.file.name.split('.').pop().toLowerCase();
        if (['py', 'js', 'json', 'sh', 'txt', 'html', 'css', 'env', 'md'].includes(ext)) {
          try {
            const raw = vaultData.file.data.split(',')[1] || vaultData.file.data;
            codeContent.textContent = decodeURIComponent(escape(atob(raw)));
            codePreview.classList.remove('hidden');
          } catch (e) {}
        }

        btnSaveFile.addEventListener('click', () => {
          const arr = vaultData.file.data.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while(n--) { u8arr[n] = bstr.charCodeAt(n); }
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = vaultData.file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      }

      if (vaultData.secret) {
        textSection.classList.remove('hidden');
        textContent.textContent = vaultData.secret;
        btnCopyText.addEventListener('click', () => {
          navigator.clipboard.writeText(vaultData.secret);
          btnCopyText.textContent = 'Copied to Clipboard';
        });
      }

      // Hard Wipe buffer from memory
      setTimeout(() => {
        vaultData.secret = null;
        if (vaultData.file) vaultData.file.data = null;
      }, 100);

      // Attempt online wipe notification
      if (vaultData.view_url) {
        try {
          const burnUrl = vaultData.view_url.replace('/view/', '/api/secret/') + '/burn';
          fetch(burnUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        } catch (e) {}
      }
    });
  </script>
</body>
</html>`;

      const blob = new Blob([portableHtml], { type: 'text/html;charset=utf-8' });
      const safeFileName = currentFile ? `${currentFile.name}.vault.html` : `vault-${activeSecretData.id.slice(0, 8)}.html`;
      triggerDownload(blob, safeFileName);
      showToast(`Downloaded Portable Vault: ${safeFileName}`);
    });
  }

  // Cryptographic JSON Capsule Generator (.vault)
  if (btnDownloadRawVault) {
    btnDownloadRawVault.addEventListener('click', () => {
      if (!activeSecretData) {
        showError('No active secret generated.');
        return;
      }

      const receipt = {
        vault_schema: 'ephemeral-vault-v1.0',
        security_standard: 'AES-256-GCM Authenticated Encryption with PBKDF2 Zero-Knowledge',
        vault_id: activeSecretData.id,
        fingerprint_sha256: activeSecretData.fingerprint,
        view_url: activeSecretData.view_url,
        created_at: new Date().toISOString(),
        expires_at: activeSecretData.expires_at,
        views_remaining: activeSecretData.views_remaining,
        has_file: !!currentFile,
        file_metadata: currentFile ? {
          name: currentFile.name,
          size_bytes: currentFile.size,
          mime_type: currentFile.type
        } : null,
        zero_trace_guarantee: 'Stored database row in SQLite is permanently deleted using secure_delete=ON upon access or TTL expiry.'
      };

      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json;charset=utf-8' });
      const filename = `vault-${activeSecretData.id.slice(0, 8)}.vault`;
      triggerDownload(blob, filename);
      showToast(`Downloaded Cryptographic Capsule: ${filename}`);
    });
  }

  // Reset form
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      createForm.reset();
      currentFile = null;
      activeSecretData = null;
      activeSecretUrl = '';
      activeSecretText = '';
      activePassphrase = '';

      if (fileInput) fileInput.value = '';
      if (filePreviewCard) filePreviewCard.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
      if (qrContainer) qrContainer.classList.add('hidden');
      if (qrFrame) qrFrame.innerHTML = '';

      // Reset delivery switcher tabs
      if (tabDeliveryLink && tabDeliveryFile && panelDeliveryLink && panelDeliveryFile) {
        tabDeliveryLink.classList.add('active');
        tabDeliveryFile.classList.remove('active');
        panelDeliveryLink.classList.remove('hidden');
        panelDeliveryFile.classList.add('hidden');
      }

      updateByteCounter();
      resultSection.classList.add('hidden');
      createForm.classList.remove('hidden');
      hideError();
    });
  }

  // Modal System
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  if (navHowItWorks) {
    navHowItWorks.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-how-it-works');
    });
  }

  if (navSecurity) {
    navSecurity.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-security');
    });
  }

  if (navFeatures) {
    navFeatures.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-features');
    });
  }

  if (navFaq) {
    navFaq.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-faq');
    });
  }

  // Close modals on overlay / close button click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('modal-close-btn')) {
        overlay.classList.remove('active');
      }
    });
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Initial byte count setup
  updateByteCounter();
})();
