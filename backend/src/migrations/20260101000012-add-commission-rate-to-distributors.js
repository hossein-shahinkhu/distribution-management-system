module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('distributors', 'commission_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('distributors', 'commission_rate');
  },
};
