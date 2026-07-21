/**
 * M-22: Add `stock_compensated` flag to `orders`.
 *
 * When a sales order is cancelled after inventory has been deducted,
 * the controller restores the stock and sets this flag to `true`.
 * The flag prevents a second cancellation attempt from double-restoring
 * inventory (idempotency guard).
 */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'stock_compensated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'stock_compensated');
  },
};
