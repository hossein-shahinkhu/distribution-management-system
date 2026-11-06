const { getCustomerAccount, publicEntry } = require('../services/customerBalanceService');
const { cents, amount } = require('../utils/money');
const { Customer, Order } = require('../models');
const { Op } = require('sequelize');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

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
    return res.json(buildPaginatedResponse({ ...result, rows: result.rows.map(c => { const data = c.toJSON(); if (req.user.Role?.name !== 'admin') delete data.credit_limit; return data; }) }, page, limit));
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

async function getOne(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    const data = customer.toJSON();
    if (req.user.Role?.name !== 'admin') delete data.credit_limit;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
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
    const data = customer.toJSON();
    if (req.user.Role?.name !== 'admin') delete data.credit_limit;
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

async function update(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    await customer.update(req.body);
    const data = customer.toJSON();
    if (req.user.Role?.name !== 'admin') delete data.credit_limit;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

async function remove(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    await customer.destroy();
    return res.json({ message: 'مشتری حذف شد.' });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

// Account balance is derived from invoices, posted credits and actual receipts.
async function getCreditUsage(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    if (req.user.Role?.name === 'salesperson' && !(await Order.findOne({ where: { customer_id: customer.id, salesperson_id: req.user.id } }))) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    const { balance, unpaidCount } = await getCustomerAccount(customer.id, { salespersonId: req.user.Role?.name === 'salesperson' ? req.user.id : undefined });
    const limit = cents(customer.credit_limit);
    return res.json({
      scope: req.user.Role?.name === 'salesperson' ? 'salesperson_orders' : 'customer',
      credit_limit: req.user.Role?.name === 'admin' ? amount(limit) : null,
      outstanding_balance: amount(balance > 0n ? balance : 0n),
      credit_balance: amount(balance < 0n ? -balance : 0n),
      account_balance: amount(balance),
      available_credit: req.user.Role?.name === 'admin' ? amount(limit - balance) : null,
      unpaid_invoices: unpaidCount,
      unpaid_invoice_count: unpaidCount,
    });
  } catch (err) {
    logger.error('customer.getCreditUsage error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getStatement(req, res) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    const { from, to } = req.query;
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    // Date-only values represent UTC calendar days; explicit timestamps stay exact.
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(to)) end.setUTCHours(23, 59, 59, 999);
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime())) ||
        (start && end && start > end)) return res.status(400).json({ message: 'بازه تاریخ نامعتبر است.' });
    if (req.user.Role?.name === 'salesperson' && !(await Order.findOne({ where: { customer_id: customer.id, salesperson_id: req.user.id } }))) return res.status(404).json({ message: 'مشتری یافت نشد.' });
    const { entries } = await getCustomerAccount(customer.id, { salespersonId: req.user.Role?.name === 'salesperson' ? req.user.id : undefined });
    let opening = 0n;
    let balance = 0n;
    const result = [];
    for (const e of entries) {
      const date = new Date(e.date);
      if (end && date > end) continue;
      balance += e.debitCents - e.creditCents;
      if (start && date < start) opening = balance;
      else result.push(publicEntry(e, balance));
    }
    return res.json({
      scope: req.user.Role?.name === 'salesperson' ? 'salesperson_orders' : 'customer',
      customer: { id: customer.id, full_name: customer.full_name, credit_limit: req.user.Role?.name === 'admin' ? amount(cents(customer.credit_limit)) : null },
      opening_balance: amount(opening), entries: result, closing_balance: amount(balance),
      outstanding_balance: amount(balance > 0n ? balance : 0n),
      credit_balance: amount(balance < 0n ? -balance : 0n),
    });
  } catch (err) {
    logger.error('customer.getStatement error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}
module.exports = { getAll, getOne, create, update, remove, getCreditUsage, getStatement };
