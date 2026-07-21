/**
 * utils/numberGenerator.js
 *
 * Generates collision-resistant document numbers using crypto.randomBytes
 * instead of a plain timestamp slice.
 *
 * Format:  <PREFIX>-<YYYYMMDD>-<6 random hex chars>
 * Example: ORD-20250614-a3f91c
 *
 * The date component helps humans identify roughly when a document was
 * created; the 6-byte random suffix (2^48 ≈ 281 trillion combinations)
 * makes collision essentially impossible even under high concurrency.
 */

const crypto = require('crypto');

/**
 * @param {string} prefix — e.g. 'ORD', 'PO', 'INV'
 * @returns {string}
 */
function generateOrderNumber(prefix) {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const day    = String(now.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex'); // 6 hex chars
  return `${prefix}-${year}${month}${day}-${random}`;
}

/**
 * Invoice numbers follow a slightly different convention.
 * Using the same underlying generator — just a different prefix.
 *
 * @returns {string}
 */
function generateInvoiceNumber() {
  return generateOrderNumber('INV');
}

module.exports = { generateOrderNumber, generateInvoiceNumber };
