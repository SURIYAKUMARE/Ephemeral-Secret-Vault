# 🔐 Ephemeral Secret Vault — Browser Extension

> **"Share the link. Not the secret."**
> A cross-platform browser extension for Chromium-based browsers (Chrome, Edge, Brave, Opera) and Firefox that encrypts confidential credentials, passwords, and sensitive text directly inside web messaging composers into self-destructing vault links.

---

## 🚀 Features

- **In-Page Text Protection:** Highlight sensitive text in WhatsApp Web, Gmail, Outlook, Slack, or any website, and convert it instantly into a secure ephemeral link.
- **Right-Click Context Menu:** Right-click any selected text → `🔐 Protect with Ephemeral Vault`.
- **Modular Platform Adapters:**
  - 💬 **WhatsApp Web (`web.whatsapp.com`)**: Integrated `🔐` toolbar button; updates composer state without triggering auto-send.
  - ✉️ **Gmail (`mail.google.com`)**: Compose toolbar `🔐 Protect Secret` button with clean, confidential layout insertion.
  - 📬 **Outlook Web (`outlook.live.com` / `office.com`)**: Seamless message body replacement.
  - 💬 **Slack Web (`app.slack.com`)**, **Discord Web (`discord.com`)**, **Teams Web (`teams.microsoft.com`)**, and **Telegram Web (`web.telegram.org`)**.
  - 🌐 **Generic Composer Fallback**: Universal support for standard `textarea`, text inputs, and `contenteditable` editors with clipboard fallback.
- **Smart Sensitive Detection:** Local client-side heuristics detect OpenAI keys, AWS credentials, Google Cloud keys, GitHub tokens, database URIs, and passwords without any network requests.
- **Zero-Trace Security:**
  - Plaintext secrets and encryption keys are **NEVER stored** in `localStorage`, `chrome.storage`, or browser history.
  - History stores **metadata only** (ID, expiration, view limit, platform).
  - Least-privilege permissions (`activeTab`, `contextMenus`, `storage`, `scripting`).

---

## 📦 How to Install (Load Unpacked in Chrome / Brave / Edge)

1. Open your browser's Extension Manager:
   - Chrome / Brave: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`
2. Enable **Developer mode** (toggle switch in the top-right corner).
3. Click **Load unpacked**.
4. Select the `extension/` folder located in this repository:
   ```text
   d:\PROJECT\Ephemeral Secret Vault\extension
   ```
5. The extension will now appear in your browser toolbar with the 🔐 icon.

---

## 🛠️ Configuration & Custom Vault Server

By default, the extension connects to your local vault backend at `http://localhost:3000`.

To change this:
1. Click the **Ephemeral Secret Vault** extension icon.
2. Click the ⚙️ **Settings** icon (or right-click the extension → **Options**).
3. Under **Vault Server Origin URL**, enter your self-hosted domain or production URL.
4. Click **Test Connection** to verify live API connectivity.
5. Click **Save Changes**.

---

## 🔒 Security Architecture & Recipient Experience

1. **User Experience:**
   - Instead of sending plaintext credentials directly in chat:
     ```text
     "My password is SuperSecret123"
     ```
   - The extension replaces it with:
     ```text
     🔐 Secure Secret
     Open securely:
     https://your-vault-domain/view/7f9a2c...
     ```
2. **Recipient Experience:**
   - The recipient does **NOT** need the browser extension.
   - Clicking the link opens the existing, responsive Ephemeral Secret Vault web portal.
   - The recipient completes the token-authorized reveal to decrypt the secret in memory.
   - Upon viewing or TTL expiry, the secret is permanently wiped.
