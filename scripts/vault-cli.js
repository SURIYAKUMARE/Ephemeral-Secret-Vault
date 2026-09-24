#!/usr/bin/env node

/**
 * Ephemeral Secret Vault CLI
 *
 * Reads secret from stdin, sends to Vault API, and outputs the resulting secure URL and metadata.
 * Never echoes the plaintext secret unnecessarily.
 * All errors are sent to stderr with non-zero exit code.
 *
 * Usage:
 *   echo "my-secret" | node scripts/vault-cli.js
 *   cat secret.txt | node scripts/vault-cli.js --ttl 3600 --views 1
 */

async function main() {
  const args = process.argv.slice(2);
  let ttl = 3600;
  let views = 1;
  let passphrase = null;
  let vaultUrl = process.env.BASE_URL || process.env.VAULT_URL || 'http://localhost:3000';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--ttl' && i + 1 < args.length) {
      ttl = parseInt(args[++i], 10);
    } else if (arg === '--views' && i + 1 < args.length) {
      views = parseInt(args[++i], 10);
    } else if (arg === '--passphrase' && i + 1 < args.length) {
      passphrase = args[++i];
    } else if (arg === '--url' && i + 1 < args.length) {
      vaultUrl = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      process.stderr.write(`Ephemeral Secret Vault CLI\n\nUsage: echo "secret" | node scripts/vault-cli.js [options]\n\nOptions:\n  --ttl <seconds>       Expiration in seconds (default: 3600)\n  --views <number>      Maximum views allowed (default: 1)\n  --passphrase <string> Optional decryption passphrase\n  --url <vault-url>     Vault server URL (default: http://localhost:3000)\n  -h, --help            Show this help message\n`);
      process.exitCode = 0;
      return;
    }
  }

  if (process.stdin.isTTY) {
    process.stderr.write('Error: No input provided via stdin. Pipe data into vault-cli (e.g., echo "secret" | node scripts/vault-cli.js)\n');
    process.exitCode = 1;
    return;
  }

  // Read entire stdin
  let secretInput = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    secretInput += chunk;
  }

  // Trim trailing newline from echo
  secretInput = secretInput.replace(/\r?\n$/, '');

  if (!secretInput) {
    process.stderr.write('Error: Secret cannot be empty.\n');
    process.exitCode = 1;
    return;
  }

  const endpoint = `${vaultUrl.replace(/\/+$/, '')}/api/secret`;
  const payload = {
    secret: secretInput,
    ttl_seconds: ttl,
    max_views: views
  };
  if (passphrase) {
    payload.passphrase = passphrase;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      process.stderr.write(`Error: ${data.error || `HTTP ${res.status} ${res.statusText}`}\n`);
      process.exitCode = 1;
      return;
    }

    // Print resulting secure URL to stdout
    process.stdout.write(`${data.view_url}\n`);
    process.exitCode = 0;
    return;
  } catch (err) {
    process.stderr.write(`Error connecting to Vault server at ${vaultUrl}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }
}

main();
