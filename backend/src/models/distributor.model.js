const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Distributor extends Model {}

Distributor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // در صورتی که توزیع‌کننده حساب کاربری داشته باشد
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vehicle_plate: {
      type: DataTypes.STRING,
    },
    vehicle_type: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Distributor',
    tableName: 'distributors',
  }
);

module.exports = Distributor;
