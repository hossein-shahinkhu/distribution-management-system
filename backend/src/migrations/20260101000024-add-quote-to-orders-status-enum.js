'use strict';

/**
 * M-24: Safely add the `quote` value to the PostgreSQL `enum_orders_status` type.
 *
 * Background
 * ----------
 * Migration 10 (`add-is-quote-to-orders`) already contains an
 * `ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'quote'` statement,
 * but PostgreSQL forbids executing `ALTER TYPE ... ADD VALUE` inside an open
 * transaction.  Sequelize CLI wraps every migration in a transaction by default,
 * so that statement was silently skipped or failed on any PostgreSQL database
 * where the migration ran with transaction support enabled.
 *
 * This migration re-issues the same statement with `transaction: false` so that
 * it runs outside any transaction, which is the only way PostgreSQL allows enum
 * mutation.  The `IF NOT EXISTS` guard makes it fully idempotent — safe to run
 * on databases where the value was already added as well as those where it was not.
 *
 * SQLite (used in automated tests) does not use real ENUMs; the dialect guard
 * skips the statement there, and the model definition already includes `quote`.
 *
 * Down migration
 * --------------
 * PostgreSQL does not support removing an enum value once added.  The `down`
 * function is intentionally a no-op.  If a full rollback is ever required the
 * enum type must be recreated from scratch via a dedicated reverse migration.
 */
module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') return;

    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_orders_status\" ADD VALUE IF NOT EXISTS 'quote'",
      { transaction: false }
    );
  },

  async down() {
    // PostgreSQL cannot remove an enum value — intentional no-op.
    // To fully revert, recreate the enum type in a dedicated migration.
  },
};
