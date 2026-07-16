const { Invoice, Order, OrderItem, Product, Customer } = require('../models');

const TAX_RATE = 0.09; // مالیات بر ارزش افزوده (قابل تنظیم)

function generateInvoiceNumber() {
  const now = new Date();
  const stamp = now.getTime().toString().slice(-8);
  return `INV-${stamp}`;
}

// صدور فاکتور بر اساس یک سفارش موجود
async function createFromOrder(req, res) {
  try {
    const { order_id } = req.body;
    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد.' });

    const existing = await Invoice.findOne({ where: { order_id } });
    if (existing) {
      return res.status(409).json({ message: 'برای این سفارش قبلاً فاکتور صادر شده است.' });
    }

    const subtotal = Number(order.total_amount);
    const taxAmount = Math.round(subtotal * TAX_RATE);
    const totalAmount = subtotal + taxAmount;

    const invoice = await Invoice.create({
      invoice_number: generateInvoiceNumber(),
      order_id,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // ۱۴ روز مهلت پرداخت
    });

    return res.status(201).json(invoice);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getAll(req, res) {
  try {
    const invoices = await Invoice.findAll({
      include: [{ model: Order, include: [Customer, { model: OrderItem, as: 'items', include: Product }] }],
      order: [['id', 'DESC']],
    });
    return res.json(invoices);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Order, include: [Customer, { model: OrderItem, as: 'items', include: Product }] }],
    });
    if (!invoice) return res.status(404).json({ message: 'فاکتور یافت نشد.' });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

async function updatePaymentStatus(req, res) {
  try {
    const { payment_status } = req.body;
    if (!['unpaid', 'partial', 'paid'].includes(payment_status)) {
      return res.status(400).json({ message: 'وضعیت پرداخت نامعتبر است.' });
    }
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'فاکتور یافت نشد.' });
    await invoice.update({ payment_status });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ message: 'خطای سرور', error: err.message });
  }
}

module.exports = { createFromOrder, getAll, getOne, updatePaymentStatus };
