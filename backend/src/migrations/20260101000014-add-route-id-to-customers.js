module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'route_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('customers', ['route_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('customers', 'route_id');
  },
};
