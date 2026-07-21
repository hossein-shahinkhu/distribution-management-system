'use strict';

/**
 * M-10: Add performance indexes on the most-queried foreign key and filter
 * columns.  These are plain BTREE indexes — no schema change, no data loss,
 * can be rolled back cleanly.
 *
 * Columns chosen based on the most common WHERE / JOIN patterns observed in
 * the controllers:
 *   - orders.customer_id      — getAll JOIN + dashboard recent orders
 *   - orders.distributor_id   — distributor scoped view + performance report
 *   - orders.salesperson_id   — commissions report aggregation
 *   - orders.status           — status filter on every order list
 *   - order_items.order_id    — CASCADE detail load (already an FK, may not have index)
 *   - invoices.order_id       — invoice → order lookup
 *   - treasury_transactions.invoice_id          — payment sync
 *   - treasury_transactions.purchase_invoice_id — payment sync
 *   - treasury_transactions.customer_id         — treasury filter
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const add = (table, columns, suffix) =>
      queryInterface.addIndex(table, columns, {
        name:   `idx_${table}_${suffix}`,
        concurrently: true,   // PostgreSQL: non-blocking index build
      }).catch(() => {});     // silently skip if index already exists

    await add('orders',               ['customer_id'],                      'customer_id');
    await add('orders',               ['distributor_id'],                   'distributor_id');
    await add('orders',               ['salesperson_id'],                   'salesperson_id');
    await add('orders',               ['status'],                           'status');
    await add('orders',               ['order_date'],                       'order_date');
    await add('order_items',          ['order_id'],                         'order_id');
    await add('order_items',          ['product_id'],                       'product_id');
    await add('invoices',             ['order_id'],                         'order_id');
    await add('invoices',             ['payment_status'],                   'payment_status');
    await add('treasury_transactions',['invoice_id'],                       'invoice_id');
    await add('treasury_transactions',['purchase_invoice_id'],              'purchase_invoice_id');
    await add('treasury_transactions',['customer_id'],                      'customer_id');
    await add('treasury_transactions',['transaction_date'],                 'transaction_date');
    await add('purchase_order_items', ['purchase_order_id'],                'purchase_order_id');
    await add('customers',            ['route_id'],                         'route_id');
    await add('distributors',         ['user_id'],                          'user_id');
  },

  async down(queryInterface) {
    const tables = {
      orders:                ['idx_orders_customer_id', 'idx_orders_distributor_id', 'idx_orders_salesperson_id', 'idx_orders_status', 'idx_orders_order_date'],
      order_items:           ['idx_order_items_order_id', 'idx_order_items_product_id'],
      invoices:              ['idx_invoices_order_id', 'idx_invoices_payment_status'],
      treasury_transactions: ['idx_treasury_transactions_invoice_id', 'idx_treasury_transactions_purchase_invoice_id', 'idx_treasury_transactions_customer_id', 'idx_treasury_transactions_transaction_date'],
      purchase_order_items:  ['idx_purchase_order_items_purchase_order_id'],
      customers:             ['idx_customers_route_id'],
      distributors:          ['idx_distributors_user_id'],
    };

    for (const [table, indexes] of Object.entries(tables)) {
      for (const indexName of indexes) {
        await queryInterface.removeIndex(table, indexName).catch(() => {});
      }
    }
  },
};
