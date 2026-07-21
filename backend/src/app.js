const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

// در production حتماً CORS_ORIGIN را در .env به آدرس دقیق فرانت‌اند محدود کنید
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));

app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
  app.use('/api', apiLimiter);
}

// Q-11: Full health check — verifies DB connectivity, not just process uptime
app.get('/api/health', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    res.json({
      status:  'ok',
      db:      'connected',
      uptime:  Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/distributors', require('./routes/distributor.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/routes', require('./routes/route.routes'));
app.use('/api/treasury', require('./routes/treasury.routes'));
app.use('/api/suppliers', require('./routes/supplier.routes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrder.routes'));
app.use('/api/purchase-invoices', require('./routes/purchaseInvoice.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
