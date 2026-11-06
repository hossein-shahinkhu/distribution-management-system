'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const reference = (table) => ({ type: Sequelize.INTEGER, allowNull: false,
        references: { model: table, key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
      await queryInterface.createTable('sales_credit_notes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        credit_number: { type: Sequelize.STRING, allowNull: false, unique: true },
        invoice_id: { ...reference('invoices'), unique: true },
        order_id: { ...reference('orders'), unique: true },
        customer_id: reference('customers'),
        kind: { type: Sequelize.STRING, allowNull: false, defaultValue: 'order_cancellation' },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'posted' },
        subtotal: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        tax_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        total_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        posted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        confirmed_not_dispatched: { type: Sequelize.BOOLEAN, allowNull: false },
        created_by: reference('users'),
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      }, { transaction });
      await queryInterface.addIndex('sales_credit_notes', ['customer_id', 'posted_at'], { transaction });
      await queryInterface.addConstraint('sales_credit_notes', {
        type: 'check', name: 'sales_credit_notes_valid_cancellation',
        fields: ['kind', 'status', 'confirmed_not_dispatched', 'subtotal', 'tax_amount', 'total_amount'],
        where: Sequelize.literal("kind = 'order_cancellation' AND status = 'posted' AND confirmed_not_dispatched = true AND subtotal >= 0 AND tax_amount >= 0 AND total_amount = subtotal + tax_amount"),
        transaction,
      });
    });
  },
  async down(queryInterface) {
    const db = queryInterface.sequelize;
    if (db.getDialect() !== 'postgres') {
      throw new Error('Rollback blocked: safe credit-note removal requires PostgreSQL table locking.');
    }
    // READ COMMITTED takes a fresh snapshot after any in-flight insert commits.
    // ACCESS EXCLUSIVE prevents inserts between the existence check and DROP.
    await db.transaction({ isolationLevel: 'READ COMMITTED' }, async (transaction) => {
      await db.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await db.query('LOCK TABLE "sales_credit_notes" IN ACCESS EXCLUSIVE MODE', { transaction });
      const [rows] = await db.query('SELECT EXISTS (SELECT 1 FROM "sales_credit_notes") AS has_documents', { transaction });
      if (rows.length !== 1 || rows[0].has_documents !== false) {
        throw new Error('Rollback blocked: sales_credit_notes contains financial documents; preserve the table and use a forward migration.');
      }
      await queryInterface.dropTable('sales_credit_notes', { transaction });
    });
  },
};
