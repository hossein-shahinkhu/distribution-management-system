const sequelize = require('../config/database');

const Role = require('./role.model');
const User = require('./user.model');
const Category = require('./category.model');
const Product = require('./product.model');
const Customer = require('./customer.model');
const Distributor = require('./distributor.model');
const Order = require('./order.model');
const OrderItem = require('./orderItem.model');
const Invoice = require('./invoice.model');

// ---------- روابط ----------

// Role <-> User (یک نقش، چند کاربر)
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

// Category <-> Product (یک دسته، چند کالا)
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

// User <-> Distributor (یک کاربر می‌تواند نقش توزیع‌کننده داشته باشد)
User.hasOne(Distributor, { foreignKey: 'user_id' });
Distributor.belongsTo(User, { foreignKey: 'user_id' });

// Customer <-> Order (یک مشتری، چند سفارش)
Customer.hasMany(Order, { foreignKey: 'customer_id' });
Order.belongsTo(Customer, { foreignKey: 'customer_id' });

// User (salesperson) <-> Order
User.hasMany(Order, { foreignKey: 'salesperson_id', as: 'salesOrders' });
Order.belongsTo(User, { foreignKey: 'salesperson_id', as: 'salesperson' });

// Distributor <-> Order (یک توزیع‌کننده، چند سفارش برای تحویل)
Distributor.hasMany(Order, { foreignKey: 'distributor_id' });
Order.belongsTo(Distributor, { foreignKey: 'distributor_id' });

// Order <-> OrderItem (یک سفارش، چند قلم)
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

// Product <-> OrderItem
Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

// Order <-> Invoice (یک به یک)
Order.hasOne(Invoice, { foreignKey: 'order_id' });
Invoice.belongsTo(Order, { foreignKey: 'order_id' });

module.exports = {
  sequelize,
  Role,
  User,
  Category,
  Product,
  Customer,
  Distributor,
  Order,
  OrderItem,
  Invoice,
};
