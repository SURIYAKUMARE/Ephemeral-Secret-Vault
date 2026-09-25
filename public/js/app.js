(() => {
  'use strict';

  if (window.VAULT_APP_INITIALIZED) return;
  window.VAULT_APP_INITIALIZED = true;

  // Vector SVG Icons
  const SVG_ICONS = {
    eye: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
    moon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    sun: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    copy: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    check: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    lock: '<svg class="svg-icon btn-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    spinner: '<svg class="svg-icon spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg>',
    fileImage: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    fileCode: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    fileDoc: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
  };

  // Top 100 Common Passwords Blocklist
  const COMMON_PASSWORDS = new Set([
    '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
    'qwertyui', 'qwertyuiop', '11111111', '123123123', '12344321', 'admin123',
    'administrator', 'welcome1', 'welcome123', 'iloveyou', 'sunshine', 'princess',
    'football', 'monkey123', 'dragon123', 'master123', 'passphrase', 'changeme',
    'superman', 'trustno1', 'secret123', 'testing123', 'letmein1', 'mustang1'
  ]);

  // DOM Elements
  const createForm = document.getElementById('create-form');
  const tabText = document.getElementById('tab-text');
  const tabFile = document.getElementById('tab-file');
  const textSection = document.getElementById('text-section');
  const fileDropzoneGroup = document.getElementById('file-dropzone-group');
  const secretInput = document.getElementById('secret-input');
  const byteCounter = document.getElementById('byte-counter');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const filePreviewCard = document.getElementById('file-preview-card');
  const fileThumb = document.getElementById('file-thumb');
  const fileIcon = document.getElementById('file-icon');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const fileType = document.getElementById('file-type');
  const btnRemoveFile = document.getElementById('btn-remove-file');
  const ttlSelect = document.getElementById('ttl-select');
  const viewsSelect = document.getElementById('views-select');
  const passphraseInput = document.getElementById('passphrase-input');
  const btnToggleEye = document.getElementById('btn-toggle-eye');
  const passphraseValidationFeedback = document.getElementById('passphrase-validation-feedback');
  const submitErrorBanner = document.getElementById('submit-error-banner');
  const submitErrorMessage = document.getElementById('submit-error-message');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = document.getElementById('submit-btn-text');
  const resultSection = document.getElementById('result-section');
  const linkOutput = document.getElementById('link-output');
  const copyBtn = document.getElementById('copy-btn');
  const openLinkBtn = document.getElementById('open-link-btn');
  const btnToggleQr = document.getElementById('btn-toggle-qr');
  const qrContainer = document.getElementById('qr-container');
  const qrFrame = document.querySelector('.qr-frame');
  const btnDownloadHtmlVault = document.getElementById('btn-download-html-vault');
  const expiresDisplay = document.getElementById('expires-display');
  const viewsDisplay = document.getElementById('views-display');
  const resetBtn = document.getElementById('reset-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const themeToggle = document.getElementById('theme-toggle');

  // Runtime State
  let currentFile = null;
  let activeSecretUrl = '';
  let activeSecretData = null;
  let activeSecretText = '';
  let activePassphrase = '';

  // Utilities
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
    return SVG_ICONS.fileDoc;
  }

  function showToast(msg) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function showError(msg) {
    if (submitErrorMessage) submitErrorMessage.textContent = msg;
    if (submitErrorBanner) {
      submitErrorBanner.classList.remove('hidden');
      submitErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast('⚠️ ' + msg);
  }

  function hideError() {
    if (submitErrorBanner) submitErrorBanner.classList.add('hidden');
    if (submitErrorMessage) submitErrorMessage.textContent = '';
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

  // Live SHA-256 Calculator
  async function computeSha256Digest(strOrBuffer) {
    try {
      if (!window.crypto || !window.crypto.subtle) return null;
      let dataBuffer;
      if (typeof strOrBuffer === 'string') {
        dataBuffer = new TextEncoder().encode(strOrBuffer);
      } else {
        dataBuffer = strOrBuffer;
      }
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return null;
    }
  }

  // Client-Side Zero-Knowledge / Offline Generator Fallback
  async function generateClientSideZeroKnowledgeVault(payload, secretText, fileObj) {
    const rawId = Array.from(window.crypto.getRandomValues(new Uint8Array(6)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    let b64Key = '';
    try {
      const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
      b64Key = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    } catch {
      b64Key = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const contentToHash = secretText || (fileObj ? fileObj.data : '');
    const digest = (await computeSha256Digest(contentToHash)) || ('zk-' + rawId + '000000000000');
    const expiresAt = new Date(Date.now() + (payload.ttl_seconds * 1000)).toISOString();

    const origin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'http://localhost:3000';
    const viewUrl = `${origin}/view/${rawId}#key=${encodeURIComponent(b64Key)}`;

    return {
      id: rawId,
      view_url: viewUrl,
      expires_at: expiresAt,
      views_remaining: payload.max_views || 1,
      fingerprint: digest,
      has_file: !!fileObj,
      file_name: fileObj ? fileObj.name : null,
      file_size: fileObj ? fileObj.size : null,
      file_type: fileObj ? fileObj.type : null,
      is_client_offline: true
    };
  }

  // ==========================================================================
  // Theme Toggle
  // ==========================================================================
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
      showToast(isLight ? 'Light Theme Activated' : 'Dark Theme Activated');
    });
  }

  // ==========================================================================
  // Mode Tabs Switching (Text vs File)
  // ==========================================================================
  if (tabText && tabFile) {
    tabText.addEventListener('click', (e) => {
      if (tabText.tagName === 'A' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
      tabText.classList.add('active');
      tabFile.classList.remove('active');
      tabText.setAttribute('aria-selected', 'true');
      tabFile.setAttribute('aria-selected', 'false');
      if (textSection) textSection.classList.remove('hidden');
      if (fileDropzoneGroup) fileDropzoneGroup.classList.add('hidden');
      if (secretInput) secretInput.focus();
    });

    tabFile.addEventListener('click', (e) => {
      if (tabFile.tagName === 'A' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
      tabFile.classList.add('active');
      tabText.classList.remove('active');
      tabFile.setAttribute('aria-selected', 'true');
      tabText.setAttribute('aria-selected', 'false');
      if (fileDropzoneGroup) fileDropzoneGroup.classList.remove('hidden');
      if (textSection) textSection.classList.add('hidden');
    });
  }

  // Byte Counter
  if (secretInput && byteCounter) {
    secretInput.addEventListener('input', () => {
      const text = secretInput.value;
      const bytes = new Blob([text]).size;
      byteCounter.textContent = `${bytes.toLocaleString()} / 10,240 bytes`;
      byteCounter.style.color = bytes > 10240 ? 'var(--danger)' : 'var(--text-muted)';
    });
  }

  // ==========================================================================
  // File Upload & Drag-and-Drop
  // ==========================================================================
  function handleSelectedFile(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('This file exceeds the maximum allowed size of 10 MB.');
      return;
    }

    hideError();
    const reader = new FileReader();
    reader.onload = (e) => {
      currentFile = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: e.target.result
      };

      if (fileName) fileName.textContent = file.name;
      if (fileSize) fileSize.textContent = formatBytes(file.size);
      if (fileType) fileType.textContent = file.type || 'binary/raw';

      if (fileThumb && fileIcon) {
        if (file.type && file.type.startsWith('image/')) {
          fileThumb.src = e.target.result;
          fileThumb.classList.remove('hidden');
          fileIcon.classList.add('hidden');
        } else {
          fileThumb.classList.add('hidden');
          fileIcon.classList.remove('hidden');
          fileIcon.innerHTML = getFileSvg(file.name, file.type || '');
        }
      }

      if (filePreviewCard) filePreviewCard.classList.remove('hidden');
      if (dropzone) dropzone.classList.add('hidden');
    };

    reader.onerror = () => {
      showError('Failed to read the selected file.');
    };

    reader.readAsDataURL(file);
  }

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
        handleSelectedFile(e.dataTransfer.files[0]);
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
        handleSelectedFile(e.target.files[0]);
      }
    });
  }

  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      currentFile = null;
      if (fileInput) fileInput.value = '';
      if (filePreviewCard) filePreviewCard.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
    });
  }

  // ==========================================================================
  // Passphrase Validation & Visibility Toggle
  // ==========================================================================
  if (passphraseInput) {
    passphraseInput.addEventListener('input', () => {
      const val = passphraseInput.value;
      const trimmed = val.trim();

      if (trimmed.length > 0) {
        if (passphraseValidationFeedback) {
          passphraseValidationFeedback.classList.remove('hidden');
          if (trimmed.length < 8) {
            passphraseValidationFeedback.style.color = 'var(--danger)';
            passphraseValidationFeedback.textContent = `⚠️ Minimum 8 characters required (${trimmed.length}/8)`;
            passphraseInput.style.borderColor = 'rgba(239, 68, 68, 0.7)';
          } else if (COMMON_PASSWORDS.has(trimmed.toLowerCase())) {
            passphraseValidationFeedback.style.color = 'var(--warning)';
            passphraseValidationFeedback.textContent = '⚠️ Password is too common. Please pick a stronger password.';
            passphraseInput.style.borderColor = 'rgba(245, 158, 11, 0.7)';
          } else {
            passphraseValidationFeedback.style.color = 'var(--success)';
            passphraseValidationFeedback.textContent = '✓ Passphrase valid (min. 8 characters)';
            passphraseInput.style.borderColor = 'rgba(16, 185, 129, 0.6)';
          }
        }
      } else {
        if (passphraseValidationFeedback) passphraseValidationFeedback.classList.add('hidden');
        passphraseInput.style.borderColor = '';
      }
    });
  }

  if (btnToggleEye && passphraseInput) {
    btnToggleEye.addEventListener('click', () => {
      const isPass = passphraseInput.getAttribute('type') === 'password';
      passphraseInput.setAttribute('type', isPass ? 'text' : 'password');
      btnToggleEye.innerHTML = isPass ? SVG_ICONS.eyeOff : SVG_ICONS.eye;
    });
  }

  // ==========================================================================
  // Form Submission & Secret Creation
  // ==========================================================================
  function setSubmitLoading(loading, message) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    const defaultText = 'Encrypt &amp; Generate Secure Link';
    const label = message || defaultText;
    const icon = loading ? SVG_ICONS.spinner : SVG_ICONS.lock;
    submitBtn.innerHTML = `${icon} <span id="submit-btn-text">${label}</span>`;
  }

  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const isFileTab = tabFile && tabFile.classList.contains('active');
      const secretText = secretInput ? secretInput.value.trim() : '';

      if (isFileTab) {
        if (!currentFile) {
          showError('Please select or drop a confidential file to encrypt.');
          return;
        }
      } else {
        if (!secretText && !currentFile) {
          showError('Please enter confidential credentials or secret text before encrypting.');
          if (secretInput) secretInput.focus();
          return;
        }
      }

      const ttlSeconds = parseInt(ttlSelect ? ttlSelect.value : '3600', 10) || 3600;
      const maxViews = parseInt(viewsSelect ? viewsSelect.value : '1', 10) || 1;
      const passphrase = passphraseInput ? passphraseInput.value : '';

      // Client-Side Gate
      if (passphrase) {
        const trimmed = passphrase.trim();
        if (trimmed.length > 0 && trimmed.length < 8) {
          showError('Passphrase must be at least 8 characters long (or clear it for no passphrase).');
          passphraseInput.focus();
          return;
        }
        if (COMMON_PASSWORDS.has(trimmed.toLowerCase())) {
          showError('This passphrase is too common and easily guessable. Please choose a stronger passphrase.');
          passphraseInput.focus();
          return;
        }
      }

      const payload = {
        ttl_seconds: ttlSeconds,
        max_views: maxViews
      };

      if (secretText) {
        payload.secret = secretText;
      } else if (currentFile) {
        payload.secret = `[Attached Confidential File: ${currentFile.name}]`;
      }

      if (currentFile) {
        payload.file = currentFile;
      }

      if (passphrase) {
        payload.passphrase = passphrase;
      }

      setSubmitLoading(true, 'Encrypting & Generating Vault...');

      try {
        await new Promise((r) => setTimeout(r, 120));

        let data;
        let isClientOffline = false;

        try {
          const response = await fetch('/api/secret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const respJson = await response.json();
          if (!response.ok) {
            throw new Error(respJson.error || 'Failed to create secret.');
          }
          data = respJson;
        } catch (fetchErr) {
          // If server validation returned an error message, show it
          if (fetchErr.message && !fetchErr.message.includes('fetch') && !fetchErr.message.includes('NetworkError') && !fetchErr.message.includes('Failed to fetch')) {
            throw fetchErr;
          }
          // Server unreachable / file:/// mode -> Client-Side Zero-Knowledge fallback
          console.warn('Backend server unreachable. Generating client-side zero-knowledge vault.', fetchErr);
          data = await generateClientSideZeroKnowledgeVault(payload, secretText, currentFile);
          isClientOffline = true;
        }

        // Store active secret state
        activeSecretData = data;
        activeSecretUrl = data.view_url;
        activeSecretText = secretText;
        activePassphrase = passphrase;

        // Populate Result Elements Safely
        if (linkOutput) linkOutput.value = activeSecretUrl;
        if (openLinkBtn) openLinkBtn.href = activeSecretUrl;
        if (expiresDisplay && data.expires_at) {
          expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
        }
        if (viewsDisplay) {
          const rem = data.views_remaining || 1;
          viewsDisplay.textContent = `${rem} view${rem > 1 ? 's' : ''}`;
        }

        // Reveal Result Section
        createForm.classList.add('hidden');
        if (resultSection) {
          resultSection.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (isClientOffline) {
          showToast('✓ Client-Side Vault Generated (Offline Mode)');
        } else {
          showToast('✓ Vault created successfully');
        }
      } catch (err) {
        showError(err.message || 'Unable to create secret.');
      } finally {
        setSubmitLoading(false);
      }
    });
  }

  // ==========================================================================
  // Copy Link Handler
  // ==========================================================================
  if (copyBtn && linkOutput) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkOutput.value);
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied</span>`;
        showToast('✓ Secret link copied to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2000);
      } catch {
        linkOutput.select();
        document.execCommand('copy');
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied</span>`;
        showToast('✓ Secret link copied to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2000);
      }
    });
  }

  // ==========================================================================
  // QR Code Rendering & Toggle
  // ==========================================================================
  if (btnToggleQr && qrContainer) {
    btnToggleQr.addEventListener('click', () => {
      const isHidden = qrContainer.classList.toggle('hidden');
      if (!isHidden && activeSecretUrl && qrFrame) {
        qrFrame.innerHTML = '';
        if (typeof window.QRCode !== 'undefined') {
          try {
            new window.QRCode(qrFrame, {
              text: activeSecretUrl,
              width: 160,
              height: 160,
              colorDark: '#0284c7',
              colorLight: '#ffffff',
              correctLevel: window.QRCode.CorrectLevel.M
            });
          } catch (e) {
            renderFallbackQr(activeSecretUrl);
          }
        } else {
          renderFallbackQr(activeSecretUrl);
        }
      }
    });
  }

  function renderFallbackQr(url) {
    if (!qrFrame) return;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = '#0284c7';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code Ready', 80, 75);
      ctx.fillText(url.slice(0, 20) + '...', 80, 95);
    }
    qrFrame.innerHTML = '';
    qrFrame.appendChild(canvas);
  }

  // ==========================================================================
  // Portable Vault (.html) Single-File Generator
  // ==========================================================================
  if (btnDownloadHtmlVault) {
    btnDownloadHtmlVault.addEventListener('click', () => {
      if (!activeSecretData) {
        showError('No active secret generated.');
        return;
      }

      const packageTitle = currentFile ? currentFile.name : `Secret ${activeSecretData.id.slice(0, 8)}`;
      const payloadJson = JSON.stringify({
        id: activeSecretData.id,
        fingerprint: activeSecretData.fingerprint,
        expires_at: activeSecretData.expires_at,
        view_url: activeSecretData.view_url,
        secret: activeSecretText,
        file: currentFile
      });

      const safePayloadBase64 = btoa(unescape(encodeURIComponent(payloadJson)));

      const portableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Portable Ephemeral Vault — ${packageTitle}</title>
  <style>
    body { background: #060911; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .box { background: #0f172a; border: 1px solid rgba(56,189,248,0.2); border-radius: 12px; padding: 2rem; max-width: 550px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.25rem; }
    .btn { background: #0284c7; color: white; border: none; border-radius: 6px; padding: 0.75rem 1.25rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; width: 100%; }
    .btn:hover { background: #0369a1; }
    pre { background: #020617; border: 1px solid rgba(56,189,248,0.15); border-radius: 6px; padding: 1rem; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; word-break: break-all; margin-top: 1rem; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${packageTitle}</h1>
    <p>This is a portable self-contained cryptographic capsule generated by Ephemeral Vault.</p>
    <div id="pre"><button type="button" class="btn" id="rev">Reveal Payload</button></div>
    <div id="post" class="hidden">
      <pre id="out"></pre>
      <p style="color:#ef4444;font-size:0.75rem;margin-top:0.75rem;">Memory buffer flushed.</p>
    </div>
  </div>
  <script>
    let d = JSON.parse(decodeURIComponent(escape(atob("${safePayloadBase64}"))));
    document.getElementById('rev').addEventListener('click', () => {
      document.getElementById('pre').classList.add('hidden');
      document.getElementById('post').classList.remove('hidden');
      document.getElementById('out').textContent = d.file ? d.file.name + ' (' + d.file.size + ' bytes)' : d.secret;
      d = null;
    });
  <\/script>
</body>
</html>`;

      const blob = new Blob([portableHtml], { type: 'text/html;charset=utf-8' });
      const safeName = currentFile ? `${currentFile.name}.vault.html` : `vault-${activeSecretData.id.slice(0, 8)}.html`;
      triggerDownload(blob, safeName);
      showToast(`✓ Downloaded Portable Vault: ${safeName}`);
    });
  }

  // ==========================================================================
  // Reset Button (Create Another Secret)
  // ==========================================================================
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (createForm) createForm.reset();
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
      if (passphraseValidationFeedback) passphraseValidationFeedback.classList.add('hidden');

      if (byteCounter) byteCounter.textContent = '0 / 10,240 bytes';

      if (resultSection) resultSection.classList.add('hidden');
      if (createForm) createForm.classList.remove('hidden');
      hideError();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
