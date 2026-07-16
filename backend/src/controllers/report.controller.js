const { Op, fn, col, literal } = require('sequelize');
const { Order, OrderItem, Product, Distributor, User, Role, TreasuryTransaction, sequelize } = require('../models');

// گزارش فروش بر اساس بازه زمانی
async function salesReport(req, res) {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.order_date = {};
      if (from) where.order_date[Op.gte] = new Date(from);
      if (to) where.order_date[Op.lte] = new Date(to);
    }

    const orders = await Order.findAll({ where, attributes: ['id', 'total_amount', 'status', 'order_date'] });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const byStatus = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return res.json({ totalRevenue, totalOrders, byStatus });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// گزارش وضعیت موجودی انبار
async function inventoryReport(req, res) {
  try {
    const products = await Product.findAll({
      attributes: ['id', 'name', 'sku', 'stock_quantity', 'reorder_level', 'unit_price'],
      order: [['stock_quantity', 'ASC']],
    });

    const lowStockCount = products.filter((p) => p.stock_quantity <= p.reorder_level).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + Number(p.unit_price) * p.stock_quantity,
      0
    );

    return res.json({ products, lowStockCount, totalInventoryValue });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// گزارش عملکرد توزیع‌کنندگان (تعداد سفارش‌های تحویل داده‌شده)
async function distributorPerformanceReport(req, res) {
  try {
    const results = await Order.findAll({
      attributes: [
        'distributor_id',
        [fn('COUNT', col('Order.id')), 'total_orders'],
        [fn('SUM', literal("CASE WHEN status = 'delivered' THEN 1 ELSE 0 END")), 'delivered_orders'],
      ],
      where: { distributor_id: { [Op.ne]: null } },
      group: ['distributor_id'],
      include: [{ model: Distributor, attributes: ['full_name', 'phone'] }],
    });

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// گزارش پورسانت فروشندگان و توزیع‌کنندگان بر اساس سفارش‌های تحویل‌شده در بازه
async function commissionsReport(req, res) {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from) dateWhere[Op.gte] = new Date(from);
    if (to) dateWhere[Op.lte] = new Date(to);

    const baseWhere = { status: 'delivered' };
    if (from || to) baseWhere.order_date = dateWhere;

    const salespeople = await User.findAll({
      include: [{ model: Role, where: { name: 'salesperson' } }],
    });
    const distributors = await Distributor.findAll();

    const results = [];

    for (const sp of salespeople) {
      const orders = await Order.findAll({
        where: { ...baseWhere, salesperson_id: sp.id },
        attributes: ['id', 'total_amount'],
      });
      const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const rate = Number(sp.commission_rate) || 0;
      results.push({
        name: sp.full_name,
        role: 'salesperson',
        order_count: orders.length,
        total_amount: totalAmount,
        commission_amount: (totalAmount * rate) / 100,
      });
    }

    for (const d of distributors) {
      const orders = await Order.findAll({
        where: { ...baseWhere, distributor_id: d.id },
        attributes: ['id', 'total_amount'],
      });
      const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const rate = Number(d.commission_rate) || 0;
      results.push({
        name: d.full_name,
        role: 'distributor',
        order_count: orders.length,
        total_amount: totalAmount,
        commission_amount: (totalAmount * rate) / 100,
      });
    }

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

// خلاصه وضعیت خزانه‌داری در یک بازه: جمع دریافت‌ها، جمع پرداخت‌ها، مانده خالص
// و تفکیک بر اساس روش پرداخت (نقدی/بانکی/کارت/چک). تراکنش‌های باطل‌شده لحاظ نمی‌شوند.
async function treasuryBalanceReport(req, res) {
  try {
    const { from, to } = req.query;
    const where = { is_voided: false };
    if (from || to) {
      where.transaction_date = {};
      if (from) where.transaction_date[Op.gte] = new Date(from);
      if (to) where.transaction_date[Op.lte] = new Date(to);
    }

    const transactions = await TreasuryTransaction.findAll({
      where,
      attributes: ['type', 'amount', 'method'],
    });

    let totalReceipts = 0;
    let totalPayments = 0;
    const byMethod = {};

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (!byMethod[t.method]) byMethod[t.method] = { receipts: 0, payments: 0 };

      if (t.type === 'receipt') {
        totalReceipts += amount;
        byMethod[t.method].receipts += amount;
      } else {
        totalPayments += amount;
        byMethod[t.method].payments += amount;
      }
    }

    return res.json({
      totalReceipts,
      totalPayments,
      netBalance: totalReceipts - totalPayments,
      byMethod,
    });
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = {
  salesReport,
  inventoryReport,
  distributorPerformanceReport,
  commissionsReport,
  treasuryBalanceReport,
};
