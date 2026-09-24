const path = require('node:path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const port = parseInt(process.env.PORT, 10) || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
const rawKey = process.env.VAULT_MASTER_KEY;

function validateAndGetMasterKey(key = rawKey) {
  if (!key) {
    throw new Error('FATAL: VAULT_MASTER_KEY environment variable is required. Generate one using: node scripts/gen-key.js');
  }
  const trimmed = key.trim();
  if (trimmed.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new Error('FATAL: VAULT_MASTER_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }
  return Buffer.from(trimmed, 'hex');
}

// In non-test environments or when key is present, validate master key
let masterKeyBuffer;
try {
  masterKeyBuffer = validateAndGetMasterKey();
} catch (err) {
  if (nodeEnv !== 'test') {
    console.error(err.message);
    process.exit(1);
  }
}

const databasePath = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(process.cwd(), 'data', 'vault.db');
const baseUrl = (process.env.BASE_URL || process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');
const sweeperIntervalMs = parseInt(process.env.SWEEPER_INTERVAL_MS || process.env.SWEEP_INTERVAL_MS, 10) || 10000;

module.exports = {
  port,
  nodeEnv,
  vaultMasterKey: rawKey,
  masterKeyBuffer,
  databasePath,
  baseUrl,
  sweeperIntervalMs,
  validateAndGetMasterKey
};
