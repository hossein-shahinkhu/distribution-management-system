'use strict';

/**
 * orderService.js
 *
 * Pure domain logic for sales orders.  No Express (req/res) dependency.
 * Controllers call these functions and translate results to HTTP responses.
 *
 * Thrown errors carry a `statusCode` property so the controller can forward
 * the correct HTTP status without embedding HTTP knowledge here.
 */

const { sequelize, Order, OrderItem, Product, Customer, Distributor } = require('../models');
const { generateOrderNumber } = require('../utils/numberGenerator');
const { isSalesTransitionAllowed, salesCancelRestoresStock } = require('../utils/orderStateMachine');
const logger = require('../utils/logger');

/**
 * Create a sales order (or quote).
 *
 * @param {object} params
 * @param {number}   params.customer_id
 * @param {number|null} params.salesperson_id  — derived by controller from req.user; never from client body
 * @param {number|null} params.distributor_id
 * @param {Array<{product_id:number, quantity:number}>} params.items
 * @param {string|null} params.notes
 * @param {boolean} params.is_quote
 * @returns {Promise<Order>}  fully loaded Order instance
 */
async function createOrder({ customer_id, salesperson_id, distributor_id, items, notes, is_quote }) {
  const isQuote = Boolean(is_quote);
  const t = await sequelize.transaction();
  try {
    const customer = await Customer.findByPk(customer_id, { transaction: t });
    if (!customer) {
      const err = new Error('مشتری یافت نشد.');
      err.statusCode = 404;
      throw err;
    }

    let totalAmount = 0;
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) {
        const err = new Error(`کالا با شناسه ${item.product_id} یافت نشد.`);
        err.statusCode = 404;
        throw err;
      }
      if (!isQuote && product.stock_quantity < item.quantity) {
        const err = new Error(`موجودی کالای «${product.name}» کافی نیست.`);
        err.statusCode = 400;
        throw err;
      }

      // Total and line prices are ALWAYS derived from the server-side product price.
      const lineTotal = Number(product.unit_price) * Number(item.quantity);
      totalAmount += lineTotal;

      preparedItems.push({
        product_id: product.id,
        quantity:   item.quantity,
        unit_price: product.unit_price,  // snapshot of server price
        line_total: lineTotal,
      });

      if (!isQuote) {
        await product.update({ stock_quantity: product.stock_quantity - item.quantity }, { transaction: t });
      }
    }

    const order = await Order.create(
      {
        order_number:   generateOrderNumber('ORD'),
        customer_id,
        salesperson_id: salesperson_id || null,
        distributor_id: distributor_id || null,
        total_amount:   totalAmount,
        notes,
        is_quote:       isQuote,
        status:         isQuote ? 'quote' : 'pending',
      },
      { transaction: t }
    );

    for (const item of preparedItems) {
      await OrderItem.create({ ...item, order_id: order.id }, { transaction: t });
    }

    await t.commit();

    return Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items', include: Product }, Customer],
    });
  } catch (err) {
    await t.rollback();
    if (!err.statusCode) {
      logger.error('orderService.createOrder error', { error: err.message });
      err.statusCode = 500;
      err.message = 'خطای داخلی سرور.';
    }
    throw err;
  }
}

/**
 * Convert a quote to a confirmed sales order: checks stock, deducts inventory.
 *
 * @param {number} orderId
 * @returns {Promise<Order>}  fully loaded updated Order instance
 */
async function convertToOrder(orderId) {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });
    if (!order) {
      const err = new Error('سفارش یافت نشد.');
      err.statusCode = 404;
      throw err;
    }
    if (!order.is_quote) {
      const err = new Error('این سفارش پیش‌فاکتور نیست.');
      err.statusCode = 400;
      throw err;
    }

    for (const item of order.items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) {
        const err = new Error(`کالا با شناسه ${item.product_id} یافت نشد.`);
        err.statusCode = 404;
        throw err;
      }
      if (product.stock_quantity < item.quantity) {
        const err = new Error(`موجودی کالای «${product.name}» کافی نیست.`);
        err.statusCode = 400;
        throw err;
      }
      await product.update({ stock_quantity: product.stock_quantity - item.quantity }, { transaction: t });
    }

    await order.update({ is_quote: false, status: 'pending' }, { transaction: t });
    await t.commit();

    return Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items', include: Product }, Customer],
    });
  } catch (err) {
    await t.rollback();
    if (!err.statusCode) {
      logger.error('orderService.convertToOrder error', { error: err.message });
      err.statusCode = 500;
      err.message = 'خطای داخلی سرور.';
    }
    throw err;
  }
}

/**
 * Update the status of a sales order, enforcing the state machine and
 * compensating inventory when cancelling.
 *
 * @param {number} orderId
 * @param {string} newStatus
 * @param {number|null} callerDistributorId  — null means no ownership restriction
 * @returns {Promise<Order>}  fully loaded updated Order instance
 */
async function updateOrderStatus(orderId, newStatus, callerDistributorId = null) {
  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      const err = new Error('سفارش یافت نشد.');
      err.statusCode = 404;
      throw err;
    }

    // Distributor ownership check
    if (callerDistributorId !== null && order.distributor_id !== callerDistributorId) {
      const err = new Error('دسترسی به این سفارش مجاز نیست.');
      err.statusCode = 403;
      throw err;
    }

    if (order.is_quote || order.status === 'quote') {
      const err = new Error('وضعیت پیش‌فاکتور از این مسیر قابل تغییر نیست.');
      err.statusCode = 400;
      throw err;
    }

    if (!isSalesTransitionAllowed(order.status, newStatus)) {
      const err = new Error(`انتقال از وضعیت «${order.status}» به «${newStatus}» مجاز نیست.`);
      err.statusCode = 400;
      throw err;
    }

    const updates = { status: newStatus };
    if (newStatus === 'delivered') updates.delivery_date = new Date();

    if (newStatus === 'cancelled' && salesCancelRestoresStock(order.status) && !order.stock_compensated) {
      const items = await OrderItem.findAll({
        where: { order_id: order.id }, transaction: t,
        order: [['product_id', 'ASC'], ['id', 'ASC']],
      });
      for (const item of items) {
        const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!product) {
          const err = new Error('کالای سفارش یافت نشد؛ لغو انجام نشد.');
          err.statusCode = 409;
          throw err;
        }
        await product.update(
          { stock_quantity: product.stock_quantity + item.quantity },
          { transaction: t }
        );
      }
      updates.stock_compensated = true;
    }

    await order.update(updates, { transaction: t });
    return Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }], transaction: t,
    });
  });
}

// Assignment shares the order lock with status updates and never dispatches it.
async function assignDistributor(orderId, distributorId) {
  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      const err = new Error('سفارش یافت نشد.');
      err.statusCode = 404;
      throw err;
    }
    if (order.is_quote || !salesCancelRestoresStock(order.status)) {
      const err = new Error('تخصیص توزیع‌کننده به این سفارش مجاز نیست.');
      err.statusCode = 400;
      throw err;
    }
    const distributor = await Distributor.findByPk(distributorId, { transaction: t });
    if (!distributor) {
      const err = new Error('توزیع‌کننده یافت نشد.');
      err.statusCode = 404;
      throw err;
    }
    await order.update({ distributor_id: distributor.id }, { transaction: t });
    return order;
  });
}

module.exports = { createOrder, convertToOrder, updateOrderStatus, assignDistributor };
