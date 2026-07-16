module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('treasury_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: Sequelize.ENUM('receipt', 'payment'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      method: { type: Sequelize.ENUM('cash', 'bank_transfer', 'card', 'cheque'), allowNull: false },
      reference_number: { type: Sequelize.STRING, allowNull: true },
      transaction_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      description: { type: Sequelize.TEXT, allowNull: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      is_voided: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('treasury_transactions', ['type']);
    await queryInterface.addIndex('treasury_transactions', ['customer_id']);
    await queryInterface.addIndex('treasury_transactions', ['invoice_id']);
    await queryInterface.addIndex('treasury_transactions', ['transaction_date']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('treasury_transactions');
  },
};
