const { canReadOrderFinancials, orderView } = require('../utils/financialAccess');
const orderService = require('../services/orderService');
const { Invoice, SalesCreditNote } = require('../models');
const { attachInvoiceFinancials } = require('../services/invoiceFinancialService');
const { sequelize, Order, OrderItem, Product, Customer, Distributor, User } = require('../models');
const { Op } = require('sequelize');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');

function generateOrderNumber() {
  const now = new Date();
  const stamp = now.getTime().toString().slice(-8);
  return `ORD-${stamp}`;
}

// اگر کاربر لاگین‌شده نقش توزیع‌کننده دارد، رکورد Distributor متناظر با او را برمی‌گرداند؛
// در غیر این صورت null. برای اعمال کنترل مالکیت روی سفارش‌ها استفاده می‌شود.
async function getOwnDistributor(req) {
  if (req.user.Role?.name !== 'distributor') return null;
  return Distributor.findOne({ where: { user_id: req.user.id } });
}

// ثبت سفارش جدید همراه با اقلام آن و کسر موجودی انبار (به‌صورت تراکنشی)
// اگر is_quote=true ارسال شود، سفارش به‌عنوان پیش‌فاکتور ثبت می‌شود و موجودی
// انبار کسر نمی‌شود؛ بعداً از طریق convert-to-order به سفارش قطعی تبدیل می‌شود.
async function create(req, res) {
  const t = await sequelize.transaction();
  try {
    const { customer_id, distributor_id, items, notes, is_quote } = req.body;
    const isQuote = Boolean(is_quote);
    // salesperson_id هرگز از کلاینت پذیرفته نمی‌شود: اگر ثبت‌کننده خودش فروشنده
    // است، شناسه‌اش به‌طور خودکار استفاده می‌شود؛ فقط ادمین می‌تواند فروشنده را
    // صریحاً در بدنه درخواست مشخص کند.
    const salesperson_id = req.user.Role?.name === 'salesperson' ? req.user.id : req.body.salesperson_id || null;

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
        quantity: item.quantity,
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
        order_number: generateOrderNumber(),
        customer_id,
        salesperson_id: salesperson_id || null,
        distributor_id: distributor_id || null,
        total_amount: totalAmount,
        notes,
        is_quote: isQuote,
        status: isQuote ? 'quote' : 'pending',
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

    return res.status(201).json(orderView(req.user, fullOrder));
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: 'خطای سرور' });
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
    if (!order || !canReadOrderFinancials(req.user, order)) {
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
    return res.json(orderView(req.user, fullOrder));
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

async function getAll(req, res) {
  try {
    const { search, status, route_id, date_from, date_to, amount_min, amount_max } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if ((amount_min || amount_max) && !['admin', 'salesperson'].includes(req.user.Role?.name)) {
      return res.status(403).json({ message: 'فیلتر مالی برای این نقش مجاز نیست.' });
    }
    // Financial filters must never reveal prices of unowned orders by inference.
    if ((amount_min || amount_max) && req.user.Role?.name === 'salesperson') where.salesperson_id = req.user.id;
    if (status) where.status = status;
    if (search) {
      where.order_number = { [caseInsensitiveLike()]: `%${search}%` };
    }
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = new Date(date_from);
      if (date_to) where.order_date[Op.lte] = new Date(date_to);
    }
    if (amount_min || amount_max) {
      where.total_amount = {};
      if (amount_min) where.total_amount[Op.gte] = Number(amount_min);
      if (amount_max) where.total_amount[Op.lte] = Number(amount_max);
    }

    // توزیع‌کننده فقط سفارش‌های تخصیص‌یافته به خودش را می‌بیند
    if (req.user.Role?.name === 'distributor') {
      const distributor = await Distributor.findOne({ where: { user_id: req.user.id } });
      where.distributor_id = distributor ? distributor.id : -1; // -1 یعنی هیچ نتیجه‌ای
    }

    // فیلتر بر اساس مسیر مشتری (برای اینکه توزیع‌کننده بتواند سفارش‌های یک مسیر را ببیند)
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

    return res.json(buildPaginatedResponse({ ...result, rows: result.rows.map(o => orderView(req.user, o)) }, page, limit));
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

async function getOne(req, res) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [Customer, Distributor, { model: Invoice, include: [SalesCreditNote] }, { model: OrderItem, as: 'items', include: Product }],
    });
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    if (req.user.Role?.name === 'distributor') {
      const ownDistributor = await getOwnDistributor(req);
      if (!ownDistributor || order.distributor_id !== ownDistributor.id) {
        return res.status(403).json({ message: 'شما به این سفارش دسترسی ندارید.' });
      }
    }

    const data = order.toJSON();
    if (order.Invoice && canReadOrderFinancials(req.user, order)) data.Invoice = (await attachInvoiceFinancials([order.Invoice]))[0];
    return res.json(orderView(req.user, data));
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور' });
  }
}

async function updateStatus(req, res) {
  try {
    let callerDistributorId = null;
    if (req.user.Role?.name === 'distributor') {
      const ownDistributor = await getOwnDistributor(req);
      if (!ownDistributor) return res.status(403).json({ message: 'شما به این سفارش دسترسی ندارید.' });
      callerDistributorId = ownDistributor.id;
    }
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status, callerDistributorId, {
      actorId: req.user.id, actorRole: req.user.Role?.name,
      confirmedNotDispatched: req.body.confirmed_not_dispatched,
    });
    return res.json(orderView(req.user, order));
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'خطای سرور' });
  }
}

async function assignDistributor(req, res) {
  try {
    const distributorId = Number(req.body.distributor_id);
    if (!Number.isSafeInteger(distributorId) || distributorId < 1) {
      return res.status(400).json({ message: 'توزیع‌کننده معتبر انتخاب کنید.' });
    }
    const order = await orderService.assignDistributor(req.params.id, distributorId);
    return res.json(orderView(req.user, order));
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'خطای سرور' });
  }
}
module.exports = { create, getAll, getOne, updateStatus, assignDistributor, convertToOrder };
