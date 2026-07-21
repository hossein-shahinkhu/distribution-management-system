const { Route } = require('../models');
const logger = require('../utils/logger');

// فیلدهای مجاز برای ایجاد و ویرایش مسیر (allowlist)
const ALLOWED_FIELDS = ['name', 'description'];

async function getAll(req, res) {
  try {
    const routes = await Route.findAll({ order: [['name', 'ASC']] });
    return res.json(routes);
  } catch (err) {
    logger.error('route.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getOne(req, res) {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ message: 'مسیر یافت نشد.' });
    return res.json(route);
  } catch (err) {
    logger.error('route.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function create(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'نام مسیر الزامی است.' });
    const route = await Route.create({ name, description });
    return res.status(201).json(route);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'این مسیر قبلاً ثبت شده است.' });
    }
    logger.error('route.create error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function update(req, res) {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ message: 'مسیر یافت نشد.' });

    // Allowlist
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await route.update(updates);
    return res.json(route);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'این مسیر قبلاً ثبت شده است.' });
    }
    logger.error('route.update error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function remove(req, res) {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ message: 'مسیر یافت نشد.' });
    await route.destroy();
    return res.json({ message: 'مسیر حذف شد.' });
  } catch (err) {
    logger.error('route.remove error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
