const { Op } = require('sequelize');
const { financialDocumentView } = require('../utils/financialAccess');
const { TreasuryTransaction, Customer, Invoice, PurchaseInvoice, User, Order } = require('../models');
const { parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const { syncPurchaseInvoicePaymentStatus } = require('../utils/invoicePaymentSync');
const logger = require('../utils/logger');
const { createSalesReceipt, voidSalesReceipt } = require('../services/salesReceiptService');

const INCLUDE = [
  Customer,
  Invoice,
  PurchaseInvoice,
  { model: User, as: 'creator', attributes: ['id', 'full_name'] },
];

// فیلدهای مجاز برای ثبت تراکنش (allowlist)
const ALLOWED_FIELDS = ['type', 'amount', 'method', 'reference_number', 'transaction_date', 'description', 'customer_id', 'invoice_id', 'purchase_invoice_id'];

// ثبت تراکنش دریافت/پرداخت جدید. اگر از نوع دریافت باشد و به یک فاکتور متصل
// شده باشد، وضعیت پرداخت آن فاکتور بلافاصله بازمحاسبه می‌شود.
async function create(req, res) {
  try {
    const {
      type, amount, method, reference_number, transaction_date,
      description, customer_id, invoice_id, purchase_invoice_id,
    } = req.body;

    if ((invoice_id && purchase_invoice_id) || (invoice_id && type !== 'receipt') ||
        (purchase_invoice_id && type !== 'payment')) {
      return res.status(422).json({ message: 'نوع تراکنش و مرجع فاکتور سازگار نیستند؛ دریافت برای فروش و پرداخت برای خرید است.' });
    }
    if (type === 'payment' && customer_id) {
      return res.status(403).json({ message: 'پرداخت به مشتری از مسیر عمومی مجاز نیست؛ بازپرداخت کنترل‌شده هنوز پشتیبانی نمی‌شود.' });
    }
    if (invoice_id) {
      const receipt = await createSalesReceipt(req.body, req.user.id, INCLUDE, req.user);
      return res.status(201).json(financialDocumentView(req.user, receipt));
    }

    if (req.user.Role?.name !== 'admin') return res.status(403).json({ message: 'اسناد بدون مالکیت سفارش فقط برای مدیر مجازند.' });
    if (customer_id) {
      const customer = await Customer.findByPk(customer_id);
      if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    }
    if (purchase_invoice_id) {
      const purchaseInvoice = await PurchaseInvoice.findByPk(purchase_invoice_id);
      if (!purchaseInvoice) return res.status(404).json({ message: 'فاکتور خرید یافت نشد.' });
    }

    const record = await TreasuryTransaction.create({
      type,
      amount,
      method,
      reference_number:    reference_number    || null,
      transaction_date:    transaction_date    || new Date(),
      description:         description         || null,
      customer_id:         customer_id         || null,
      invoice_id:          invoice_id          || null,
      purchase_invoice_id: purchase_invoice_id || null,
      created_by:          req.user.id,
    });

    if (type === 'payment' && purchase_invoice_id) {
      await syncPurchaseInvoicePaymentStatus(purchase_invoice_id);
    }

    const full = await TreasuryTransaction.findByPk(record.id, { include: INCLUDE });
    return res.status(201).json(full);
  } catch (err) {
    logger.error('treasury.create error', { error: err.message });
    return res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'خطای داخلی سرور.' });
  }
}

async function getAll(req, res) {
  try {
    const { type, customer_id, invoice_id, purchase_invoice_id, from, to } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (type)                where.type                = type;
    if (customer_id)         where.customer_id         = customer_id;
    if (invoice_id)          where.invoice_id          = invoice_id;
    if (purchase_invoice_id) where.purchase_invoice_id = purchase_invoice_id;
    if (from || to) {
      where.transaction_date = {};
      if (from) where.transaction_date[Op.gte] = new Date(from);
      if (to)   where.transaction_date[Op.lte] = new Date(to);
    }

    const result = await TreasuryTransaction.findAndCountAll({
      where,
      include: req.user.Role?.name === 'salesperson' ? [Customer, { model: Invoice, required: true, include: [{ model: Order, required: true, where: { salesperson_id: req.user.id }, attributes: [] }] }, { model: User, as: 'creator', attributes: ['id', 'full_name'] }] : INCLUDE,
      order: [['transaction_date', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json(buildPaginatedResponse({ ...result, rows: result.rows.map(r => financialDocumentView(req.user, r)) }, page, limit));
  } catch (err) {
    logger.error('treasury.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// باطل‌کردن یک تراکنش به‌جای حذف واقعی آن؛ در صورت دریافت مرتبط با فاکتور،
// وضعیت پرداخت فاکتور دوباره بازمحاسبه می‌شود.
async function voidTransaction(req, res) {
  try {
    const record = await TreasuryTransaction.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'تراکنش یافت نشد.' });
    if (record.type === 'receipt' && record.invoice_id) {
      return res.json(financialDocumentView(req.user, await voidSalesReceipt(record.id, INCLUDE, req.user)));
    }
    if (req.user.Role?.name !== 'admin') return res.status(404).json({ message: 'تراکنش یافت نشد.' });
    if (record.is_voided) {
      return res.status(400).json({ message: 'این تراکنش قبلاً باطل شده است.' });
    }

    await record.update({ is_voided: true });

    if (record.type === 'payment' && record.purchase_invoice_id) {
      await syncPurchaseInvoicePaymentStatus(record.purchase_invoice_id);
    }

    const full = await TreasuryTransaction.findByPk(record.id, { include: INCLUDE });
    return res.json(full);
  } catch (err) {
    logger.error('treasury.voidTransaction error', { error: err.message });
    return res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'خطای داخلی سرور.' });
  }
}

module.exports = { create, getAll, voidTransaction };
