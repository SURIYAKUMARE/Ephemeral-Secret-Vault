const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const port = parseInt(process.env.PORT, 10) || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
const rawKey = process.env.VAULT_MASTER_KEY;
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);

function validateAndGetMasterKey(key = rawKey) {
  if (!key) {
    throw new Error('VAULT_MASTER_KEY environment variable is required.');
  }
  const trimmed = key.trim();
  if (trimmed.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new Error('VAULT_MASTER_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }
  return Buffer.from(trimmed, 'hex');
}

// In non-test environments or when key is present, validate master key
let masterKeyBuffer;
let effectiveMasterKey = rawKey;

try {
  masterKeyBuffer = validateAndGetMasterKey(rawKey);
} catch (err) {
  if (nodeEnv === 'test') {
    effectiveMasterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    masterKeyBuffer = Buffer.from(effectiveMasterKey, 'hex');
  } else if (isVercel) {
    // Vercel / serverless runtime fallback: generate 256-bit ephemeral key if not set in Vercel settings
    console.warn('[VAULT WARNING] VAULT_MASTER_KEY not set in Vercel environment variables. Using auto-generated 256-bit ephemeral key for this instance.');
    effectiveMasterKey = crypto.randomBytes(32).toString('hex');
    masterKeyBuffer = Buffer.from(effectiveMasterKey, 'hex');
  } else {
    // Local development fallback instead of crashing
    console.warn(`[VAULT WARNING] ${err.message}. Using development fallback master key.`);
    effectiveMasterKey = crypto.createHash('sha256').update('ephemeral-secret-vault-dev-master-key').digest('hex');
    masterKeyBuffer = Buffer.from(effectiveMasterKey, 'hex');
  }
}

// Ensure writable path on Vercel serverless (/tmp)
const defaultDbPath = isVercel
  ? path.join('/tmp', 'vault.db')
  : path.join(process.cwd(), 'data', 'vault.db');

const databasePath = process.env.DATABASE_PATH || process.env.DB_PATH || defaultDbPath;

let defaultBaseUrl = `http://localhost:${port}`;
if (process.env.VERCEL_URL) {
  defaultBaseUrl = `https://${process.env.VERCEL_URL}`;
}
const baseUrl = (process.env.BASE_URL || process.env.PUBLIC_BASE_URL || defaultBaseUrl).replace(/\/+$/, '');
const sweeperIntervalMs = parseInt(process.env.SWEEPER_INTERVAL_MS || process.env.SWEEP_INTERVAL_MS, 10) || 10000;

module.exports = {
  port,
  nodeEnv,
  isVercel,
  vaultMasterKey: effectiveMasterKey,
  masterKeyBuffer,
  databasePath,
  baseUrl,
  sweeperIntervalMs,
  validateAndGetMasterKey
};
