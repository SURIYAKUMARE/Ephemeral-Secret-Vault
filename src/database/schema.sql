-- Ephemeral Secret Vault Database Schema
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA secure_delete = ON;

-- Core secrets table
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
  passphrase_salt TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  max_failed_attempts INTEGER NOT NULL DEFAULT 3,
  duress_hash TEXT,
  duress_salt TEXT,
  cover_secret TEXT
);

CREATE INDEX IF NOT EXISTS idx_secrets_expiry ON secrets(expires_at);

-- Shamir Threshold Sharing (Feature 1)
CREATE TABLE IF NOT EXISTS threshold_secrets (
  id TEXT PRIMARY KEY,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  threshold_k INTEGER NOT NULL,
  total_n INTEGER NOT NULL,
  redeemed_shares TEXT NOT NULL DEFAULT '[]',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threshold_expiry ON threshold_secrets(expires_at);

-- Dead Man's Switch (Feature 3)
CREATE TABLE IF NOT EXISTS deadman_switches (
  id TEXT PRIMARY KEY,
  checkin_token TEXT NOT NULL,
  checkin_interval_seconds INTEGER NOT NULL,
  last_checkin INTEGER NOT NULL,
  beneficiary TEXT,
  triggered INTEGER NOT NULL DEFAULT 0,
  revealed_payload TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deadman_checkin ON deadman_switches(last_checkin);

-- Ed25519 Signed Burn Receipts (Feature 4)
CREATE TABLE IF NOT EXISTS burn_receipts (
  id TEXT PRIMARY KEY,
  burned_at TEXT NOT NULL,
  requester_ip_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Canary Trap IDs (Feature 6)
CREATE TABLE IF NOT EXISTS canary_traps (
  id TEXT PRIMARY KEY,
  fake_secret TEXT NOT NULL,
  webhook_url TEXT,
  memo TEXT,
  created_at INTEGER NOT NULL,
  triggered_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at INTEGER
);

-- Secret Security Policies (Geo/IP Allow-list & Client ZK Mode) (Features 2 & 5)
CREATE TABLE IF NOT EXISTS secret_policies (
  id TEXT PRIMARY KEY,
  allowed_ips TEXT,
  allowed_countries TEXT,
  client_encrypted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
