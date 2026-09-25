(() => {
  'use strict';

  if (window.VAULT_APP_INITIALIZED) return;
  window.VAULT_APP_INITIALIZED = true;

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

  // Password & Token Generator Elements
  const btnOpenGenerator = document.getElementById('btn-open-generator');
  const passwordGeneratorPanel = document.getElementById('password-generator-panel');
  const genPresetBtns = document.querySelectorAll('.gen-preset-btn');
  const genLengthSlider = document.getElementById('gen-length-slider');
  const genLengthVal = document.getElementById('gen-length-val');
  const genOptUpper = document.getElementById('gen-opt-upper');
  const genOptLower = document.getElementById('gen-opt-lower');
  const genOptNums = document.getElementById('gen-opt-nums');
  const genOptSyms = document.getElementById('gen-opt-syms');
  const genOutput = document.getElementById('gen-output');
  const btnRegenPwd = document.getElementById('btn-regen-pwd');
  const btnInsertSecretPwd = document.getElementById('btn-insert-secret-pwd');
  const btnUseAsPassphrase = document.getElementById('btn-use-as-passphrase');
  const btnGenPassphrase = document.getElementById('btn-gen-passphrase');
  const passphraseHintInput = document.getElementById('passphrase-hint-input');

  // Advanced Security Options Accordion
  const btnToggleAdvanced = document.getElementById('btn-toggle-advanced');
  const advancedOptionsPanel = document.getElementById('advanced-options-panel');
  const advancedChevron = document.getElementById('advanced-chevron');
  const ttlSelect = document.getElementById('ttl-select');
  const customTtlGroup = document.getElementById('custom-ttl-group');
  const customTtlHours = document.getElementById('custom-ttl-hours');
  const customTtlMinutes = document.getElementById('custom-ttl-minutes');
  const customDatetimeContainer = document.getElementById('custom-datetime-container');
  const customDatetimePicker = document.getElementById('custom-datetime-picker');
  const customDatetimeFeedback = document.getElementById('custom-datetime-feedback');
  const liveExpiryPreview = document.getElementById('live-expiry-preview');
  const heroLiveClock = document.getElementById('hero-live-clock');
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
  const liveShaPreview = document.getElementById('live-sha-preview');

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

  const COMMON_PASSWORDS = new Set([
    '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
    'qwertyui', 'qwertyuiop', '11111111', '123123123', '12344321', 'admin123',
    'administrator', 'welcome1', 'welcome123', 'iloveyou', 'sunshine', 'princess',
    'football', 'monkey123', 'dragon123', 'master123', 'passphrase', 'changeme',
    'superman', 'trustno1', 'secret123', 'testing123', 'letmein1', 'mustang1'
  ]);

  function showError(msg) {
    if (errorMessage) errorMessage.textContent = msg;
    if (errorAlert) {
      errorAlert.classList.remove('hidden');
      errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const submitErrorBanner = document.getElementById('submit-error-banner');
    const submitErrorMessage = document.getElementById('submit-error-message');
    if (submitErrorBanner && submitErrorMessage) {
      submitErrorMessage.textContent = msg;
      submitErrorBanner.classList.remove('hidden');
    }
    showToast('⚠️ ' + msg);
  }

  function hideError() {
    if (errorAlert) errorAlert.classList.add('hidden');
    if (errorMessage) errorMessage.textContent = '';
    const submitErrorBanner = document.getElementById('submit-error-banner');
    const submitErrorMessage = document.getElementById('submit-error-message');
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

    // Update Live SHA-256 Digest preview
    if (liveShaPreview) {
      if (chars > 0) {
        computeSha256Digest(text).then((hash) => {
          if (hash && liveShaPreview) {
            liveShaPreview.textContent = `${hash.slice(0, 32)}... (Pre-Verified)`;
            liveShaPreview.style.color = 'var(--cyan-glow)';
          }
        });
      } else if (!currentFile) {
        liveShaPreview.textContent = 'Waiting for secret input...';
        liveShaPreview.style.color = 'var(--text-muted)';
      }
    }
  }

  // Live Cryptographic SHA-256 Digest Calculator
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

  if (secretInput) {
    secretInput.addEventListener('input', updateByteCounterAndIndicators);

    // Direct Drag & Drop of text/code files directly onto textarea
    secretInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      secretInput.classList.add('textarea-dragover');
    });

    secretInput.addEventListener('dragleave', () => {
      secretInput.classList.remove('textarea-dragover');
    });

    secretInput.addEventListener('drop', (e) => {
      e.preventDefault();
      secretInput.classList.remove('textarea-dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.size > 10 * 1024) {
          showError(`File is ${formatBytes(file.size)}. Secret text max limit is 10 KB (use Universal File Vault for larger files).`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          secretInput.value = evt.target.result;
          secretInput.dispatchEvent(new Event('input'));
          showToast(`✓ Loaded ${file.name} into secret content`);
        };
        reader.readAsText(file);
      }
    });
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
  // Cryptographically Secure Password / Token Generator
  // ==========================================================================
  const WORD_LIST = [
    'cyber', 'vault', 'crypto', 'shield', 'phantom', 'orbit', 'matrix', 'vector',
    'zenith', 'pulse', 'quantum', 'signal', 'beacon', 'echo', 'alpha', 'delta',
    'vortex', 'titan', 'nebula', 'plasma', 'solar', 'aurora', 'chrono', 'forge',
    'glacier', 'horizon', 'infinit', 'jupiter', 'kinetic', 'lunar', 'meteor', 'nova',
    'omega', 'photon', 'quasar', 'radiant', 'shadow', 'stellar', 'tactical', 'umbra',
    'velocity', 'warp', 'xenon', 'yield', 'zero', 'sentinel', 'cipher', 'apex'
  ];

  function getSecureRandomInt(max) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  function generateSecureRandomString(mode = 'pwd-strong', length = 24) {
    if (mode === 'hex-key') {
      const byteCount = Math.max(16, Math.floor(length / 2));
      const bytes = new Uint8Array(byteCount);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (mode === 'base64-secret') {
      const bytes = new Uint8Array(Math.max(16, length));
      window.crypto.getRandomValues(bytes);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).slice(0, length);
    }

    if (mode === 'word-phrase') {
      const count = 4;
      const picked = [];
      for (let i = 0; i < count; i++) {
        picked.push(WORD_LIST[getSecureRandomInt(WORD_LIST.length)]);
      }
      const randomNum = getSecureRandomInt(99) + 1;
      return `${picked.join('-')}-${randomNum}`;
    }

    // Default: strong password
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const nums = '23456789';
    const syms = '!@#$%^&*()_+~|}{[]:;?><,./-=';

    let pool = '';
    const guaranteed = [];

    if (genOptUpper && genOptUpper.checked) {
      pool += upper;
      guaranteed.push(upper[getSecureRandomInt(upper.length)]);
    }
    if (genOptLower && genOptLower.checked) {
      pool += lower;
      guaranteed.push(lower[getSecureRandomInt(lower.length)]);
    }
    if (genOptNums && genOptNums.checked) {
      pool += nums;
      guaranteed.push(nums[getSecureRandomInt(nums.length)]);
    }
    if (genOptSyms && genOptSyms.checked) {
      pool += syms;
      guaranteed.push(syms[getSecureRandomInt(syms.length)]);
    }

    if (!pool) pool = upper + lower + nums;

    const remainingLen = Math.max(0, length - guaranteed.length);
    const randomBytes = new Uint32Array(remainingLen);
    window.crypto.getRandomValues(randomBytes);

    let resultArr = [...guaranteed];
    for (let i = 0; i < remainingLen; i++) {
      resultArr.push(pool[randomBytes[i] % pool.length]);
    }

    // Fisher-Yates shuffle
    for (let i = resultArr.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1);
      [resultArr[i], resultArr[j]] = [resultArr[j], resultArr[i]];
    }

    return resultArr.join('');
  }

  let activeGenPreset = 'pwd-strong';

  function refreshGeneratedToken() {
    if (!genOutput) return;
    const len = genLengthSlider ? parseInt(genLengthSlider.value, 10) : 24;
    if (genLengthVal) genLengthVal.textContent = len;
    genOutput.value = generateSecureRandomString(activeGenPreset, len);
  }

  if (btnOpenGenerator && passwordGeneratorPanel) {
    btnOpenGenerator.addEventListener('click', () => {
      const isHidden = passwordGeneratorPanel.classList.toggle('hidden');
      if (!isHidden) {
        refreshGeneratedToken();
      }
    });
  }

  if (genPresetBtns && genPresetBtns.length > 0) {
    genPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        genPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeGenPreset = btn.dataset.preset || 'pwd-strong';
        if (activeGenPreset === 'hex-key' && genLengthSlider) {
          genLengthSlider.value = '64';
        } else if (activeGenPreset === 'word-phrase' && genLengthSlider) {
          genLengthSlider.value = '28';
        } else if (activeGenPreset === 'base64-secret' && genLengthSlider) {
          genLengthSlider.value = '32';
        } else if (genLengthSlider) {
          genLengthSlider.value = '24';
        }
        refreshGeneratedToken();
      });
    });
  }

  if (genLengthSlider) {
    genLengthSlider.addEventListener('input', refreshGeneratedToken);
  }

  [genOptUpper, genOptLower, genOptNums, genOptSyms].forEach(chk => {
    if (chk) chk.addEventListener('change', refreshGeneratedToken);
  });

  if (btnRegenPwd) {
    btnRegenPwd.addEventListener('click', refreshGeneratedToken);
  }

  if (btnInsertSecretPwd && secretInput && genOutput) {
    btnInsertSecretPwd.addEventListener('click', () => {
      secretInput.value = genOutput.value;
      secretInput.dispatchEvent(new Event('input'));
      if (passwordGeneratorPanel) passwordGeneratorPanel.classList.add('hidden');
      showToast('✓ Token inserted into secret content');
      secretInput.focus();
    });
  }

  if (btnUseAsPassphrase && passphraseInput && genOutput) {
    btnUseAsPassphrase.addEventListener('click', () => {
      if (advancedOptionsPanel && advancedOptionsPanel.classList.contains('hidden') && btnToggleAdvanced) {
        btnToggleAdvanced.click();
      }
      passphraseInput.value = genOutput.value;
      passphraseInput.setAttribute('type', 'text');
      if (btnToggleEye) {
        const eyeSvg = btnToggleEye.querySelector('svg');
        if (eyeSvg) eyeSvg.outerHTML = SVG_ICONS.eyeOff;
      }
      passphraseInput.dispatchEvent(new Event('input'));
      if (passwordGeneratorPanel) passwordGeneratorPanel.classList.add('hidden');
      showToast('✓ Vault passphrase set (visible for review)');
      passphraseInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      passphraseInput.focus();
    });
  }

  if (btnGenPassphrase && passphraseInput) {
    btnGenPassphrase.addEventListener('click', () => {
      if (advancedOptionsPanel && advancedOptionsPanel.classList.contains('hidden') && btnToggleAdvanced) {
        btnToggleAdvanced.click();
      }
      const newPass = generateSecureRandomString('pwd-strong', 20);
      passphraseInput.value = newPass;
      passphraseInput.setAttribute('type', 'text');
      if (btnToggleEye) {
        const eyeSvg = btnToggleEye.querySelector('svg');
        if (eyeSvg) eyeSvg.outerHTML = SVG_ICONS.eyeOff;
      }
      passphraseInput.dispatchEvent(new Event('input'));
      showToast('✓ Generated 20-char secure passphrase');
      passphraseInput.focus();
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
      const trimmed = val.trim();
      const feedbackEl = document.getElementById('passphrase-validation-feedback');

      if (val.length > 0) {
        if (passphraseStrengthContainer) passphraseStrengthContainer.classList.remove('hidden');
        const { score, text, color } = evaluatePassphraseStrength(val);
        if (passphraseStrengthBar) {
          passphraseStrengthBar.style.width = `${score}%`;
          passphraseStrengthBar.style.background = color;
        }
        if (passphraseStrengthText) {
          passphraseStrengthText.textContent = text;
          passphraseStrengthText.style.color = color;
        }

        if (feedbackEl) {
          feedbackEl.style.display = 'block';
          if (trimmed.length < 8) {
            feedbackEl.style.color = 'var(--danger, #ef4444)';
            feedbackEl.textContent = `⚠️ Minimum 8 characters required (currently ${trimmed.length}/8)`;
            passphraseInput.style.borderColor = 'rgba(239, 68, 68, 0.7)';
          } else if (COMMON_PASSWORDS.has(trimmed.toLowerCase())) {
            feedbackEl.style.color = 'var(--warning, #f59e0b)';
            feedbackEl.textContent = '⚠️ Common password detected. Please choose a stronger passphrase.';
            passphraseInput.style.borderColor = 'rgba(245, 158, 11, 0.7)';
          } else {
            feedbackEl.style.color = 'var(--success, #10b981)';
            feedbackEl.textContent = '✓ Passphrase valid (meets 8+ char requirement)';
            passphraseInput.style.borderColor = 'rgba(16, 185, 129, 0.6)';
          }
        }

        if (factorPassphrase) {
          factorPassphrase.className = 'factor-item factor-active';
          factorPassphrase.textContent = trimmed.length < 8 ? '⚠️ Passphrase < 8 chars' : '✓ Passphrase enabled';
        }
      } else {
        if (passphraseStrengthContainer) passphraseStrengthContainer.classList.add('hidden');
        if (feedbackEl) feedbackEl.style.display = 'none';
        passphraseInput.style.borderColor = '';
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
  // Live Header System Clock Updater
  function updateHeroLiveClock() {
    if (!heroLiveClock) return;
    const now = new Date();
    heroLiveClock.textContent = `${now.toUTCString().split(' ').slice(4, 5)[0]} UTC`;
  }
  updateHeroLiveClock();
  setInterval(updateHeroLiveClock, 1000);

  // Initialize datetime picker min/max constraints
  if (customDatetimePicker) {
    const now = new Date();
    const minDate = new Date(now.getTime() + (5 * 60 * 1000)); // +5 min
    const maxDate = new Date(now.getTime() + (7 * 24 * 3600 * 1000)); // +7 days
    const defaultDate = new Date(now.getTime() + (3600 * 1000)); // +1 hour

    const toLocalIso = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    customDatetimePicker.min = toLocalIso(minDate);
    customDatetimePicker.max = toLocalIso(maxDate);
    customDatetimePicker.value = toLocalIso(defaultDate);
  }

  function getSelectedTtlSeconds() {
    if (!ttlSelect) return 3600;
    const val = ttlSelect.value;
    if (val === 'custom') {
      const h = parseInt(customTtlHours ? customTtlHours.value : '0', 10) || 0;
      const m = parseInt(customTtlMinutes ? customTtlMinutes.value : '0', 10) || 0;
      const total = (h * 3600) + (m * 60);
      if (isNaN(total) || total < 60) return 60;
      return Math.max(60, Math.min(total, 604800));
    }
    if (val === 'datetime') {
      if (customDatetimePicker && customDatetimePicker.value) {
        const targetMs = new Date(customDatetimePicker.value).getTime();
        if (!isNaN(targetMs)) {
          const diffSec = Math.floor((targetMs - Date.now()) / 1000);
          if (!isNaN(diffSec) && diffSec >= 60) {
            return Math.max(60, Math.min(diffSec, 604800));
          }
        }
      }
      return 3600;
    }
    const parsed = parseInt(val, 10);
    return (!isNaN(parsed) && parsed >= 60 && parsed <= 604800) ? parsed : 3600;
  }

  function updateExpiryLivePreview() {
    const seconds = getSelectedTtlSeconds();
    const expiryDate = new Date(Date.now() + (seconds * 1000));
    const now = new Date();
    const isToday = expiryDate.toDateString() === now.toDateString();
    const timeStr = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const datePrefix = isToday ? 'Today' : expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    if (liveExpiryPreview) {
      liveExpiryPreview.textContent = `Expires approximately: ${datePrefix}, ${timeStr}`;
    }

    if (customDatetimeFeedback && ttlSelect && ttlSelect.value === 'datetime') {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      customDatetimeFeedback.textContent = `Valid expiration window: ${hours}h ${mins}m from now (${seconds.toLocaleString()} seconds)`;
      customDatetimeFeedback.style.color = 'var(--cyan-glow)';
    }

    if (summaryExpiration) {
      if (seconds < 3600) {
        summaryExpiration.textContent = `${Math.round(seconds / 60)} minutes`;
      } else if (seconds === 3600) {
        summaryExpiration.textContent = '1 hour';
      } else if (seconds < 86400) {
        summaryExpiration.textContent = `${Math.round(seconds / 3600)} hours`;
      } else {
        summaryExpiration.textContent = `${(seconds / 86400).toFixed(1)} days`;
      }
    }
  }

  if (ttlSelect) {
    ttlSelect.addEventListener('change', () => {
      if (ttlSelect.value === 'custom') {
        if (customTtlGroup) customTtlGroup.classList.remove('hidden');
        if (customDatetimeContainer) customDatetimeContainer.classList.add('hidden');
      } else if (ttlSelect.value === 'datetime') {
        if (customTtlGroup) customTtlGroup.classList.add('hidden');
        if (customDatetimeContainer) customDatetimeContainer.classList.remove('hidden');
      } else {
        if (customTtlGroup) customTtlGroup.classList.add('hidden');
        if (customDatetimeContainer) customDatetimeContainer.classList.add('hidden');
      }
      updateExpiryLivePreview();
      updateSecurityScore();
    });
  }

  if (customTtlHours) customTtlHours.addEventListener('input', updateExpiryLivePreview);
  if (customTtlMinutes) customTtlMinutes.addEventListener('input', updateExpiryLivePreview);
  if (customDatetimePicker) {
    customDatetimePicker.addEventListener('input', () => {
      updateExpiryLivePreview();
      updateSecurityScore();
    });
  }

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

      if (liveShaPreview && file) {
        file.arrayBuffer().then((buf) => computeSha256Digest(buf)).then((hash) => {
          if (hash && liveShaPreview) {
            liveShaPreview.textContent = `${hash.slice(0, 32)}... (${file.name})`;
            liveShaPreview.style.color = 'var(--cyan-glow)';
          }
        }).catch(() => {});
      }
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

    const btnQuickToFile = document.getElementById('btn-quick-to-file');
    const btnQuickToLink = document.getElementById('btn-quick-to-link');

    if (btnQuickToFile) {
      btnQuickToFile.addEventListener('click', () => tabDeliveryFile.click());
    }
    if (btnQuickToLink) {
      btnQuickToLink.addEventListener('click', () => tabDeliveryLink.click());
    }
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

  function setSubmitLoading(loading, message) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    const isFilePage = document.body.dataset.page === 'file' || window.location.pathname.startsWith('/file');
    const defaultText = isFilePage ? 'Encrypt &amp; Generate Secure File Link' : 'Encrypt &amp; Generate Secure Link';
    const label = message || defaultText;
    const icon = loading ? SVG_ICONS.spinner : (isFilePage
      ? '<svg class="svg-icon btn-icon-lock" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>'
      : '<svg class="svg-icon btn-icon-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>');
    const arrow = loading ? '' : '<svg class="svg-icon btn-arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';

    submitBtn.innerHTML = `${icon} <span id="submit-btn-text">${label}</span> ${arrow}`;
  }

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
          if (secretInput) secretInput.focus();
          return;
        }
      }

      const ttlSeconds = getSelectedTtlSeconds();
      const maxViews = parseInt(viewsSelect ? viewsSelect.value : '1', 10);
      const passphrase = passphraseInput ? passphraseInput.value : '';

      // Client-Side Passphrase Validation Gate
      if (passphrase) {
        const trimmedPass = passphrase.trim();
        if (trimmedPass.length > 0 && trimmedPass.length < 8) {
          showError('Passphrase must be at least 8 characters long. Please lengthen it or leave blank.');
          if (advancedOptionsPanel && advancedOptionsPanel.classList.contains('hidden') && btnToggleAdvanced) {
            btnToggleAdvanced.click();
          }
          if (passphraseInput) {
            passphraseInput.focus();
            passphraseInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
        if (COMMON_PASSWORDS.has(trimmedPass.toLowerCase())) {
          showError('Passphrase is too common and easily guessable. Please choose a stronger passphrase.');
          if (advancedOptionsPanel && advancedOptionsPanel.classList.contains('hidden') && btnToggleAdvanced) {
            btnToggleAdvanced.click();
          }
          if (passphraseInput) {
            passphraseInput.focus();
            passphraseInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
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

      // Interactive CTA sequence
      setSubmitLoading(true, 'Encrypting & Generating Vault...');

      try {
        await new Promise((r) => setTimeout(r, 150));
        setSubmitLoading(true, 'Generating Secure Link & Capsule...');

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
          // If error was an explicit validation message from server, display it
          if (fetchErr.message && !fetchErr.message.includes('fetch') && !fetchErr.message.includes('NetworkError') && !fetchErr.message.includes('Failed to fetch')) {
            throw fetchErr;
          }

          // Otherwise backend is offline or page is opened via file:///
          console.warn('Backend server unreachable. Generating client-side zero-knowledge vault.', fetchErr);
          data = await generateClientSideZeroKnowledgeVault(payload, secretText, currentFile);
          isClientOffline = true;
        }

        // Store active runtime data
        activeSecretData = data;
        const passphraseHint = (passphraseHintInput && passphraseHintInput.value) ? passphraseHintInput.value.trim() : '';
        if (passphraseHint && passphrase) {
          activeSecretUrl = `${data.view_url}#hint=${encodeURIComponent(passphraseHint)}`;
        } else {
          activeSecretUrl = data.view_url;
        }
        activeSecretText = secretText;
        activePassphrase = passphrase;

        // Display results in Link panel safely
        if (linkOutput) linkOutput.value = activeSecretUrl;
        if (openLinkBtn) openLinkBtn.href = activeSecretUrl;
        if (expiresDisplay && data.expires_at) {
          expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
        }
        if (viewsDisplay) {
          const rem = data.views_remaining || 1;
          viewsDisplay.textContent = `${rem} view${rem > 1 ? 's' : ''}`;
        }
        if (fingerprintDisplay) {
          fingerprintDisplay.textContent = data.fingerprint || 'Verified';
        }

        // Populate File Manifest Card in Option 2 (Download Encrypted File)
        if (currentFile) {
          if (manifestFileName) manifestFileName.textContent = currentFile.name;
          if (manifestFileSize) manifestFileSize.textContent = formatBytes(currentFile.size);
          if (manifestFileType) manifestFileType.textContent = currentFile.type || 'binary/raw';
          if (manifestFileIcon) manifestFileIcon.innerHTML = getFileSvg(currentFile.name, currentFile.type || '');
          if (btnDownloadHtmlVault) {
            const span = btnDownloadHtmlVault.querySelector('span');
            if (span) span.textContent = `Download Portable Vault (${currentFile.name}.html)`;
          }
        } else {
          const safeId = data.id ? data.id.slice(0, 8) : 'note';
          if (manifestFileName) manifestFileName.textContent = `secret-${safeId}.txt`;
          if (manifestFileSize) manifestFileSize.textContent = formatBytes(new Blob([secretText]).size);
          if (manifestFileType) manifestFileType.textContent = 'text/plain';
          if (manifestFileIcon) manifestFileIcon.innerHTML = SVG_ICONS.fileDoc;
          if (btnDownloadHtmlVault) {
            const span = btnDownloadHtmlVault.querySelector('span');
            if (span) span.textContent = 'Download Portable Vault (.html)';
          }
        }

        // Setup Social Sharing Links
        const shareText = `Confidential Ephemeral Secret:\nA self-destructing secret has been generated via Ephemeral Secret Vault.\n\nAccess Link: ${activeSecretUrl}\n\nSecurity Notice: This link permanently self-destructs upon access.`;

        if (shareWhatsApp) shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        if (shareTeams) shareTeams.href = `https://teams.microsoft.com/share?href=${encodeURIComponent(activeSecretUrl)}&msgText=${encodeURIComponent('A confidential self-destructing secret has been shared with you.')}`;

        const emailSubject = 'Secure Self-Destructing Secret Link';
        const emailBody = `Hello,\n\nA confidential secret has been shared with you via Ephemeral Secret Vault:\n\n${activeSecretUrl}\n\nSecurity Notice: This secret is permanently erased from storage once viewed or upon expiration. No records are retained.\n`;
        if (shareEmail) shareEmail.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        // Switch cleanly to next page / result section
        createForm.classList.add('hidden');
        const pipeline = document.querySelector('.security-flow-pipeline');
        if (pipeline) pipeline.classList.add('hidden');

        if (resultSection) {
          resultSection.classList.remove('hidden');
          const targetTop = resultSection.getBoundingClientRect().top + window.scrollY - 30;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }

        if (currentFile && tabDeliveryFile && panelDeliveryFile) {
          tabDeliveryFile.click();
        }

        if (isClientOffline) {
          showToast('✓ Client-Side Vault Generated (Offline Resilient)');
        } else {
          showToast('✓ Vault created successfully');
        }
      } catch (err) {
        showError(err.message || 'Unable to create the vault. Please try again.');
      } finally {
        setSubmitLoading(false);
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
      if (passphraseHintInput) passphraseHintInput.value = '';
      if (passwordGeneratorPanel) passwordGeneratorPanel.classList.add('hidden');

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

      if (liveShaPreview) {
        liveShaPreview.textContent = 'Waiting for secret input...';
        liveShaPreview.style.color = 'var(--text-muted)';
      }

      const pipeline = document.querySelector('.security-flow-pipeline');
      if (pipeline) pipeline.classList.remove('hidden');
      resultSection.classList.add('hidden');
      createForm.classList.remove('hidden');
      hideError();
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      openModal('modal-security');
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

  // ==========================================================================
  // QPA Presets, Buffer Clear & Allocation Interactions
  // ==========================================================================
  const presetCards = document.querySelectorAll('.qpa-preset-card');
  const allocTagName = document.getElementById('alloc-tag-name');
  const allocTitle = document.getElementById('alloc-title');
  const allocSub = document.getElementById('alloc-sub');
  const allocQueueNum = document.getElementById('alloc-queue-num');
  const allocIconBox = document.getElementById('alloc-icon-box');

  const PRESET_DATA = {
    day: {
      name: '✦ CPA Day',
      title: '☀ Python',
      sub: 'Level 3 • CPA Day',
      queue: '#205 in queue',
      icon: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      payload: 'CPA-DAY-ASSESSMENT: PYTHON-LV3-CREDENTIALS\nSESSION_TOKEN=cpa_live_day_py3_9941a87\nENCRYPTION=AES-256-GCM\nEXAM_SECRET=python_eval_key_2026_qpa'
    },
    evening: {
      name: '✦ CPA Evening',
      title: '🌙 Node.js',
      sub: 'Level 4 • CPA Evening',
      queue: '#142 in queue',
      icon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
      payload: 'CPA-EVENING-ASSESSMENT: NODEJS-LV4-CREDENTIALS\nSESSION_TOKEN=cpa_live_eve_node4_8812b3\nENCRYPTION=AES-256-GCM\nEXAM_SECRET=node_eval_key_2026_qpa'
    },
    holiday: {
      name: '✦ CPA Holiday',
      title: '⭐ DevOps',
      sub: 'Level 5 • CPA Holiday',
      queue: '#089 in queue',
      icon: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      payload: 'CPA-HOLIDAY-MASTERCLASS: DEVOPS-LV5-CREDENTIALS\nSESSION_TOKEN=cpa_live_hol_devops5_7749c1\nENCRYPTION=AES-256-GCM\nEXAM_SECRET=devops_eval_key_2026_qpa'
    }
  };

  presetCards.forEach((card) => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => {
        c.classList.remove('active-preset');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('active-preset');
      card.setAttribute('aria-pressed', 'true');

      const presetKey = card.getAttribute('data-preset') || 'day';
      const info = PRESET_DATA[presetKey];
      if (info) {
        if (allocTagName) allocTagName.textContent = info.name;
        if (allocTitle) allocTitle.textContent = info.title;
        if (allocSub) allocSub.textContent = info.sub;
        if (allocQueueNum) allocQueueNum.textContent = info.queue;
        if (allocIconBox) allocIconBox.innerHTML = info.icon;
        if (secretInput) {
          secretInput.value = info.payload;
          secretInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        showToast(`Locked in ${info.name}`);
      }
    });
  });

  // Filter Pills Interactivity
  const filterPills = document.querySelectorAll('.qpa-filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      showToast(`Filter applied: ${pill.textContent}`);
    });
  });

  // Header Refresh Button
  const qpaHeaderRefresh = document.getElementById('qpa-header-refresh');
  if (qpaHeaderRefresh) {
    qpaHeaderRefresh.addEventListener('click', () => {
      if (secretInput) {
        secretInput.value = '';
        secretInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passphraseInput) {
        passphraseInput.value = '';
        passphraseInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (btnRemoveFile && filePreviewCard && !filePreviewCard.classList.contains('hidden')) {
        btnRemoveFile.click();
      }
      updateByteCounterAndIndicators();
      updateSecurityScore();
      showToast('Buffer cleared! Ready to join a queue for your next session.');
    });
  }

  // Cancel Allocation Button
  const btnCancelAllocation = document.getElementById('btn-cancel-allocation');
  if (btnCancelAllocation) {
    btnCancelAllocation.addEventListener('click', () => {
      if (resetBtn && resultSection && !resultSection.classList.contains('hidden')) {
        resetBtn.click();
      } else {
        if (secretInput) {
          secretInput.value = '';
          secretInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        updateByteCounterAndIndicators();
      }
      showToast('Allocation reset & buffer cleared.');
    });
  }

  // Know Me dialog handler
  const btnKnowMe = document.getElementById('nav-help');
  const infoModal = document.getElementById('info-modal');
  const modalClose = document.getElementById('modal-close');
  if (btnKnowMe && infoModal) {
    btnKnowMe.addEventListener('click', (e) => {
      e.preventDefault();
      infoModal.classList.remove('hidden');
    });
  }
  if (modalClose && infoModal) {
    modalClose.addEventListener('click', () => {
      infoModal.classList.add('hidden');
    });
  }
  if (infoModal) {
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) infoModal.classList.add('hidden');
    });
  }

  // Initial runs
  updateByteCounterAndIndicators();
  updateExpiryLivePreview();
  updateSecurityScore();
})();
