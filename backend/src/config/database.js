require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'test') {
  // در محیط تست از SQLite حافظه‌ای استفاده می‌شود تا تست‌ها مستقل و سریع اجرا شوند
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: { underscored: true, timestamps: true },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'distribution_management',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        underscored: true,
        timestamps: true,
      },
    }
  );
}

module.exports = sequelize;
