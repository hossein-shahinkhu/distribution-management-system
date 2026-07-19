const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PurchaseOrder extends Model {}

PurchaseOrder.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    po_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'ordered', 'received', 'cancelled'),
      defaultValue: 'draft',
    },
    total_amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    order_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expected_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'PurchaseOrder',
    tableName: 'purchase_orders',
  }
);

module.exports = PurchaseOrder;
