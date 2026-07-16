const rateLimit = require('express-rate-limit');

// محدودیت سخت‌گیرانه روی مسیر ورود، برای جلوگیری از حدس رمز عبور
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 10,
  message: { message: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// محدودیت عمومی برای کل API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
