(() => {
  'use strict';

  // DOM Elements
  const vaultCard = document.getElementById('vault-card');
  const splashSection = document.getElementById('splash-section');
  const revealedSection = document.getElementById('revealed-section');
  const destroyedSection = document.getElementById('destroyed-section');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const burnBtn = document.getElementById('burn-btn');
  const passphraseInput = document.getElementById('view-passphrase');
  const burnStatusAlert = document.getElementById('burn-status-alert');
  const burnStatusTitle = document.getElementById('burn-status-title');
  const burnStatusDesc = document.getElementById('burn-status-desc');
  const secretDisplay = document.getElementById('secret-display');
  const copySecretBtn = document.getElementById('copy-secret-btn');
  const downloadTextBtn = document.getElementById('download-text-btn');
  const textDisplayGroup = document.getElementById('text-display-group');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // File preview elements
  const revealedFileBox = document.getElementById('revealed-file-box');
  const revealedFileIcon = document.getElementById('revealed-file-icon');
  const revealedFileName = document.getElementById('revealed-file-name');
  const revealedFileMeta = document.getElementById('revealed-file-meta');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const revealedImage = document.getElementById('revealed-image');
  const downloadFileBtn = document.getElementById('download-file-btn');

  // Metadata
  const secretId = vaultCard.dataset.id;
  const hasPassphrase = vaultCard.dataset.hasPassphrase === 'true';

  let decryptedFileData = null;

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

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
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

  // Convert base64 data URL to Blob for download
  function dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1] || arr[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Trigger download helper
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

  // Burn and reveal handler
  burnBtn.addEventListener('click', async () => {
    hideError();
    burnBtn.disabled = true;
    burnBtn.innerHTML = '<span>⏳ Decrypting & Burning Vault Row...</span>';

    const bodyPayload = {};
    if (hasPassphrase || (passphraseInput && passphraseInput.value)) {
      bodyPayload.passphrase = passphraseInput.value;
    }

    try {
      const response = await fetch(`/api/secret/${secretId}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (response.status === 401) {
        showError(data.error || 'Invalid passphrase.');
        burnBtn.disabled = false;
        burnBtn.innerHTML = '<span>🔥 Reveal & Destroy Secret</span>';
        if (passphraseInput) {
          passphraseInput.focus();
          passphraseInput.select();
        }
        return;
      }

      if (response.status === 404) {
        splashSection.classList.add('hidden');
        destroyedSection.classList.remove('hidden');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reveal secret.');
      }

      // Hide splash, show revealed section
      splashSection.classList.add('hidden');
      revealedSection.classList.remove('hidden');

      // Check if file payload returned
      if (data.file) {
        decryptedFileData = data.file;
        revealedFileName.textContent = data.file.name;
        revealedFileMeta.textContent = `${formatBytes(data.file.size)} • ${data.file.type || 'binary'}`;
        revealedFileIcon.textContent = getFileIcon(data.file.name, data.file.type || '');
        downloadFileBtn.innerHTML = `<span>📥 Download ${data.file.name}</span>`;

        // Check if image for inline rendering
        if (data.file.type && data.file.type.startsWith('image/')) {
          revealedImage.src = data.file.data;
          imagePreviewContainer.classList.remove('hidden');
        }

        revealedFileBox.classList.remove('hidden');
      }

      // Check text content
      const textContent = data.secret || '';
      const isPlaceholder = textContent.startsWith('[Attached File:');
      
      if (textContent && !isPlaceholder) {
        secretDisplay.textContent = textContent;
        textDisplayGroup.classList.remove('hidden');
      } else if (!data.file) {
        secretDisplay.textContent = textContent;
        textDisplayGroup.classList.remove('hidden');
      } else {
        // If file exists and text was just placeholder, hide raw text box
        textDisplayGroup.classList.add('hidden');
      }

      // Configure destruction alert
      if (data.burned || data.views_remaining === 0) {
        burnStatusAlert.className = 'alert alert-danger';
        burnStatusTitle.textContent = '🔥 SECRET REVEALED & DESTROYED';
        burnStatusDesc.textContent = 'This secret has now been permanently erased from the SQLite database with zero-overwriting. Zero traces remain.';
      } else {
        burnStatusAlert.className = 'alert alert-warning';
        burnStatusTitle.textContent = '⚠️ SECRET REVEALED';
        burnStatusDesc.textContent = `Warning: ${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''} remaining before permanent destruction.`;
      }
    } catch (err) {
      showError(err.message);
      burnBtn.disabled = false;
      burnBtn.innerHTML = '<span>🔥 Reveal & Destroy Secret</span>';
    }
  });

  // Download attached file
  downloadFileBtn.addEventListener('click', () => {
    if (!decryptedFileData || !decryptedFileData.data) return;
    try {
      const blob = dataUrlToBlob(decryptedFileData.data);
      triggerDownload(blob, decryptedFileData.name);
      showToast(`Downloaded ${decryptedFileData.name}!`);
    } catch {
      showError('Failed to prepare file download.');
    }
  });

  // Copy secret text
  copySecretBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(secretDisplay.textContent);
      copySecretBtn.textContent = 'Copied!';
      showToast('Text copied to clipboard!');
      setTimeout(() => {
        copySecretBtn.textContent = '📋 Copy Text';
      }, 2000);
    } catch {
      const range = document.createRange();
      range.selectNode(secretDisplay);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      copySecretBtn.textContent = 'Copied!';
      showToast('Text copied to clipboard!');
      setTimeout(() => {
        copySecretBtn.textContent = '📋 Copy Text';
      }, 2000);
    }
  });

  // Save text note as file
  downloadTextBtn.addEventListener('click', () => {
    const content = secretDisplay.textContent;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `secret-${secretId}.txt`);
    showToast('Saved text as file!');
  });
})();
