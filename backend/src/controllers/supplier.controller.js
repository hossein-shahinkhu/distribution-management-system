const { Op } = require('sequelize');
const { Supplier, PurchaseInvoice, TreasuryTransaction } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

// فیلدهای مجاز برای ایجاد و ویرایش تامین‌کننده (allowlist)
const ALLOWED_FIELDS = ['name', 'contact_person', 'phone', 'address', 'tax_id', 'payment_terms_days'];

async function getAll(req, res) {
  try {
    const { search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (search) {
      where[Op.or] = [
        { name:           { [caseInsensitiveLike()]: `%${search}%` } },
        { contact_person: { [caseInsensitiveLike()]: `%${search}%` } },
        { phone:          { [caseInsensitiveLike()]: `%${search}%` } },
      ];
    }

    const result = await Supplier.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    logger.error('supplier.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getOne(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'تامین‌کننده یافت نشد.' });
    return res.json(supplier);
  } catch (err) {
    logger.error('supplier.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function create(req, res) {
  try {
    const { name, contact_person, phone, address, tax_id, payment_terms_days } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'نام و شماره تماس الزامی است.' });
    }
    const supplier = await Supplier.create({ name, contact_person, phone, address, tax_id, payment_terms_days });
    return res.status(201).json(supplier);
  } catch (err) {
    logger.error('supplier.create error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function update(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'تامین‌کننده یافت نشد.' });

    // Allowlist — فقط فیلدهای مجاز به‌روز می‌شوند
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await supplier.update(updates);
    return res.json(supplier);
  } catch (err) {
    logger.error('supplier.update error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function remove(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'تامین‌کننده یافت نشد.' });
    await supplier.update({ is_active: false });
    return res.json({ message: 'تامین‌کننده غیرفعال شد.' });
  } catch (err) {
    logger.error('supplier.remove error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// گردش مالی تامین‌کننده: ادغام فاکتورهای خرید (بدهکار) و پرداخت‌های خزانه (بستانکار)
async function getStatement(req, res) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'تامین‌کننده یافت نشد.' });

    const { from, to } = req.query;

    // ── بدهکار: فاکتورهای خرید این تامین‌کننده ──
    const piWhere = { supplier_id: supplier.id };
    if (from || to) {
      piWhere.issue_date = {};
      if (from) piWhere.issue_date[Op.gte] = new Date(from);
      if (to)   piWhere.issue_date[Op.lte] = new Date(to);
    }
    const purchaseInvoices = await PurchaseInvoice.findAll({
      where: piWhere,
      attributes: ['id', 'invoice_number', 'issue_date', 'total_amount'],
    });

    // ── بستانکار: پرداخت‌های غیرباطل مرتبط با فاکتورهای خرید این تامین‌کننده ──
    const invoiceIds = purchaseInvoices.map((pi) => pi.id);
    const paymentWhere = { type: 'payment', is_voided: false };
    if (invoiceIds.length > 0) {
      paymentWhere.purchase_invoice_id = { [Op.in]: invoiceIds };
    } else {
      // هیچ فاکتور خریدی در بازه نیست — هیچ پرداختی هم نمی‌تواند وجود داشته باشد
      return res.json({
        supplier:        { id: supplier.id, name: supplier.name },
        opening_balance: 0,
        entries:         [],
        closing_balance: 0,
      });
    }
    if (from || to) {
      paymentWhere.transaction_date = {};
      if (from) paymentWhere.transaction_date[Op.gte] = new Date(from);
      if (to)   paymentWhere.transaction_date[Op.lte] = new Date(to);
    }
    const payments = await TreasuryTransaction.findAll({
      where: paymentWhere,
      attributes: ['id', 'reference_number', 'transaction_date', 'amount', 'description'],
    });

    // ── ادغام و مرتب‌سازی ──
    const entries = [
      ...purchaseInvoices.map((pi) => ({
        date:      pi.issue_date,
        type:      'invoice',
        reference: pi.invoice_number,
        debit:     Number(pi.total_amount),
        credit:    0,
      })),
      ...payments.map((t) => ({
        date:      t.transaction_date,
        type:      'payment',
        reference: t.reference_number || t.description || `پرداخت #${t.id}`,
        debit:     0,
        credit:    Number(t.amount),
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const entriesWithBalance = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });

    return res.json({
      supplier:        { id: supplier.id, name: supplier.name },
      opening_balance: 0,
      entries:         entriesWithBalance,
      closing_balance: balance,
    });
  } catch (err) {
    logger.error('supplier.getStatement error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { getAll, getOne, create, update, remove, getStatement };
