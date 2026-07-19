module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_order_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'purchase_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      line_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('purchase_order_items');
  },
};
