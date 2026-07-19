const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PurchaseInvoice extends Model {}

PurchaseInvoice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    purchase_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    issue_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    tax_amount: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
      defaultValue: 'unpaid',
    },
  },
  {
    sequelize,
    modelName: 'PurchaseInvoice',
    tableName: 'purchase_invoices',
    indexes: [
      // شماره فاکتور تامین‌کننده فقط باید در محدوده همان تامین‌کننده یکتا باشد
      { unique: true, fields: ['supplier_id', 'invoice_number'] },
    ],
  }
);

module.exports = PurchaseInvoice;
