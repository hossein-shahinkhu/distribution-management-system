'use strict';

/**
 * purchaseOrderService.js
 *
 * Pure domain logic for purchase orders.  No Express (req/res) dependency.
 * Controllers call these functions and translate results to HTTP responses.
 *
 * Thrown errors carry a `statusCode` property so the controller can forward
 * the correct HTTP status without embedding HTTP knowledge here.
 */

const { sequelize, PurchaseOrder, PurchaseOrderItem, Product, Supplier } = require('../models');
const { generateOrderNumber } = require('../utils/numberGenerator');
const { isPurchaseTransitionAllowed } = require('../utils/orderStateMachine');
const logger = require('../utils/logger');

/**
 * Create a purchase order with items.
 * unit_cost comes from the client (supplier-quoted price) and is validated
 * upstream by express-validator (gt: 0).  total_amount is ALWAYS derived
 * server-side as Σ(unit_cost × quantity) — the client-supplied total is ignored.
 *
 * @param {object} params
 * @param {number}   params.supplier_id
 * @param {Array<{product_id:number, quantity:number, unit_cost:number}>} params.items
 * @param {string|Date|null} params.order_date
 * @param {string|Date|null} params.expected_date
 * @param {string|null} params.notes
 * @returns {Promise<PurchaseOrder>}  fully loaded PurchaseOrder instance
 */
async function createPurchaseOrder({ supplier_id, items, order_date, expected_date, notes }) {
  const t = await sequelize.transaction();
  try {
    const supplier = await Supplier.findByPk(supplier_id, { transaction: t });
    if (!supplier) {
      const err = new Error('تامین‌کننده یافت نشد.');
      err.statusCode = 404;
      throw err;
    }

    let totalAmount = 0;
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        const err = new Error(`کالا با شناسه ${item.product_id} یافت نشد.`);
        err.statusCode = 404;
        throw err;
      }

      // Server-side total computation — client-supplied total fields are ignored
      const unitCost  = Number(item.unit_cost);
      const lineTotal = unitCost * Number(item.quantity);
      totalAmount    += lineTotal;

      preparedItems.push({
        product_id: product.id,
        quantity:   item.quantity,
        unit_cost:  unitCost,
        line_total: lineTotal,
      });
    }

    const purchaseOrder = await PurchaseOrder.create(
      {
        po_number:     generateOrderNumber('PO'),
        supplier_id,
        total_amount:  totalAmount,
        order_date:    order_date    || new Date(),
        expected_date: expected_date || null,
        notes,
        status:        'draft',
      },
      { transaction: t }
    );

    for (const item of preparedItems) {
      await PurchaseOrderItem.create({ ...item, purchase_order_id: purchaseOrder.id }, { transaction: t });
    }

    await t.commit();

    return PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
    });
  } catch (err) {
    await t.rollback();
    if (!err.statusCode) {
      logger.error('purchaseOrderService.createPurchaseOrder error', { error: err.message });
      err.statusCode = 500;
      err.message = 'خطای داخلی سرور.';
    }
    throw err;
  }
}

/**
 * Update the status of a purchase order, enforcing the state machine and
 * increasing stock on first `received` transition.
 *
 * @param {number} purchaseOrderId
 * @param {string} newStatus
 * @returns {Promise<PurchaseOrder>}  fully loaded updated PurchaseOrder instance
 */
async function updatePurchaseOrderStatus(purchaseOrderId, newStatus) {
  const t = await sequelize.transaction();
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(purchaseOrderId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction: t,
    });
    if (!purchaseOrder) {
      const err = new Error('سفارش خرید یافت نشد.');
      err.statusCode = 404;
      throw err;
    }

    if (!isPurchaseTransitionAllowed(purchaseOrder.status, newStatus)) {
      const err = new Error(`انتقال از وضعیت «${purchaseOrder.status}» به «${newStatus}» مجاز نیست.`);
      err.statusCode = 400;
      throw err;
    }

    if (newStatus === 'received') {
      for (const item of purchaseOrder.items) {
        const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!product) {
          const err = new Error(`کالا با شناسه ${item.product_id} یافت نشد.`);
          err.statusCode = 404;
          throw err;
        }
        await product.update({ stock_quantity: product.stock_quantity + item.quantity }, { transaction: t });
      }
    }

    await purchaseOrder.update({ status: newStatus }, { transaction: t });
    await t.commit();

    return PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
    });
  } catch (err) {
    await t.rollback();
    if (!err.statusCode) {
      logger.error('purchaseOrderService.updatePurchaseOrderStatus error', { error: err.message });
      err.statusCode = 500;
      err.message = 'خطای داخلی سرور.';
    }
    throw err;
  }
}

module.exports = { createPurchaseOrder, updatePurchaseOrderStatus };
