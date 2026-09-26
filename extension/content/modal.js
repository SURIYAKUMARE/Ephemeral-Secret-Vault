/**
 * Ephemeral Secret Vault — In-Page Protection Modal (Shadow DOM)
 * Completely isolated from host page styles. Zero plaintext retention.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EphemeralModal = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let currentHost = null;
  let currentShadow = null;
  let activeCallback = null;

  const MODAL_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    .vault-overlay {
      position: fixed;
      inset: 0;
      background: rgba(3, 6, 17, 0.78);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .vault-dialog {
      background: rgba(10, 16, 35, 0.94);
      border: 1px solid rgba(120, 120, 255, 0.25);
      border-radius: 20px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(99, 102, 241, 0.15);
      width: 100%;
      max-width: 480px;
      color: #f8fafc;
      overflow: hidden;
      animation: slideUp 0.25s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .dialog-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(5, 8, 22, 0.5);
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }

    .brand-title .gradient-text {
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .btn-close {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.2s;
    }

    .btn-close:hover { color: #ffffff; }

    .dialog-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sensitive-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      width: fit-content;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .btn-mask {
      background: none;
      border: none;
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .secret-input {
      width: 100%;
      background: #050816;
      border: 1px solid rgba(120, 120, 255, 0.2);
      border-radius: 12px;
      color: #f8fafc;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 13px;
      padding: 12px;
      resize: vertical;
      min-height: 80px;
      max-height: 180px;
      outline: none;
      transition: border-color 0.2s;
    }

    .secret-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15);
    }

    .secret-input.masked {
      -webkit-text-security: disc;
    }

    .config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .form-select, .form-input {
      background: #050816;
      border: 1px solid rgba(120, 120, 255, 0.2);
      border-radius: 10px;
      color: #ffffff;
      font-size: 13px;
      padding: 8px 10px;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-select:focus, .form-input:focus {
      border-color: #38bdf8;
    }

    .btn-primary {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #8b5cf6 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
      transition: all 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(99, 102, 241, 0.5);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .success-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      animation: fadeIn 0.2s;
    }

    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #34d399;
      font-size: 13px;
      font-weight: 700;
    }

    .link-box {
      display: flex;
      gap: 8px;
    }

    .link-input {
      flex: 1;
      background: #020617;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      color: #38bdf8;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 10px;
      outline: none;
    }

    .action-row {
      display: flex;
      gap: 8px;
    }

    .destruction-note {
      font-size: 11.5px;
      color: #94a3b8;
      line-height: 1.4;
      background: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(120, 120, 255, 0.15);
      border-radius: 8px;
      padding: 8px 12px;
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .hidden { display: none !important; }
  `;

  /**
   * Opens the in-page modal
   */
  function open(options = {}) {
    close();

    const {
      initialText = '',
      sensitiveInfo = null,
      onInsert = null,
      serverUrl = 'http://localhost:3000'
    } = options;

    activeCallback = onInsert;

    currentHost = document.createElement('div');
    currentHost.id = 'ephemeral-vault-modal-host';
    currentShadow = currentHost.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = MODAL_CSS;
    currentShadow.appendChild(styleEl);

    const overlay = document.createElement('div');
    overlay.className = 'vault-overlay';

    overlay.innerHTML = `
      <div class="vault-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="dialog-header">
          <div class="brand-title" id="dialog-title">
            <span>🔐</span>
            <span>Ephemeral <span class="gradient-text">Secret Vault</span></span>
          </div>
          <button type="button" class="btn-close" aria-label="Close modal">&times;</button>
        </div>

        <div class="dialog-body">
          <div id="step-create">
            ${sensitiveInfo && sensitiveInfo.isSensitive ? `
              <div class="sensitive-pill" style="margin-bottom: 12px;">
                <span>⚠ ${sensitiveInfo.type || 'Sensitive content detected'}</span>
              </div>
            ` : ''}

            <div class="form-group" style="margin-bottom: 12px;">
              <div class="label-row">
                <span>Secret Content</span>
                <button type="button" id="btn-mask-toggle" class="btn-mask">Hide</button>
              </div>
              <textarea id="modal-secret-input" class="secret-input" placeholder="Paste sensitive text, credentials, or keys here...">${escapeHtml(initialText)}</textarea>
            </div>

            <div class="config-grid" style="margin-bottom: 12px;">
              <div class="form-group">
                <label class="form-label" for="modal-ttl">Expires After</label>
                <select id="modal-ttl" class="form-select">
                  <option value="600" selected>10 minutes</option>
                  <option value="3600">1 hour</option>
                  <option value="21600">6 hours</option>
                  <option value="86400">24 hours</option>
                  <option value="604800">7 days</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="modal-views">Access Limit</label>
                <select id="modal-views" class="form-select">
                  <option value="1" selected>1 view (Instant Burn)</option>
                  <option value="2">2 views</option>
                  <option value="5">5 views</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label" for="modal-passphrase">Passphrase (Optional)</label>
              <input type="password" id="modal-passphrase" class="form-input" placeholder="Optional decryption passphrase">
            </div>

            <div id="modal-error" class="error-banner hidden" style="margin-bottom: 12px;"></div>

            <button type="button" id="btn-create-link" class="btn-primary">
              <span>🔐 Create Secure Link</span>
            </button>
          </div>

          <div id="step-success" class="success-card hidden">
            <div class="success-badge">
              <span>✓</span>
              <span>Secret Protected</span>
            </div>

            <div class="link-box">
              <input type="text" id="modal-link-output" class="link-input" readonly>
            </div>

            <div class="action-row">
              <button type="button" id="btn-copy-link" class="btn-primary" style="flex:1;">
                <span>📋 Copy Link</span>
              </button>
              ${onInsert ? `
                <button type="button" id="btn-insert-link" class="btn-primary" style="flex:1; background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
                  <span>↵ Insert Into Message</span>
                </button>
              ` : ''}
            </div>

            <div class="destruction-note">
              🛡️ <strong>Burn Protection Active:</strong> Access is permanently closed once viewed or expired. The plaintext secret was erased from this browser session.
            </div>

            <button type="button" id="btn-modal-done" class="btn-secondary" style="margin-top: 4px;">
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    `;

    currentShadow.appendChild(overlay);
    document.body.appendChild(currentHost);

    // Bindings inside Shadow DOM
    const btnClose = currentShadow.querySelector('.btn-close');
    const secretInput = currentShadow.querySelector('#modal-secret-input');
    const maskToggle = currentShadow.querySelector('#btn-mask-toggle');
    const btnCreate = currentShadow.querySelector('#btn-create-link');
    const errorBanner = currentShadow.querySelector('#modal-error');
    const stepCreate = currentShadow.querySelector('#step-create');
    const stepSuccess = currentShadow.querySelector('#step-success');
    const linkOutput = currentShadow.querySelector('#modal-link-output');
    const btnCopy = currentShadow.querySelector('#btn-copy-link');
    const btnInsert = currentShadow.querySelector('#btn-insert-link');
    const btnDone = currentShadow.querySelector('#btn-modal-done');

    // Focus input
    secretInput.focus();

    // Close on escape or outside click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const keyListener = (e) => {
      if (e.key === 'Escape') {
        close();
        window.removeEventListener('keydown', keyListener);
      }
    };
    window.addEventListener('keydown', keyListener);

    btnClose.addEventListener('click', close);
    if (btnDone) btnDone.addEventListener('click', close);

    // Mask / Peek
    let isMasked = false;
    maskToggle.addEventListener('click', () => {
      isMasked = !isMasked;
      if (isMasked) {
        secretInput.classList.add('masked');
        maskToggle.textContent = 'Show';
      } else {
        secretInput.classList.remove('masked');
        maskToggle.textContent = 'Hide';
      }
    });

    // Create Secret Action
    btnCreate.addEventListener('click', async () => {
      const text = secretInput.value.trim();
      if (!text) {
        errorBanner.textContent = 'Please enter or select text to protect.';
        errorBanner.classList.remove('hidden');
        return;
      }

      errorBanner.classList.add('hidden');
      btnCreate.disabled = true;
      btnCreate.innerHTML = '<span>⏳ Encrypting securely...</span>';

      const ttl = currentShadow.querySelector('#modal-ttl').value;
      const views = currentShadow.querySelector('#modal-views').value;
      const pass = currentShadow.querySelector('#modal-passphrase').value;

      try {
        // Send request to background script or direct API client
        let result = null;
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              {
                type: 'CREATE_VAULT_SECRET',
                payload: {
                  secret: text,
                  ttlSeconds: ttl,
                  maxViews: views,
                  passphrase: pass,
                  serverUrl
                }
              },
              (res) => {
                if (chrome.runtime.lastError) {
                  return reject(new Error(chrome.runtime.lastError.message));
                }
                if (res && res.error) {
                  return reject(new Error(res.error));
                }
                resolve(res);
              }
            );
          });
        } else if (root.VaultApiClient) {
          result = await root.VaultApiClient.createSecret({
            secret: text,
            ttlSeconds: ttl,
            maxViews: views,
            passphrase: pass,
            serverUrl
          });
        }

        if (!result || !result.url) {
          throw new Error('Failed to generate secure vault link.');
        }

        // Zero plaintext memory from the textarea
        secretInput.value = '';

        linkOutput.value = result.url;
        stepCreate.classList.add('hidden');
        stepSuccess.classList.remove('hidden');

        // Copy Link
        btnCopy.addEventListener('click', async () => {
          await navigator.clipboard.writeText(result.url);
          btnCopy.innerHTML = '<span>✓ Copied!</span>';
          setTimeout(() => { btnCopy.innerHTML = '<span>📋 Copy Link</span>'; }, 2000);
        });

        // Insert Link
        if (btnInsert && onInsert) {
          btnInsert.addEventListener('click', () => {
            onInsert(result.url);
            btnInsert.innerHTML = '<span>✓ Inserted!</span>';
            setTimeout(close, 600);
          });
        }
      } catch (err) {
        btnCreate.disabled = false;
        let displayMsg = err.message || 'Unable to protect this content.';
        if (displayMsg.includes('Failed to fetch') || displayMsg.includes('network')) {
          displayMsg = 'Vault server unreachable. Please ensure server is running (npm start) or check settings.';
        }
        errorBanner.textContent = displayMsg;
        errorBanner.classList.remove('hidden');
      }
    });
  }

  function close() {
    if (currentHost && currentHost.parentNode) {
      currentHost.parentNode.removeChild(currentHost);
    }
    currentHost = null;
    currentShadow = null;
    activeCallback = null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    open,
    close
  };
});
