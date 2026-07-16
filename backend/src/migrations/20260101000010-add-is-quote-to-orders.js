module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'is_quote', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // افزودن مقدار 'quote' به ENUM وضعیت سفارش (فقط PostgreSQL از ENUM واقعی
    // پشتیبانی می‌کند؛ SQLite در تست‌ها از طریق تعریف مدل sync می‌شود)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        "ALTER TYPE \"enum_orders_status\" ADD VALUE IF NOT EXISTS 'quote'"
      );
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'is_quote');
    // توجه: PostgreSQL حذف مقدار از یک ENUM موجود را پشتیبانی نمی‌کند؛
    // در صورت نیاز به rollback کامل باید نوع ENUM از نو ساخته شود.
  },
};
