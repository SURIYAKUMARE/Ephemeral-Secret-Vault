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

-- Reveal Authorization Tokens (Short-lived, single-use, cryptographically hashed)
CREATE TABLE IF NOT EXISTS reveal_tokens (
  token_hash TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reveal_tokens_vault ON reveal_tokens(vault_id);
CREATE INDEX IF NOT EXISTS idx_reveal_tokens_expiry ON reveal_tokens(expires_at);

-- ============================================================================
-- Professional Security-Focused Admin Dashboard Architecture
-- ============================================================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'superadmin',
  totp_secret TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  is_valid INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);

-- Non-Sensitive File Metadata & Lifecycle Controls Table
CREATE TABLE IF NOT EXISTS file_metadata_records (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL DEFAULT 'Secret Note',
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'text/plain',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  max_views INTEGER NOT NULL DEFAULT 1,
  views_remaining INTEGER NOT NULL DEFAULT 1,
  access_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_revoked INTEGER NOT NULL DEFAULT 0,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  revoked_at INTEGER,
  has_passphrase INTEGER NOT NULL DEFAULT 0,
  require_verification INTEGER NOT NULL DEFAULT 0,
  require_location INTEGER NOT NULL DEFAULT 0,
  disable_downloads INTEGER NOT NULL DEFAULT 0,
  disable_previews INTEGER NOT NULL DEFAULT 0,
  one_time_burn INTEGER NOT NULL DEFAULT 1,
  client_encrypted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_file_meta_status ON file_metadata_records(status);
CREATE INDEX IF NOT EXISTS idx_file_meta_created ON file_metadata_records(created_at);
CREATE INDEX IF NOT EXISTS idx_file_meta_expires ON file_metadata_records(expires_at);

-- Access Events Table (Comprehensive Monitoring)
CREATE TABLE IF NOT EXISTS access_events (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  ip_address TEXT NOT NULL,
  country TEXT DEFAULT 'Unknown',
  region TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown',
  isp_asn TEXT DEFAULT 'Unknown',
  browser TEXT DEFAULT 'Unknown',
  os TEXT DEFAULT 'Unknown',
  device_type TEXT DEFAULT 'Desktop',
  user_agent TEXT,
  referrer TEXT,
  access_status TEXT NOT NULL,
  session_id TEXT,
  previous_access_count INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  risk_reason TEXT,
  has_verification INTEGER NOT NULL DEFAULT 0,
  has_location INTEGER NOT NULL DEFAULT 0,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  location_source TEXT DEFAULT 'ip_fallback',
  exact_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_access_events_file ON access_events(file_id);
CREATE INDEX IF NOT EXISTS idx_access_events_time ON access_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_events_ip ON access_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_access_events_status ON access_events(access_status);
CREATE INDEX IF NOT EXISTS idx_access_events_risk ON access_events(risk_level);

-- Verification Records Table (Camera / Photo Verification)
CREATE TABLE IF NOT EXISTS verification_records (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  camera_permission TEXT NOT NULL DEFAULT 'DENIED',
  image_data TEXT,
  device_info TEXT
);
CREATE INDEX IF NOT EXISTS idx_verif_file ON verification_records(file_id);
CREATE INDEX IF NOT EXISTS idx_verif_event ON verification_records(event_id);

-- Location Records Table (Privacy-Preserving IP & Browser Consented Geolocation)
CREATE TABLE IF NOT EXISTS location_records (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'IP_APPROXIMATE',
  ip_country TEXT,
  ip_region TEXT,
  ip_city TEXT,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  exact_address TEXT,
  consent_granted INTEGER NOT NULL DEFAULT 0,
  retention_expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_loc_file ON location_records(file_id);
CREATE INDEX IF NOT EXISTS idx_loc_retention ON location_records(retention_expires_at);

-- Immutable-Style Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  admin_id TEXT,
  admin_username TEXT,
  file_id TEXT,
  event_id TEXT,
  action_type TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'SUCCESS',
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_file ON audit_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type);

-- Admin Global Security Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Secrets Metadata for Admin Dashboard Tracking
CREATE TABLE IF NOT EXISTS admin_secrets (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  max_views INTEGER NOT NULL DEFAULT 1,
  views_remaining INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_admin_secrets_created ON admin_secrets(created_at);

-- Consent-Based Access Log Table
CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  secret_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT,
  geo_city TEXT,
  geo_country TEXT,
  gps_lat REAL,
  gps_long REAL,
  gps_accuracy_m REAL,
  location_source TEXT CHECK(location_source IN ('gps', 'ip_fallback', 'denied')),
  user_agent TEXT,
  result TEXT CHECK(result IN ('revealed', 'already_burned', 'expired'))
);
CREATE INDEX IF NOT EXISTS idx_access_log_secret ON access_log(secret_id);
CREATE INDEX IF NOT EXISTS idx_access_log_timestamp ON access_log(timestamp);

