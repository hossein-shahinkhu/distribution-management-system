'use strict';
const { Invoice, SalesCreditNote } = require('../models');
const { generateOrderNumber } = require('../utils/numberGenerator');
const { cents } = require('../utils/money');

// Caller must hold the order lock. Never call outside the cancellation transaction.
async function postCancellationCredit(order, actorId, transaction) {
  if (!transaction || !actorId) throw new Error('Cancellation transaction and actor required');
  const invoice = await Invoice.findOne({ where: { order_id: order.id }, transaction, lock: transaction.LOCK.UPDATE });
  if (!invoice) return null;
  if (cents(invoice.subtotal) < 0n || cents(invoice.tax_amount) < 0n ||
      cents(invoice.total_amount) !== cents(invoice.subtotal) + cents(invoice.tax_amount)) {
    const err = new Error('مبالغ فاکتور ناسازگار است؛ نیاز به بررسی مالی دارد.');
    err.statusCode = 409;
    throw err;
  }
  if (await SalesCreditNote.findOne({ where: { invoice_id: invoice.id }, transaction })) {
    const err = new Error('سند اعتبار این فاکتور قبلاً ثبت شده است.');
    err.statusCode = 409;
    throw err;
  }
  return SalesCreditNote.create({
    credit_number: generateOrderNumber('SCN'), invoice_id: invoice.id,
    order_id: order.id, customer_id: order.customer_id,
    subtotal: invoice.subtotal, tax_amount: invoice.tax_amount, total_amount: invoice.total_amount,
    confirmed_not_dispatched: true, created_by: actorId,
  }, { transaction });
}
module.exports = { postCancellationCredit };
