const { canReadOrderFinancials } = require('../utils/financialAccess');
'use strict';
const { sequelize, Invoice, Order, SalesCreditNote, TreasuryTransaction } = require('../models');
const { syncInvoicePaymentStatus } = require('../utils/invoicePaymentSync');
const { cents } = require('../utils/money');

function fail(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

// Same lock order as invoice issuance/cancellation: order -> invoice -> receipt.
// Query the order separately: PostgreSQL cannot lock the nullable side of a JOIN.
async function lockInvoice(invoiceId, transaction) {
  const reference = await Invoice.findByPk(invoiceId, { transaction });
  if (!reference) fail(404, 'فاکتور یافت نشد.');
  const order = await Order.findByPk(reference.order_id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!order) fail(409, 'سفارش فاکتور یافت نشد.');
  const invoice = await Invoice.findByPk(invoiceId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!invoice || invoice.order_id !== order.id) fail(409, 'ارتباط فاکتور تغییر کرده است.');
  return { order, invoice };
}

async function createSalesReceipt(data, actorId, include, actor) {
  let value;
  try { value = cents(String(data.amount)); } catch {
    fail(422, 'مبلغ دریافت باید حداکثر دو رقم اعشار داشته باشد.');
  }
  if (value <= 0n || value > 99999999999999n) fail(422, 'مبلغ دریافت خارج از محدوده مجاز است.');
  return sequelize.transaction(async (transaction) => {
    const { invoice, order } = await lockInvoice(data.invoice_id, transaction);
    if (actor && !canReadOrderFinancials(actor, order)) fail(404, 'فاکتور یافت نشد.');
    if (data.customer_id != null && Number(data.customer_id) !== order.customer_id) {
      fail(422, 'مشتری دریافت باید مالک فاکتور فروش باشد.');
    }
    const credit = await SalesCreditNote.findOne({
      where: { invoice_id: invoice.id, kind: 'order_cancellation', status: 'posted' }, transaction,
    });
    if (order.status === 'cancelled' || (credit && cents(credit.total_amount) >= cents(invoice.total_amount))) {
      fail(409, 'ثبت دریافت برای فاکتور ابطال‌شده مجاز نیست.');
    }
    const receipt = await TreasuryTransaction.create({
      type: 'receipt', amount: data.amount, method: data.method,
      reference_number: data.reference_number || null,
      transaction_date: data.transaction_date || new Date(), description: data.description || null,
      customer_id: order.customer_id, invoice_id: invoice.id, purchase_invoice_id: null, created_by: actorId,
    }, { transaction });
    await syncInvoicePaymentStatus(invoice.id, { transaction });
    return receipt.reload({ transaction, include });
  });
}

async function voidSalesReceipt(receiptId, include, actor) {
  return sequelize.transaction(async (transaction) => {
    const reference = await TreasuryTransaction.findByPk(receiptId, { transaction });
    if (!reference) fail(404, 'تراکنش یافت نشد.');
    const { invoice, order } = await lockInvoice(reference.invoice_id, transaction);
    if (actor && !canReadOrderFinancials(actor, order)) fail(404, 'تراکنش یافت نشد.');
    const receipt = await TreasuryTransaction.findByPk(receiptId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!receipt || receipt.type !== 'receipt' || receipt.invoice_id !== invoice.id) {
      fail(409, 'ارتباط تراکنش تغییر کرده است.');
    }
    if (receipt.is_voided) fail(400, 'این تراکنش قبلاً باطل شده است.');
    await receipt.update({ is_voided: true }, { transaction });
    await syncInvoicePaymentStatus(invoice.id, { transaction });
    return receipt.reload({ transaction, include });
  });
}
module.exports = { createSalesReceipt, voidSalesReceipt };
