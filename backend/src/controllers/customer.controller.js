const { Op } = require('sequelize');
const { Customer, Invoice, Order, TreasuryTransaction } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

// فیلدهای مجاز برای ایجاد و ویرایش مشتری (allowlist)
const ALLOWED_FIELDS = ['full_name', 'business_name', 'phone', 'address', 'city', 'credit_limit', 'route_id'];

async function getAll(req, res) {
  try {
    const { search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name:     { [caseInsensitiveLike()]: `%${search}%` } },
        { business_name: { [caseInsensitiveLike()]: `%${search}%` } },
        { phone:         { [caseInsensitiveLike()]: `%${search}%` } },
      ];
    }

    const result = await Customer.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    logger.error('customer.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getOne(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    return res.json(customer);
  } catch (err) {
    logger.error('customer.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
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
    logger.error('customer.create error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function update(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });

    // Allowlist — از req.body فقط فیلدهای مجاز استخراج می‌شوند
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.route_id === '') updates.route_id = null;

    await customer.update(updates);
    return res.json(customer);
  } catch (err) {
    logger.error('customer.update error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function remove(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    await customer.destroy();
    return res.json({ message: 'مشتری حذف شد.' });
  } catch (err) {
    logger.error('customer.remove error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// TASK-06: مجموع بدهی فعال مشتری
// مانده بدهی = مجموع مبلغ فاکتورهای پرداخت‌نشده/جزئی
//              منهای مجموع دریافت‌های غیرباطل مرتبط با آن فاکتورها
async function getCreditUsage(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });

    // فاکتورهای پرداخت‌نشده یا جزئی برای سفارش‌های این مشتری
    const unpaidInvoices = await Invoice.findAll({
      where: { payment_status: { [Op.in]: ['unpaid', 'partial'] } },
      include: [{
        model: Order,
        where: { customer_id: customer.id },
        attributes: [],
      }],
      attributes: ['id', 'total_amount'],
    });

    if (unpaidInvoices.length === 0) {
      return res.json({
        customer_id:         customer.id,
        credit_limit:        Number(customer.credit_limit),
        outstanding_balance: 0,
        available_credit:    Number(customer.credit_limit),
        unpaid_invoices:     0,
      });
    }

    const invoiceIds = unpaidInvoices.map((inv) => inv.id);

    // جمع دریافت‌های غیرباطل مرتبط با این فاکتورها
    const receipts = await TreasuryTransaction.findAll({
      where: {
        invoice_id: { [Op.in]: invoiceIds },
        type:       'receipt',
        is_voided:  false,
      },
      attributes: ['invoice_id', 'amount'],
    });

    const paidPerInvoice = {};
    for (const r of receipts) {
      paidPerInvoice[r.invoice_id] = (paidPerInvoice[r.invoice_id] || 0) + Number(r.amount);
    }

    // مانده واقعی هر فاکتور = مبلغ کل - دریافت‌شده
    const outstandingBalance = unpaidInvoices.reduce((sum, inv) => {
      const paid = paidPerInvoice[inv.id] || 0;
      return sum + Math.max(0, Number(inv.total_amount) - paid);
    }, 0);

    const creditLimit = Number(customer.credit_limit);

    return res.json({
      customer_id:         customer.id,
      credit_limit:        creditLimit,
      outstanding_balance: outstandingBalance,
      available_credit:    creditLimit > 0 ? Math.max(0, creditLimit - outstandingBalance) : null,
      unpaid_invoices:     unpaidInvoices.length,
    });
  } catch (err) {
    logger.error('customer.getCreditUsage error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { getAll, getOne, create, update, remove, getCreditUsage };
