(() => {
  'use strict';

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

  function getFileIcon(name, mime) {
    const ext = name.split('.').pop().toLowerCase();
    if (mime.startsWith('image/')) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'sh', 'c', 'cpp', 'rs', 'go', 'php'].includes(ext)) return '💻';
    if (['pem', 'key', 'crt', 'cer', 'p12', 'env'].includes(ext)) return '🔑';
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return '📦';
    return '📄';
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
      btnToggleEye.textContent = isPassword ? '🔒' : '👁️';
      btnToggleEye.setAttribute('aria-label', isPassword ? 'Hide passphrase' : 'Show passphrase');
    });
  }

  // Theme toggle
  if (themeToggle) {
    const savedTheme = localStorage.getItem('vault_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      themeToggle.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      themeToggle.textContent = isLight ? '☀️' : '🌙';
      localStorage.setItem('vault_theme', isLight ? 'light' : 'dark');
      showToast(isLight ? 'Switched to Light Theme' : 'Switched to Cyber Cosmic Dark Theme');
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
        fileIcon.textContent = getFileIcon(file.name, file.type || '');
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
        showError('Please enter a secret text note or attach a file.');
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
      submitBtn.innerHTML = '<span>⏳ Encrypting & Sealing Vault...</span>';

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

        // Setup Social Sharing Integrations
        const shareText = `🔒 Confidential Secret: I've sent you a self-destructing secret link via Ephemeral Secret Vault.\n\nOpen link: ${data.view_url}\n\n⚠️ Notice: This link permanently self-destructs once viewed!`;

        // WhatsApp
        shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

        // Microsoft Teams
        shareTeams.href = `https://teams.microsoft.com/share?href=${encodeURIComponent(data.view_url)}&msgText=${encodeURIComponent("🔒 I have shared a confidential self-destructing secret with you.")}`;

        // Email
        const emailSubject = '🔒 Secure Self-Destructing Secret Link';
        const emailBody = `Hello,\n\nI have shared a confidential secret with you via Ephemeral Secret Vault:\n\n${data.view_url}\n\n⚠️ IMPORTANT: This secret will be permanently destroyed from storage once viewed or when it expires. Zero copies remain after destruction.\n`;
        shareEmail.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        // Hide form, show result
        createForm.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🔒 Encrypt &amp; Generate Self-Destructing Link</span>';
      }
    });
  }

  // Copy link handler
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkOutput.value);
        copyBtn.textContent = 'Copied!';
        showToast('Link copied to clipboard!');
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Link';
        }, 2000);
      } catch {
        linkOutput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        showToast('Link copied to clipboard!');
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Link';
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
        showToast('SHA-256 Fingerprint copied to clipboard!');
      } catch {
        showToast('Failed to copy fingerprint.');
      }
    });
  }

  // Slack share handler (copies mrkdwn + launches Slack)
  if (shareSlack) {
    shareSlack.addEventListener('click', async () => {
      const slackSnippet = `*🔒 Encrypted Self-Destructing Secret*\nView Link: <${activeSecretUrl}>\n> ⚠️ _This secret link self-destructs automatically once opened._`;
      try {
        await navigator.clipboard.writeText(slackSnippet);
        showToast('Slack-formatted message copied to clipboard!');
      } catch {
        showToast('Failed to copy to clipboard.');
      }
      window.open('https://slack.com/app_redirect', '_blank');
    });
  }

  // Discord share handler (copies Discord markdown)
  if (shareDiscord) {
    shareDiscord.addEventListener('click', async () => {
      const discordSnippet = `**🔒 Ephemeral Secret Vault**\n> **Secret Link:** ${activeSecretUrl}\n> ⚠️ *Warning: This link will self-destruct and permanently delete upon being opened.*`;
      try {
        await navigator.clipboard.writeText(discordSnippet);
        showToast('Discord markdown copied to clipboard!');
      } catch {
        showToast('Failed to copy to clipboard.');
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
            text: '🔒 Here is a secure, self-destructing secret link:',
            url: activeSecretUrl
          });
          showToast('Shared successfully!');
        } catch (err) {
          if (err.name !== 'AbortError') {
            showToast('Sharing cancelled or failed.');
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
