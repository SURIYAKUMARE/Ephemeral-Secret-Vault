#!/usr/bin/env node
'use strict';

/**
 * create-admin.js — CLI tool to create or update admin credentials
 *
 * Usage:
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js --username admin --password "MyP@ssw0rd!" --env
 *
 * Options:
 *   --username <name>   Admin username (default: admin)
 *   --password <pass>   Password (will prompt if omitted)
 *   --env               Print .env variable format instead of inserting to DB
 *   --update            Update existing admin user's password
 *   --help              Show this help message
 *
 * What it does:
 *   1. Hashes the password with bcrypt (cost factor 12)
 *   2. Either inserts into admin_users table OR prints the ADMIN_PASSWORD_HASH value
 *   3. Never stores plaintext password anywhere
 */

require('dotenv').config();

const crypto   = require('node:crypto');
const path     = require('node:path');
const readline = require('node:readline');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help')) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   Ephemeral Secret Vault — Admin Account Creator         ║
╚══════════════════════════════════════════════════════════╝

Usage:
  node scripts/create-admin.js [options]

Options:
  --username <name>   Admin username (default: admin)
  --password <pass>   Password in plain text (will prompt if omitted)
  --env               Print ADMIN_PASSWORD_HASH for .env instead of DB
  --update            Update password for existing admin user in DB
  --help              Show this help message

Examples:
  # Interactive (recommended)
  node scripts/create-admin.js

  # Print .env format
  node scripts/create-admin.js --username admin --env

  # Create with specific credentials
  node scripts/create-admin.js --username admin --password "SecurePass@123"

Security:
  - Passwords are hashed with bcrypt (cost 12) — plaintext is never stored
  - Set ADMIN_PASSWORD_HASH in .env for the env-based authentication
  - Or insert directly into admin_users SQLite table for DB-based auth
`);
  process.exit(0);
}

const envMode  = hasFlag('--env');
const updateMode = hasFlag('--update');
const username = getArg('--username') || 'admin';
let   password = getArg('--password') || null;

async function promptPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write('Enter password (input hidden): ');
    // Disable echo
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    let pass = '';
    process.stdin.on('data', function handler(char) {
      char = char + '';
      if (char === '\n' || char === '\r' || char === '\u0004') {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        rl.close();
        resolve(pass);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007F') {
        pass = pass.slice(0, -1);
      } else {
        pass += char;
        process.stdout.write('*');
      }
    });
    process.stdin.resume();
  });
}

async function hashPassword(plain) {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(plain, 12);
  } catch {
    // Fallback to scrypt if bcryptjs not available
    const salt   = crypto.randomBytes(16).toString('hex');
    const hash   = crypto.scryptSync(plain, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
  }
}

function validatePassword(pass) {
  if (!pass || pass.length < 8) return 'Password must be at least 8 characters.';
  if (pass.length < 12) console.warn('  ⚠  Weak password — recommend 12+ characters with mixed case and symbols.');
  return null;
}

async function run() {
  console.log('\n🔐 Ephemeral Secret Vault — Admin Account Creator\n');

  if (!password) {
    password = await promptPassword();
  }

  const validationError = validatePassword(password);
  if (validationError) {
    console.error('  ✗  ' + validationError);
    process.exit(1);
  }

  console.log('  ⏳  Hashing password (bcrypt cost 12)…');
  const hash = await hashPassword(password);
  password = null; // Clear plaintext from memory ASAP

  if (envMode) {
    // ── Env mode: print .env variables ────────────────────────────────
    console.log('\n  ✅  Environment variable for .env:\n');
    console.log('  ┌────────────────────────────────────────────────────────────┐');
    console.log(`  │ ADMIN_USERNAME=${username.padEnd(46)}│`);
    console.log(`  │ ADMIN_PASSWORD_HASH=${hash.slice(0,41)}… │`);
    console.log('  └────────────────────────────────────────────────────────────┘\n');
    console.log('  Full ADMIN_PASSWORD_HASH value:');
    console.log('  ' + hash);
    console.log('\n  Add these to your .env file and Vercel environment variables.');
    console.log('  ⚠  Never commit .env to version control.\n');
    return;
  }

  // ── DB mode: insert into admin_users table ─────────────────────────
  try {
    const { initDb } = require('../src/database/db');
    const db = initDb();

    const existing = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);

    if (existing && !updateMode) {
      console.error(`  ✗  Admin user "${username}" already exists. Use --update to change password.`);
      process.exit(1);
    }

    const now  = Date.now();
    const salt = crypto.randomBytes(16).toString('hex');

    if (existing && updateMode) {
      db.prepare('UPDATE admin_users SET password_hash = ?, password_salt = ? WHERE username = ?')
        .run(hash, salt, username);
      console.log(`\n  ✅  Password updated for admin: "${username}"`);
    } else {
      const adminId = 'admin_' + crypto.randomBytes(8).toString('hex');
      db.prepare(`
        INSERT INTO admin_users (id, username, password_hash, password_salt, role, created_at)
        VALUES (?, ?, ?, ?, 'superadmin', ?)
      `).run(adminId, username, hash, salt, now);
      console.log(`\n  ✅  Admin user created:`);
      console.log(`     Username : ${username}`);
      console.log(`     ID       : ${adminId}`);
      console.log(`     Role     : superadmin`);
      console.log(`     Hash     : ${hash.slice(0,20)}…`);
    }

    // Write an audit log entry
    try {
      const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, admin_username, action_type, result, details)
        VALUES (?, ?, ?, ?, 'SUCCESS', ?)
      `).run(auditId, now, username,
        existing ? 'ADMIN_PASSWORD_UPDATED' : 'ADMIN_USER_CREATED',
        JSON.stringify({ by: 'CLI create-admin.js', at: new Date(now).toISOString() }));
    } catch (_) {}

    console.log('\n  🔑  Login at: /admin/login');
    console.log('  ⚠  Keep your credentials secure. All admin actions are logged.\n');

  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('\n  ✗  Could not load database. Use --env mode to get the hash for .env instead:\n');
      console.error('     node scripts/create-admin.js --env\n');
    } else {
      console.error('\n  ✗  Database error:', err.message);
    }
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
