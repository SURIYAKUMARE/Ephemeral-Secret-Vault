(() => {
  'use strict';

  // SVG Icon Templates
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
    fileDoc: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
  };

  // DOM Elements
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
  const resultSection = document.getElementById('result-section');
  const linkOutput = document.getElementById('link-output');
  const copyBtn = document.getElementById('copy-btn');
  const openLinkBtn = document.getElementById('open-link-btn');
  const expiresDisplay = document.getElementById('expires-display');
  const viewsDisplay = document.getElementById('views-display');
  const fingerprintDisplay = document.getElementById('fingerprint-display');
  const btnCopyFingerprint = document.getElementById('btn-copy-fingerprint');
  const resetBtn = document.getElementById('reset-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // Sharing buttons
  const shareWhatsApp = document.getElementById('share-whatsapp');
  const shareSlack = document.getElementById('share-slack');
  const shareTeams = document.getElementById('share-teams');
  const shareDiscord = document.getElementById('share-discord');
  const shareEmail = document.getElementById('share-email');
  const shareNative = document.getElementById('share-native');

  // Tabs
  const tabText = document.getElementById('tab-text');
  const tabFile = document.getElementById('tab-file');

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');

  // Nav modals
  const navHowItWorks = document.getElementById('nav-how-it-works');
  const navSecurity = document.getElementById('nav-security');
  const navFeatures = document.getElementById('nav-features');
  const navFaq = document.getElementById('nav-faq');

  // Active state
  let currentFile = null;
  let activeSecretUrl = '';

  // Helpers
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileSvg(name, mime) {
    const ext = name.split('.').pop().toLowerCase();
    if (mime.startsWith('image/')) return SVG_ICONS.fileImage;
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

  // Reactive byte counter
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

  // Tab switching
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

        // Display result
        activeSecretUrl = data.view_url;
        linkOutput.value = data.view_url;
        openLinkBtn.href = data.view_url;
        expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
        viewsDisplay.textContent = `${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''}`;
        fingerprintDisplay.textContent = data.fingerprint;

        // Setup Social Sharing Integrations (Professional Templates)
        const shareText = `Confidential Secret: A self-destructing secret has been generated via Ephemeral Secret Vault.\n\nAccess Link: ${data.view_url}\n\nSecurity Notice: This link permanently self-destructs upon access.`;

        // WhatsApp
        shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

        // Microsoft Teams
        shareTeams.href = `https://teams.microsoft.com/share?href=${encodeURIComponent(data.view_url)}&msgText=${encodeURIComponent("A confidential self-destructing secret has been shared with you.")}`;

        // Email
        const emailSubject = 'Secure Self-Destructing Secret Link';
        const emailBody = `Hello,\n\nA confidential secret has been shared with you via Ephemeral Secret Vault:\n\n${data.view_url}\n\nSecurity Notice: This secret is permanently erased from storage once viewed or upon expiration. No records are retained.\n`;
        shareEmail.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        // Hide form, show result
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

  // Slack share handler (copies mrkdwn + launches Slack)
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

  // Discord share handler (copies Discord markdown)
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

  // Reset form
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      createForm.reset();
      currentFile = null;
      if (fileInput) fileInput.value = '';
      if (filePreviewCard) filePreviewCard.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
      updateByteCounter();
      resultSection.classList.add('hidden');
      createForm.classList.remove('hidden');
      hideError();
    });
  }

  // Modal system
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
    }
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

  // Close modal when clicking X button or backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('modal-close-btn')) {
        overlay.classList.remove('active');
      }
    });
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Initial byte count
  updateByteCounter();
})();
