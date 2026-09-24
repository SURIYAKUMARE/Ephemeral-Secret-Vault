# Ephemeral Secret Vault 🔒

**Production-Grade, Self-Destructing, Zero-Trace Secret-Sharing Web Application**

Ephemeral Secret Vault is a high-security, self-destructing secret-sharing service built with Node.js, Express.js, better-sqlite3 in WAL mode, and native AES-256-GCM authenticated encryption.

It allows users and automated systems to securely share temporary passwords, database credentials, API keys, certificates, environment variables, and confidential text. Secrets are encrypted at rest with record-bound authentication tags, exposed only through safe pre-reveal landing pages, revealed exclusively through explicit human action, and permanently destroyed from storage once their allowed view count is reached or their time-to-live (TTL) expires.

---

### User Interface & Workflow Diagram
<p align="center">
  <img src="docs/images/vault-ui-screenshot.png" alt="Ephemeral Secret Vault UI" width="600">
</p>

*Figure 1: Ephemeral Secret Vault Interface with File Upload & Real-Time Byte Counter.*

<p align="center">
  <img src="docs/images/workflow-diagram.jpg" alt="Ephemeral Secret Vault Complete Workflow" width="750">
</p>

*Figure 2: Complete 7-Step Lifecycle: Ingestion, AES-GCM Encryption, Bot Shield, Atomic Reveal, and TTL Sweeper.*

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Installation](#5-installation)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Running the Application](#8-running-the-application)
9. [API Documentation](#9-api-documentation)
10. [cURL Examples](#10-curl-examples)
11. [CLI Usage](#11-cli-usage)
12. [Security Model](#12-security-model)
13. [Concurrency Strategy](#13-concurrency-strategy)
14. [Scraper Defense](#14-scraper-defense)
15. [TTL Cleanup & Garbage Collection](#15-ttl-cleanup--garbage-collection)
16. [Testing](#16-testing)
17. [Project Structure](#17-project-structure)
18. [Limitations](#18-limitations)
19. [Future Enhancements](#19-future-enhancements)

---

## 1. Project Overview

Standard communication channels (Slack, email, chat, ticket comments) leave persistent, indexed plaintext trails of sensitive secrets. Ephemeral Secret Vault solves this problem by ensuring:
- **Zero Plaintext at Rest:** Plaintext is encrypted in memory before database insertion and never written to disk.
- **Single-Use Self-Destruction:** Once revealed or consumed, secrets are permanently and physically deleted from disk with SQLite zero-overwriting.
- **Immunity to Link Crawlers:** Chat preview bots (Slackbot, Twitterbot, Discordbot, WhatsApp, Facebook, Telegram) cannot consume secrets because preview requests are served static non-decrypting shells.
- **Race Condition Immunity:** 20 simultaneous requests against a 1-view secret result in exactly 1 successful burn and 19 HTTP 404 responses.

---

## 2. Features

- **Authenticated Encryption:** AES-256-GCM using Node.js `node:crypto`. Fresh 96-bit random IV per secret, 128-bit authentication tag, and record ID bound as Additional Authenticated Data (AAD) to prevent ciphertext transplantation between rows.
- **Universal File Upload (Up to 10 MB):** Encrypts and securely shares any file type — images (`.png`, `.jpg`, `.webp`), documents (`.pdf`, `.docx`, `.xlsx`), source code and scripts (`surya.py`, `.env`, `.js`, `.json`), keys (`.pem`, `.key`), and binaries. Files are encrypted in-memory and never written unencrypted to disk.
- **1-Click Messaging Integrations:** Automated instant sharing to **WhatsApp**, **Slack**, **Microsoft Teams**, **Discord**, and **Email** with pre-filled self-destruction warnings and secure links.
- **Atomic Concurrency Protection:** Single-statement atomic burn (`UPDATE secrets SET views_remaining = views_remaining - 1 WHERE id = ? AND views_remaining > 0 ... RETURNING ...`) in an ACID transaction.
- **Scraper Defense:** Reusable bot detection middleware intercepts link expanders (Slackbot, Twitterbot, Discordbot, WhatsApp, Facebook, Telegram) and serves static HTML shells without querying SQLite.
- **Automatic Sweeper:** In-process background worker runs every 10–30s to purge expired secrets and executes `PRAGMA wal_checkpoint(TRUNCATE)` to eliminate residual transaction bytes.
- **Zero-Trace SQLite Storage:** Hard `DELETE` operations combined with `PRAGMA secure_delete = ON` ensure database blocks are physically zeroed out upon record deletion.
- **Recipient File Viewer & Download:** On reveal, renders inline image previews, syntax-formatted code displays (for python scripts like `surya.py`), and provides a 1-click download button preserving the original filename and binary fidelity.
- **CLI & Stdin Integration:** Supports piping secrets and files from command line into `node scripts/vault-cli.js`.
- **Passphrase & Audit Fingerprint:** Optional scrypt passphrase verification per record and SHA-256 integrity fingerprinting.
- **Zero-CDN Frontend:** Responsive, accessible, cybersecurity-themed UI built with semantic HTML5, modern CSS3, and vanilla JavaScript.

---

## 3. Architecture

```
User / CLI / Stdin
      │
      ▼
HTTP Request (POST /api/secret)
      │
      ▼
Validation Middleware (Length, TTL, Views, Malformed JSON)
      │
      ▼
Crypto Engine (AES-256-GCM + 12-byte IV + AAD: record ID)
      │
      ▼
SQLite WAL Storage Engine (data/vault.db, secure_delete=ON)
      │
      ▼
Recipient opens GET /view/:id (Safe Landing Page — No Decryption / No Decrement)
      │
      ▼
Recipient clicks "Reveal & Destroy Secret"
      │
      ▼
HTTP POST /api/secret/:id/burn
      │
      ▼
Atomic SQLite Claim (UPDATE ... WHERE views_remaining > 0 RETURNING ...)
      ├── If views hit 0 ──► Hard DELETE row immediately
      └── If claim valid  ──► Decrypt & Return Plaintext
```

---

## 4. Technology Stack

- **Runtime:** Node.js 20+ (ES2023+, native `fetch`, native `node:crypto`)
- **Backend Framework:** Express.js 4
- **Database Engine:** SQLite 3 via `better-sqlite3` (WAL mode enabled, `secure_delete = ON`)
- **Cryptography:** Native `node:crypto` (AES-256-GCM, scrypt KDF, SHA-256)
- **Frontend:** Semantic HTML5, CSS3, Vanilla JavaScript (zero build steps, zero external CDNs)
- **Testing:** Node.js native test runner (`node:test`, `node:assert/strict`)
- **Benchmarking:** Autocannon

---

## 5. Installation

```bash
# Clone repository
git clone <repo-url>
cd "Ephemeral Secret Vault"

# Install production and development dependencies
npm install
```

---

## 6. Environment Variables

Create a local `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Generate a cryptographically secure 256-bit (64 hex characters) master key:
```bash
node scripts/gen-key.js
```

Configure `.env`:
```env
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
VAULT_MASTER_KEY=<64-hex-character-key>
DATABASE_PATH=./data/vault.db
SWEEPER_INTERVAL_MS=10000
```

> **IMPORTANT:** `.env` is listed in `.gitignore` and must never be committed to source control.

---

## 7. Database Setup

Database creation and table migrations are handled automatically on startup by `src/database/db.js`:
- Ensures directory `data/` exists.
- Applies `PRAGMA journal_mode = WAL;`.
- Applies `PRAGMA synchronous = NORMAL;`.
- Applies `PRAGMA secure_delete = ON;`.
- Executes `src/database/schema.sql`.

```sql
CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  max_views INTEGER NOT NULL DEFAULT 1,
  views_remaining INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  passphrase_hash TEXT,
  passphrase_salt TEXT
);

CREATE INDEX IF NOT EXISTS idx_secrets_expiry ON secrets(expires_at);
```

---

## 8. Running the Application

### Development / Production Server
```bash
npm start
```
Server runs at `http://localhost:3000` (or configured `BASE_URL`).

---

## 9. API Documentation

### 9.1 Health Check
- **Endpoint:** `GET /health`
- **Response:** `200 OK`
```json
{
  "status": "ok"
}
```

### 9.2 Create Secret
- **Endpoint:** `POST /api/secret`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "secret": "my-database-password-xyz",
  "ttl_seconds": 3600,
  "max_views": 1,
  "passphrase": "optional-passphrase"
}
```
- **Validation:**
  - `secret`: non-empty string, maximum 10 KB (10,240 bytes).
  - `ttl_seconds`: integer between 10 and 604,800 (default: 3600).
  - `max_views`: integer between 1 and 10 (default: 1).
- **Response:** `201 Created`
```json
{
  "id": "e8a1b4c7d2e9",
  "view_url": "http://localhost:3000/view/e8a1b4c7d2e9",
  "expires_at": "2026-09-24T12:00:00.000Z",
  "views_remaining": 1,
  "fingerprint": "872e4e50ce9990d8b041330c47c9ddd11bec6b503ae9386a99da8584e9bb12c4"
}
```

### 9.3 Safe View Landing Page
- **Endpoint:** `GET /view/:id`
- **Headers Sent:** `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`
- **Behavior:** Strictly read-only (`SELECT id, max_views, views_remaining, expires_at`). Plaintext secret is NEVER included in HTML. Does not decrypt, decrement, or burn.

### 9.4 Burn and Reveal Secret
- **Endpoint:** `POST /api/secret/:id/burn`
- **Headers:** `Content-Type: application/json`
- **Body:** `{"passphrase": "optional-passphrase"}`
- **Success Response:** `200 OK`
```json
{
  "secret": "my-database-password-xyz",
  "views_remaining": 0,
  "burned": true
}
```
- **Error Response (Burned / Expired / Invalid ID):** `404 Not Found`
```json
{
  "error": "Secret not found, expired, or already destroyed."
}
```

---

## 10. cURL Examples

### Create Secret
```bash
curl -s -X POST http://localhost:3000/api/secret \
  -H "Content-Type: application/json" \
  -d '{"secret":"prod-api-key-12345","ttl_seconds":3600,"max_views":1}'
```

### Open Safe View Landing Page
```bash
curl -s http://localhost:3000/view/<ID>
```

### Reveal and Burn Secret
```bash
curl -s -X POST http://localhost:3000/api/secret/<ID>/burn \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Second Burn Attempt (Demonstrating 404)
```bash
curl -s -X POST http://localhost:3000/api/secret/<ID>/burn
```

---

## 11. CLI Usage

The CLI client (`scripts/vault-cli.js` / `./vault-cli`) reads sensitive input from standard input:

```bash
# Push secret via echo
echo "my-secret-key" | node scripts/vault-cli.js

# Push secret with custom TTL and view limits
echo "temporary-db-credential" | node scripts/vault-cli.js --ttl 1800 --views 2

# Push secret from file
cat credentials.json | node scripts/vault-cli.js

# Push with optional passphrase protection
echo "confidential" | node scripts/vault-cli.js --passphrase "unlock123"
```
The CLI outputs **ONLY the view URL** to stdout on success, allowing clean pipe workflows into clipboard utilities (`pbcopy`, `xclip`, `clip.exe`).

---

## 12. Security Model

1. **AES-256-GCM:** 256-bit keys with 128-bit authentication tags ensure authenticated confidentiality.
2. **Per-Secret Random IVs:** 12-byte cryptographically secure random IVs prevent ciphertext patterns and frequency analysis.
3. **AAD Binding:** The 12-character record ID is bound into the GCM authentication tag as Additional Authenticated Data (`cipher.setAAD(Buffer.from(id, 'utf8'))`), ensuring ciphertexts cannot be transplanted across rows.
4. **Master Key Protection:** The master key is held exclusively in memory; it is never written to disk, logged, or returned in HTTP responses.
5. **Clean Error Handling:** No internal stack traces, crypto exceptions, or database errors are ever exposed to clients.
6. **Security Headers:** Strict CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.

---

## 13. Concurrency Strategy

To prevent double-reads on 1-view secrets, Ephemeral Secret Vault avoids vulnerable `SELECT-then-UPDATE` logic. Instead, an atomic `UPDATE ... RETURNING` statement executes inside an ACID transaction:
```sql
UPDATE secrets
SET views_remaining = views_remaining - 1
WHERE id = ? AND views_remaining > 0 AND expires_at > ?
RETURNING ciphertext, iv, auth_tag, views_remaining;
```
If multiple parallel requests arrive simultaneously:
- Exactly 1 request successfully decrements `views_remaining` from 1 to 0 and receives the returning row.
- The other 19 requests match 0 rows and immediately receive `404 Not Found`.
- The winning transaction immediately hard-deletes the row before returning plaintext.

---

## 14. Scraper Defense

Social media and chat applications deploy link preview crawlers (Slackbot, Twitterbot, Discordbot, Facebook, WhatsApp, Telegram). Ephemeral Secret Vault defends against crawler secret consumption using two mechanisms:
1. **Architectural Separation:** `GET /view/:id` is strictly read-only and never decrypts or decrements views.
2. **Bot Detection Middleware (`src/middleware/botGuard.js`):** Inspects incoming `User-Agent` headers. When a crawler hits `GET /view/:id`, it is served a static HTML shell containing generic OpenGraph tags without querying SQLite. Crawler `POST` requests are rejected with `403 Forbidden`.

---

## 15. TTL Cleanup & Garbage Collection

Every secret record has an `expires_at` timestamp.
1. Any burn request verifying `expires_at <= Date.now()` is rejected with `404`.
2. An automated in-process sweeper worker (`src/services/sweeperService.js`) runs every 10 seconds:
   - Deletes all records where `expires_at <= Date.now()`.
   - Executes `PRAGMA wal_checkpoint(TRUNCATE)` to ensure no deleted pages remain in WAL logs.

---

## 16. Testing

Run the complete automated test suite:
```bash
npm test
```

### Test Suites (`tests/`)
- `happy-path.test.js`: Secret creation, database BLOB storage verification, splash rendering, single-use burn, 404 second burn, multi-view decrementing.
- `concurrency.test.js`: 50 rounds of 20 parallel requests against 1-view secrets (verifying 1x 200, 19x 404 per round); 10 parallel requests against 3-view secrets.
- `crawler.test.js`: Verification that Slackbot, Twitterbot, Discordbot, WhatsApp, and Facebook receive static shells without touching SQLite; crawler POST rejection; curl whitelisting.
- `expiry.test.js`: Expiration validation and physical sweeper deletion verification.
- `tamper.test.js`: Raw SQLite byte inspection verifying zero plaintext on disk, bit-flip ciphertext/tag tampering handling.
- `validation.test.js`: Comprehensive boundary testing (invalid TTL, invalid max views, bad JSON, oversized secrets, invalid IDs, log inspection).

---

## 17. Project Structure

```
ephemeral-secret-vault/
├── src/
│   ├── server.js                  # Application server entry point & shutdown handler
│   ├── app.js                     # Express app setup, security headers, middleware
│   ├── config/
│   │   └── env.js                 # Environment configuration & master key validator
│   ├── database/
│   │   ├── db.js                  # SQLite database manager & WAL pragma configuration
│   │   ├── schema.sql             # SQL table & index definitions
│   │   └── migrations/            # Migration scripts
│   ├── crypto/
│   │   └── encryption.js          # AES-256-GCM engine, AAD binding, scrypt KDF
│   ├── routes/
│   │   └── secretRoutes.js        # API and UI route definitions
│   ├── controllers/
│   │   └── secretController.js    # Request handlers & response formatting
│   ├── services/
│   │   ├── secretService.js       # Atomic burn transactions & database queries
│   │   └── sweeperService.js      # Background TTL expiration cleaner
│   ├── middleware/
│   │   ├── botGuard.js            # Scraper & crawler mitigation
│   │   ├── errorHandler.js        # Centralized sanitized error handler
│   │   └── validation.js          # Input validation & bad ID interceptor
│   └── utils/
│       ├── idGenerator.js         # 12-hex-character ID generator & validator
│       └── logger.js              # Structured logger avoiding plaintext exposure
├── public/
│   ├── index.html                 # Hero landing & secret creation UI
│   ├── view.html                  # Safe pre-reveal splash UI
│   ├── 404.html                   # Generic 404 page with noindex tags
│   ├── css/
│   │   └── style.css              # Dark theme CSS design system
│   └── js/
│       ├── app.js                 # Secret creation & reactive byte counter
│       └── view.js                # Secret reveal, burn trigger & copy UI
├── tests/
│   ├── happy-path.test.js         # Full lifecycle tests
│   ├── concurrency.test.js        # 20-parallel race condition tests
│   ├── crawler.test.js            # Bot defense & crawler tests
│   ├── expiry.test.js             # Expiry & background sweeper tests
│   ├── tamper.test.js             # Tamper protection & zero-trace tests
│   └── validation.test.js         # Input validation & error handling tests
├── scripts/
│   ├── gen-key.js                 # 256-bit master key generator
│   ├── inspect-db.sh              # Database inspection & zero-trace bash script
│   ├── bench.js                   # Autocannon performance benchmark script
│   └── vault-cli.js               # CLI client tool
├── data/
│   └── vault.db                   # SQLite database storage (WAL mode)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules (.env, *.db, *.db-wal, node_modules)
├── package.json                   # Project metadata & npm scripts
├── README.md                      # Complete documentation
└── REPORT.md                      # Engineering and security report
```

---

## 18. Limitations

1. **Server-Side In-Memory Decryption:** While plaintext is never persisted to disk, the server process briefly holds the decrypted secret in memory while returning it to the client during the burn request.
2. **Single-Node SQLite Deployment:** The SQLite WAL architecture is optimized for single-instance deployments.
3. **Master Key Single Point of Compromise:** If an attacker gains full root access to environment variables, they could decrypt active unburned records before their expiration.

---

## 19. Future Enhancements

1. **Client-Side WebCrypto Encryption:** Perform encryption and decryption in the browser using `#fragment` URLs (`/view/id#KEY`). Since URL fragments are never sent to the server in HTTP requests (RFC 3986), the server operates under complete zero-knowledge.
2. **Hardware Security Module (HSM) / KMS Integration:** Store and envelope-encrypt the master key using AWS KMS, Google Cloud KMS, or HashiCorp Vault.
3. **Distributed Multi-Region Storage:** Support distributed SQL (e.g. CockroachDB) and Redis token-bucket rate limiting for multi-region active-active deployments.
4. **Key Rotation Headers:** Support multiple master key versions through key ID headers in ciphertexts.
