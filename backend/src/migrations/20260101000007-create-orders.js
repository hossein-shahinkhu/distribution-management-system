module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_number: { type: Sequelize.STRING, allowNull: false, unique: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      salesperson_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      distributor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'distributors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'),
        defaultValue: 'pending',
      },
      total_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      order_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      delivery_date: { type: Sequelize.DATE },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['customer_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
  },
};
