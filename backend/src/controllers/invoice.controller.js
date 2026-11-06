const { canReadOrderFinancials, financialDocumentView } = require('../utils/financialAccess');
const { sequelize, Invoice, Order, OrderItem, Product, Customer, SalesCreditNote } = require('../models');
const { generateInvoiceNumber } = require('../utils/numberGenerator');
const logger = require('../utils/logger');
const { calculateInvoiceFinancials, attachInvoiceFinancials, filterInvoices, summarizeInvoices } = require('../services/invoiceFinancialService');

const DEFAULT_TAX_RATE = 9; // درصد — می‌تواند از طرف کلاینت تغییر کند

// صدور فاکتور بر اساس یک سفارش موجود
async function createFromOrder(req, res) {
  try {
    const { order_id, tax_rate } = req.body;
    const rate = tax_rate !== undefined ? Number(tax_rate) : DEFAULT_TAX_RATE;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'درصد مالیات باید بین ۰ تا ۱۰۰ باشد.' });
    }
    const invoice = await sequelize.transaction(async (t) => {
      const order = await Order.findByPk(order_id, { transaction: t, lock: t.LOCK.UPDATE });
      const fail = (statusCode, message) => { const e = new Error(message); e.statusCode = statusCode; throw e; };
      if (!order || !canReadOrderFinancials(req.user, order)) fail(404, 'سفارش یافت نشد.');
      if (order.is_quote || ['quote', 'cancelled'].includes(order.status)) fail(400, 'صدور فاکتور برای این سفارش مجاز نیست.');
      if (await Invoice.findOne({ where: { order_id }, transaction: t })) fail(409, 'برای این سفارش قبلاً فاکتور صادر شده است.');
      const subtotal = Number(order.total_amount);
      const taxAmount = Math.round(subtotal * (rate / 100));
      return Invoice.create({
        invoice_number: generateInvoiceNumber(), order_id, subtotal, tax_rate: rate,
        tax_amount: taxAmount, total_amount: subtotal + taxAmount,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }, { transaction: t });
    });
    return res.status(201).json({ ...invoice.toJSON(), ...calculateInvoiceFinancials(invoice) });
  } catch (err) {
    logger.error('invoice.createFromOrder error', { error: err.message });
    return res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'خطای داخلی سرور.' });
  }
}
async function getAll(req, res) {
  try {
    // Orders have explicit salesperson ownership; customers do not. Never infer
    // access to every order of a customer from a single owned order.
    const owner = req.user.Role?.name === 'salesperson' ? { salesperson_id: req.user.id } : undefined;
    const invoices = await Invoice.findAll({
      include: [SalesCreditNote, { model: Order, ...(owner ? { where: owner, required: true } : {}), include: [Customer, { model: OrderItem, as: 'items', include: Product }] }],
      order: [['id', 'DESC']],
    });
    const data = filterInvoices(await attachInvoiceFinancials(invoices), req.query).map(i => financialDocumentView(req.user, i));
    return res.json(req.query.include_summary === 'true' ? { data, summary: summarizeInvoices(data) } : data);
  } catch (err) {
    logger.error('invoice.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getOne(req, res) {
  try {
    const id = Number(req.params.id);
    if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
      return res.status(404).json({ message: 'فاکتور یافت نشد.' });
    }
    const owner = req.user.Role?.name === 'salesperson' ? { salesperson_id: req.user.id } : undefined;
    const invoice = await Invoice.findOne({
      where: { id: req.params.id },
      include: [SalesCreditNote, { model: Order, ...(owner ? { where: owner, required: true } : {}), include: [Customer, { model: OrderItem, as: 'items', include: Product }] }],
    });
    if (!invoice) return res.status(404).json({ message: 'فاکتور یافت نشد.' });
    return res.json(financialDocumentView(req.user, (await attachInvoiceFinancials([invoice]))[0]));
  } catch (err) {
    logger.error('invoice.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// Retained endpoint for old clients: payment state can only follow valid documents.
async function updatePaymentStatus(req, res) {
  return res.status(409).json({
    code: 'MANUAL_PAYMENT_STATUS_DISABLED',
    message: 'تغییر دستی وضعیت پرداخت فاکتور فروش مجاز نیست؛ وضعیت از اسناد مالی معتبر محاسبه می‌شود.',
  });
}
module.exports = { createFromOrder, getAll, getOne, updatePaymentStatus };
