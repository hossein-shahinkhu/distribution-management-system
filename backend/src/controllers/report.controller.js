const { Op, fn, col, literal } = require('sequelize');
const { Order, OrderItem, Product, Distributor, sequelize } = require('../models');

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

module.exports = { salesReport, inventoryReport, distributorPerformanceReport };
