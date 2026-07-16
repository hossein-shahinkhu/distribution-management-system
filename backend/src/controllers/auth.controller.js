const { User, Role } = require('../models');
const { generateToken } = require('../utils/token');

// ثبت‌نام کاربر جدید (معمولاً فقط توسط ادمین انجام می‌شود)
async function register(req, res) {
  try {
    const { full_name, email, password, phone, role_name } = req.body;

    if (!full_name || !email || !password || !role_name) {
      return res.status(400).json({ message: 'فیلدهای الزامی را تکمیل کنید.' });
    }

    const role = await Role.findOne({ where: { name: role_name } });
    if (!role) {
      return res.status(400).json({ message: 'نقش انتخاب‌شده معتبر نیست.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'این ایمیل قبلاً ثبت شده است.' });
    }

    const user = await User.create({
      full_name,
      email,
      phone,
      password_hash: password, // در hook مدل هش می‌شود
      role_id: role.id,
    });

    const token = generateToken(user);
    return res.status(201).json({
      message: 'ثبت‌نام با موفقیت انجام شد.',
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: role.name },
    });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// ورود کاربر
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی است.' });
    }

    const user = await User.findOne({ where: { email }, include: Role });
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'ایمیل یا رمز عبور اشتباه است.' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'ایمیل یا رمز عبور اشتباه است.' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'ورود موفقیت‌آمیز بود.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.Role.name,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// دریافت اطلاعات کاربر لاگین‌شده
async function me(req, res) {
  return res.json({
    id: req.user.id,
    full_name: req.user.full_name,
    email: req.user.email,
    role: req.user.Role.name,
  });
}

async function listUsers(req, res) {
  try {
    const users = await User.findAll({ include: Role, attributes: { exclude: ['password_hash'] } });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user.id);

    const isValid = await user.validatePassword(current_password);
    if (!isValid) {
      return res.status(401).json({ message: 'رمز عبور فعلی اشتباه است.' });
    }

    user.password_hash = new_password; // در hook مدل هش می‌شود
    await user.save();

    return res.json({ message: 'رمز عبور با موفقیت تغییر کرد.' });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const { full_name, phone, role_name, is_active, commission_rate } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد.' });

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;
    if (commission_rate !== undefined) updates.commission_rate = commission_rate;

    if (role_name !== undefined) {
      const role = await Role.findOne({ where: { name: role_name } });
      if (!role) return res.status(400).json({ message: 'نقش انتخاب‌شده معتبر نیست.' });
      updates.role_id = role.id;
    }

    await user.update(updates);
    const updated = await User.findByPk(user.id, { include: Role, attributes: { exclude: ['password_hash'] } });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { register, login, me, listUsers, changePassword, updateUser };
