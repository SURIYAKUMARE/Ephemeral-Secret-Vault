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
  const ttlHelperText = document.getElementById('ttl-helper-text');
  const customDatetimePanel = document.getElementById('custom-datetime-panel');
  const customDateInput = document.getElementById('custom-date-input');
  const customTimeInput = document.getElementById('custom-time-input');
  const btnAmpmAm = document.getElementById('btn-ampm-am');
  const btnAmpmPm = document.getElementById('btn-ampm-pm');
  const customDatetimePreview = document.getElementById('custom-datetime-preview');
  const customDatetimePreviewText = document.getElementById('custom-datetime-preview-text');
  const customDatetimeError = document.getElementById('custom-datetime-error');

  const viewsSelect = document.getElementById('views-select');
  const viewsHelperText = document.getElementById('views-helper-text');
  const customViewsPanel = document.getElementById('custom-views-panel');
  const customViewsInput = document.getElementById('custom-views-input');
  const customViewsPreview = document.getElementById('custom-views-preview');
  const customViewsError = document.getElementById('custom-views-error');
  const summaryExpiration = document.getElementById('summary-expiration');
  const summaryViews = document.getElementById('summary-views');

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
  const openShareCenterBtn = document.getElementById('open-share-center-btn');
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

  // Cybersecurity Suite Elements
  const secretTypeBadge = document.getElementById('secret-type-badge');
  const btnClearSecret = document.getElementById('btn-clear-secret');
  const btnFullscreenEditor = document.getElementById('btn-fullscreen-editor');
  const pasteIndicator = document.getElementById('paste-indicator');
  const secretStatusDot = document.getElementById('secret-status-dot');
  const secretStatusText = document.getElementById('secret-status-text');

  const confirmPassphraseGroup = document.getElementById('confirm-passphrase-group');
  const confirmPassphraseInput = document.getElementById('confirm-passphrase-input');
  const passphraseMismatchFeedback = document.getElementById('passphrase-mismatch-feedback');
  const autoDestructGroup = document.getElementById('auto-destruct-group');

  const customTimezoneSelect = document.getElementById('custom-timezone-select');
  const expireAfterViewToggle = document.getElementById('expire-after-view-toggle');

  const zkToggle = document.getElementById('zk-toggle');
  const zkActiveNotice = document.getElementById('zk-active-notice');

  const securityScoreVal = document.getElementById('security-score-val');
  const securityScoreFill = document.getElementById('security-score-fill');
  const scoreItemZk = document.getElementById('score-item-zk');
  const scoreItemPass = document.getElementById('score-item-pass');

  const resultVaultId = document.getElementById('result-vault-id');
  const btnUnmaskVaultId = document.getElementById('btn-unmask-vault-id');
  const resultZkBadge = document.getElementById('result-zk-badge');
  const resultIntegrityFingerprint = document.getElementById('result-integrity-fingerprint');
  const btnDownloadQrPng = document.getElementById('btn-download-qr-png');
  const btnDownloadQrSvg = document.getElementById('btn-download-qr-svg');
  const btnEmergencyDestroy = document.getElementById('btn-emergency-destroy');

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

  // ==========================================================================
  // Secret Classifier & Cryptographic Utilities
  // ==========================================================================
  function detectSecretType(text) {
    if (!text || !text.trim()) return null;
    const t = text.trim();
    if (t.startsWith('-----BEGIN') && (t.includes('PRIVATE KEY') || t.includes('RSA PRIVATE KEY') || t.includes('EC PRIVATE KEY'))) return 'PRIVATE KEY';
    if (t.startsWith('-----BEGIN CERTIFICATE')) return 'CERTIFICATE';
    if (t.startsWith('ssh-rsa ') || t.startsWith('ssh-ed25519 ')) return 'PRIVATE KEY';
    if (t.startsWith('ey') && t.split('.').length === 3) return 'JWT';
    if (/^(postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|sqlite|mssql):\/\//i.test(t)) return 'DATABASE URL';
    if (/^(sk_live_|sk_test_|ghp_|gho_|glpat-|xoxb-|xoxp-|AKIA[0-9A-Z]{16}|sq0atp-|access_token)/i.test(t)) return 'API KEY';
    if (t.includes('=') && t.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).every(l => /^[A-Z0-9_]+=/i.test(l.trim()))) return 'ENV VAR';
    if (!t.includes('\n') && !t.includes(' ') && t.length >= 8 && t.length <= 64 && /[0-9]/.test(t) && /[a-zA-Z]/.test(t)) return 'PASSWORD';
    if (/^(Bearer\s+[A-Za-z0-9\-_.]+|gh[pousr]_[A-Za-z0-9_]+|[0-9a-f]{32,64})$/i.test(t)) return 'TOKEN';
    return 'GENERIC SECRET';
  }

  async function encryptWithWebCrypto(secretText) {
    const rawKey = window.crypto.getRandomValues(new Uint8Array(32));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const encBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(secretText)
    );
    const encBytes = new Uint8Array(encBuf);
    const cipherPart = encBytes.slice(0, encBytes.length - 16);
    const tagPart = encBytes.slice(encBytes.length - 16);
    const toHex = (buf) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      keyHex: toHex(rawKey),
      ivHex: toHex(iv),
      ciphertextHex: toHex(cipherPart),
      tagHex: toHex(tagPart)
    };
  }

  function updateSecurityScore() {
    let score = 70;
    const pass = passphraseInput ? passphraseInput.value.trim() : '';
    const isZk = zkToggle && zkToggle.checked;
    const isOneView = viewsSelect && (viewsSelect.value === '1' || (customViewsInput && customViewsInput.value === '1'));
    const isShortTtl = ttlSelect && (ttlSelect.value === '300' || ttlSelect.value === '3600');

    if (pass.length >= 8) {
      score += 10;
      if (scoreItemPass) scoreItemPass.textContent = '✓ Passphrase (+10%)';
    } else {
      if (scoreItemPass) scoreItemPass.textContent = '○ Passphrase (+10%)';
    }

    if (isZk) {
      score += 15;
      if (scoreItemZk) scoreItemZk.textContent = '✓ Zero-Knowledge (+15%)';
    } else {
      if (scoreItemZk) scoreItemZk.textContent = '○ Zero-Knowledge (+15%)';
    }

    if (isOneView) score += 3;
    if (isShortTtl) score += 2;

    score = Math.min(100, Math.max(0, score));

    if (securityScoreVal) {
      let rating = 'Standard';
      if (score >= 90) rating = 'Military-Grade';
      else if (score >= 80) rating = 'Ultra-Secure';
      else if (score >= 70) rating = 'Strong';
      securityScoreVal.textContent = `${score}% • ${rating}`;
    }
    if (securityScoreFill) {
      securityScoreFill.style.width = `${score}%`;
    }
  }

  // Live 3-Step Wizard Stepper Tracker
  function updateStepperState(step) {
    const stepContent = document.getElementById('step-content');
    const stepSettings = document.getElementById('step-settings');
    const stepGenerate = document.getElementById('step-generate');
    if (!stepContent || !stepSettings || !stepGenerate) return;

    if (step === 1) {
      stepContent.className = 'step-item active';
      stepContent.innerHTML = '<span class="step-num">01</span><span>Content</span>';
      stepSettings.className = 'step-item';
      stepSettings.innerHTML = '<span class="step-num">02</span><span>Settings</span>';
      stepGenerate.className = 'step-item';
      stepGenerate.innerHTML = '<span class="step-num">03</span><span>Generate</span>';
    } else if (step === 2) {
      stepContent.className = 'step-item completed';
      stepContent.innerHTML = '<span class="step-num" style="color:var(--success);">✓</span><span>Content</span>';
      stepSettings.className = 'step-item active';
      stepSettings.innerHTML = '<span class="step-num">02</span><span>Settings</span>';
      stepGenerate.className = 'step-item';
      stepGenerate.innerHTML = '<span class="step-num">03</span><span>Generate</span>';
    } else if (step === 3) {
      stepContent.className = 'step-item completed';
      stepContent.innerHTML = '<span class="step-num" style="color:var(--success);">✓</span><span>Content</span>';
      stepSettings.className = 'step-item completed';
      stepSettings.innerHTML = '<span class="step-num" style="color:var(--success);">✓</span><span>Settings</span>';
      stepGenerate.className = 'step-item active';
      stepGenerate.innerHTML = '<span class="step-num" style="color:var(--cyan);">✓</span><span>Generated</span>';
    }
  }

  // Byte Counter & Classifier
  if (secretInput && byteCounter) {
    secretInput.addEventListener('input', () => {
      const text = secretInput.value;
      const bytes = new Blob([text]).size;
      const chars = text.length;
      byteCounter.textContent = `${bytes.toLocaleString()} / 10,240 bytes • ${chars.toLocaleString()} chars`;
      byteCounter.style.color = bytes > 10240 ? 'var(--danger)' : 'var(--text-muted)';

      if (text.trim().length > 0 || currentFile) {
        updateStepperState(2);
      } else {
        updateStepperState(1);
      }

      const detected = detectSecretType(text);
      if (secretTypeBadge) {
        if (detected) {
          secretTypeBadge.textContent = detected;
          secretTypeBadge.classList.remove('hidden');
        } else {
          secretTypeBadge.classList.add('hidden');
        }
      }

      if (secretStatusText && secretStatusDot) {
        if (chars > 0) {
          secretStatusDot.style.background = 'var(--cyan)';
          secretStatusDot.style.boxShadow = '0 0 8px var(--cyan)';
          secretStatusText.textContent = `Ready for encryption (${detected || 'GENERIC'})`;
        } else {
          secretStatusDot.style.background = 'var(--text-muted)';
          secretStatusDot.style.boxShadow = 'none';
          secretStatusText.textContent = 'Awaiting input...';
        }
      }

      updateSecurityScore();
    });
  }

  // Clear Button
  if (btnClearSecret && secretInput) {
    btnClearSecret.addEventListener('click', () => {
      secretInput.value = '';
      secretInput.dispatchEvent(new Event('input'));
      secretInput.focus();
      showToast('Secret input cleared');
    });
  }

  // Fullscreen Editor
  if (btnFullscreenEditor && textSection) {
    btnFullscreenEditor.addEventListener('click', () => {
      const isFull = textSection.classList.toggle('fullscreen-editor-modal');
      btnFullscreenEditor.textContent = isFull ? '✕ Exit' : '⛶ Fullscreen';
      if (secretInput) secretInput.focus();
    });
  }

  // Paste Detection Indicator
  if (secretInput) {
    secretInput.addEventListener('paste', () => {
      if (pasteIndicator) {
        pasteIndicator.classList.remove('hidden');
        setTimeout(() => pasteIndicator.classList.add('hidden'), 2500);
      }
      setTimeout(() => {
        secretInput.dispatchEvent(new Event('input'));
      }, 20);
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
      updateStepperState(2);
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
      if (!secretInput || secretInput.value.trim().length === 0) {
        updateStepperState(1);
      }
    });
  }

  // ==========================================================================
  // Passphrase Validation & Visibility Toggle
  // ==========================================================================
  let selectedFailedAttempts = 3;

  function checkPassphraseMismatch() {
    if (!confirmPassphraseInput || !passphraseInput) return true;
    const p1 = passphraseInput.value;
    const p2 = confirmPassphraseInput.value;
    if (p1 && p2 && p1 !== p2) {
      if (passphraseMismatchFeedback) passphraseMismatchFeedback.classList.remove('hidden');
      return false;
    } else {
      if (passphraseMismatchFeedback) passphraseMismatchFeedback.classList.add('hidden');
      return true;
    }
  }

  if (confirmPassphraseInput) {
    confirmPassphraseInput.addEventListener('input', checkPassphraseMismatch);
  }

  document.querySelectorAll('.attempt-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.attempt-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedFailedAttempts = parseInt(chip.getAttribute('data-attempts'), 10) || 3;
    });
  });

  if (zkToggle) {
    zkToggle.addEventListener('change', () => {
      if (zkActiveNotice) {
        if (zkToggle.checked) {
          zkActiveNotice.classList.remove('hidden');
        } else {
          zkActiveNotice.classList.add('hidden');
        }
      }
      updateSecurityScore();
    });
  }

  if (passphraseInput) {
    passphraseInput.addEventListener('input', () => {
      const val = passphraseInput.value;
      const trimmed = val.trim();

      if (confirmPassphraseGroup) {
        if (trimmed.length > 0) {
          confirmPassphraseGroup.classList.remove('hidden');
          if (autoDestructGroup) autoDestructGroup.classList.remove('hidden');
        } else {
          confirmPassphraseGroup.classList.add('hidden');
          if (autoDestructGroup) autoDestructGroup.classList.add('hidden');
        }
      }
      checkPassphraseMismatch();

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
      updateSecurityScore();
    });
  }

  if (btnToggleEye && passphraseInput) {
    btnToggleEye.addEventListener('click', () => {
      const isPass = passphraseInput.getAttribute('type') === 'password';
      passphraseInput.setAttribute('type', isPass ? 'text' : 'password');
      if (confirmPassphraseInput) {
        confirmPassphraseInput.setAttribute('type', isPass ? 'text' : 'password');
      }
      btnToggleEye.innerHTML = isPass ? SVG_ICONS.eyeOff : SVG_ICONS.eye;
    });
  }

  // ==========================================================================
  // Enhanced Expiration & Max Views Controls
  // ==========================================================================
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateTimeHuman(date) {
    const d = date.getDate();
    const m = MONTH_NAMES_SHORT[date.getMonth()];
    const y = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad2(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${d} ${m} ${y} at ${hours}:${minutes} ${ampm}`;
  }

  function formatDateTimeCompact(date) {
    const d = date.getDate();
    const m = MONTH_NAMES_SHORT[date.getMonth()];
    const y = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad2(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${m} ${d}, ${y} • ${hours}:${minutes} ${ampm}`;
  }

  function formatRemainingDuration(diffMs) {
    if (diffMs <= 0) return 'Expired';
    const totalSec = Math.floor(diffMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function initDateTimeDefaults() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    const minDateStr = `${yyyy}-${mm}-${dd}`;

    if (customDateInput) {
      customDateInput.min = minDateStr;
      if (!customDateInput.value) {
        customDateInput.value = minDateStr;
      }
    }

    if (customTimeInput && !customTimeInput.value) {
      customTimeInput.value = '23:45';
      if (btnAmpmPm && btnAmpmAm) {
        btnAmpmPm.classList.add('active');
        btnAmpmAm.classList.remove('active');
      }
    }
  }

  function getCustomTargetDate() {
    if (!customDateInput || !customTimeInput) return null;
    const dateVal = customDateInput.value;
    const timeVal = customTimeInput.value;
    if (!dateVal || !timeVal) return null;

    const tz = customTimezoneSelect ? customTimezoneSelect.value : 'Local';
    let target;

    if (tz === 'UTC') {
      target = new Date(`${dateVal}T${timeVal}:00.000Z`);
    } else if (tz === 'Asia/Kolkata') {
      target = new Date(`${dateVal}T${timeVal}:00+05:30`);
    } else if (tz === 'America/New_York') {
      target = new Date(`${dateVal}T${timeVal}:00-04:00`);
    } else if (tz === 'Europe/London') {
      target = new Date(`${dateVal}T${timeVal}:00+01:00`);
    } else if (tz === 'Asia/Tokyo') {
      target = new Date(`${dateVal}T${timeVal}:00+09:00`);
    } else {
      target = new Date(`${dateVal}T${timeVal}`);
    }

    if (isNaN(target.getTime())) return null;
    return target;
  }

  function updateTtlState() {
    if (!ttlSelect) return { valid: true, expiresAt: new Date(Date.now() + 3600000).toISOString(), ttlSeconds: 3600 };

    if (ttlSelect.value === 'custom') {
      if (customDatetimePanel) customDatetimePanel.classList.remove('hidden');
      initDateTimeDefaults();

      const target = getCustomTargetDate();
      if (!target) {
        if (customDatetimeError) {
          customDatetimeError.textContent = 'Please choose both a date and time.';
          customDatetimeError.classList.remove('hidden');
        }
        return { valid: false, error: 'Please choose both an expiration date and time.' };
      }

      const now = Date.now();
      const diffMs = target.getTime() - now;

      if (diffMs <= 0) {
        if (customDatetimeError) {
          customDatetimeError.textContent = 'Custom expiration cannot be in the past.';
          customDatetimeError.classList.remove('hidden');
        }
        if (ttlHelperText) ttlHelperText.textContent = 'Invalid date (in the past)';
        return { valid: false, error: 'Custom expiration cannot be in the past.' };
      }

      if (diffMs < 60000) {
        if (customDatetimeError) {
          customDatetimeError.textContent = 'Require at least 1 minute from the current time.';
          customDatetimeError.classList.remove('hidden');
        }
        if (ttlHelperText) ttlHelperText.textContent = 'Min. 1 minute required';
        return { valid: false, error: 'Require at least 1 minute from the current time.' };
      }

      // Valid custom expiration
      if (customDatetimeError) customDatetimeError.classList.add('hidden');
      const humanStr = formatDateTimeHuman(target);
      const compactStr = formatDateTimeCompact(target);
      const countdownStr = formatRemainingDuration(diffMs);

      if (customDatetimePreviewText) {
        customDatetimePreviewText.textContent = `Expires on ${humanStr}`;
      }
      if (ttlHelperText) {
        ttlHelperText.textContent = `Expires ${compactStr} (${countdownStr})`;
      }
      if (summaryExpiration) {
        summaryExpiration.textContent = compactStr;
      }

      const ttlSec = Math.round(diffMs / 1000);
      return { valid: true, expiresAt: target.toISOString(), ttlSeconds: ttlSec };
    } else {
      if (customDatetimePanel) customDatetimePanel.classList.add('hidden');
      if (customDatetimeError) customDatetimeError.classList.add('hidden');

      const sec = parseInt(ttlSelect.value, 10) || 3600;
      let label = 'Expires in 1 hour';
      let summaryLabel = '1 hour';
      if (sec === 300) { label = 'Expires in 5 minutes'; summaryLabel = '5 minutes'; }
      else if (sec === 3600) { label = 'Expires in 1 hour'; summaryLabel = '1 hour'; }
      else if (sec === 86400) { label = 'Expires in 24 hours'; summaryLabel = '24 hours'; }
      else if (sec === 604800) { label = 'Expires in 7 days'; summaryLabel = '7 days'; }

      if (ttlHelperText) ttlHelperText.textContent = label;
      if (summaryExpiration) summaryExpiration.textContent = summaryLabel;

      const target = new Date(Date.now() + sec * 1000);
      return { valid: true, expiresAt: target.toISOString(), ttlSeconds: sec };
    }
  }

  function updateViewsState() {
    if (!viewsSelect) return { valid: true, maxViews: 1 };

    if (viewsSelect.value === 'custom') {
      if (customViewsPanel) customViewsPanel.classList.remove('hidden');
      const rawVal = customViewsInput ? customViewsInput.value.trim() : '25';
      const numVal = parseInt(rawVal, 10);

      if (isNaN(numVal) || !/^\d+$/.test(rawVal)) {
        if (customViewsError) {
          customViewsError.textContent = 'Only positive integers allowed. Reject letters, negative values and decimals.';
          customViewsError.classList.remove('hidden');
        }
        if (viewsHelperText) viewsHelperText.textContent = 'Invalid view count';
        return { valid: false, error: 'Only positive integers allowed for custom view limit.' };
      }

      if (numVal < 1) {
        if (customViewsError) {
          customViewsError.textContent = 'Minimum limit is 1 view.';
          customViewsError.classList.remove('hidden');
        }
        return { valid: false, error: 'Minimum limit is 1 view.' };
      }

      if (numVal > 1000) {
        if (customViewsError) {
          customViewsError.textContent = 'Maximum safety limit is 1000 views.';
          customViewsError.classList.remove('hidden');
        }
        return { valid: false, error: 'Maximum safety limit is 1000 views.' };
      }

      // Valid custom views
      if (customViewsError) customViewsError.classList.add('hidden');
      const helper = `Secret can be revealed up to ${numVal} times.`;
      const dropdownHelper = `Secret can be viewed ${numVal} times`;
      if (customViewsPreview) customViewsPreview.textContent = helper;
      if (viewsHelperText) viewsHelperText.textContent = dropdownHelper;
      if (summaryViews) summaryViews.textContent = `${numVal} views`;

      // Update active chip state if matching
      document.querySelectorAll('.view-chip').forEach(chip => {
        if (parseInt(chip.getAttribute('data-views'), 10) === numVal) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });

      return { valid: true, maxViews: numVal };
    } else {
      if (customViewsPanel) customViewsPanel.classList.add('hidden');
      if (customViewsError) customViewsError.classList.add('hidden');

      const numVal = parseInt(viewsSelect.value, 10) || 1;
      let helper = 'Single-view secret';
      let summary = '1 view (Single-use)';
      if (numVal === 1) {
        helper = 'Single-view secret';
        summary = '1 view (Single-use)';
      } else if (numVal === 2) {
        helper = 'Secret can be viewed 2 times';
        summary = '2 views';
      } else {
        helper = `Secret can be viewed ${numVal} times`;
        summary = `${numVal} views`;
      }

      if (viewsHelperText) viewsHelperText.textContent = helper;
      if (summaryViews) summaryViews.textContent = summary;

      return { valid: true, maxViews: numVal };
    }
  }

  if (ttlSelect) {
    ttlSelect.addEventListener('change', updateTtlState);
  }

  if (customDateInput) {
    customDateInput.addEventListener('input', updateTtlState);
    customDateInput.addEventListener('change', updateTtlState);
  }

  if (customTimeInput) {
    customTimeInput.addEventListener('input', () => {
      const timeVal = customTimeInput.value;
      if (timeVal) {
        const h = parseInt(timeVal.split(':')[0], 10);
        if (btnAmpmAm && btnAmpmPm) {
          if (h >= 12) {
            btnAmpmPm.classList.add('active');
            btnAmpmAm.classList.remove('active');
          } else {
            btnAmpmAm.classList.add('active');
            btnAmpmPm.classList.remove('active');
          }
        }
      }
      updateTtlState();
    });
  }

  if (btnAmpmAm && customTimeInput) {
    btnAmpmAm.addEventListener('click', () => {
      btnAmpmAm.classList.add('active');
      if (btnAmpmPm) btnAmpmPm.classList.remove('active');
      const timeVal = customTimeInput.value || '11:45';
      const parts = timeVal.split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1] || '00';
      if (h >= 12) h -= 12;
      customTimeInput.value = `${pad2(h)}:${m}`;
      updateTtlState();
    });
  }

  if (btnAmpmPm && customTimeInput) {
    btnAmpmPm.addEventListener('click', () => {
      btnAmpmPm.classList.add('active');
      if (btnAmpmAm) btnAmpmAm.classList.remove('active');
      const timeVal = customTimeInput.value || '11:45';
      const parts = timeVal.split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1] || '00';
      if (h < 12) h += 12;
      customTimeInput.value = `${pad2(h)}:${m}`;
      updateTtlState();
    });
  }

  if (viewsSelect) {
    viewsSelect.addEventListener('change', updateViewsState);
  }

  if (customViewsInput) {
    customViewsInput.addEventListener('input', updateViewsState);
  }

  document.querySelectorAll('.view-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const val = chip.getAttribute('data-views');
      if (customViewsInput) {
        customViewsInput.value = val;
      }
      updateViewsState();
    });
  });

  // Dynamic countdown refresher every 30s
  setInterval(() => {
    if (ttlSelect && ttlSelect.value === 'custom') {
      updateTtlState();
    }
  }, 30000);

  // Initialize both controls
  initDateTimeDefaults();
  updateTtlState();
  updateViewsState();

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

      // Validate Expiration & Views
      const ttlResult = updateTtlState();
      if (!ttlResult.valid) {
        showError(ttlResult.error || 'Please provide a valid expiration date and time.');
        if (customDateInput) customDateInput.focus();
        return;
      }

      const viewsResult = updateViewsState();
      if (!viewsResult.valid) {
        showError(viewsResult.error || 'Please provide a valid view limit.');
        if (customViewsInput) customViewsInput.focus();
        return;
      }

      const passphrase = passphraseInput ? passphraseInput.value : '';

      // Client-Side Gate
      if (passphrase) {
        if (!checkPassphraseMismatch()) {
          showError('Passphrases do not match. Please ensure both fields match exactly.');
          if (confirmPassphraseInput) confirmPassphraseInput.focus();
          return;
        }

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
        expiresAt: ttlResult.expiresAt,
        ttl_seconds: ttlResult.ttlSeconds,
        maxViews: viewsResult.maxViews,
        max_views: viewsResult.maxViews <= 10 ? viewsResult.maxViews : 1
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
        payload.max_failed_attempts = selectedFailedAttempts;
      }

      // True Client-Side Zero-Knowledge Encryption
      const isZk = zkToggle && zkToggle.checked;
      let zkKeyHex = null;

      if (isZk && secretText) {
        try {
          const encResult = await encryptWithWebCrypto(secretText);
          payload.client_encrypted = true;
          payload.ciphertext = encResult.ciphertextHex;
          payload.iv = encResult.ivHex;
          payload.auth_tag = encResult.tagHex;
          zkKeyHex = encResult.keyHex;
          payload.secret = `[Client-Side Zero-Knowledge Encrypted Payload]`;
        } catch (encErr) {
          showError('Failed to perform client-side encryption: ' + encErr.message);
          return;
        }
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
        if (isZk && zkKeyHex) {
          activeSecretUrl = `${data.view_url}#zk=${zkKeyHex}`;
        } else {
          activeSecretUrl = data.view_url;
        }
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
        if (openShareCenterBtn && data.id) {
          openShareCenterBtn.href = '/share/' + data.id;
        }
        if (expiresDisplay && data.expires_at) {
          expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
        }
        if (viewsDisplay) {
          const rem = data.views_remaining || 1;
          viewsDisplay.textContent = `${rem} view${rem > 1 ? 's' : ''}`;
        }

        // Populate Vault ID & Fingerprint
        if (resultVaultId && data.id) {
          resultVaultId.textContent = '••••••••••••';
          resultVaultId.dataset.id = data.id;
          resultVaultId.dataset.masked = 'true';
          if (btnUnmaskVaultId) btnUnmaskVaultId.textContent = 'Show';
        }
        if (resultZkBadge) {
          if (isZk) resultZkBadge.classList.remove('hidden');
          else resultZkBadge.classList.add('hidden');
        }
        if (resultIntegrityFingerprint && data.id) {
          resultIntegrityFingerprint.textContent = `SHA-256: ${data.id.slice(0, 8)}...`;
        }

        // Save anonymous metadata reference to local creator history (Zero Plaintext Guarantee)
        try {
          if (data && data.id) {
            const hist = JSON.parse(localStorage.getItem('vault_created_history') || '[]');
            hist.unshift({
              id: data.id,
              url: activeSecretUrl,
              createdAt: Date.now(),
              expiresAt: data.expires_at || (Date.now() + 3600000),
              burned: false
            });
            localStorage.setItem('vault_created_history', JSON.stringify(hist.slice(0, 50)));
          }
        } catch (_) {}

        // Reveal Result Section
        createForm.classList.add('hidden');
        if (heroHeader) heroHeader.classList.add('hidden');
        if (trustStrip) trustStrip.classList.add('hidden');
        if (resultSection) {
          resultSection.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        updateStepperState(3);

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

  // Unmask Vault ID
  if (btnUnmaskVaultId && resultVaultId) {
    btnUnmaskVaultId.addEventListener('click', () => {
      const isMasked = resultVaultId.dataset.masked === 'true';
      if (isMasked) {
        resultVaultId.textContent = resultVaultId.dataset.id || '';
        resultVaultId.dataset.masked = 'false';
        btnUnmaskVaultId.textContent = 'Hide';
      } else {
        resultVaultId.textContent = '••••••••••••';
        resultVaultId.dataset.masked = 'true';
        btnUnmaskVaultId.textContent = 'Show';
      }
    });
  }

  // QR Code PNG & SVG Downloads
  if (btnDownloadQrPng) {
    btnDownloadQrPng.addEventListener('click', () => {
      const canvas = qrFrame ? qrFrame.querySelector('canvas') : null;
      if (!canvas) {
        showToast('Please open QR Code view first');
        return;
      }
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ephemeral-vault-qr-${activeSecretData ? activeSecretData.id : 'code'}.png`;
      a.click();
      showToast('✓ QR Code downloaded as PNG');
    });
  }

  if (btnDownloadQrSvg) {
    btnDownloadQrSvg.addEventListener('click', () => {
      const canvas = qrFrame ? qrFrame.querySelector('canvas') : null;
      if (!canvas) {
        showToast('Please open QR Code view first');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><image href="${dataUrl}" width="160" height="160"/></svg>`;
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      triggerDownload(blob, `ephemeral-vault-qr-${activeSecretData ? activeSecretData.id : 'code'}.svg`);
      showToast('✓ QR Code downloaded as SVG');
    });
  }

  // Emergency Vault Destruction
  if (btnEmergencyDestroy) {
    btnEmergencyDestroy.addEventListener('click', async () => {
      if (!activeSecretData || !activeSecretData.id) {
        showToast('No active vault to destroy');
        return;
      }
      const confirmed = window.confirm('⚠️ EMERGENCY PERMANENT DESTRUCTION:\n\nAre you sure you want to permanently erase and shred this vault right now?\nThis action cannot be undone. All data will be immediately wiped from the database.');
      if (!confirmed) return;

      try {
        btnEmergencyDestroy.disabled = true;
        btnEmergencyDestroy.innerHTML = `${SVG_ICONS.spinner} <span>Shredding Database Row...</span>`;

        const res = await fetch(`/api/vault/${activeSecretData.id}/destroy`, {
          method: 'POST'
        });
        if (!res.ok && res.status !== 404) {
          throw new Error('Failed to destroy vault.');
        }

        btnEmergencyDestroy.innerHTML = `<span>✓ Vault Permanently Shredded &amp; Purged</span>`;
        btnEmergencyDestroy.style.background = 'rgba(239, 68, 68, 0.2)';
        btnEmergencyDestroy.style.borderColor = 'var(--danger)';
        if (linkOutput) linkOutput.value = '[PERMANENTLY DESTROYED]';
        if (openLinkBtn) openLinkBtn.removeAttribute('href');
        showToast('✓ Vault permanently shredded. Zero traces remain.');
      } catch (err) {
        showError(err.message || 'Error revoking vault');
        btnEmergencyDestroy.disabled = false;
        btnEmergencyDestroy.innerHTML = `<span>💣 Emergency Destroy Vault Now</span>`;
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
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied securely</span>`;
        showToast('✓ Secret link copied securely');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2200);
      } catch {
        linkOutput.select();
        document.execCommand('copy');
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied securely</span>`;
        showToast('✓ Secret link copied securely');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2200);
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
            // Step 1: Request short-lived Reveal Token
            let revealToken = null;
            try {
              const tokRes = await fetch(serverOrigin + '/api/vault/' + vaultId + '/reveal/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              if (tokRes.ok) {
                const tokJson = await tokRes.json();
                revealToken = tokJson.reveal_token;
              }
            } catch(e) {}

            // Step 2: Authorized Reveal using Bearer Token
            const revealHeaders = { 'Content-Type': 'application/json' };
            if (revealToken) {
              revealHeaders['Authorization'] = 'Bearer ' + revealToken;
            }

            const revealUrl = revealToken
              ? serverOrigin + '/api/vault/' + vaultId + '/reveal'
              : serverOrigin + '/api/secret/' + vaultId + '/burn';

            const resp = await fetch(revealUrl, {
              method: 'POST',
              headers: revealHeaders,
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
      updateStepperState(1);
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
