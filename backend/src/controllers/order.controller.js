const { sequelize, Order, OrderItem, Product, Customer, Distributor, User } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');

function generateOrderNumber() {
  const now = new Date();
  const stamp = now.getTime().toString().slice(-8);
  return `ORD-${stamp}`;
}

// ثبت سفارش جدید همراه با اقلام آن و کسر موجودی انبار (به‌صورت تراکنشی)
async function create(req, res) {
  const t = await sequelize.transaction();
  try {
    const { customer_id, salesperson_id, distributor_id, items, notes } = req.body;

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
      if (product.stock_quantity < item.quantity) {
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

      // کسر موجودی انبار
      await product.update({ stock_quantity: product.stock_quantity - item.quantity }, { transaction: t });
    }

    const order = await Order.create(
      {
        order_number: generateOrderNumber(),
        customer_id,
        salesperson_id: salesperson_id || null,
        distributor_id: distributor_id || null,
        total_amount: totalAmount,
        notes,
        status: 'pending',
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
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getAll(req, res) {
  try {
    const { search, status } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.order_number = { [caseInsensitiveLike()]: `%${search}%` };
    }

    // توزیع‌کننده فقط سفارش‌های تخصیص‌یافته به خودش را می‌بیند
    if (req.user.Role?.name === 'distributor') {
      const distributor = await Distributor.findOne({ where: { user_id: req.user.id } });
      where.distributor_id = distributor ? distributor.id : -1; // -1 یعنی هیچ نتیجه‌ای
    }

    const result = await Order.findAndCountAll({
      where,
      include: [Customer, { model: OrderItem, as: 'items', include: Product }],
      order: [['id', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [Customer, Distributor, { model: OrderItem, as: 'items', include: Product }],
    });
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'وضعیت نامعتبر است.' });
    }
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    await order.update({
      status,
      delivery_date: status === 'delivered' ? new Date() : order.delivery_date,
    });

    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function assignDistributor(req, res) {
  try {
    const { distributor_id } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    const distributor = await Distributor.findByPk(distributor_id);
    if (!distributor) return res.status(404).json({ message: 'توزیع‌کننده یافت نشد.' });

    await order.update({ distributor_id, status: 'out_for_delivery' });
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { create, getAll, getOne, updateStatus, assignDistributor };
