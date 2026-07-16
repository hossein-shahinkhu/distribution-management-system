function notFound(req, res, next) {
  res.status(404).json({ message: 'مسیر درخواستی یافت نشد.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('خطای مدیریت‌نشده:', err);

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: isProduction ? 'خطای داخلی سرور رخ داده است.' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
