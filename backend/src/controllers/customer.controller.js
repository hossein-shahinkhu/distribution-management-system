const { Customer, Order, Invoice, TreasuryTransaction } = require('../models');
const { Op } = require('sequelize');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

async function getAll(req, res) {
  try {
    const { search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [caseInsensitiveLike()]: `%${search}%` } },
        { business_name: { [caseInsensitiveLike()]: `%${search}%` } },
        { phone: { [caseInsensitiveLike()]: `%${search}%` } },
      ];
    }

    const result = await Customer.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    return res.json(customer);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function create(req, res) {
  try {
    const { full_name, business_name, phone, address, city, credit_limit, route_id } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ message: 'نام و شماره تماس الزامی است.' });
    }
    const customer = await Customer.create({
      full_name,
      business_name,
      phone,
      address,
      city,
      credit_limit,
      route_id: route_id || null,
    });
    return res.status(201).json(customer);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function update(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    await customer.update(req.body);
    return res.json(customer);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function remove(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    await customer.destroy();
    return res.json({ message: 'مشتری حذف شد.' });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// وضعیت اعتبار مشتری: مبلغ بدهی جاری بر اساس فاکتورهایی که هنوز به‌طور کامل
// پرداخت نشده‌اند محاسبه می‌شود. برای هر فاکتور، فقط رسیدهای غیرباطل (is_voided=false)
// از مبلغ کل فاکتور کم می‌شوند؛ مبلغ کامل فاکتورهای partial حساب نمی‌شود.
async function getCreditUsage(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });

    const invoices = await Invoice.findAll({
      where: { payment_status: { [Op.ne]: 'paid' } },
      include: [{ model: Order, where: { customer_id: customer.id }, attributes: [] }],
    });

    let outstandingBalance = 0;
    let unpaidInvoiceCount = 0;

    for (const invoice of invoices) {
      const paidResult = await TreasuryTransaction.sum('amount', {
        where: { invoice_id: invoice.id, type: 'receipt', is_voided: false },
      });
      const paidAmount = Number(paidResult) || 0;
      const remaining = Number(invoice.total_amount) - paidAmount;
      if (remaining > 0) {
        outstandingBalance += remaining;
        unpaidInvoiceCount += 1;
      }
    }

    const creditLimit = Number(customer.credit_limit) || 0;

    return res.json({
      credit_limit: creditLimit,
      outstanding_balance: outstandingBalance,
      available_credit: creditLimit - outstandingBalance,
      unpaid_invoices: unpaidInvoiceCount,
    });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// گردش مالی مشتری: ادغام فاکتورهای فروش (بدهکار) و رسیدهای خزانه (بستانکار)
// به ترتیب تاریخ، با مانده تجمعی.
async function getStatement(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });

    const { from, to } = req.query;

    // ── بدهکار: فاکتورهای فروش صادرشده برای سفارش‌های این مشتری ──
    const invoiceWhere = {};
    if (from || to) {
      invoiceWhere.issue_date = {};
      if (from) invoiceWhere.issue_date[Op.gte] = new Date(from);
      if (to)   invoiceWhere.issue_date[Op.lte] = new Date(to);
    }
    const invoices = await Invoice.findAll({
      where: invoiceWhere,
      include: [{ model: Order, where: { customer_id: customer.id }, attributes: ['id'] }],
      attributes: ['id', 'invoice_number', 'issue_date', 'total_amount'],
    });

    // ── بستانکار: رسیدهای دریافتی از این مشتری (غیرباطل) ──
    const receiptWhere = { customer_id: customer.id, type: 'receipt', is_voided: false };
    if (from || to) {
      receiptWhere.transaction_date = {};
      if (from) receiptWhere.transaction_date[Op.gte] = new Date(from);
      if (to)   receiptWhere.transaction_date[Op.lte] = new Date(to);
    }
    const receipts = await TreasuryTransaction.findAll({
      where: receiptWhere,
      attributes: ['id', 'reference_number', 'transaction_date', 'amount', 'description'],
    });

    // ── ادغام و مرتب‌سازی بر اساس تاریخ (صعودی) ──
    const entries = [
      ...invoices.map((inv) => ({
        date:      inv.issue_date,
        type:      'invoice',
        reference: inv.invoice_number,
        debit:     Number(inv.total_amount),
        credit:    0,
      })),
      ...receipts.map((t) => ({
        date:      t.transaction_date,
        type:      'receipt',
        reference: t.reference_number || t.description || `رسید #${t.id}`,
        debit:     0,
        credit:    Number(t.amount),
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // مانده تجمعی
    let balance = 0;
    const entriesWithBalance = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });

    return res.json({
      customer: {
        id:           customer.id,
        full_name:    customer.full_name,
        credit_limit: Number(customer.credit_limit) || 0,
      },
      opening_balance: 0,
      entries:         entriesWithBalance,
      closing_balance: balance,
    });
  } catch (err) {
    logger.error('customer.getStatement error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { getAll, getOne, create, update, remove, getCreditUsage, getStatement };
