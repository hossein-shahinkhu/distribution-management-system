'use strict';

const { PurchaseOrder, PurchaseOrderItem, Product, Supplier } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const { createPurchaseOrder, updatePurchaseOrderStatus } = require('../services/purchaseOrderService');
const logger = require('../utils/logger');

// ─── create ──────────────────────────────────────────────────────────────────
async function create(req, res) {
  try {
    const { supplier_id, items, order_date, expected_date, notes } = req.body;
    const purchaseOrder = await createPurchaseOrder({ supplier_id, items, order_date, expected_date, notes });
    return res.status(201).json(purchaseOrder);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// ─── getAll ───────────────────────────────────────────────────────────────────
async function getAll(req, res) {
  try {
    const { search, status, supplier_id } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (status)      where.status      = status;
    if (supplier_id) where.supplier_id = supplier_id;
    if (search) {
      where.po_number = { [caseInsensitiveLike()]: `%${search}%` };
    }

    const result = await PurchaseOrder.findAndCountAll({
      where,
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
      order: [['id', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    logger.error('purchaseOrder.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// ─── getOne ───────────────────────────────────────────────────────────────────
async function getOne(req, res) {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id, {
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
    });
    if (!purchaseOrder) return res.status(404).json({ message: 'سفارش خرید یافت نشد.' });
    return res.json(purchaseOrder);
  } catch (err) {
    logger.error('purchaseOrder.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

// ─── updateStatus ─────────────────────────────────────────────────────────────
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const purchaseOrder = await updatePurchaseOrderStatus(Number(req.params.id), status);
    return res.json(purchaseOrder);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
}

module.exports = { create, getAll, getOne, updateStatus };
