/**
 * State-transition rules for sales orders and purchase orders.
 *
 * Only transitions listed in ALLOWED_TRANSITIONS are permitted.
 * The `quote` state is managed exclusively through the convert-to-order
 * endpoint and is not reachable via the generic updateStatus handler.
 *
 * INVENTORY_RESTORED_ON_CANCEL lists every sales-order status from which
 * a cancel transition must compensate previously deducted stock.
 */

'use strict';

// Sales-order allowed transitions (from → [to, ...])
const SALES_TRANSITIONS = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['processing', 'cancelled'],
  processing:       ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered:        [],
  cancelled:        [],
  // quote transitions are handled by convert-to-order, not updateStatus
  quote:            [],
};

// Stock was already deducted for these statuses, so cancelling must restore it
const SALES_RESTORE_ON_CANCEL = new Set(['pending', 'confirmed', 'processing', 'out_for_delivery']);

// Purchase-order allowed transitions (from → [to, ...])
const PURCHASE_TRANSITIONS = {
  draft:     ['ordered', 'cancelled'],
  ordered:   ['received', 'cancelled'],
  received:  [],          // terminal — inventory already added; reversal is blocked
  cancelled: [],          // terminal
};

/**
 * Returns true if moving from `from` to `to` is a valid sales-order transition.
 */
function isSalesTransitionAllowed(from, to) {
  const allowed = SALES_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Returns true if cancelling a sales order from `currentStatus` requires
 * restoring the deducted inventory.
 */
function salesCancelRestoresStock(currentStatus) {
  return SALES_RESTORE_ON_CANCEL.has(currentStatus);
}

/**
 * Returns true if moving from `from` to `to` is a valid purchase-order transition.
 */
function isPurchaseTransitionAllowed(from, to) {
  const allowed = PURCHASE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

module.exports = {
  isSalesTransitionAllowed,
  salesCancelRestoresStock,
  isPurchaseTransitionAllowed,
  SALES_TRANSITIONS,
  PURCHASE_TRANSITIONS,
};
