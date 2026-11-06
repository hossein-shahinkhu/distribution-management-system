const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Invoice extends Model {}

Invoice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // هر سفارش یک فاکتور دارد
    },
    issue_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    due_date: {
      type: DataTypes.DATE,
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 9,
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
    modelName: 'Invoice',
    tableName: 'invoices',
  }
);

module.exports = Invoice;
