'use strict';
const { Op } = require('sequelize');
const { Order, Invoice, SalesCreditNote, TreasuryTransaction } = require('../models');
const { cents, amount } = require('../utils/money');
const { calculateInvoiceFinancials } = require('./invoiceFinancialService');

// The invoice owner is authoritative for linked receipts, including legacy
// receipts with no customer_id. Unlinked customer receipts are counted once.
async function getCustomerAccount(customerId, { salespersonId } = {}) {
  const invoices = await Invoice.findAll({
    include: [{ model: Order, where: { customer_id: customerId, ...(salespersonId ? { salesperson_id: salespersonId } : {}) }, attributes: [] }],
  });
  const ids = invoices.map(i => i.id);
  const [notes, receipts] = await Promise.all([
    SalesCreditNote.findAll({ where: { customer_id: customerId, status: 'posted', ...(salespersonId ? { invoice_id: { [Op.in]: ids } } : {}) } }),
    TreasuryTransaction.findAll({ where: { type: 'receipt', is_voided: false,
      [Op.or]: [{ invoice_id: { [Op.in]: ids } }, ...(salespersonId ? [] : [{ customer_id: customerId, invoice_id: null }]) ],
    } }),
  ]);
  const entries = [
    ...invoices.map(i => ({ date: i.issue_date, type: 'invoice', reference: i.invoice_number,
      id: i.id, debitCents: cents(i.total_amount), creditCents: 0n })),
    ...notes.map(n => ({ date: n.posted_at, type: 'sales_credit_note', reference: n.credit_number,
      id: n.id, debitCents: 0n, creditCents: cents(n.total_amount), invoice_id: n.invoice_id })),
    ...receipts.map(r => ({ date: r.transaction_date, type: 'receipt',
      reference: r.reference_number || r.description || `رسید #${r.id}`,
      id: r.id, debitCents: 0n, creditCents: cents(r.amount), invoice_id: r.invoice_id })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date) || a.type.localeCompare(b.type) || a.id - b.id);
  const balance = entries.reduce((sum, e) => sum + e.debitCents - e.creditCents, 0n);
  const unpaidCount = invoices.filter(i => calculateInvoiceFinancials(i, notes, receipts).outstanding_amount > 0).length;
  return { entries, balance, unpaidCount };
}
function publicEntry(e, balance) {
  return { date: e.date, type: e.type, reference: e.reference,
    debit: amount(e.debitCents), credit: amount(e.creditCents), balance: amount(balance) };
}
module.exports = { getCustomerAccount, publicEntry };
