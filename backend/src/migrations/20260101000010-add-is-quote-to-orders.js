module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'is_quote', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // افزودن مقدار 'quote' به ENUM وضعیت سفارش.
    // توجه: PostgreSQL اجازه نمی‌دهد ALTER TYPE ... ADD VALUE داخل transaction اجرا شود.
    // { transaction: false } الزامی است؛ بدون آن این دستور روی PostgreSQL با خطا fail می‌شود.
    // SQLite در تست‌ها ENUM واقعی ندارد و از طریق model definition کار می‌کند.
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        "ALTER TYPE \"enum_orders_status\" ADD VALUE IF NOT EXISTS 'quote'",
        { transaction: false }
      );
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'is_quote');
    // توجه: PostgreSQL حذف مقدار از یک ENUM موجود را پشتیبانی نمی‌کند؛
    // در صورت نیاز به rollback کامل باید نوع ENUM از نو ساخته شود.
  },
};
