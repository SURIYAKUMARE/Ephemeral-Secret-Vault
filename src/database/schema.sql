-- Ephemeral Secret Vault Database Schema
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA secure_delete = ON;

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
