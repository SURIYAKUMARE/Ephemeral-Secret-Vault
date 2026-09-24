#!/usr/bin/env bash
# Inspection script for Ephemeral Secret Vault SQLite database

DB_FILE="${1:-data/vault.db}"
if [ ! -f "$DB_FILE" ] && [ -f "vault.db" ]; then
  DB_FILE="vault.db"
fi

if [ ! -f "$DB_FILE" ]; then
  echo "Database file '$DB_FILE' does not exist."
  exit 1
fi

echo "=== Ephemeral Secret Vault DB Inspection ==="
echo "Database: $DB_FILE"
echo ""

echo "--- Table Schema ---"
sqlite3 "$DB_FILE" ".schema secrets"

echo ""
echo "--- Active Records Count ---"
sqlite3 "$DB_FILE" "SELECT COUNT(*) AS active_secrets FROM secrets;"

echo ""
echo "--- Secrets Metadata (Excluding Ciphertext/IV/Tag) ---"
sqlite3 "$DB_FILE" "SELECT id, max_views, views_remaining, datetime(expires_at/1000, 'unixepoch') AS expires_utc, datetime(created_at/1000, 'unixepoch') AS created_utc FROM secrets;"

echo ""
echo "--- Raw Plaintext Scan Check ---"
echo "Searching DB and WAL files for sample plaintexts..."
if [ -n "$2" ]; then
  if grep -q "$2" "$DB_FILE" 2>/dev/null || ( [ -f "${DB_FILE}-wal" ] && grep -q "$2" "${DB_FILE}-wal" 2>/dev/null ); then
    echo "WARNING: Plaintext '$2' was found in raw database bytes!"
  else
    echo "OK: Plaintext '$2' was NOT found in raw database bytes (zero trace confirmed)."
  fi
fi
