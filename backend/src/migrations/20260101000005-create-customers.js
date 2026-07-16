module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('customers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      full_name: { type: Sequelize.STRING, allowNull: false },
      business_name: { type: Sequelize.STRING },
      phone: { type: Sequelize.STRING, allowNull: false },
      address: { type: Sequelize.TEXT },
      city: { type: Sequelize.STRING },
      credit_limit: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('customers');
  },
};
