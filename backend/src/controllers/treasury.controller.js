const { Op, literal, Transaction } = require('sequelize');
const { cents, decimalAmount } = require('../utils/money');
const { financialDocumentView } = require('../utils/financialAccess');
const { sequelize, TreasuryTransaction, Customer, Invoice, PurchaseInvoice, User, Order } = require('../models');
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

// GET ?include_summary=true adds scoped totals and each row's running_balance.
// The running balance starts at zero within the selected filters, not before from.
// All four aggregate fields are exact decimal strings in toman, with two decimals.
async function getAll(req, res) {
  try {
    const { type, customer_id, invoice_id, purchase_invoice_id, from, to, is_voided } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (type)                where.type                = type;
    if (customer_id)         where.customer_id         = customer_id;
    if (invoice_id)          where.invoice_id          = invoice_id;
    if (purchase_invoice_id) where.purchase_invoice_id = purchase_invoice_id;
    if (is_voided !== undefined) {
      if (!['true', 'false'].includes(is_voided)) return res.status(400).json({ message: 'وضعیت ابطال نامعتبر است.' });
      where.is_voided = is_voided === 'true';
    }
    if (from || to) {
      where.transaction_date = {};
      if (from) where.transaction_date[Op.gte] = new Date(from);
      if (to)   where.transaction_date[Op.lte] = new Date(to);
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) where.transaction_date[Op.lte].setUTCHours(23, 59, 59, 999);
      if ((from && !Number.isFinite(where.transaction_date[Op.gte].getTime())) ||
          (to && !Number.isFinite(where.transaction_date[Op.lte].getTime())) ||
          (from && to && where.transaction_date[Op.gte] > where.transaction_date[Op.lte])) {
        return res.status(400).json({ message: 'بازه تاریخ نامعتبر است.' });
      }
    }

    const ownerInclude = req.user.Role?.name === 'salesperson' ? [{ model: Invoice, attributes: [], required: true,
      include: [{ model: Order, required: true, where: { salesperson_id: req.user.id }, attributes: [] }] }] : [];
    const includeSummary = req.query.include_summary === 'true';
    // Both aggregates and the page use the same scope and PostgreSQL snapshot.
    const read = async (transaction) => {
      const result = await TreasuryTransaction.findAndCountAll({
        where,
        include: req.user.Role?.name === 'salesperson' ? [Customer, { model: Invoice, required: true, include: [{ model: Order, required: true, where: { salesperson_id: req.user.id }, attributes: [] }] }, { model: User, as: 'creator', attributes: ['id', 'full_name'] }] : INCLUDE,
        order: [['transaction_date', 'DESC'], ['id', 'DESC']],
        limit,
        offset,
        distinct: true,
        transaction,
        ...(includeSummary ? { attributes: { include: [[literal(`CAST(SUM(CASE WHEN "TreasuryTransaction"."is_voided" = true THEN 0 WHEN "TreasuryTransaction"."type" = 'receipt' THEN "TreasuryTransaction"."amount" ELSE -"TreasuryTransaction"."amount" END) OVER (ORDER BY "TreasuryTransaction"."transaction_date", "TreasuryTransaction"."id" ROWS UNBOUNDED PRECEDING) AS TEXT)`), 'running_balance']] } } : {}),
      });

      const response = buildPaginatedResponse({ ...result, rows: result.rows.map(r => {
        const data = financialDocumentView(req.user, r);
        if (includeSummary) data.running_balance = decimalAmount(cents(data.running_balance));
        return data;
      }) }, page, limit);
      if (includeSummary) {
        const [totals] = await TreasuryTransaction.findAll({ where, include: ownerInclude, raw: true, transaction,
          attributes: ['receipt', 'payment'].map(type => [literal(`CAST(SUM(CASE WHEN "TreasuryTransaction"."is_voided" = false AND "TreasuryTransaction"."type" = '${type}' THEN "TreasuryTransaction"."amount" ELSE 0 END) AS TEXT)`), type]),
        });
        const receipts = cents(totals.receipt), payments = cents(totals.payment);
        response.summary = { total_receipts: decimalAmount(receipts), total_payments: decimalAmount(payments), net_balance: decimalAmount(receipts - payments) };
      }
      return response;
    };
    return res.json(includeSummary ? await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, read) : await read());
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
