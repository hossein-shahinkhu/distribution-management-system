/**
 * M-23: Add `stock_compensated` flag to `purchase_orders`.
 *
 * Reserved for future purchase-order return/reversal flows.  Currently the
 * purchase-order state machine blocks any transition out of `received`, so
 * this column will always remain false in normal operation — but having it in
 * the schema keeps the compensation pattern symmetric with sales orders and
 * makes future extension straightforward without another migration.
 */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('purchase_orders', 'stock_compensated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('purchase_orders', 'stock_compensated');
  },
};
