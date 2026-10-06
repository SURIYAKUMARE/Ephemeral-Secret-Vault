/**
 * Ephemeral Secret Vault — Visitor Verification Service
 * Handles transparent, consent-first camera verification when enabled by vault creator/admin.
 * Strict privacy enforcement: NO silent capture, NO hidden camera activation.
 */

(function () {
  'use strict';

  window.VaultVerification = {
    /**
     * Checks if verification is required and shows the consent screen if needed.
     */
    checkAndPrompt: async function (fileId, eventId) {
      if (!fileId) return;

      try {
        // Query if verification is required for this file
        const res = await fetch(`/api/vault/${fileId}/metadata`);
        if (!res.ok) return;
        const meta = await res.json();

        if (meta.require_verification || meta.require_camera) {
          this.showVerificationModal(fileId, eventId);
        }
      } catch (_) {}
    },

    /**
     * Renders and displays the verification consent dialog.
     */
    showVerificationModal: function (fileId, eventId) {
      if (document.getElementById('vault-verification-modal')) return;

      const modalHtml = `
        <div id="vault-verification-modal" style="
          position: fixed; inset: 0; background: rgba(5, 8, 20, 0.88);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;
        ">
          <div style="
            background: #0B1124; border: 1px solid rgba(34, 211, 238, 0.35);
            border-radius: 20px; max-width: 480px; width: 100%; padding: 32px 28px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 211, 238, 0.12);
            text-align: center; color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              width: 56px; height: 56px; border-radius: 16px;
              background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35);
              display: flex; align-items: center; justify-content: center; margin: 0 auto 18px;
              color: #22D3EE;
            ">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>

            <div style="
              display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
              border-radius: 999px; background: rgba(34, 211, 238, 0.10); border: 1px solid rgba(34, 211, 238, 0.25);
              font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #22D3EE; margin-bottom: 12px;
            ">
              Sender Verification Policy
            </div>

            <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #FFFFFF;">
              Visitor Identity Verification
            </h3>

            <p style="font-size: 13.5px; color: #94A3B8; line-height: 1.6; margin-bottom: 22px;">
              The creator of this vault has enabled one-time visitor verification for audit records.
              Your browser will prompt for camera access. You may allow or deny this request.
            </p>

            <div style="
              background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
              border-radius: 12px; padding: 12px 14px; text-align: left; margin-bottom: 24px; font-size: 12px; color: #64748B;
            ">
              <div style="font-weight: 600; color: #CBD5E1; margin-bottom: 4px;">Privacy Transparency Notice</div>
              Camera access is strictly one-time for a security snapshot. It will be immediately released and never kept active.
            </div>

            <div id="verif-preview-box" style="display: none; margin-bottom: 18px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(34,211,238,0.3);">
              <video id="verif-stream-preview" autoplay playsinline muted style="width: 100%; height: 180px; object-fit: cover; background: #000;"></video>
            </div>

            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="btn-verif-deny" type="button" style="
                flex: 1; padding: 12px 18px; border-radius: 10px; background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.12); color: #94A3B8; font-weight: 600; font-size: 13.5px; cursor: pointer;
              ">
                Deny &amp; Proceed
              </button>
              <button id="btn-verif-grant" type="button" style="
                flex: 1; padding: 12px 18px; border-radius: 10px; background: linear-gradient(135deg, #2875FF 0%, #8B5CF6 100%);
                border: none; color: #FFFFFF; font-weight: 700; font-size: 13.5px; cursor: pointer;
                box-shadow: 0 4px 18px rgba(40, 117, 255, 0.4);
              ">
                Allow &amp; Verify
              </button>
            </div>
          </div>
        </div>
      `;

      const wrap = document.createElement('div');
      wrap.innerHTML = modalHtml;
      document.body.appendChild(wrap.firstElementChild);

      const modalEl = document.getElementById('vault-verification-modal');
      const grantBtn = document.getElementById('btn-verif-grant');
      const denyBtn = document.getElementById('btn-verif-deny');

      const removeModal = () => {
        if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      };

      denyBtn.addEventListener('click', async () => {
        await this.submitRecord(fileId, eventId, 'DENIED', null);
        removeModal();
      });

      grantBtn.addEventListener('click', async () => {
        grantBtn.disabled = true;
        grantBtn.innerText = 'Requesting Permission...';

        try {
          // Native explicit browser camera prompt
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
          });

          grantBtn.innerText = 'Capturing Verification...';
          const video = document.createElement('video');
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();

          // Wait 500ms for camera auto-exposure
          await new Promise((r) => setTimeout(r, 500));

          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = canvas.toDataURL('image/jpeg', 0.85);

          // Immediately shut down camera stream (zero persistence)
          stream.getTracks().forEach((track) => track.stop());

          await this.submitRecord(fileId, eventId, 'GRANTED', imageData);
          removeModal();
        } catch (err) {
          // Permission denied by user or camera unavailable
          await this.submitRecord(fileId, eventId, 'DENIED', null);
          removeModal();
        }
      });
    },

    /**
     * Submits verification result to admin backend.
     */
    submitRecord: async function (fileId, eventId, permission, imageData) {
      try {
        const payload = {
          file_id: fileId,
          event_id: eventId || ('evt_' + Math.random().toString(36).substring(2, 10)),
          camera_permission: permission,
          image_data: imageData,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: window.screen?.width,
            screenHeight: window.screen?.height
          }
        };

        await fetch('/api/admin/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {}
    }
  };
})();
