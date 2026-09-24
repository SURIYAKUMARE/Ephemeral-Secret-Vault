(() => {
  const form = document.getElementById('create-form');
  const secretInput = document.getElementById('secret-input');
  const byteCounter = document.getElementById('byte-counter');
  const ttlSelect = document.getElementById('ttl-select');
  const viewsInput = document.getElementById('views-input');
  const passphraseInput = document.getElementById('passphrase-input');
  const submitBtn = document.getElementById('submit-btn');

  const resultSection = document.getElementById('result-section');
  const linkOutput = document.getElementById('link-output');
  const copyBtn = document.getElementById('copy-btn');
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

  // Update byte counter
  secretInput.addEventListener('input', () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(secretInput.value).length;
    byteCounter.textContent = `${bytes.toLocaleString()} / 10,240 bytes`;
    if (bytes > 10240) {
      byteCounter.style.color = 'var(--danger)';
    } else {
      byteCounter.style.color = 'var(--text-muted)';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const secret = secretInput.value.trim();
    if (!secret) {
      showError('Please enter a secret to share.');
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
      max_views: parseInt(viewsInput.value, 10)
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
      expiresDisplay.textContent = new Date(data.expires_at).toLocaleString();
      viewsDisplay.textContent = `${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''}`;
      fingerprintDisplay.textContent = data.fingerprint || 'N/A';
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Secret Link';
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
    byteCounter.textContent = '0 / 10,240 bytes';
    hideError();
    resultSection.classList.add('hidden');
    form.classList.remove('hidden');
  });
})();
