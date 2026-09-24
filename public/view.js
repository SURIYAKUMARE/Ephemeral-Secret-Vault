(() => {
  const card = document.getElementById('vault-card');
  const secretId = card.getAttribute('data-id');
  const hasPassphrase = card.getAttribute('data-has-passphrase') === 'true';

  const splashSection = document.getElementById('splash-section');
  const revealedSection = document.getElementById('revealed-section');
  const destroyedSection = document.getElementById('destroyed-section');

  const burnBtn = document.getElementById('burn-btn');
  const passphraseInput = document.getElementById('view-passphrase');
  const secretDisplay = document.getElementById('secret-display');
  const copySecretBtn = document.getElementById('copy-secret-btn');

  const burnStatusAlert = document.getElementById('burn-status-alert');
  const burnStatusTitle = document.getElementById('burn-status-title');
  const burnStatusDesc = document.getElementById('burn-status-desc');

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

  burnBtn.addEventListener('click', async () => {
    hideError();

    const payload = {};
    if (hasPassphrase || (passphraseInput && passphraseInput.value.trim())) {
      payload.passphrase = passphraseInput.value.trim();
      if (!payload.passphrase) {
        showError('Please enter the passphrase to unlock this secret.');
        return;
      }
    }

    burnBtn.disabled = true;
    burnBtn.textContent = 'Decrypting & Burning...';

    try {
      const res = await fetch(`/api/secret/${encodeURIComponent(secretId)}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 404) {
        splashSection.classList.add('hidden');
        destroyedSection.classList.remove('hidden');
        return;
      }

      if (res.status === 401) {
        showError(data.error || 'Incorrect passphrase.');
        burnBtn.disabled = false;
        burnBtn.textContent = 'Reveal and Destroy Secret';
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reveal secret.');
      }

      // Success 200
      splashSection.classList.add('hidden');
      revealedSection.classList.remove('hidden');

      secretDisplay.textContent = data.secret;

      if (data.burned || data.views_remaining === 0) {
        burnStatusAlert.className = 'alert alert-danger';
        burnStatusTitle.textContent = 'Secret Destroyed!';
        burnStatusDesc.textContent = 'This secret was burned from storage and cannot be viewed again.';
      } else {
        burnStatusAlert.className = 'alert alert-warning';
        burnStatusTitle.textContent = 'Secret Revealed';
        burnStatusDesc.textContent = `Warning: ${data.views_remaining} view${data.views_remaining > 1 ? 's' : ''} remaining before permanent deletion.`;
      }
    } catch (err) {
      showError(err.message);
      burnBtn.disabled = false;
      burnBtn.textContent = 'Reveal and Destroy Secret';
    }
  });

  copySecretBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(secretDisplay.textContent);
      copySecretBtn.textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        copySecretBtn.textContent = 'Copy Secret to Clipboard';
      }, 2000);
    } catch {
      const range = document.createRange();
      range.selectNode(secretDisplay);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      copySecretBtn.textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        copySecretBtn.textContent = 'Copy Secret to Clipboard';
      }, 2000);
    }
  });
})();
