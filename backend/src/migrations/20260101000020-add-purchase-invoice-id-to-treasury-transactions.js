module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('treasury_transactions', 'purchase_invoice_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'purchase_invoices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('treasury_transactions', ['purchase_invoice_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('treasury_transactions', 'purchase_invoice_id');
  },
};
