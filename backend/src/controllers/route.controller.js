const { Route } = require('../models');

async function getAll(req, res) {
  try {
    const routes = await Route.findAll({ order: [['name', 'ASC']] });
    return res.json(routes);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ message: 'مسیر یافت نشد.' });
    return res.json(route);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
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
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function update(req, res) {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ message: 'مسیر یافت نشد.' });
    await route.update(req.body);
    return res.json(route);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'این مسیر قبلاً ثبت شده است.' });
    }
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function remove(req, res) {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ message: 'مسیر یافت نشد.' });
    await route.destroy();
    return res.json({ message: 'مسیر حذف شد.' });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { getAll, getOne, create, update, remove };
