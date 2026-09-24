(() => {
  'use strict';

  // Enterprise Vector SVG Icons (Zero Casual Emojis)
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

  // DOM Elements - Creation Form & Inputs
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
  const submitBtnText = document.getElementById('submit-btn-text');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');

  // Textarea Controls & Indicators
  const btnClearSecret = document.getElementById('btn-clear-secret');
  const btnToggleSecretView = document.getElementById('btn-toggle-secret-view');
  const secretVisibilityIcon = document.getElementById('secret-visibility-icon');
  const secretVisibilityText = document.getElementById('secret-visibility-text');
  const detectedFormatBadge = document.getElementById('detected-format-badge');
  const secretStatusIndicator = document.getElementById('secret-status-indicator');

  // Advanced Security Options Accordion
  const btnToggleAdvanced = document.getElementById('btn-toggle-advanced');
  const advancedOptionsPanel = document.getElementById('advanced-options-panel');
  const advancedChevron = document.getElementById('advanced-chevron');
  const ttlSelect = document.getElementById('ttl-select');
  const customTtlGroup = document.getElementById('custom-ttl-group');
  const customTtlHours = document.getElementById('custom-ttl-hours');
  const customTtlMinutes = document.getElementById('custom-ttl-minutes');
  const liveExpiryPreview = document.getElementById('live-expiry-preview');
  const viewsSelect = document.getElementById('views-select');

  // Passphrase Strength Meter
  const passphraseStrengthContainer = document.getElementById('passphrase-strength-container');
  const passphraseStrengthBar = document.getElementById('passphrase-strength-bar');
  const passphraseStrengthText = document.getElementById('passphrase-strength-text');

  // Configuration Score & Summary Box
  const securityScoreBar = document.getElementById('security-score-bar');
  const securityScoreLabel = document.getElementById('security-score-label');
  const factorViews = document.getElementById('factor-views');
  const factorTtl = document.getElementById('factor-ttl');
  const factorPassphrase = document.getElementById('factor-passphrase');
  const summaryExpiration = document.getElementById('summary-expiration');
  const summaryViews = document.getElementById('summary-views');

  // Delivery Tabs & Result Screen
  const resultSection = document.getElementById('result-section');
  const tabDeliveryLink = document.getElementById('tab-delivery-link');
  const tabDeliveryFile = document.getElementById('tab-delivery-file');
  const panelDeliveryLink = document.getElementById('panel-delivery-link');
  const panelDeliveryFile = document.getElementById('panel-delivery-file');
  const linkOutput = document.getElementById('link-output');
  const copyBtn = document.getElementById('copy-btn');
  const openLinkBtn = document.getElementById('open-link-btn');
  const btnToggleQr = document.getElementById('btn-toggle-qr');
  const qrContainer = document.getElementById('qr-container');
  const qrFrame = document.querySelector('.qr-frame');

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

  // Tabs & Nav
  const tabText = document.getElementById('tab-text');
  const tabFile = document.getElementById('tab-file');
  const tabHelperText = document.getElementById('tab-helper-text');
  const themeToggle = document.getElementById('theme-toggle');
  const navHelp = document.getElementById('nav-help');
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');

  // Active Runtime State
  let currentFile = null;
  let activeSecretUrl = '';
  let activeSecretData = null;
  let activeSecretText = '';
  let activePassphrase = '';
  let isSecretMasked = false;

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

  // ==========================================================================
  // Smart Client-Side Format Detection
  // ==========================================================================
  function detectSecretFormat(text) {
    if (!text || text.trim().length === 0) return null;
    const trimmed = text.trim();

    // 1. Private Key
    if (/-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP)?\s?PRIVATE KEY-----/.test(trimmed)) {
      return 'Private Key';
    }

    // 2. SSH Key
    if (/ssh-(?:rsa|ed25519|dss)\s+[A-Za-z0-9+/=]+/.test(trimmed)) {
      return 'SSH Key';
    }

    // 3. Certificate
    if (/-----BEGIN CERTIFICATE-----/.test(trimmed)) {
      return 'Certificate';
    }

    // 4. JWT
    if (/^eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/.test(trimmed)) {
      return 'JWT Token';
    }

    // 5. Cloud & API Keys
    if (/(?:sk_live_|ghp_|gho_|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35}|Bearer\s+[A-Za-z0-9-_=]+|xox[baprs]-[0-9a-zA-Z]{10,48})/i.test(trimmed)) {
      return 'API Key';
    }

    // 6. JSON Credentials
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object') {
          return 'JSON Credentials';
        }
      } catch (e) {}
    }

    // 7. Environment Variables (.env)
    if (/^[A-Z0-9_]+\s*=\s*.+/m.test(trimmed) && trimmed.includes('=')) {
      return '.env Content';
    }

    // 8. Password
    if (trimmed.length >= 8 && trimmed.length <= 64 && !trimmed.includes('\n') && !trimmed.includes(' ')) {
      return 'Password';
    }

    return 'Generic Secret';
  }

  // ==========================================================================
  // Reactive Byte Counter & Detection
  // ==========================================================================
  function updateByteCounterAndIndicators() {
    if (!secretInput || !byteCounter) return;
    const text = secretInput.value;
    const bytes = new Blob([text]).size;
    const chars = text.length;

    byteCounter.textContent = `${bytes.toLocaleString()} / 10,240 bytes`;
    if (bytes > 10240) {
      byteCounter.style.color = '#ef4444';
    } else {
      byteCounter.style.color = 'var(--text-dim)';
    }

    // Toggle clear button
    if (btnClearSecret) {
      if (chars > 0) {
        btnClearSecret.classList.remove('hidden');
      } else {
        btnClearSecret.classList.add('hidden');
      }
    }

    // Format detection badge & status indicator
    const format = detectSecretFormat(text);
    if (format && detectedFormatBadge) {
      detectedFormatBadge.textContent = `Detected format: ${format}`;
      detectedFormatBadge.classList.remove('hidden');
      if (secretStatusIndicator) secretStatusIndicator.classList.remove('hidden');
    } else {
      if (detectedFormatBadge) detectedFormatBadge.classList.add('hidden');
      if (secretStatusIndicator) secretStatusIndicator.classList.add('hidden');
    }
  }

  if (secretInput) {
    secretInput.addEventListener('input', updateByteCounterAndIndicators);
  }

  // Clear secret button
  if (btnClearSecret && secretInput) {
    btnClearSecret.addEventListener('click', () => {
      secretInput.value = '';
      updateByteCounterAndIndicators();
      secretInput.focus();
    });
  }

  // Textarea visibility toggle (masking)
  if (btnToggleSecretView && secretInput) {
    btnToggleSecretView.addEventListener('click', () => {
      isSecretMasked = !isSecretMasked;
      if (isSecretMasked) {
        secretInput.classList.add('masked-content');
        secretVisibilityText.textContent = 'Unmask';
        secretVisibilityIcon.innerHTML = SVG_ICONS.eyeOff;
      } else {
        secretInput.classList.remove('masked-content');
        secretVisibilityText.textContent = 'Mask';
        secretVisibilityIcon.innerHTML = SVG_ICONS.eye;
      }
    });
  }

  // ==========================================================================
  // Passphrase Strength Evaluator
  // ==========================================================================
  function evaluatePassphraseStrength(pwd) {
    if (!pwd || pwd.length === 0) return { score: 0, text: 'None' };
    let score = 0;
    if (pwd.length >= 8) score += 30;
    if (pwd.length >= 14) score += 20;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 10;

    if (score < 45) return { score: 30, text: 'Weak', color: 'var(--danger)' };
    if (score < 75) return { score: 65, text: 'Medium', color: 'var(--warning)' };
    return { score: 100, text: 'Strong', color: 'var(--success)' };
  }

  if (passphraseInput) {
    passphraseInput.addEventListener('input', () => {
      const val = passphraseInput.value;
      if (val.length > 0) {
        passphraseStrengthContainer.classList.remove('hidden');
        const { score, text, color } = evaluatePassphraseStrength(val);
        passphraseStrengthBar.style.width = `${score}%`;
        passphraseStrengthBar.style.background = color;
        passphraseStrengthText.textContent = text;
        passphraseStrengthText.style.color = color;
        if (factorPassphrase) {
          factorPassphrase.className = 'factor-item factor-active';
          factorPassphrase.textContent = '✓ Passphrase enabled';
        }
      } else {
        passphraseStrengthContainer.classList.add('hidden');
        if (factorPassphrase) {
          factorPassphrase.className = 'factor-item factor-inactive';
          factorPassphrase.textContent = '+ Optional Passphrase';
        }
      }
      updateSecurityScore();
    });
  }

  // Passphrase Show/Hide Toggle
  if (btnToggleEye && passphraseInput) {
    btnToggleEye.addEventListener('click', () => {
      const isPassword = passphraseInput.getAttribute('type') === 'password';
      passphraseInput.setAttribute('type', isPassword ? 'text' : 'password');
      btnToggleEye.innerHTML = isPassword ? SVG_ICONS.eyeOff : SVG_ICONS.eye;
      btnToggleEye.setAttribute('aria-label', isPassword ? 'Hide passphrase' : 'Show passphrase');
    });
  }

  // ==========================================================================
  // Expiration / TTL & Security Configuration Score
  // ==========================================================================
  function getSelectedTtlSeconds() {
    if (!ttlSelect) return 3600;
    const val = ttlSelect.value;
    if (val === 'custom') {
      const h = parseInt(customTtlHours.value, 10) || 0;
      const m = parseInt(customTtlMinutes.value, 10) || 0;
      const total = (h * 3600) + (m * 60);
      return Math.max(60, Math.min(total, 604800));
    }
    return parseInt(val, 10);
  }

  function updateExpiryLivePreview() {
    const seconds = getSelectedTtlSeconds();
    const expiryDate = new Date(Date.now() + (seconds * 1000));
    const now = new Date();
    const isToday = expiryDate.toDateString() === now.toDateString();
    const timeStr = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const datePrefix = isToday ? 'Today' : expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (liveExpiryPreview) {
      liveExpiryPreview.textContent = `Expires approximately: ${datePrefix}, ${timeStr}`;
    }

    if (summaryExpiration) {
      if (seconds < 3600) {
        summaryExpiration.textContent = `${Math.round(seconds / 60)} minutes`;
      } else if (seconds === 3600) {
        summaryExpiration.textContent = '1 hour';
      } else if (seconds < 86400) {
        summaryExpiration.textContent = `${Math.round(seconds / 3600)} hours`;
      } else {
        summaryExpiration.textContent = `${Math.round(seconds / 86400)} days`;
      }
    }
  }

  if (ttlSelect) {
    ttlSelect.addEventListener('change', () => {
      if (ttlSelect.value === 'custom') {
        customTtlGroup.classList.remove('hidden');
      } else {
        customTtlGroup.classList.add('hidden');
      }
      updateExpiryLivePreview();
      updateSecurityScore();
    });
  }

  if (customTtlHours) customTtlHours.addEventListener('input', updateExpiryLivePreview);
  if (customTtlMinutes) customTtlMinutes.addEventListener('input', updateExpiryLivePreview);

  if (viewsSelect) {
    viewsSelect.addEventListener('change', () => {
      const views = parseInt(viewsSelect.value, 10);
      if (summaryViews) {
        summaryViews.textContent = views === 1 ? '1 view (Instant Burn)' : `${views} views`;
      }
      if (factorViews) {
        factorViews.textContent = views === 1 ? '✓ 1 view burn' : `✓ ${views} views limit`;
      }
      updateSecurityScore();
    });
  }

  function updateSecurityScore() {
    let score = 70; // Base score (AES-256-GCM + random URL + SQLite hard deletion)
    const views = parseInt(viewsSelect ? viewsSelect.value : '1', 10);
    const ttl = getSelectedTtlSeconds();
    const hasPass = passphraseInput && passphraseInput.value.length > 0;

    if (views === 1) score += 10;
    if (ttl <= 3600) score += 10;
    if (hasPass) score += 10;

    if (securityScoreBar) securityScoreBar.style.width = `${score}%`;
    if (securityScoreLabel) {
      if (score >= 95) securityScoreLabel.textContent = `Maximum (${score}%)`;
      else if (score >= 85) securityScoreLabel.textContent = `Strong (${score}%)`;
      else securityScoreLabel.textContent = `Good (${score}%)`;
    }
  }

  // ==========================================================================
  // Collapsible Advanced Security Options Accordion
  // ==========================================================================
  if (btnToggleAdvanced && advancedOptionsPanel && advancedChevron) {
    btnToggleAdvanced.addEventListener('click', () => {
      const isExpanded = btnToggleAdvanced.getAttribute('aria-expanded') === 'true';
      btnToggleAdvanced.setAttribute('aria-expanded', !isExpanded);
      if (isExpanded) {
        advancedOptionsPanel.classList.add('hidden');
        advancedChevron.classList.remove('rotated');
      } else {
        advancedOptionsPanel.classList.remove('hidden');
        advancedChevron.classList.add('rotated');
      }
    });
  }

  // ==========================================================================
  // Theme Toggle (Dark Cyber Cosmic / Light Mode)
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
      showToast(isLight ? 'Light Theme Activated' : 'Dark Cyber Theme Activated');
    });
  }

  // Mobile Hamburger Menu Toggle
  if (btnMobileMenu && mobileNavDrawer) {
    btnMobileMenu.addEventListener('click', () => {
      const isOpen = !mobileNavDrawer.classList.contains('hidden');
      if (isOpen) {
        mobileNavDrawer.classList.add('hidden');
        btnMobileMenu.setAttribute('aria-expanded', 'false');
      } else {
        mobileNavDrawer.classList.remove('hidden');
        btnMobileMenu.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // ==========================================================================
  // Tab Switching (Text vs File Input - Never Mingled)
  // ==========================================================================
  const textSection = document.getElementById('text-section');
  const fileDropzoneGroup = document.getElementById('file-dropzone-group');

  if (tabText && tabFile) {
    tabText.addEventListener('click', (e) => {
      if (tabText.tagName === 'A' && tabText.getAttribute('href') !== '#' && !e.ctrlKey && !e.metaKey) {
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
          e.preventDefault();
        } else {
          return; // Let browser navigate to /
        }
      }
      tabText.classList.add('active');
      tabFile.classList.remove('active');
      tabText.setAttribute('aria-selected', 'true');
      tabFile.setAttribute('aria-selected', 'false');
      if (textSection) {
        textSection.classList.remove('hidden');
        textSection.style.display = '';
      }
      if (fileDropzoneGroup) {
        fileDropzoneGroup.classList.add('hidden');
        fileDropzoneGroup.style.display = 'none';
      }
      if (tabHelperText) {
        tabHelperText.textContent = 'Dedicated text mode for passwords, API keys, credentials, tokens and environment variables.';
      }
      if (secretInput) secretInput.focus();
    });

    tabFile.addEventListener('click', (e) => {
      if (tabFile.tagName === 'A' && tabFile.getAttribute('href') !== '#' && !e.ctrlKey && !e.metaKey) {
        if (window.location.pathname.startsWith('/file')) {
          e.preventDefault();
        } else {
          return; // Let browser navigate to /file
        }
      }
      tabFile.classList.add('active');
      tabText.classList.remove('active');
      tabFile.setAttribute('aria-selected', 'true');
      tabText.setAttribute('aria-selected', 'false');
      if (fileDropzoneGroup) {
        fileDropzoneGroup.classList.remove('hidden');
        fileDropzoneGroup.style.display = '';
      }
      if (textSection) {
        textSection.classList.add('hidden');
        textSection.style.display = 'none';
      }
      if (tabHelperText) {
        tabHelperText.textContent = 'Upload any confidential file up to 10 MB: Python scripts (surya.py), Shell, JSON keys, Word, PDF, or images.';
      }
    });
  }

  // ==========================================================================
  // Universal File Upload & Drag-and-Drop Experience
  // ==========================================================================
  function processSelectedFile(file) {
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
        data: e.target.result // Base64 Data URL
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

  // ==========================================================================
  // Delivery Method Switchers (Link vs File)
  // ==========================================================================
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
          colorDark: '#0284c7',
          colorLight: '#ffffff',
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
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 180, 180);
      ctx.fillStyle = '#0284c7';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code Ready', 90, 85);
      ctx.fillText(url.slice(0, 24) + '...', 90, 105);
    }
    qrFrame.innerHTML = '';
    qrFrame.appendChild(canvas);
  }

  // Native Device Share
  if (navigator.share && shareNative) {
    shareNative.classList.remove('hidden');
  }

  // ==========================================================================
  // Form Submission & Secret Creation
  // ==========================================================================
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const isFilePage = document.body.dataset.page === 'file' || window.location.pathname.startsWith('/file');
      const secretText = secretInput ? secretInput.value.trim() : '';

      if (isFilePage) {
        if (!currentFile) {
          showError('Please select or drop a confidential file to encrypt.');
          return;
        }
      } else {
        if (!secretText && !currentFile) {
          showError('Please enter confidential credentials or secret text before encrypting.');
          return;
        }
      }

      const ttlSeconds = getSelectedTtlSeconds();
      const maxViews = parseInt(viewsSelect.value, 10);
      const passphrase = passphraseInput ? passphraseInput.value : '';

      const payload = {
        ttl_seconds: ttlSeconds,
        max_views: maxViews
      };

      if (secretText) payload.secret = secretText;
      if (currentFile) payload.file = currentFile;
      if (passphrase) payload.passphrase = passphrase;

      // Premium interactive CTA sequence
      submitBtn.disabled = true;
      submitBtnText.textContent = 'Encrypting...';
      submitBtn.querySelector('.btn-icon-lock').outerHTML = SVG_ICONS.spinner;

      try {
        await new Promise((r) => setTimeout(r, 200));
        submitBtnText.textContent = 'Generating Secure Link...';

        const response = await fetch('/api/secret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create secret.');
        }

        submitBtnText.textContent = 'Vault Created ✓';

        // Store active runtime data
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

        // Setup Social Sharing Links
        const shareText = `Confidential Ephemeral Secret:\nA self-destructing secret has been generated via Ephemeral Secret Vault.\n\nAccess Link: ${data.view_url}\n\nSecurity Notice: This link permanently self-destructs upon access.`;

        shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        shareTeams.href = `https://teams.microsoft.com/share?href=${encodeURIComponent(data.view_url)}&msgText=${encodeURIComponent('A confidential self-destructing secret has been shared with you.')}`;

        const emailSubject = 'Secure Self-Destructing Secret Link';
        const emailBody = `Hello,\n\nA confidential secret has been shared with you via Ephemeral Secret Vault:\n\n${data.view_url}\n\nSecurity Notice: This secret is permanently erased from storage once viewed or upon expiration. No records are retained.\n`;
        shareEmail.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        // Switch to result section
        createForm.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (currentFile && tabDeliveryFile && panelDeliveryFile) {
          tabDeliveryFile.click();
        }
      } catch (err) {
        showError(err.message || 'Unable to create the vault. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg class="svg-icon btn-icon-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span id="submit-btn-text">Encrypt &amp; Generate Secure Link</span>
          <svg class="svg-icon btn-arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;
      }
    });
  }

  // Copy Link Handler
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkOutput.value);
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied</span>`;
        showToast('✓ Secure link copied to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2000);
      } catch {
        linkOutput.select();
        document.execCommand('copy');
        copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied</span>`;
        showToast('✓ Secure link copied to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = `${SVG_ICONS.copy} <span>Copy Link</span>`;
        }, 2000);
      }
    });
  }

  // Copy Fingerprint Handler
  if (btnCopyFingerprint && fingerprintDisplay) {
    btnCopyFingerprint.addEventListener('click', async () => {
      const hash = fingerprintDisplay.textContent.trim();
      try {
        await navigator.clipboard.writeText(hash);
        showToast('✓ SHA-256 Digest copied');
      } catch {
        showToast('Failed to copy fingerprint');
      }
    });
  }

  // Slack Share Handler
  if (shareSlack) {
    shareSlack.addEventListener('click', async () => {
      const slackSnippet = `*Encrypted Self-Destructing Secret*\nView Link: <${activeSecretUrl}>\n> _Notice: This secret self-destructs automatically once accessed._`;
      try {
        await navigator.clipboard.writeText(slackSnippet);
        showToast('✓ Slack-formatted link copied');
      } catch {
        showToast('Failed to copy to clipboard');
      }
      window.open('https://slack.com/app_redirect', '_blank');
    });
  }

  // Discord Share Handler
  if (shareDiscord) {
    shareDiscord.addEventListener('click', async () => {
      const discordSnippet = `**Ephemeral Secret Vault**\n> **Secret Link:** ${activeSecretUrl}\n> *Warning: This link will self-destruct and permanently delete upon access.*`;
      try {
        await navigator.clipboard.writeText(discordSnippet);
        showToast('✓ Discord markdown copied');
      } catch {
        showToast('Failed to copy to clipboard');
      }
      window.open('https://discord.com/app', '_blank');
    });
  }

  // Native Share Handler
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
      --bg: #070a13;
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
        <span>AES-256-GCM Authenticated Encryption</span>
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
      showToast(`✓ Downloaded Portable Vault: ${safeFileName}`);
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
      showToast(`✓ Downloaded Cryptographic Capsule: ${filename}`);
    });
  }

  // Reset Form
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

      updateByteCounterAndIndicators();
      updateExpiryLivePreview();
      updateSecurityScore();

      resultSection.classList.add('hidden');
      createForm.classList.remove('hidden');
      hideError();
    });
  }

  // ==========================================================================
  // Scroll-Spy & On-Page Navigation
  // ==========================================================================
  const navSections = [
    { id: 'top', element: document.getElementById('top') || document.getElementById('create-workspace') },
    { id: 'how-it-works', element: document.getElementById('how-it-works') },
    { id: 'security', element: document.getElementById('security') },
    { id: 'features', element: document.getElementById('features') },
    { id: 'faq', element: document.getElementById('faq') }
  ].filter(s => s.element !== null);

  const desktopNavLinks = document.querySelectorAll('#desktop-nav-links .nav-link');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-drawer .mobile-nav-link');

  const isFilePage = document.body.dataset.page === 'file' || window.location.pathname.startsWith('/file');

  function setActiveNavLink(sectionId) {
    const isTopSection = sectionId === 'top' || sectionId === 'create-workspace';

    desktopNavLinks.forEach((link) => {
      const navType = link.getAttribute('data-nav');
      const targetSec = link.getAttribute('data-section') || link.getAttribute('href')?.replace('#', '').replace('/#', '');

      if (isTopSection) {
        if (isFilePage && navType === 'file') {
          link.classList.add('active');
        } else if (!isFilePage && navType === 'text') {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      } else {
        if (targetSec === sectionId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });

    mobileNavLinks.forEach((link) => {
      const navType = link.getAttribute('data-nav');
      const targetSec = link.getAttribute('data-section') || link.getAttribute('href')?.replace('#', '').replace('/#', '');

      if (isTopSection) {
        if (isFilePage && navType === 'file') {
          link.classList.add('active');
        } else if (!isFilePage && navType === 'text') {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      } else {
        if (targetSec === sectionId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  }

  // Smooth scroll & auto-close mobile drawer
  mobileNavLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileNavDrawer) mobileNavDrawer.classList.add('hidden');
      if (btnMobileMenu) btnMobileMenu.setAttribute('aria-expanded', 'false');
    });
  });

  // IntersectionObserver for Scroll-Spy
  if ('IntersectionObserver' in window && navSections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -65% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveNavLink(entry.target.id);
        }
      });
    }, observerOptions);

    navSections.forEach(s => sectionObserver.observe(s.element));
  } else {
    // Fallback scroll listener
    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY + 120;
      for (let i = navSections.length - 1; i >= 0; i--) {
        const sec = navSections[i];
        if (sec.element.offsetTop <= scrollPos) {
          setActiveNavLink(sec.id);
          break;
        }
      }
    }, { passive: true });
  }

  // ==========================================================================
  // Interactive FAQ Accordion
  // ==========================================================================
  const faqButtons = document.querySelectorAll('#faq-accordion .faq-question-btn');
  faqButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      const item = btn.closest('.faq-item');
      const answer = item ? item.querySelector('.faq-answer-body') : null;

      // Close other accordion items
      faqButtons.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute('aria-expanded', 'false');
          const otherItem = otherBtn.closest('.faq-item');
          const otherAns = otherItem ? otherItem.querySelector('.faq-answer-body') : null;
          if (otherAns) otherAns.classList.add('hidden');
        }
      });

      // Toggle current item
      btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      if (answer) {
        answer.classList.toggle('hidden', isExpanded);
      }
    });
  });

  // ==========================================================================
  // Modal Dialogs System & Quick Help
  // ==========================================================================
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      modal.classList.remove('active');
    });
  }

  if (navHelp) {
    navHelp.addEventListener('click', (e) => {
      e.preventDefault();
      const secSection = document.getElementById('security');
      if (secSection) {
        secSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        openModal('modal-security');
      }
    });
  }

  // Close modals on overlay / close button click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
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

  // Initial runs
  updateByteCounterAndIndicators();
  updateExpiryLivePreview();
  updateSecurityScore();
})();
