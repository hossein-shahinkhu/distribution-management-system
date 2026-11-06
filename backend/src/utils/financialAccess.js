'use strict';

function canReadOrderFinancials(user, order) {
  return user.Role?.name === 'admin' ||
    (user.Role?.name === 'salesperson' && order.salesperson_id != null &&
      Number(order.salesperson_id) === Number(user.id));
}

// Operational responses must not carry nested financial documents or prices.
function orderView(user, order) {
  const data = order.toJSON ? order.toJSON() : structuredClone(order);
  data.can_view_financials = canReadOrderFinancials(user, data);
  if (user.Role?.name !== 'admin') {
    if (data.Customer) delete data.Customer.credit_limit;
    if (data.Distributor) delete data.Distributor.commission_rate;
  }
  if (data.can_view_financials) return data;
  delete data.total_amount;
  delete data.Invoice;
  for (const item of data.items || []) {
    delete item.unit_price;
    delete item.line_total;
    if (item.Product) delete item.Product.unit_price;
  }
  return data;
}

function financialDocumentView(user, document) {
  const data = document.toJSON ? document.toJSON() : structuredClone(document);
  if (user.Role?.name !== 'admin') {
    if (data.Customer) delete data.Customer.credit_limit;
    if (data.Order) data.Order = orderView(user, data.Order);
    delete data.PurchaseInvoice;
    delete data.purchase_invoice_id;
  }
  return data;
}

module.exports = { canReadOrderFinancials, orderView, financialDocumentView };
