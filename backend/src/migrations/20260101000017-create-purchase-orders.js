module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      po_number: { type: Sequelize.STRING, allowNull: false, unique: true },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('draft', 'ordered', 'received', 'cancelled'),
        defaultValue: 'draft',
      },
      total_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      order_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      expected_date: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('purchase_orders', ['status']);
    await queryInterface.addIndex('purchase_orders', ['supplier_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('purchase_orders');
  },
};
