const { Distributor, User } = require('../models');

async function getAll(req, res) {
  try {
    const distributors = await Distributor.findAll({
      include: { model: User, attributes: ['id', 'full_name', 'email'] },
      order: [['id', 'DESC']],
    });
    return res.json(distributors);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function create(req, res) {
  try {
    const { full_name, phone, vehicle_plate, vehicle_type, user_id, commission_rate } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ message: 'نام و شماره تماس الزامی است.' });
    }

    if (user_id) {
      const existingLink = await Distributor.findOne({ where: { user_id } });
      if (existingLink) {
        return res.status(409).json({ message: 'این حساب کاربری قبلاً به یک توزیع‌کننده دیگر متصل شده است.' });
      }
    }

    const distributor = await Distributor.create({
      full_name,
      phone,
      vehicle_plate,
      vehicle_type,
      user_id: user_id || null,
      commission_rate: commission_rate || 0,
    });
    return res.status(201).json(distributor);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function update(req, res) {
  try {
    const distributor = await Distributor.findByPk(req.params.id);
    if (!distributor) return res.status(404).json({ message: 'توزیع‌کننده یافت نشد.' });

    if (req.body.user_id) {
      const existingLink = await Distributor.findOne({ where: { user_id: req.body.user_id } });
      if (existingLink && existingLink.id !== distributor.id) {
        return res.status(409).json({ message: 'این حساب کاربری قبلاً به یک توزیع‌کننده دیگر متصل شده است.' });
      }
    }

    await distributor.update(req.body);
    return res.json(distributor);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function remove(req, res) {
  try {
    const distributor = await Distributor.findByPk(req.params.id);
    if (!distributor) return res.status(404).json({ message: 'توزیع‌کننده یافت نشد.' });
    await distributor.update({ is_active: false });
    return res.json({ message: 'توزیع‌کننده غیرفعال شد.' });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { getAll, create, update, remove };
