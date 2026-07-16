require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('اتصال به دیتابیس با موفقیت برقرار شد.');

    // توجه: از نسخه فعلی به بعد، ساخت/به‌روزرسانی جداول از طریق migration
    // انجام می‌شود، نه sequelize.sync(). قبل از اولین اجرا حتماً دستور زیر را بزنید:
    //   npm run migrate
    try {
      await sequelize.query('SELECT 1 FROM roles LIMIT 1');
    } catch (checkErr) {
      console.warn(
        '\n⚠ به نظر می‌رسد جداول دیتابیس هنوز ساخته نشده‌اند.\n' +
          '  لطفاً قبل از استفاده، دستور زیر را اجرا کنید:\n' +
          '  npm run migrate\n'
      );
    }

    app.listen(PORT, () => {
      console.log(`سرور روی پورت ${PORT} در حال اجراست.`);
    });
  } catch (err) {
    console.error('خطا در راه‌اندازی سرور:', err);
    process.exit(1);
  }
}

start();
