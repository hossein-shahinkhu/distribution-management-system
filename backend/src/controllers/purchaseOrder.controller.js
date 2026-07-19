const { sequelize, PurchaseOrder, PurchaseOrderItem, Product, Supplier } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');

function generatePoNumber() {
  const now = new Date();
  const stamp = now.getTime().toString().slice(-8);
  return `PO-${stamp}`;
}

// ثبت سفارش خرید جدید همراه با اقلام آن (بدون تغییر موجودی انبار؛ موجودی فقط
// هنگام تغییر وضعیت به 'received' افزایش می‌یابد)
async function create(req, res) {
  const t = await sequelize.transaction();
  try {
    const { supplier_id, items, order_date, expected_date, notes } = req.body;

    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'تامین‌کننده و حداقل یک قلم کالا الزامی است.' });
    }

    const supplier = await Supplier.findByPk(supplier_id, { transaction: t });
    if (!supplier) {
      await t.rollback();
      return res.status(404).json({ message: 'تامین‌کننده یافت نشد.' });
    }

    let totalAmount = 0;
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ message: `کالا با شناسه ${item.product_id} یافت نشد.` });
      }

      const unitCost = Number(item.unit_cost);
      const lineTotal = unitCost * Number(item.quantity);
      totalAmount += lineTotal;

      preparedItems.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_cost: unitCost,
        line_total: lineTotal,
      });
    }

    const purchaseOrder = await PurchaseOrder.create(
      {
        po_number: generatePoNumber(),
        supplier_id,
        total_amount: totalAmount,
        order_date: order_date || new Date(),
        expected_date: expected_date || null,
        notes,
        status: 'draft',
      },
      { transaction: t }
    );

    for (const item of preparedItems) {
      await PurchaseOrderItem.create({ ...item, purchase_order_id: purchaseOrder.id }, { transaction: t });
    }

    await t.commit();

    const full = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
    });

    return res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getAll(req, res) {
  try {
    const { search, status, supplier_id } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (status) where.status = status;
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
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id, {
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
    });
    if (!purchaseOrder) return res.status(404).json({ message: 'سفارش خرید یافت نشد.' });
    return res.json(purchaseOrder);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

const VALID_STATUSES = ['draft', 'ordered', 'received', 'cancelled'];

// تغییر وضعیت سفارش خرید؛ فقط هنگام گذار به 'received' (و نه هر بار)
// موجودی انبار هر کالا به‌اندازه quantity افزایش می‌یابد (به‌صورت تراکنشی)
async function updateStatus(req, res) {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: 'وضعیت نامعتبر است.' });
    }

    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction: t,
    });
    if (!purchaseOrder) {
      await t.rollback();
      return res.status(404).json({ message: 'سفارش خرید یافت نشد.' });
    }

    const isNewlyReceived = status === 'received' && purchaseOrder.status !== 'received';

    if (isNewlyReceived) {
      for (const item of purchaseOrder.items) {
        const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!product) {
          await t.rollback();
          return res.status(404).json({ message: `کالا با شناسه ${item.product_id} یافت نشد.` });
        }
        await product.update({ stock_quantity: product.stock_quantity + item.quantity }, { transaction: t });
      }
    }

    await purchaseOrder.update({ status }, { transaction: t });
    await t.commit();

    const full = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [Supplier, { model: PurchaseOrderItem, as: 'items', include: Product }],
    });
    return res.json(full);
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { create, getAll, getOne, updateStatus };
