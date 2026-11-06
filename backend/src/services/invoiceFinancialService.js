'use strict';
const { Op } = require('sequelize');
const { SalesCreditNote, TreasuryTransaction } = require('../models');
const { cents, amount } = require('../utils/money');

function calculateInvoiceFinancials(invoice, notes = [], receipts = []) {
  const original = cents(invoice.total_amount);
  const posted = notes.filter(n => n.status === 'posted' && n.invoice_id === invoice.id);
  const credited = posted.reduce((s, n) => s + cents(n.total_amount), 0n);
  const received = receipts.filter(r => r.invoice_id === invoice.id && r.type === 'receipt' && !r.is_voided)
    .reduce((s, r) => s + cents(r.amount), 0n);
  const net = original - credited;
  const outstanding = net > received ? net - received : 0n;
  const credit = received > net ? received - net : 0n;
  const cancelled = posted.length > 0 && credited >= original;
  const document_status = cancelled ? 'cancelled' : 'active';
  const settlement_status = credit > 0n ? 'credit' : net <= 0n ? 'not_due'
    : received <= 0n ? 'unpaid' : outstanding > 0n ? 'partial' : 'paid';
  return { original_total: amount(original), credited_total: amount(credited), net_total: amount(net),
    received_amount: amount(received), outstanding_amount: amount(outstanding), credit_balance: amount(credit),
    document_status, settlement_status };
}

// Batch reads keep the list endpoint from issuing one query per invoice.
async function attachInvoiceFinancials(invoices) {
  if (!invoices.length) return [];
  const ids = invoices.map(i => i.id);
  const [notes, receipts] = await Promise.all([
    SalesCreditNote.findAll({ where: { invoice_id: { [Op.in]: ids }, status: 'posted' } }),
    TreasuryTransaction.findAll({ where: { invoice_id: { [Op.in]: ids }, type: 'receipt', is_voided: false } }),
  ]);
  return invoices.map(i => ({ ...(i.toJSON ? i.toJSON() : i), ...calculateInvoiceFinancials(i, notes, receipts) }));
}

function filterInvoices(invoices, query = {}) {
  const search = String(query.search || '').trim().toLowerCase();
  return invoices.filter(i => (!query.document_status || i.document_status === query.document_status)
    && (!query.settlement_status || (i.document_status === 'active' && i.settlement_status === query.settlement_status))
    && (!search || [i.invoice_number, i.Order?.Customer?.full_name].some(v => String(v || '').toLowerCase().includes(search))));
}

function summarizeInvoices(invoices) {
  const summary = { count: invoices.length };
  for (const key of ['original_total', 'credited_total', 'net_total', 'received_amount', 'outstanding_amount', 'credit_balance']) {
    summary[key] = amount(invoices.reduce((s, i) => s + cents(i[key]), 0n));
  }
  return summary;
}
module.exports = { calculateInvoiceFinancials, attachInvoiceFinancials, filterInvoices, summarizeInvoices };
