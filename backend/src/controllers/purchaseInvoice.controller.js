const { PurchaseInvoice, PurchaseOrder, Supplier } = require('../models');
const { caseInsensitiveLike, parsePagination, buildPaginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const INCLUDE = [Supplier, PurchaseOrder];

// ثبت فاکتور خرید؛ یا بر اساس یک purchase_order موجود (که supplier_id از آن
// استنتاج می‌شود) یا مستقیم با ارسال supplier_id. شماره فاکتور همان شماره‌ای
// است که تامین‌کننده صادر کرده، نه چیزی که ما تولید کنیم.
async function create(req, res) {
  try {
    const {
      invoice_number, purchase_order_id, supplier_id,
      issue_date, due_date, subtotal, tax_amount, total_amount,
    } = req.body;

    let resolvedSupplierId = supplier_id || null;

    if (purchase_order_id) {
      const purchaseOrder = await PurchaseOrder.findByPk(purchase_order_id);
      if (!purchaseOrder) return res.status(404).json({ message: 'سفارش خرید یافت نشد.' });
      resolvedSupplierId = resolvedSupplierId || purchaseOrder.supplier_id;
    }

    if (!resolvedSupplierId) {
      return res.status(400).json({ message: 'تامین‌کننده الزامی است.' });
    }

    const supplier = await Supplier.findByPk(resolvedSupplierId);
    if (!supplier) return res.status(404).json({ message: 'تامین‌کننده یافت نشد.' });

    const invoice = await PurchaseInvoice.create({
      invoice_number,
      purchase_order_id: purchase_order_id || null,
      supplier_id:       resolvedSupplierId,
      issue_date:        issue_date || new Date(),
      due_date:          due_date   || null,
      subtotal,
      tax_amount:  tax_amount || 0,
      total_amount,
    });

    const full = await PurchaseInvoice.findByPk(invoice.id, { include: INCLUDE });
    return res.status(201).json(full);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'این شماره فاکتور قبلاً برای همین تامین‌کننده ثبت شده است.' });
    }
    logger.error('purchaseInvoice.create error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getAll(req, res) {
  try {
    const { search, supplier_id, purchase_order_id, payment_status } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const where = {};
    if (supplier_id)        where.supplier_id        = supplier_id;
    if (purchase_order_id)  where.purchase_order_id  = purchase_order_id;
    if (payment_status)     where.payment_status      = payment_status;
    if (search) {
      where.invoice_number = { [caseInsensitiveLike()]: `%${search}%` };
    }

    const result = await PurchaseInvoice.findAndCountAll({
      where,
      include: INCLUDE,
      order: [['id', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json(buildPaginatedResponse(result, page, limit));
  } catch (err) {
    logger.error('purchaseInvoice.getAll error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await PurchaseInvoice.findByPk(req.params.id, { include: INCLUDE });
    if (!invoice) return res.status(404).json({ message: 'فاکتور خرید یافت نشد.' });
    return res.json(invoice);
  } catch (err) {
    logger.error('purchaseInvoice.getOne error', { error: err.message });
    return res.status(500).json({ message: 'خطای داخلی سرور.' });
  }
}

module.exports = { create, getAll, getOne };
