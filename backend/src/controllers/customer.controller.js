const { Customer } = require('../models');
const { Op } = require('sequelize');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');

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

module.exports = { getAll, getOne, create, update, remove };
