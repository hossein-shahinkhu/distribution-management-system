'use strict';

// DECIMAL(14,2): calculate in integer hundredths, convert only at the API edge.
function cents(value) {
  // SQLite returns DECIMAL as JS numbers; normalize its binary representation.
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) >= 1e12)) {
    throw new Error('Invalid monetary range');
  }
  const text = typeof value === 'number' ? value.toFixed(2) : String(value ?? '0');
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error('Invalid monetary precision');
  const result = BigInt(match[2]) * 100n + BigInt((match[3] || '').padEnd(2, '0'));
  return match[1] ? -result : result;
}
function amount(value) { return Number(value) / 100; }
// Exact JSON in the existing currency unit (toman), always two decimals.
// Additive: legacy amount() consumers retain their numeric contract.
function decimalAmount(value) {
  if (typeof value !== 'bigint') throw new TypeError('Integer hundredths required');
  const unsigned = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${unsigned / 100n}.${(unsigned % 100n).toString().padStart(2, '0')}`;
}
module.exports = { cents, amount, decimalAmount };
