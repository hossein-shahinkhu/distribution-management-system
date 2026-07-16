module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      invoice_number: { type: Sequelize.STRING, allowNull: false, unique: true },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      issue_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      due_date: { type: Sequelize.DATE },
      subtotal: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      tax_amount: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
        defaultValue: 'unpaid',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('invoices');
  },
};
