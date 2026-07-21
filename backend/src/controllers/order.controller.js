const { Op } = require('sequelize');
const { sequelize, Order, OrderItem, Product, Customer, Distributor, User } = require('../models');
const { generateOrderNumber } = require('../utils/numberGenerator');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const { isSalesTransitionAllowed, salesCancelRestoresStock } = require('../utils/orderStateMachine');
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

// ثبت سفارش جدید همراه با اقلام آن و کسر موجودی انبار (به‌صورت تراکنشی)
// اگر is_quote=true ارسال شود، سفارش به‌عنوان پیش‌فاکتور ثبت می‌شود و موجودی
// انبار کسر نمی‌شود؛ بعداً از طریق convert-to-order به سفارش قطعی تبدیل می‌شود.
async function create(req, res) {
  const t = await sequelize.transaction();
  try {
    const { customer_id, distributor_id, items, notes, is_quote } = req.body;
    const isQuote = Boolean(is_quote);
    // salesperson_id is derived from the authenticated user; client-supplied value is ignored
    const salesperson_id = req.user.Role?.name === 'salesperson' ? req.user.id : null;

    if (!customer_id || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'مشتری و حداقل یک قلم کالا الزامی است.' });
    }

    const customer = await Customer.findByPk(customer_id, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ message: 'مشتری یافت نشد.' });
    }

    let totalAmount = 0;
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ message: `کالا با شناسه ${item.product_id} یافت نشد.` });
      }
      if (!isQuote && product.stock_quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({ message: `موجودی کالای «${product.name}» کافی نیست.` });
      }

      const lineTotal = Number(product.unit_price) * Number(item.quantity);
      totalAmount += lineTotal;

      preparedItems.push({
        product_id: product.id,
        quantity:   item.quantity,
        unit_price: product.unit_price,
        line_total: lineTotal,
      });

      // برای پیش‌فاکتور موجودی انبار کسر نمی‌شود
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

    const fullOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items', include: Product }, Customer],
    });

    return res.status(201).json(fullOrder);
  } catch (err) {
    await t.rollback();
    logger.error('order.create error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// تبدیل یک پیش‌فاکتور به سفارش قطعی: موجودی انبار را بررسی و کسر می‌کند
async function convertToOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'سفارش یافت نشد.' });
    }
    if (!order.is_quote) {
      await t.rollback();
      return res.status(400).json({ message: 'این سفارش پیش‌فاکتور نیست.' });
    }

    for (const item of order.items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ message: `کالا با شناسه ${item.product_id} یافت نشد.` });
      }
      if (product.stock_quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({ message: `موجودی کالای «${product.name}» کافی نیست.` });
      }
      await product.update({ stock_quantity: product.stock_quantity - item.quantity }, { transaction: t });
    }

    await order.update({ is_quote: false, status: 'pending' }, { transaction: t });
    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items', include: Product }, Customer],
    });
    return res.json(fullOrder);
  } catch (err) {
    await t.rollback();
    logger.error('order.convertToOrder error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getAll(req, res) {
  try {
    const { search, status, route_id, date_from, date_to, amount_min, amount_max } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.order_number = { [caseInsensitiveLike()]: `%${search}%` };
    }

    // بازه تاریخ
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = new Date(date_from);
      if (date_to) {
        // آخر روز انتخاب‌شده
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        where.order_date[Op.lte] = end;
      }
    }

    // بازه مبلغ
    if (amount_min || amount_max) {
      where.total_amount = {};
      if (amount_min) where.total_amount[Op.gte] = Number(amount_min);
      if (amount_max) where.total_amount[Op.lte] = Number(amount_max);
    }

    // توزیع‌کننده فقط سفارش‌های تخصیص‌یافته به خودش را می‌بیند
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

async function getOne(req, res) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [Customer, Distributor, { model: OrderItem, as: 'items', include: Product }],
    });
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    // توزیع‌کننده فقط سفارش‌هایی که به خودش تخصیص یافته را می‌تواند ببیند
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

async function updateStatus(req, res) {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;

    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'سفارش یافت نشد.' });
    }

    // توزیع‌کننده فقط وضعیت سفارش‌هایی که به خودش تخصیص یافته را می‌تواند تغییر دهد
    const distributorId = await resolveDistributorId(req.user);
    if (distributorId !== null && order.distributor_id !== distributorId) {
      await t.rollback();
      return res.status(403).json({ message: 'دسترسی به این سفارش مجاز نیست.' });
    }

    // quotes can only be progressed through convert-to-order
    if (order.is_quote || order.status === 'quote') {
      await t.rollback();
      return res.status(400).json({ message: 'وضعیت پیش‌فاکتور از این مسیر قابل تغییر نیست.' });
    }

    if (!isSalesTransitionAllowed(order.status, status)) {
      await t.rollback();
      return res.status(400).json({
        message: `انتقال از وضعیت «${order.status}» به «${status}» مجاز نیست.`,
      });
    }

    const updates = { status };

    if (status === 'delivered') {
      updates.delivery_date = new Date();
    }

    // Restore inventory when cancelling an order that had stock deducted
    if (status === 'cancelled' && salesCancelRestoresStock(order.status) && !order.stock_compensated) {
      for (const item of order.items) {
        const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (product) {
          await product.update(
            { stock_quantity: product.stock_quantity + item.quantity },
            { transaction: t }
          );
        }
      }
      updates.stock_compensated = true;
    }

    await order.update(updates, { transaction: t });
    await t.commit();

    const updated = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items', include: Product }, Customer],
    });
    return res.json(updated);
  } catch (err) {
    await t.rollback();
    logger.error('order.updateStatus error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

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

module.exports = { create, getAll, getOne, updateStatus, assignDistributor, convertToOrder };
