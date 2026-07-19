const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Supplier extends Model {}

Supplier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact_person: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tax_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_terms_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Supplier',
    tableName: 'suppliers',
  }
);

module.exports = Supplier;
