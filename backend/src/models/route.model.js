const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Route extends Model {}

Route.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
  }
);

module.exports = Route;
