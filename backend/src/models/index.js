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
const Route = require('./route.model');
const TreasuryTransaction = require('./treasuryTransaction.model');
const Supplier = require('./supplier.model');
const PurchaseOrder = require('./purchaseOrder.model');
const PurchaseOrderItem = require('./purchaseOrderItem.model');
const PurchaseInvoice = require('./purchaseInvoice.model');
const SalesCreditNote = require('./salesCreditNote.model');

// ---------- روابط ----------
Invoice.hasOne(SalesCreditNote, { foreignKey: 'invoice_id', onDelete: 'RESTRICT' });
SalesCreditNote.belongsTo(Invoice, { foreignKey: 'invoice_id', onDelete: 'RESTRICT' });
Order.hasOne(SalesCreditNote, { foreignKey: 'order_id', onDelete: 'RESTRICT' });
SalesCreditNote.belongsTo(Order, { foreignKey: 'order_id', onDelete: 'RESTRICT' });
Customer.hasMany(SalesCreditNote, { foreignKey: 'customer_id', onDelete: 'RESTRICT' });
SalesCreditNote.belongsTo(Customer, { foreignKey: 'customer_id', onDelete: 'RESTRICT' });
SalesCreditNote.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT' });

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

// Route <-> Customer (یک مسیر، چند مشتری برای گروه‌بندی جغرافیایی)
Route.hasMany(Customer, { foreignKey: 'route_id' });
Customer.belongsTo(Route, { foreignKey: 'route_id' });

// Customer <-> TreasuryTransaction (دریافت/پرداخت مرتبط با یک مشتری خاص)
Customer.hasMany(TreasuryTransaction, { foreignKey: 'customer_id' });
TreasuryTransaction.belongsTo(Customer, { foreignKey: 'customer_id' });

// Invoice <-> TreasuryTransaction (دریافت‌های مرتبط با یک فاکتور خاص)
Invoice.hasMany(TreasuryTransaction, { foreignKey: 'invoice_id' });
TreasuryTransaction.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// User <-> TreasuryTransaction (کاربری که تراکنش را ثبت کرده)
User.hasMany(TreasuryTransaction, { foreignKey: 'created_by', as: 'treasuryTransactions' });
TreasuryTransaction.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Supplier <-> PurchaseOrder (یک تامین‌کننده، چند سفارش خرید)
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id' });

// PurchaseOrder <-> PurchaseOrderItem (یک سفارش خرید، چند قلم)
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items', onDelete: 'CASCADE' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });

// Product <-> PurchaseOrderItem
Product.hasMany(PurchaseOrderItem, { foreignKey: 'product_id' });
PurchaseOrderItem.belongsTo(Product, { foreignKey: 'product_id' });

// Supplier <-> PurchaseInvoice (یک تامین‌کننده، چند فاکتور خرید)
Supplier.hasMany(PurchaseInvoice, { foreignKey: 'supplier_id' });
PurchaseInvoice.belongsTo(Supplier, { foreignKey: 'supplier_id' });

// PurchaseOrder <-> PurchaseInvoice (یک سفارش خرید می‌تواند چند فاکتور خرید داشته باشد؛
// یکتا نیست چون خرید می‌تواند بدون سفارش خرید قبلی هم مستقیم ثبت شود)
PurchaseOrder.hasMany(PurchaseInvoice, { foreignKey: 'purchase_order_id' });
PurchaseInvoice.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });

// PurchaseInvoice <-> TreasuryTransaction (پرداخت‌های مرتبط با یک فاکتور خرید خاص)
PurchaseInvoice.hasMany(TreasuryTransaction, { foreignKey: 'purchase_invoice_id' });
TreasuryTransaction.belongsTo(PurchaseInvoice, { foreignKey: 'purchase_invoice_id' });

module.exports = {
  SalesCreditNote,
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
  Route,
  TreasuryTransaction,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseInvoice,
};
