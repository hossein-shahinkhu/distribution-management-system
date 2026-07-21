const { Op, fn, col, literal, sequelize: seq } = require('sequelize');
const {
  Order, OrderItem, Product, Distributor, User, Role,
  TreasuryTransaction, sequelize,
} = require('../models');
const logger = require('../utils/logger');

// گزارش فروش بر اساس بازه زمانی
async function salesReport(req, res) {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.order_date = {};
      if (from) where.order_date[Op.gte] = new Date(from);
      if (to)   where.order_date[Op.lte] = new Date(to);
    }

    const orders = await Order.findAll({
      where,
      attributes: ['id', 'total_amount', 'status', 'order_date'],
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders  = orders.length;
    const byStatus     = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return res.json({ totalRevenue, totalOrders, byStatus });
  } catch (err) {
    logger.error('report.salesReport error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// گزارش وضعیت موجودی انبار
async function inventoryReport(req, res) {
  try {
    const products = await Product.findAll({
      attributes: ['id', 'name', 'sku', 'stock_quantity', 'reorder_level', 'unit_price'],
      order: [['stock_quantity', 'ASC']],
    });

    const lowStockCount      = products.filter((p) => p.stock_quantity <= p.reorder_level).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + Number(p.unit_price) * p.stock_quantity,
      0
    );

    return res.json({ products, lowStockCount, totalInventoryValue });
  } catch (err) {
    logger.error('report.inventoryReport error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// گزارش عملکرد توزیع‌کنندگان (تعداد سفارش‌های تحویل داده‌شده)
async function distributorPerformanceReport(req, res) {
  try {
    const results = await Order.findAll({
      attributes: [
        'distributor_id',
        [fn('COUNT', col('Order.id')),                                              'total_orders'],
        [fn('SUM', literal("CASE WHEN status = 'delivered' THEN 1 ELSE 0 END")), 'delivered_orders'],
      ],
      where:   { distributor_id: { [Op.ne]: null } },
      group:   ['distributor_id', 'Distributor.id'],
      include: [{ model: Distributor, attributes: ['full_name', 'phone'] }],
    });

    return res.json(results);
  } catch (err) {
    logger.error('report.distributorPerformanceReport error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

/**
 * Q-03: گزارش پورسانت — رفع N+1 query
 *
 * قبلاً برای هر فروشنده/توزیع‌کننده یک query مجزا زده می‌شد.
 * حالا با دو GROUP BY aggregation query کل داده دریافت می‌شود.
 */
async function commissionsReport(req, res) {
  try {
    const { from, to } = req.query;
    const dateWhere    = {};
    if (from) dateWhere[Op.gte] = new Date(from);
    if (to)   dateWhere[Op.lte] = new Date(to);

    const orderWhere = { status: 'delivered' };
    if (from || to) orderWhere.order_date = dateWhere;

    // ── Fetch ALL salespersons with commission_rate > 0 ──────
    // Then aggregate matching delivered orders via a scoped include.
    // Using a subquery approach: load all eligible users, then lookup
    // their aggregated order stats in a single GROUP BY query and merge.

    const [allSalespersons, allDistributors] = await Promise.all([
      User.findAll({
        where: { commission_rate: { [Op.gt]: 0 } },
        attributes: ['id', 'full_name', 'commission_rate'],
      }),
      Distributor.findAll({
        where: { commission_rate: { [Op.gt]: 0 } },
        attributes: ['id', 'full_name', 'commission_rate'],
      }),
    ]);

    // ── Salesperson aggregation (single GROUP BY query) ──────
    const salesRows = await Order.findAll({
      attributes: [
        'salesperson_id',
        [fn('COUNT', col('Order.id')), 'order_count'],
        [fn('SUM', col('Order.total_amount')), 'total_amount'],
      ],
      where:  { ...orderWhere, salesperson_id: { [Op.ne]: null } },
      group:  ['salesperson_id'],
      raw:    true,
    });

    // ── Distributor aggregation (single GROUP BY query) ──────
    const distRows = await Order.findAll({
      attributes: [
        'distributor_id',
        [fn('COUNT', col('Order.id')), 'order_count'],
        [fn('SUM', col('Order.total_amount')), 'total_amount'],
      ],
      where:  { ...orderWhere, distributor_id: { [Op.ne]: null } },
      group:  ['distributor_id'],
      raw:    true,
    });

    // Index aggregation results by entity id for O(1) lookup
    const salesMap = Object.fromEntries(salesRows.map((r) => [r.salesperson_id, r]));
    const distMap  = Object.fromEntries(distRows.map((r) => [r.distributor_id, r]));

    const results = [];

    for (const sp of allSalespersons) {
      const agg         = salesMap[sp.id] || {};
      const totalAmount = Number(agg.total_amount || 0);
      const rate        = Number(sp.commission_rate) || 0;
      results.push({
        name:              sp.full_name,
        role:              'salesperson',
        order_count:       Number(agg.order_count || 0),
        total_amount:      totalAmount,
        commission_amount: (totalAmount * rate) / 100,
      });
    }

    for (const d of allDistributors) {
      const agg         = distMap[d.id] || {};
      const totalAmount = Number(agg.total_amount || 0);
      const rate        = Number(d.commission_rate) || 0;
      results.push({
        name:              d.full_name,
        role:              'distributor',
        order_count:       Number(agg.order_count || 0),
        total_amount:      totalAmount,
        commission_amount: (totalAmount * rate) / 100,
      });
    }

    return res.json(results);
  } catch (err) {
    logger.error('report.commissionsReport error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
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
      if (to)   where.transaction_date[Op.lte] = new Date(to);
    }

    const transactions = await TreasuryTransaction.findAll({
      where,
      attributes: ['type', 'amount', 'method'],
    });

    let totalReceipts = 0;
    let totalPayments = 0;
    const byMethod    = {};

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (!byMethod[t.method]) byMethod[t.method] = { receipts: 0, payments: 0 };

      if (t.type === 'receipt') {
        totalReceipts           += amount;
        byMethod[t.method].receipts += amount;
      } else {
        totalPayments           += amount;
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
    logger.error('report.treasuryBalanceReport error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = {
  salesReport,
  inventoryReport,
  distributorPerformanceReport,
  commissionsReport,
  treasuryBalanceReport,
};
