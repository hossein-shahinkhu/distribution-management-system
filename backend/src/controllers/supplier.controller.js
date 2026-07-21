const { Op } = require('sequelize');
const { Supplier } = require('../models');
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

module.exports = { getAll, getOne, create, update, remove };
