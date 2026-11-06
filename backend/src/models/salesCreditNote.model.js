'use strict';
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
class SalesCreditNote extends Model {}
SalesCreditNote.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  credit_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  kind: { type: DataTypes.STRING, allowNull: false, defaultValue: 'order_cancellation', validate: { isIn: [['order_cancellation']] } },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'posted', validate: { isIn: [['posted']] } },
  subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  posted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  confirmed_not_dispatched: { type: DataTypes.BOOLEAN, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, modelName: 'SalesCreditNote', tableName: 'sales_credit_notes' });
module.exports = SalesCreditNote;
