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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'سرور سیستم مدیریت پخش کالا فعال است.' });
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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
