const { Invoice, PurchaseInvoice, TreasuryTransaction } = require('../models');

function computePaymentStatus(totalPaid, totalAmount) {
  if (totalPaid <= 0) return 'unpaid';
  if (totalPaid < Number(totalAmount)) return 'partial';
  return 'paid';
}

// جمع دریافت‌های غیرباطل مرتبط با یک فاکتور فروش را با مبلغ کل آن مقایسه می‌کند
// و payment_status فاکتور را متناسب با آن به‌روز می‌کند. این تابع باید هم بعد
// از ثبت یک تراکنش دریافت جدید و هم بعد از باطل‌کردن آن صدا زده شود.
async function syncInvoicePaymentStatus(invoiceId, { transaction } = {}) {
  const invoice = await Invoice.findByPk(invoiceId, { transaction });
  if (!invoice) return null;

  const receipts = await TreasuryTransaction.findAll({
    where: { invoice_id: invoiceId, type: 'receipt', is_voided: false },
    transaction,
  });
  const totalReceived = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
  const paymentStatus = computePaymentStatus(totalReceived, invoice.total_amount);

  if (invoice.payment_status !== paymentStatus) {
    await invoice.update({ payment_status: paymentStatus }, { transaction });
  }

  return paymentStatus;
}

// همان منطق syncInvoicePaymentStatus اما برای فاکتور خرید تامین‌کننده: جمع
// پرداخت‌های غیرباطل (type='payment') مرتبط با آن را با مبلغ کل مقایسه می‌کند.
async function syncPurchaseInvoicePaymentStatus(purchaseInvoiceId, { transaction } = {}) {
  const purchaseInvoice = await PurchaseInvoice.findByPk(purchaseInvoiceId, { transaction });
  if (!purchaseInvoice) return null;

  const payments = await TreasuryTransaction.findAll({
    where: { purchase_invoice_id: purchaseInvoiceId, type: 'payment', is_voided: false },
    transaction,
  });
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paymentStatus = computePaymentStatus(totalPaid, purchaseInvoice.total_amount);

  if (purchaseInvoice.payment_status !== paymentStatus) {
    await purchaseInvoice.update({ payment_status: paymentStatus }, { transaction });
  }

  return paymentStatus;
}

module.exports = { syncInvoicePaymentStatus, syncPurchaseInvoicePaymentStatus };
