const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PurchaseOrderItem extends Model {}

PurchaseOrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    purchase_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit_cost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    line_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'PurchaseOrderItem',
    tableName: 'purchase_order_items',
  }
);

module.exports = PurchaseOrderItem;
