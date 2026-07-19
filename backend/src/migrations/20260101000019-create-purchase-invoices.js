module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_invoices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      invoice_number: { type: Sequelize.STRING, allowNull: false },
      purchase_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'purchase_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      issue_date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      due_date: { type: Sequelize.DATE, allowNull: true },
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
    // شماره فاکتور تامین‌کننده فقط باید در محدوده همان تامین‌کننده یکتا باشد
    // (دو تامین‌کننده مختلف می‌توانند شماره فاکتور یکسان داشته باشند)
    await queryInterface.addIndex('purchase_invoices', ['supplier_id', 'invoice_number'], {
      unique: true,
      name: 'purchase_invoices_supplier_invoice_number_unique',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('purchase_invoices');
  },
};
