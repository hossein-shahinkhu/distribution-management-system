'use strict';

/**
 * M-25: Add `tax_rate` column to `invoices` and `purchase_invoices`.
 *
 * Previously the 9% tax rate was hardcoded in the controller (TAX_RATE = 0.09).
 * This migration persists the rate that was used when each invoice was created,
 * allowing admins/salespersons to supply a custom rate per invoice.
 *
 * Default value of 9 preserves the existing behaviour for all historical records.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'tax_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 9,
    });
    await queryInterface.addColumn('purchase_invoices', 'tax_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'tax_rate');
    await queryInterface.removeColumn('purchase_invoices', 'tax_rate');
  },
};
