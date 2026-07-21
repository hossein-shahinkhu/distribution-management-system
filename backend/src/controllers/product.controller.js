const { Product, Category } = require('../models');
const { Op, col } = require('sequelize');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

// فیلدهای مجاز برای ایجاد و ویرایش کالا (allowlist)
const ALLOWED_FIELDS = ['sku', 'name', 'category_id', 'unit_price', 'unit', 'stock_quantity', 'reorder_level', 'is_active'];

async function getAll(req, res) {
  try {
    const { search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [caseInsensitiveLike()]: `%${search}%` } },
        { sku:  { [caseInsensitiveLike()]: `%${search}%` } },
      ];
    }

    const result = await Product.findAndCountAll({
      where,
      include: Category,
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    logger.error('product.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getOne(req, res) {
  try {
    const product = await Product.findByPk(req.params.id, { include: Category });
    if (!product) return res.status(404).json({ message: 'کالا یافت نشد.' });
    return res.json(product);
  } catch (err) {
    logger.error('product.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function create(req, res) {
  try {
    const { sku, name, category_id, unit_price, unit, stock_quantity, reorder_level } = req.body;
    if (!sku || !name || unit_price === undefined) {
      return res.status(400).json({ message: 'فیلدهای الزامی (کد کالا، نام، قیمت) را تکمیل کنید.' });
    }
    const product = await Product.create({
      sku,
      name,
      category_id,
      unit_price,
      unit,
      stock_quantity: stock_quantity || 0,
      reorder_level,
    });
    return res.status(201).json(product);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'کد کالا (SKU) تکراری است.' });
    }
    logger.error('product.create error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function update(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'کالا یافت نشد.' });

    // Allowlist — فقط فیلدهای مجاز به‌روز می‌شوند
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await product.update(updates);
    return res.json(product);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'کد کالا (SKU) تکراری است.' });
    }
    logger.error('product.update error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function remove(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'کالا یافت نشد.' });
    await product.update({ is_active: false }); // حذف نرم (soft delete)
    return res.json({ message: 'کالا غیرفعال شد.' });
  } catch (err) {
    logger.error('product.remove error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// کالاهایی که موجودی‌شان به آستانه سفارش مجدد رسیده
async function lowStock(req, res) {
  try {
    const products = await Product.findAll({
      where: { stock_quantity: { [Op.lte]: col('reorder_level') } },
    });
    return res.json(products);
  } catch (err) {
    logger.error('product.lowStock error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { getAll, getOne, create, update, remove, lowStock };
