#!/usr/bin/env node

const autocannon = require('autocannon');
const crypto = require('node:crypto');
const app = require('../src/app');
const { initDb, closeDb } = require('../src/database/db');

async function runBenchmark() {
  const targetUrl = process.env.BASE_URL || process.env.VAULT_URL || 'http://localhost:3000';
  let serverInstance = null;

  // Check if server is running, otherwise boot an in-memory/ephemeral instance
  try {
    const healthCheck = await fetch(`${targetUrl}/health`);
    if (!healthCheck.ok) throw new Error('Not ok');
  } catch {
    console.log('[Bench] No active server detected at ' + targetUrl + '. Starting benchmark server...');
    process.env.VAULT_MASTER_KEY = process.env.VAULT_MASTER_KEY || crypto.randomBytes(32).toString('hex');
    initDb(':memory:');
    serverInstance = app.listen(3000, '127.0.0.1');
    console.log('[Bench] Temporary server running on http://127.0.0.1:3000');
  }

  console.log('\n======================================================');
  console.log('       EPHEMERAL SECRET VAULT PERFORMANCE BENCHMARK   ');
  console.log('======================================================\n');

  // Benchmark 1: Landing Page (GET /)
  console.log('--- 1. Benchmarking Landing Page (GET /) ---');
  const landingResult = await autocannon({
    url: `${targetUrl}/`,
    connections: 50,
    duration: 5,
    pipelining: 1
  });
  console.log(`Requests/sec: ${landingResult.requests.average}`);
  console.log(`Latency avg:  ${landingResult.latency.average} ms`);
  console.log(`Latency p99:  ${landingResult.latency.p99} ms`);
  console.log(`Throughput:   ${(landingResult.throughput.average / 1024 / 1024).toFixed(2)} MB/s\n`);

  // Benchmark 2: Burn Miss (POST /api/secret/0123456789ab/burn)
  console.log('--- 2. Benchmarking Burn Miss (POST /api/secret/0123456789ab/burn) ---');
  const burnMissResult = await autocannon({
    url: `${targetUrl}/api/secret/0123456789ab/burn`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    connections: 50,
    duration: 5,
    pipelining: 1
  });
  console.log(`Requests/sec: ${burnMissResult.requests.average}`);
  console.log(`Latency avg:  ${burnMissResult.latency.average} ms`);
  console.log(`Latency p99:  ${burnMissResult.latency.p99} ms`);
  console.log(`Throughput:   ${(burnMissResult.throughput.average / 1024 / 1024).toFixed(2)} MB/s\n`);

  if (serverInstance) {
    await serverInstance.close();
  }

  console.log('======================================================');
  console.log('Benchmark finished successfully.');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
