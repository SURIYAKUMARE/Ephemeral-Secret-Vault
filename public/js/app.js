(() => {
  const form = document.getElementById('create-form');
  const secretInput = document.getElementById('secret-input');
  const byteCounter = document.getElementById('byte-counter');
  const ttlSelect = document.getElementById('ttl-select');
  const viewsSelect = document.getElementById('views-select');
  const passphraseInput = document.getElementById('passphrase-input');
  const submitBtn = document.getElementById('submit-btn');

  // File upload elements
  const fileInput = document.getElementById('file-input');
  const uploadFileBtn = document.getElementById('upload-file-btn');
  const fileBadge = document.getElementById('file-badge');
  const fileBadgeText = document.getElementById('file-badge-text');
  const fileRemoveBtn = document.getElementById('file-remove-btn');

  const resultSection = document.getElementById('result-section');
  const linkOutput = document.getElementById('link-output');
  const copyBtn = document.getElementById('copy-btn');
  const openLinkBtn = document.getElementById('open-link-btn');
  const expiresDisplay = document.getElementById('expires-display');
  const viewsDisplay = document.getElementById('views-display');
  const fingerprintDisplay = document.getElementById('fingerprint-display');
  const resetBtn = document.getElementById('reset-btn');

  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');

  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('hidden');
  }

  function hideError() {
    errorAlert.classList.add('hidden');
    errorMessage.textContent = '';
  }

  function updateByteCount() {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(secretInput.value).length;
    byteCounter.textContent = `${bytes.toLocaleString()} / 10,240 bytes`;
    if (bytes > 10240) {
      byteCounter.style.color = 'var(--danger)';
    } else {
      byteCounter.style.color = 'var(--text-muted)';
    }
  }

  secretInput.addEventListener('input', updateByteCount);

  // File Upload Handlers
  uploadFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  function processFile(file) {
    if (!file) return;
    hideError();

    if (file.size > 10240) {
      showError(`File "${file.name}" is ${file.size.toLocaleString()} bytes, which exceeds the 10 KB maximum limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      secretInput.value = event.target.result;
      updateByteCount();
      fileBadgeText.textContent = `📄 ${file.name} (${file.size} bytes)`;
      fileBadge.classList.remove('hidden');
    };
    reader.onerror = () => {
      showError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  }

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    processFile(file);
  });

  fileRemoveBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileBadge.classList.add('hidden');
    fileBadgeText.textContent = '';
    secretInput.value = '';
    updateByteCount();
  });

  // Drag and drop onto textarea
  secretInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    secretInput.classList.add('drag-over');
  });

  secretInput.addEventListener('dragleave', () => {
    secretInput.classList.remove('drag-over');
  });

  secretInput.addEventListener('drop', (e) => {
    e.preventDefault();
    secretInput.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const secret = secretInput.value.trim();
    if (!secret) {
      showError('Please enter secret text or upload a file.');
      return;
    }

    const encoder = new TextEncoder();
    if (encoder.encode(secret).length > 10240) {
      showError('Secret exceeds the maximum limit of 10 KB (10,240 bytes).');
      return;
    }

    const payload = {
      secret,
      ttl_seconds: parseInt(ttlSelect.value, 10),
      max_views: parseInt(viewsSelect.value, 10)
    };

    const passphrase = passphraseInput.value.trim();
    if (passphrase) {
      payload.passphrase = passphrase;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Encrypting & Storing...';

    try {
      const res = await fetch('/api/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create secret.');
      }

      // Display result
      form.classList.add('hidden');
      resultSection.classList.remove('hidden');

      linkOutput.value = data.view_url;
      if (openLinkBtn) {
        openLinkBtn.href = data.view_url;
      }
      expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
      viewsDisplay.textContent = `${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''}`;
      fingerprintDisplay.textContent = data.fingerprint || 'N/A';
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Secure Secret';
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkOutput.value);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Link';
      }, 2000);
    } catch {
      linkOutput.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Link';
      }, 2000);
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    secretInput.value = '';
    fileInput.value = '';
    fileBadge.classList.add('hidden');
    fileBadgeText.textContent = '';
    updateByteCount();
    hideError();
    resultSection.classList.add('hidden');
    form.classList.remove('hidden');
  });
})();
