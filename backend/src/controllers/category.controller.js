const { Category } = require('../models');

async function getAll(req, res) {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function create(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'نام دسته‌بندی الزامی است.' });
    const category = await Category.create({ name, description });
    return res.status(201).json(category);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'این دسته‌بندی قبلاً ثبت شده است.' });
    }
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function remove(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'دسته‌بندی یافت نشد.' });
    await category.destroy();
    return res.json({ message: 'دسته‌بندی حذف شد.' });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { getAll, create, remove };
