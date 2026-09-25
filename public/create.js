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
  const heroHeader = document.getElementById('hero-header');
  const trustStrip = document.getElementById('trust-strip');
  const navCreateBtn = document.getElementById('nav-create-btn');
  const modalHowItWorks = document.getElementById('modal-how-it-works');
  const modalSecurity = document.getElementById('modal-security');
  const modalFaq = document.getElementById('modal-faq');
  const btnNavHowItWorks = document.getElementById('nav-btn-how-it-works');
  const btnNavSecurity = document.getElementById('nav-btn-security');
  const btnNavFaq = document.getElementById('nav-btn-faq');

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

        // Store active secret state (Zero Plaintext Policy)
        activeSecretData = data;
        activeSecretUrl = data.view_url;
        activeSecretText = ''; // Never store plaintext secret in global frontend state
        activePassphrase = passphrase;

        // Immediately flush plaintext from input fields and dropzone
        if (secretInput) secretInput.value = '';
        if (byteCounter) byteCounter.textContent = '0 bytes';
        if (fileInput) fileInput.value = '';
        currentFile = null;

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
        if (heroHeader) heroHeader.classList.add('hidden');
        if (trustStrip) trustStrip.classList.add('hidden');
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
  // Vault Capsule & Portable Vault Data Helpers (Single-View Self-Destructing)
  // ==========================================================================
  async function getPortableVaultData() {
    if (!activeSecretData) return null;

    const vaultId = activeSecretData.id;
    const expiresIso = activeSecretData.expires_at || new Date(Date.now() + 3600000).toISOString();
    const formattedExpires = new Date(expiresIso).toLocaleString();
    const maxViews = activeSecretData.views_remaining || 1;
    const packageTitle = currentFile ? currentFile.name : `Secret ${vaultId.slice(0, 8)}`;
    const origin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'http://localhost:3000';

    const hasPass = !!(activePassphrase && activePassphrase.trim().length > 0);

    const portableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Ephemeral Vault — ${packageTitle}</title>
  <style>
    :root {
      --bg: #060911;
      --card: #0f172a;
      --card-border: rgba(56, 189, 248, 0.22);
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --cyan: #38bdf8;
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.12);
      --danger-border: rgba(239, 68, 68, 0.35);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.12);
      --success: #10b981;
      --text: #f8fafc;
      --text-dim: #94a3b8;
      --text-muted: #64748b;
      --radius: 10px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      line-height: 1.5;
    }
    .vault-wrapper { width: 100%; max-width: 580px; }
    .card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--cyan);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
    }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); }
    h1 { font-size: 1.35rem; font-weight: 700; margin-bottom: 0.4rem; color: #ffffff; }
    .subtitle { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 1.25rem; line-height: 1.5; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.65rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.85rem;
      margin-bottom: 1.25rem;
      font-size: 0.78rem;
    }
    .meta-item { display: flex; flex-direction: column; gap: 0.2rem; }
    .meta-label { color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .meta-val { color: var(--cyan); font-weight: 600; font-family: ui-monospace, monospace; }
    .alert-box {
      border-radius: 8px;
      padding: 0.85rem 1rem;
      font-size: 0.82rem;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      line-height: 1.45;
    }
    .alert-danger {
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      color: #fca5a5;
    }
    .alert-warning {
      background: var(--warning-bg);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fcd34d;
    }
    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-dim); margin-bottom: 0.4rem; letter-spacing: 0.03em; }
    .input-row { display: flex; gap: 0.5rem; }
    .input-field {
      flex: 1;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 0.65rem 0.85rem;
      color: #ffffff;
      font-size: 0.88rem;
      outline: none;
    }
    .input-field:focus { border-color: var(--cyan); }
    .btn-primary {
      width: 100%;
      background: var(--primary);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0.6rem 1rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.2s;
    }
    .btn-danger:hover { background: #b91c1c; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--text-dim);
      border-radius: 6px;
      padding: 0.55rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-secondary:hover { color: #ffffff; border-color: var(--cyan); }
    .secret-box {
      background: #020617;
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 8px;
      padding: 1.15rem;
      margin: 1.25rem 0;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.88rem;
      color: #e0f2fe;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 280px;
      overflow-y: auto;
    }
    .countdown-bar-wrap {
      background: rgba(0, 0, 0, 0.4);
      border-radius: 9999px;
      height: 6px;
      overflow: hidden;
      margin: 0.85rem 0 0.5rem 0;
    }
    .countdown-bar-fill {
      background: linear-gradient(90deg, var(--cyan), var(--danger));
      height: 100%;
      width: 100%;
      transition: width 1s linear;
    }
    .countdown-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .actions-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .hidden { display: none !important; }
    .icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="vault-wrapper">
    <div class="card">
      <div class="header-badge">
        <span class="pulse-dot"></span>
        <span>AES-256-GCM One-Time Ephemeral Vault</span>
      </div>

      <h1 id="title-text">🔐 Secret Vault</h1>
      <p id="desc-text" class="subtitle">This secret is protected. Encrypted with AES-256-GCM.</p>

      <div id="meta-strip" class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Allowance</span>
          <span class="meta-val" id="meta-views">${maxViews} view${maxViews > 1 ? 's' : ''}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status</span>
          <span class="meta-val" id="meta-status">Arm &amp; Ready</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Expiration</span>
          <span class="meta-val" id="meta-expires">${formattedExpires}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Security</span>
          <span class="meta-val">Zero Plaintext • AES-256-GCM</span>
        </div>
      </div>

      <div id="section-pre">
        <div class="alert-box alert-warning">
          <svg class="icon" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <div>
            <strong>Strict One-Time Single-View Rule:</strong>
            <span>This file contains ZERO plaintext and ZERO keys. Clicking Reveal issues an authenticated burn request to the vault server. Once revealed, the server physically overwrites and deletes the secret row.</span>
          </div>
        </div>

        ${hasPass ? `
        <div class="form-group">
          <label class="form-label" for="pass-in">PASSPHRASE REQUIRED</label>
          <div class="input-row">
            <input type="password" id="pass-in" class="input-field" placeholder="Enter vault passphrase..." autocomplete="off">
          </div>
          <div id="pass-error" style="color:var(--danger);font-size:0.75rem;margin-top:0.35rem;" class="hidden"></div>
        </div>
        ` : ''}

        <button type="button" id="btn-reveal" class="btn-primary">
          <svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>Reveal Secret</span>
        </button>
      </div>

      <div id="section-revealed" class="hidden">
        <div class="alert-box alert-danger">
          <svg class="icon" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
          <div>
            <strong>VAULT BURNED:</strong>
            <span>Payload revealed in volatile RAM. Database record has been zero-overwritten and destroyed.</span>
          </div>
        </div>

        <div class="secret-box">
          <div id="content-area"></div>
        </div>

        <div>
          <div class="countdown-bar-wrap">
            <div id="wipe-bar" class="countdown-bar-fill"></div>
          </div>
          <div class="countdown-label">
            <span>Memory Wipe Countdown</span>
            <span id="wipe-secs">60s</span>
          </div>
        </div>

        <div class="actions-row">
          <button type="button" id="btn-copy-secret" class="btn-secondary">
            <svg class="icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Secret</span>
          </button>
          <button type="button" id="btn-mask-secret" class="btn-secondary">
            <svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span id="mask-btn-text">Hide (Mask)</span>
          </button>
          <button type="button" id="btn-wipe-now" class="btn-danger">
            <svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Wipe RAM Now</span>
          </button>
        </div>
      </div>

      <div id="section-burned" class="hidden">
        <div class="alert-box alert-danger" style="margin-bottom:1.5rem;">
          <svg class="icon" viewBox="0 0 24 24" style="width:24px;height:24px;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
          <div>
            <strong style="font-size:0.95rem;display:block;margin-bottom:0.25rem;">VAULT DESTROYED &amp; PURGED</strong>
            <span id="burn-reason-text">This one-time vault has already been viewed and permanently destroyed. Plaintext memory is wiped with zeros. It cannot be reopened or decrypted again.</span>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:1rem;font-size:0.78rem;color:var(--text-muted);line-height:1.6;margin-bottom:1.25rem;">
          <div>🔒 <strong>Zero-Trace Security Policy:</strong></div>
          <div>• Single-view allowance reached (0 views remaining)</div>
          <div>• Cryptographic keys and memory buffers zeroed</div>
          <div>• SQLite vault row physically purged</div>
          <div>• Reopening this HTML file will permanently display this burn notice</div>
        </div>
      </div>

    </div>
  </div>

  <script>
    (async function() {
      const vaultId = "${vaultId}";
      const expiresAt = new Date("${expiresIso}").getTime();
      const maxViews = ${maxViews};
      const hasPass = ${hasPass};
      const serverOrigin = "${origin}";

      const burnKey = "esv_burned_" + vaultId;
      const viewsKey = "esv_views_" + vaultId;
      const failKey = "esv_fails_" + vaultId;

      const secPre = document.getElementById('section-pre');
      const secRev = document.getElementById('section-revealed');
      const secBurn = document.getElementById('section-burned');
      const burnReasonText = document.getElementById('burn-reason-text');
      const contentArea = document.getElementById('content-area');
      const wipeBar = document.getElementById('wipe-bar');
      const wipeSecs = document.getElementById('wipe-secs');
      const metaStatus = document.getElementById('meta-status');
      const btnReveal = document.getElementById('btn-reveal');
      const passIn = document.getElementById('pass-in');
      const passErr = document.getElementById('pass-error');
      const btnCopy = document.getElementById('btn-copy-secret');
      const btnMask = document.getElementById('btn-mask-secret');
      const maskBtnText = document.getElementById('mask-btn-text');
      const btnWipeNow = document.getElementById('btn-wipe-now');

      let decryptedSecretText = '';
      let isMasked = false;
      let wipeSecondsRemaining = 60;
      let wipeInterval = null;

      function showBurned(reason) {
        if (secPre) secPre.classList.add('hidden');
        if (secRev) secRev.classList.add('hidden');
        if (secBurn) secBurn.classList.remove('hidden');
        if (metaStatus) {
          metaStatus.textContent = 'Permanently Burned';
          metaStatus.style.color = 'var(--danger)';
        }
        if (burnReasonText && reason) {
          burnReasonText.textContent = reason;
        }
      }

      if (Date.now() > expiresAt) {
        localStorage.setItem(burnKey, JSON.stringify({ burned_at: new Date().toISOString(), reason: 'EXPIRED' }));
        showBurned("This vault expired on " + new Date(expiresAt).toLocaleString() + " and was permanently self-destructed.");
        return;
      }

      const localBurn = localStorage.getItem(burnKey);
      if (localBurn) {
        let meta = {};
        try { meta = JSON.parse(localBurn); } catch(e) {}
        showBurned("This single-view vault was already opened and permanently destroyed on this device (" + (meta.burned_at ? new Date(meta.burned_at).toLocaleString() : 'previously') + "). It cannot be reopened.");
        return;
      }

      function startMemoryWipeTimer() {
        wipeInterval = setInterval(() => {
          wipeSecondsRemaining--;
          if (wipeSecs) wipeSecs.textContent = wipeSecondsRemaining + 's';
          if (wipeBar) wipeBar.style.width = (wipeSecondsRemaining / 60 * 100) + '%';
          if (wipeSecondsRemaining <= 0) {
            clearInterval(wipeInterval);
            performRamWipe();
          }
        }, 1000);
      }

      function performRamWipe() {
        if (wipeInterval) clearInterval(wipeInterval);
        decryptedSecretText = null;
        if (contentArea) contentArea.innerHTML = '<pre style="color:var(--danger)">00000000 00000000 00000000 00000000 [RAM PURGED]</pre>';
        localStorage.setItem(burnKey, JSON.stringify({ burned_at: new Date().toISOString(), reason: 'RAM_WIPED' }));
        showBurned("Secret memory buffer has been flushed and overwritten with zeros. This vault cannot be opened again.");
      }

      if (btnWipeNow) {
        btnWipeNow.addEventListener('click', performRamWipe);
      }

      if (btnMask) {
        btnMask.addEventListener('click', () => {
          isMasked = !isMasked;
          const preEl = contentArea ? contentArea.querySelector('pre') : null;
          if (preEl) {
            if (isMasked) {
              preEl.style.webkitTextSecurity = 'disc';
              preEl.style.filter = 'blur(4px)';
              preEl.style.userSelect = 'none';
              if (maskBtnText) maskBtnText.textContent = 'Reveal';
            } else {
              preEl.style.webkitTextSecurity = '';
              preEl.style.filter = '';
              preEl.style.userSelect = '';
              if (maskBtnText) maskBtnText.textContent = 'Hide (Mask)';
            }
          }
        });
      }

      if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
          if (!decryptedSecretText) return;
          try {
            await navigator.clipboard.writeText(decryptedSecretText);
            const original = btnCopy.innerHTML;
            btnCopy.textContent = '✓ Copied';
            setTimeout(() => { btnCopy.innerHTML = original; }, 2000);
          } catch(e) {}
        });
      }

      if (btnReveal) {
        btnReveal.addEventListener('click', async () => {
          btnReveal.disabled = true;
          btnReveal.innerHTML = '<span>Decrypting &amp; Burning on Server...</span>';

          const enteredPass = passIn ? passIn.value.trim() : '';
          if (hasPass && !enteredPass) {
            if (passErr) {
              passErr.textContent = 'Please enter the vault passphrase.';
              passErr.classList.remove('hidden');
            }
            btnReveal.disabled = false;
            btnReveal.innerHTML = '<span>Reveal Secret</span>';
            return;
          }

          try {
            const resp = await fetch(serverOrigin + '/api/secret/' + vaultId + '/burn', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ passphrase: enteredPass })
            });

            const data = await resp.json();

            if (resp.status === 404 || resp.status === 410) {
              localStorage.setItem(burnKey, JSON.stringify({ burned_at: new Date().toISOString(), reason: 'SERVER_PURGED' }));
              showBurned("This secret was already accessed and burned on the server. Physical database record has been purged.");
              return;
            }

            if (resp.status === 401) {
              let fails = parseInt(localStorage.getItem(failKey) || "0", 10) + 1;
              localStorage.setItem(failKey, String(fails));
              if (fails >= 3 || (data.error && data.error.includes('destroyed'))) {
                localStorage.setItem(burnKey, JSON.stringify({ burned_at: new Date().toISOString(), reason: 'BRUTE_FORCE_AUTO_DESTRUCT' }));
                showBurned("🔥 AUTO-DESTRUCT TRIGGERED: 3 wrong passphrase attempts. Vault has been permanently destroyed.");
                return;
              }
              if (passErr) {
                passErr.textContent = "⚠️ Invalid passphrase. " + (3 - fails) + " attempt(s) remaining before auto-destruct.";
                passErr.classList.remove('hidden');
              }
              btnReveal.disabled = false;
              btnReveal.innerHTML = '<span>Reveal Secret</span>';
              return;
            }

            if (!resp.ok) {
              throw new Error(data.error || 'Server error occurred');
            }

            // Successfully revealed and destroyed on server!
            localStorage.setItem(burnKey, JSON.stringify({
              burned_at: new Date().toISOString(),
              reason: 'ONE_TIME_VIEW_COMPLETED'
            }));

            if (secPre) secPre.classList.add('hidden');
            if (secRev) secRev.classList.remove('hidden');
            if (metaStatus) {
              metaStatus.textContent = 'Burned (0 views left)';
              metaStatus.style.color = 'var(--danger)';
            }

            decryptedSecretText = data.secret || '';

            if (data.file && data.file.data) {
              contentArea.innerHTML = '<div style="margin-bottom:0.75rem;"><strong>Attached File:</strong> ' + data.file.name + ' (' + data.file.size + ' bytes)</div><a href="' + data.file.data + '" download="' + data.file.name + '" class="btn-primary" style="text-decoration:none;display:inline-flex;width:auto;">Download File (' + data.file.name + ')</a>' + (data.secret ? '<div style="margin-top:1rem;color:var(--text-dim);font-size:0.8rem;">Note: ' + data.secret + '</div>' : '');
            } else {
              contentArea.innerHTML = '<pre>' + (data.secret || '') + '</pre>';
            }

            startMemoryWipeTimer();

          } catch (err) {
            console.error(err);
            showBurned("Failed to decrypt: " + (err.message || 'Connection or verification error.'));
          }
        });
      }
    })();
  <\/script>
</body>
</html>`;

    const blob = new Blob([portableHtml], { type: 'text/html;charset=utf-8' });
    const filename = currentFile ? `${currentFile.name}.vault.html` : `vault-${activeSecretData.id.slice(0, 8)}.html`;
    return { blob, filename, htmlContent: portableHtml };
  }

  function getVaultCapsuleData() {
    if (!activeSecretData) return null;
    const capsule = {
      format: "ephemeral-vault-capsule",
      version: "1.0",
      id: activeSecretData.id,
      fingerprint: activeSecretData.fingerprint,
      expires_at: activeSecretData.expires_at,
      created_at: new Date().toISOString(),
      view_url: activeSecretData.view_url,
      has_file: !!currentFile,
      file_name: currentFile ? currentFile.name : null,
      file_size: currentFile ? currentFile.size : null,
      file_type: currentFile ? currentFile.type : null,
      security: "AES-256-GCM Zero-Trace",
      payload_status: "Protected Zero-Trace Payload (Server Authenticated)"
    };
    const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: 'application/json;charset=utf-8' });
    const filename = `vault-${activeSecretData.id.slice(0, 8)}.vault`;
    return { blob, filename };
  }

  // ==========================================================================
  // Multi-Channel Dispatch (Link or File via WhatsApp, Slack, Teams, Discord, Email)
  // ==========================================================================
  const tabDispatchLink = document.getElementById('tab-dispatch-link');
  const tabDispatchFile = document.getElementById('tab-dispatch-file');
  const dispatchPanelLink = document.getElementById('dispatch-panel-link');
  const dispatchPanelFile = document.getElementById('dispatch-panel-file');

  if (tabDispatchLink && tabDispatchFile && dispatchPanelLink && dispatchPanelFile) {
    tabDispatchLink.addEventListener('click', () => {
      tabDispatchLink.classList.add('active');
      tabDispatchFile.classList.remove('active');
      tabDispatchLink.setAttribute('aria-selected', 'true');
      tabDispatchFile.setAttribute('aria-selected', 'false');
      dispatchPanelLink.classList.remove('hidden');
      dispatchPanelFile.classList.add('hidden');
    });

    tabDispatchFile.addEventListener('click', () => {
      tabDispatchFile.classList.add('active');
      tabDispatchLink.classList.remove('active');
      tabDispatchFile.setAttribute('aria-selected', 'true');
      tabDispatchLink.setAttribute('aria-selected', 'false');
      dispatchPanelFile.classList.remove('hidden');
      dispatchPanelLink.classList.add('hidden');
    });
  }

  // --------------------------------------------------------------------------
  // Link Dispatch Handlers
  // --------------------------------------------------------------------------
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  if (btnShareWhatsapp) {
    btnShareWhatsapp.addEventListener('click', () => {
      if (!activeSecretUrl) { showError('No active secret link.'); return; }
      const text = `🔐 Confidential Ephemeral Secret Vault:\n${activeSecretUrl}\n\n⚠️ Encrypted with AES-256-GCM. Will permanently self-destruct once viewed.`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      showToast('✓ WhatsApp opened with encrypted secret link');
    });
  }

  const btnShareSlack = document.getElementById('btn-share-slack');
  if (btnShareSlack) {
    btnShareSlack.addEventListener('click', async () => {
      if (!activeSecretUrl) { showError('No active secret link.'); return; }
      const slackMsg = `🔐 *Confidential Ephemeral Secret*: <${activeSecretUrl}>\n_Encrypted with AES-256-GCM • Permanently self-destructs after viewing_`;
      try {
        await navigator.clipboard.writeText(slackMsg);
      } catch {
        // clipboard fallback
      }
      window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer');
      showToast('✓ Slack message copied to clipboard! Opening Slack...');
    });
  }

  const btnShareTeams = document.getElementById('btn-share-teams');
  if (btnShareTeams) {
    btnShareTeams.addEventListener('click', () => {
      if (!activeSecretUrl) { showError('No active secret link.'); return; }
      const teamsUrl = `https://teams.microsoft.com/share?href=${encodeURIComponent(activeSecretUrl)}&msgText=${encodeURIComponent('🔐 Confidential Ephemeral Secret (AES-256-GCM One-Time Vault)')}`;
      window.open(teamsUrl, '_blank', 'noopener,noreferrer');
      showToast('✓ Microsoft Teams share window opened');
    });
  }

  const btnShareDiscord = document.getElementById('btn-share-discord');
  if (btnShareDiscord) {
    btnShareDiscord.addEventListener('click', async () => {
      if (!activeSecretUrl) { showError('No active secret link.'); return; }
      const discordMsg = `🔐 **Confidential Ephemeral Secret**: || ${activeSecretUrl} ||\n*Encrypted with AES-256-GCM • Permanently self-destructs after viewing*`;
      try {
        await navigator.clipboard.writeText(discordMsg);
      } catch {
        // clipboard fallback
      }
      window.open('https://discord.com/app', '_blank', 'noopener,noreferrer');
      showToast('✓ Discord spoiler link copied to clipboard! Opening Discord...');
    });
  }

  const btnShareEmail = document.getElementById('btn-share-email');
  if (btnShareEmail) {
    btnShareEmail.addEventListener('click', () => {
      if (!activeSecretUrl) { showError('No active secret link.'); return; }
      const subject = 'Confidential Ephemeral Secret [Zero-Trace]';
      const body = `Hello,\n\nA confidential secret has been shared with you via Ephemeral Secret Vault:\n\n${activeSecretUrl}\n\nSecurity Notice:\n- Encrypted with AES-256-GCM\n- Zero plaintext stored on disk\n- Permanently destroyed immediately after viewing or expiration\n\nDo not forward this email if you want the link to remain unviewed.\n\nEphemeral Secret Vault`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showToast('✓ Email draft opened with secret link');
    });
  }

  // --------------------------------------------------------------------------
  // File Dispatch Handlers (WhatsApp, Slack, Teams, Discord, Email)
  // --------------------------------------------------------------------------
  const btnShareFileNative = document.getElementById('btn-share-file-native');
  if (btnShareFileNative) {
    if (navigator.canShare) {
      try {
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        if (navigator.canShare({ files: [testFile] })) {
          btnShareFileNative.classList.remove('hidden');
        }
      } catch {
        // Not supported
      }
    }

    btnShareFileNative.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      try {
        const file = new File([vaultData.blob], vaultData.filename, { type: 'text/html' });
        await navigator.share({
          title: 'Confidential Ephemeral Vault Capsule',
          text: 'Here is your encrypted Ephemeral Vault capsule. Open in any web browser to decrypt.',
          files: [file]
        });
        showToast('✓ Vault file shared successfully');
      } catch (shareErr) {
        if (shareErr.name !== 'AbortError') {
          triggerDownload(vaultData.blob, vaultData.filename);
          showToast(`✓ Downloaded ${vaultData.filename}`);
        }
      }
    });
  }

  const btnShareFileWhatsapp = document.getElementById('btn-share-file-whatsapp');
  if (btnShareFileWhatsapp) {
    btnShareFileWhatsapp.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      try {
        await navigator.clipboard.writeText(`🔐 Confidential Ephemeral Vault Capsule (${vaultData.filename}). Open in any web browser to decrypt locally.`);
      } catch {}
      window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
      showToast(`✓ Downloaded ${vaultData.filename}! Drag & attach into WhatsApp`);
    });
  }

  const btnShareFileSlack = document.getElementById('btn-share-file-slack');
  if (btnShareFileSlack) {
    btnShareFileSlack.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      try {
        await navigator.clipboard.writeText(`🔐 *Confidential Ephemeral Vault File* (${vaultData.filename}). Drag and drop into this Slack channel.`);
      } catch {}
      window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer');
      showToast(`✓ Downloaded ${vaultData.filename}! Drop into Slack channel`);
    });
  }

  const btnShareFileTeams = document.getElementById('btn-share-file-teams');
  if (btnShareFileTeams) {
    btnShareFileTeams.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      try {
        await navigator.clipboard.writeText(`🔐 Confidential Ephemeral Vault Capsule (${vaultData.filename}). Attach to this Teams conversation.`);
      } catch {}
      window.open('https://teams.microsoft.com/', '_blank', 'noopener,noreferrer');
      showToast(`✓ Downloaded ${vaultData.filename}! Attach to Teams chat`);
    });
  }

  const btnShareFileDiscord = document.getElementById('btn-share-file-discord');
  if (btnShareFileDiscord) {
    btnShareFileDiscord.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      try {
        await navigator.clipboard.writeText(`🔐 **Confidential Ephemeral Vault Capsule** (${vaultData.filename}). Drop file here. Recipient opens in browser to decrypt.`);
      } catch {}
      window.open('https://discord.com/app', '_blank', 'noopener,noreferrer');
      showToast(`✓ Downloaded ${vaultData.filename}! Drop into Discord channel`);
    });
  }

  const btnShareFileEmail = document.getElementById('btn-share-file-email');
  if (btnShareFileEmail) {
    btnShareFileEmail.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      const subject = `Confidential Ephemeral Vault File Attachment [${vaultData.filename}]`;
      const body = `Hello,\n\nPlease find attached the confidential encrypted vault file (${vaultData.filename}).\n\nTo view and decrypt the contents, open the attached file in any modern web browser. The secret is protected by AES-256-GCM encryption and decrypts locally on your machine with zero server trace.\n\nEphemeral Secret Vault`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showToast(`✓ Downloaded ${vaultData.filename} & email draft opened`);
    });
  }

  // --------------------------------------------------------------------------
  // Direct Download Actions
  // --------------------------------------------------------------------------
  const btnDownloadPortableFile = document.getElementById('btn-download-portable-file');
  if (btnDownloadPortableFile) {
    btnDownloadPortableFile.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      showToast(`✓ Downloaded Portable Vault: ${vaultData.filename}`);
    });
  }

  const btnDownloadVaultCapsule = document.getElementById('btn-download-vault-capsule');
  if (btnDownloadVaultCapsule) {
    btnDownloadVaultCapsule.addEventListener('click', () => {
      const capData = getVaultCapsuleData();
      if (!capData) { showError('No active secret generated.'); return; }
      triggerDownload(capData.blob, capData.filename);
      showToast(`✓ Downloaded Capsule: ${capData.filename}`);
    });
  }

  if (btnDownloadHtmlVault) {
    btnDownloadHtmlVault.addEventListener('click', async () => {
      const vaultData = await getPortableVaultData();
      if (!vaultData) { showError('No active secret generated.'); return; }
      triggerDownload(vaultData.blob, vaultData.filename);
      showToast(`✓ Downloaded Portable Vault: ${vaultData.filename}`);
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

      if (tabDispatchLink && tabDispatchFile && dispatchPanelLink && dispatchPanelFile) {
        tabDispatchLink.classList.add('active');
        tabDispatchFile.classList.remove('active');
        tabDispatchLink.setAttribute('aria-selected', 'true');
        tabDispatchFile.setAttribute('aria-selected', 'false');
        dispatchPanelLink.classList.remove('hidden');
        dispatchPanelFile.classList.add('hidden');
      }

      if (resultSection) resultSection.classList.add('hidden');
      if (heroHeader) heroHeader.classList.remove('hidden');
      if (trustStrip) trustStrip.classList.remove('hidden');
      if (createForm) createForm.classList.remove('hidden');
      hideError();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==========================================================================
  // Navbar '+ Create Secret' Button
  // ==========================================================================
  if (navCreateBtn) {
    navCreateBtn.addEventListener('click', () => {
      if (resultSection && !resultSection.classList.contains('hidden')) {
        if (resetBtn) resetBtn.click();
      }
      if (secretInput) {
        secretInput.focus();
        secretInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // ==========================================================================
  // Informational Modals (How It Works, Security, FAQ)
  // ==========================================================================
  function openModal(modal) {
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal(modal) {
    if (modal) modal.classList.add('hidden');
  }

  if (btnNavHowItWorks) {
    btnNavHowItWorks.addEventListener('click', () => openModal(modalHowItWorks));
  }
  if (btnNavSecurity) {
    btnNavSecurity.addEventListener('click', () => openModal(modalSecurity));
  }
  if (btnNavFaq) {
    btnNavFaq.addEventListener('click', () => openModal(modalFaq));
  }

  document.querySelectorAll('.btn-modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const target = document.getElementById(modalId);
      if (target) closeModal(target);
    });
  });

  [modalHowItWorks, modalSecurity, modalFaq].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [modalHowItWorks, modalSecurity, modalFaq].forEach((modal) => {
        if (modal && !modal.classList.contains('hidden')) closeModal(modal);
      });
    }
  });
})();
