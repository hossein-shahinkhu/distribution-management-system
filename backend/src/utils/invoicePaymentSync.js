const { Invoice, TreasuryTransaction } = require('../models');

// جمع دریافت‌های غیرباطل مرتبط با یک فاکتور را با مبلغ کل آن مقایسه می‌کند
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

  let paymentStatus;
  if (totalReceived <= 0) {
    paymentStatus = 'unpaid';
  } else if (totalReceived < Number(invoice.total_amount)) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'paid';
  }

  if (invoice.payment_status !== paymentStatus) {
    await invoice.update({ payment_status: paymentStatus }, { transaction });
  }

  return paymentStatus;
}

module.exports = { syncInvoicePaymentStatus };
