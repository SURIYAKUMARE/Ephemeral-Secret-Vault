const crypto = require('node:crypto');

// Standard Rijndael Galois Field GF(2^8) with irreducible polynomial 0x11b and generator 3
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    // Multiply by generator 3 in GF(256): (x * 3) = (x * 2) ^ x
    let next = (x << 1) ^ x;
    if (next & 0x100) next ^= 0x11b;
    x = next & 0xff;
  }
})();

function gMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function gDiv(a, b) {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return EXP[(LOG[a] - LOG[b] + 255) % 255];
}

/**
 * Splits a secret Buffer into n shares with a reconstruction threshold of k.
 *
 * @param {Buffer} secret - The secret bytes to split
 * @param {number} k - Threshold of shares required (2 <= k <= n)
 * @param {number} n - Total number of shares to generate (k <= n <= 255)
 * @returns {string[]} Array of n hex-encoded share strings
 */
function split(secret, k, n) {
  if (!Buffer.isBuffer(secret) || secret.length === 0) {
    throw new TypeError('Secret must be a non-empty Buffer');
  }
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 2 || n < k || n > 255) {
    throw new RangeError(`Threshold k (${k}) and total n (${n}) must satisfy 2 <= k <= n <= 255`);
  }

  const len = secret.length;
  // Pre-generate random coefficients for degree k-1 polynomials
  // For each secret byte, we need k - 1 random coefficients
  const coefficients = crypto.randomBytes(len * (k - 1));

  const shares = [];
  for (let x = 1; x <= n; x++) {
    const shareBuf = Buffer.alloc(1 + len);
    shareBuf[0] = x; // 1-indexed x coordinate in GF(256)

    for (let i = 0; i < len; i++) {
      let y = secret[i]; // a_0
      let xPow = x;
      for (let c = 1; c < k; c++) {
        const coef = coefficients[i * (k - 1) + (c - 1)];
        y ^= gMul(coef, xPow);
        xPow = gMul(xPow, x);
      }
      shareBuf[1 + i] = y;
    }

    shares.push(shareBuf.toString('hex'));
  }

  return shares;
}

/**
 * Combines k shares to reconstruct the original secret Buffer.
 *
 * @param {string[]|Buffer[]} rawShares - Array of at least k share hex strings or Buffers
 * @returns {Buffer} The reconstructed secret
 */
function combine(rawShares) {
  if (!Array.isArray(rawShares) || rawShares.length < 2) {
    throw new Error('At least 2 shares are required for reconstruction');
  }

  const parsedShares = rawShares.map((s, idx) => {
    const buf = Buffer.isBuffer(s) ? s : Buffer.from(String(s).trim(), 'hex');
    if (buf.length < 2) {
      throw new Error(`Share at index ${idx} is too short`);
    }
    return {
      x: buf[0],
      y: buf.subarray(1)
    };
  });

  const k = parsedShares.length;
  const len = parsedShares[0].y.length;

  // Validate shares
  const seenX = new Set();
  for (const s of parsedShares) {
    if (s.x === 0) throw new Error('Share x coordinate cannot be 0');
    if (seenX.has(s.x)) throw new Error(`Duplicate share with x coordinate ${s.x}`);
    seenX.add(s.x);
    if (s.y.length !== len) throw new Error('Shares have mismatched lengths');
  }

  // Precompute Lagrange basis polynomials at x = 0:
  // l_j(0) = Prod_{m != j} (x_m / (x_j ^ x_m))
  const basis = new Uint8Array(k);
  for (let j = 0; j < k; j++) {
    let num = 1;
    let den = 1;
    for (let m = 0; m < k; m++) {
      if (m === j) continue;
      num = gMul(num, parsedShares[m].x);
      den = gMul(den, parsedShares[j].x ^ parsedShares[m].x);
    }
    basis[j] = gDiv(num, den);
  }

  // Reconstruct each byte
  const secret = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    let val = 0;
    for (let j = 0; j < k; j++) {
      val ^= gMul(parsedShares[j].y[i], basis[j]);
    }
    secret[i] = val;
  }

  return secret;
}

module.exports = {
  split,
  combine,
  gMul,
  gDiv
};
