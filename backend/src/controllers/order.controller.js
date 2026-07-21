'use strict';

const { Op } = require('sequelize');
const { Order, OrderItem, Product, Customer, Distributor } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const { createOrder, convertToOrder, updateOrderStatus } = require('../services/orderService');
const logger = require('../utils/logger');

/**
 * اگر کاربر جاری نقش distributor داشته باشد، شناسه رکورد Distributor مرتبط با
 * حساب کاربری او را برمی‌گرداند. اگر هیچ رکورد Distributor به این user_id
 * متصل نباشد، عدد -1 برمی‌گرداند تا هیچ سفارشی match نشود.
 * برای سایر نقش‌ها null برمی‌گرداند (یعنی فیلتر ownership اعمال نشود).
 */
async function resolveDistributorId(user) {
  if (user.Role?.name !== 'distributor') return null;
  const distributor = await Distributor.findOne({ where: { user_id: user.id } });
  return distributor ? distributor.id : -1;
}

// ─── create ──────────────────────────────────────────────────────────────────
async function create(req, res) {
  try {
    // salesperson_id is ALWAYS derived from the auth token — client value ignored
    const salesperson_id = req.user.Role?.name === 'salesperson' ? req.user.id : null;

    const { customer_id, distributor_id, items, notes, is_quote } = req.body;

    const order = await createOrder({ customer_id, salesperson_id, distributor_id, items, notes, is_quote });
    return res.status(201).json(order);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// ─── convertToOrder ───────────────────────────────────────────────────────────
async function convertToOrderHandler(req, res) {
  try {
    const order = await convertToOrder(Number(req.params.id));
    return res.json(order);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// ─── getAll ───────────────────────────────────────────────────────────────────
async function getAll(req, res) {
  try {
    const { search, status, route_id, date_from, date_to, amount_min, amount_max } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.order_number = { [caseInsensitiveLike()]: `%${search}%` };
    }

    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        where.order_date[Op.lte] = end;
      }
    }

    if (amount_min || amount_max) {
      where.total_amount = {};
      if (amount_min) where.total_amount[Op.gte] = Number(amount_min);
      if (amount_max) where.total_amount[Op.lte] = Number(amount_max);
    }

    const distributorId = await resolveDistributorId(req.user);
    if (distributorId !== null) {
      where.distributor_id = distributorId;
    }

    const customerInclude = { model: Customer };
    if (route_id) {
      customerInclude.where = { route_id };
    }

    const result = await Order.findAndCountAll({
      where,
      include: [customerInclude, { model: OrderItem, as: 'items', include: Product }],
      order: [['id', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    logger.error('order.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// ─── getOne ───────────────────────────────────────────────────────────────────
async function getOne(req, res) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [Customer, Distributor, { model: OrderItem, as: 'items', include: Product }],
    });
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    const distributorId = await resolveDistributorId(req.user);
    if (distributorId !== null && order.distributor_id !== distributorId) {
      return res.status(403).json({ message: 'دسترسی به این سفارش مجاز نیست.' });
    }

    return res.json(order);
  } catch (err) {
    logger.error('order.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// ─── updateStatus ─────────────────────────────────────────────────────────────
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const distributorId = await resolveDistributorId(req.user);
    const order = await updateOrderStatus(Number(req.params.id), status, distributorId);
    return res.json(order);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// ─── assignDistributor ────────────────────────────────────────────────────────
async function assignDistributor(req, res) {
  try {
    const { distributor_id } = req.body;
    if (!distributor_id) {
      return res.status(400).json({ message: 'شناسه توزیع‌کننده الزامی است.' });
    }
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    const distributor = await Distributor.findByPk(distributor_id);
    if (!distributor) return res.status(404).json({ message: 'توزیع‌کننده یافت نشد.' });

    await order.update({ distributor_id, status: 'out_for_delivery' });
    return res.json(order);
  } catch (err) {
    logger.error('order.assignDistributor error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { create, getAll, getOne, updateStatus, assignDistributor, convertToOrder: convertToOrderHandler };
