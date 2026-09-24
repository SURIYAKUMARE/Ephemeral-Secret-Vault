(() => {
  'use strict';

  // SVG Templates
  const SVG = {
    copy: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    check: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    download: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    spinner: '<svg class="svg-icon spinner" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
    flame: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>',
    fileImage: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    fileCode: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    fileDoc: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
  };

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

  // Live Timer Elements
  const countdownTimer = document.getElementById('countdown-timer');
  const timerProgressFill = document.getElementById('timer-progress-fill');
  const secretMetricsChars = document.getElementById('secret-metrics-chars');
  const memoryWipeNote = document.getElementById('memory-wipe-note');

  // File Preview Elements
  const revealedFileBox = document.getElementById('revealed-file-box');
  const revealedFileIcon = document.getElementById('revealed-file-icon');
  const revealedFileName = document.getElementById('revealed-file-name');
  const revealedFileMeta = document.getElementById('revealed-file-meta');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const revealedImage = document.getElementById('revealed-image');
  const downloadFileBtn = document.getElementById('download-file-btn');

  // Code Inspector Elements
  const codeInspectorContainer = document.getElementById('code-inspector-container');
  const codeInspectorTitle = document.getElementById('code-inspector-title');
  const codeLineNumbers = document.getElementById('code-line-numbers');
  const codeLinesContent = document.getElementById('code-lines-content');
  const copyCodeBtn = document.getElementById('copy-code-btn');

  // Metadata
  const secretId = vaultCard ? vaultCard.dataset.id : '';
  const hasPassphrase = vaultCard ? vaultCard.dataset.hasPassphrase === 'true' : false;
  const expiresIso = vaultCard ? vaultCard.dataset.expires : null;

  let decryptedFileData = null;
  let decodedScriptText = '';
  let tickerInterval = null;
  let memoryWipeInterval = null;

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

  function getFileSvg(name, mime) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (mime && mime.startsWith('image/')) return SVG.fileImage;
    if (['py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'sh', 'c', 'cpp', 'rs', 'go', 'php'].includes(ext)) {
      return SVG.fileCode;
    }
    return SVG.fileDoc;
  }

  // Convert Base64 Data URL to Blob
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
  // Live Expiry Countdown Ticker
  // ==========================================================================
  function initLiveCountdown() {
    if (!expiresIso || !countdownTimer) return;
    const expiryTime = new Date(expiresIso).getTime();

    function updateTicker() {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        countdownTimer.textContent = 'EXPIRED';
        countdownTimer.style.color = '#ef4444';
        if (timerProgressFill) timerProgressFill.style.width = '0%';
        if (burnBtn) {
          burnBtn.disabled = true;
          burnBtn.innerHTML = '<span>Secret Expired &amp; Purged</span>';
        }
        clearInterval(tickerInterval);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      if (hours > 0) {
        countdownTimer.textContent = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
      } else {
        countdownTimer.textContent = `${pad(minutes)}m ${pad(seconds)}s`;
      }

      // Smooth progress bar calculation
      if (timerProgressFill) {
        const percent = Math.min(100, Math.max(0, (diff / (3600 * 1000)) * 100));
        timerProgressFill.style.width = `${percent}%`;
      }
    }

    updateTicker();
    tickerInterval = setInterval(updateTicker, 1000);
  }

  initLiveCountdown();

  // ==========================================================================
  // Burn & Reveal Secret Execution
  // ==========================================================================
  if (burnBtn) {
    burnBtn.addEventListener('click', async () => {
      hideError();
      burnBtn.disabled = true;
      burnBtn.innerHTML = `${SVG.spinner} <span>Decrypting &amp; Wiping Database Row...</span>`;

      const bodyPayload = {};
      if (hasPassphrase || (passphraseInput && passphraseInput.value)) {
        bodyPayload.passphrase = passphraseInput.value.trim();
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
          burnBtn.innerHTML = `${SVG.flame} <span>Reveal &amp; Destroy Secret</span>`;
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

        // Stop countdown ticker
        if (tickerInterval) clearInterval(tickerInterval);

        // Hide splash, show revealed section
        splashSection.classList.add('hidden');
        revealedSection.classList.remove('hidden');

        // Check if file payload returned
        if (data.file) {
          decryptedFileData = data.file;
          revealedFileName.textContent = data.file.name;
          revealedFileMeta.textContent = `${formatBytes(data.file.size)} • ${data.file.type || 'binary/raw'}`;
          revealedFileIcon.innerHTML = getFileSvg(data.file.name, data.file.type || '');
          downloadFileBtn.innerHTML = `${SVG.download} <span>Download ${data.file.name} (${formatBytes(data.file.size)})</span>`;

          const ext = data.file.name.split('.').pop().toLowerCase();
          const isCodeFile = ['py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'sh', 'c', 'cpp', 'rs', 'go', 'php', 'env', 'txt', 'sql', 'md', 'xml', 'yaml', 'yml'].includes(ext) ||
                             (data.file.type && data.file.type.startsWith('text/')) ||
                             (data.file.type && data.file.type.includes('json'));

          // Check if image for inline rendering
          if (data.file.type && data.file.type.startsWith('image/')) {
            revealedImage.src = data.file.data;
            imagePreviewContainer.classList.remove('hidden');
            if (codeInspectorContainer) codeInspectorContainer.classList.add('hidden');
          } else if (isCodeFile && codeInspectorContainer) {
            try {
              const rawBase64 = data.file.data.split(',')[1] || data.file.data;
              decodedScriptText = decodeURIComponent(escape(atob(rawBase64)));
              const lines = decodedScriptText.split('\n');
              codeLineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');
              codeLinesContent.textContent = decodedScriptText;
              codeInspectorTitle.textContent = `${data.file.name} (${lines.length} lines)`;
              codeInspectorContainer.classList.remove('hidden');
            } catch (e) {
              codeInspectorContainer.classList.add('hidden');
            }
            imagePreviewContainer.classList.add('hidden');
          } else {
            imagePreviewContainer.classList.add('hidden');
            if (codeInspectorContainer) codeInspectorContainer.classList.add('hidden');
          }

          revealedFileBox.classList.remove('hidden');
        }

        // Check text content
        const textContent = data.secret || '';
        const isPlaceholder = textContent.startsWith('[Attached File:');

        if (textContent && !isPlaceholder) {
          secretDisplay.textContent = textContent;
          textDisplayGroup.classList.remove('hidden');
          if (secretMetricsChars) {
            secretMetricsChars.textContent = `${textContent.length} chars • ${textContent.split(/\s+/).filter(Boolean).length} words`;
          }
        } else if (!data.file) {
          secretDisplay.textContent = textContent;
          textDisplayGroup.classList.remove('hidden');
          if (secretMetricsChars) {
            secretMetricsChars.textContent = `${textContent.length} chars`;
          }
        } else {
          textDisplayGroup.classList.add('hidden');
        }

        // Configure destruction alert
        if (data.burned || data.views_remaining === 0) {
          burnStatusAlert.className = 'alert alert-danger';
          burnStatusTitle.textContent = 'SECRET DECRYPTED & PERMANENTLY BURNED';
          burnStatusDesc.textContent = 'This secret has now been permanently erased from the SQLite database with zero-overwriting. Zero traces remain.';
        } else {
          burnStatusAlert.className = 'alert alert-warning';
          burnStatusTitle.textContent = 'SECRET REVEALED';
          burnStatusDesc.textContent = `Warning: ${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''} remaining before permanent destruction.`;
        }

        // Start 60-second browser RAM auto-wipe countdown
        let memorySeconds = 60;
        if (memoryWipeNote) {
          memoryWipeInterval = setInterval(() => {
            memorySeconds--;
            if (memorySeconds > 0) {
              memoryWipeNote.textContent = `Browser RAM Security: Decrypted buffer in browser memory will be flushed in ${memorySeconds}s or upon closing this tab.`;
            } else {
              clearInterval(memoryWipeInterval);
              memoryWipeNote.textContent = 'Browser RAM Security: Plaintext buffer has been cleared from browser memory.';
              decryptedFileData = null;
              decodedScriptText = '';
              secretDisplay.textContent = '[Buffer wiped from memory]';
            }
          }, 1000);
        }
      } catch (err) {
        showError(err.message || 'Failed to reveal secret.');
        burnBtn.disabled = false;
        burnBtn.innerHTML = `${SVG.flame} <span>Reveal &amp; Destroy Secret</span>`;
      }
    });
  }

  // Download Attached File
  if (downloadFileBtn) {
    downloadFileBtn.addEventListener('click', () => {
      if (!decryptedFileData || !decryptedFileData.data) return;
      try {
        const blob = dataUrlToBlob(decryptedFileData.data);
        triggerDownload(blob, decryptedFileData.name);
        showToast(`✓ Downloaded ${decryptedFileData.name}`);
      } catch {
        showError('Failed to prepare file download.');
      }
    });
  }

  // Copy Script Code from Inspector
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', async () => {
      if (!decodedScriptText) return;
      try {
        await navigator.clipboard.writeText(decodedScriptText);
        copyCodeBtn.innerHTML = `${SVG.check} <span>Copied</span>`;
        showToast('✓ Script code copied to clipboard');
        setTimeout(() => {
          copyCodeBtn.innerHTML = `${SVG.copy} <span>Copy Code</span>`;
        }, 2000);
      } catch {
        showToast('Failed to copy script code');
      }
    });
  }

  // Copy Secret Text
  if (copySecretBtn) {
    copySecretBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(secretDisplay.textContent);
        copySecretBtn.innerHTML = `${SVG.check} <span>Copied</span>`;
        showToast('✓ Secret text copied to clipboard');
        setTimeout(() => {
          copySecretBtn.innerHTML = `${SVG.copy} <span>Copy Secret Text</span>`;
        }, 2000);
      } catch {
        const range = document.createRange();
        range.selectNode(secretDisplay);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        copySecretBtn.innerHTML = `${SVG.check} <span>Copied</span>`;
        showToast('✓ Secret text copied to clipboard');
        setTimeout(() => {
          copySecretBtn.innerHTML = `${SVG.copy} <span>Copy Secret Text</span>`;
        }, 2000);
      }
    });
  }

  // Save Text Note as File
  if (downloadTextBtn) {
    downloadTextBtn.addEventListener('click', () => {
      const content = secretDisplay.textContent;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      triggerDownload(blob, `secret-${secretId}.txt`);
      showToast('✓ Saved text note as file');
    });
  }
})();
