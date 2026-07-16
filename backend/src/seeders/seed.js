require('dotenv').config();
const { sequelize, Role, User } = require('../models');

const DEFAULT_ROLES = [
  { name: 'admin', description: 'مدیر سیستم' },
  { name: 'warehouse_keeper', description: 'انباردار' },
  { name: 'salesperson', description: 'فروشنده' },
  { name: 'distributor', description: 'توزیع‌کننده / راننده' },
];

async function seed() {
  try {
    // توجه: قبل از اجرای seed باید migration ها اجرا شده باشند (npm run migrate)
    for (const role of DEFAULT_ROLES) {
      await Role.findOrCreate({ where: { name: role.name }, defaults: role });
    }
    console.log('نقش‌های پیش‌فرض ایجاد شدند.');

    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const existingAdmin = await User.findOne({ where: { email: 'hossein@test.com' } });

    if (!existingAdmin) {
      await User.create({
        full_name: 'مدیر سیستم',
        email: 'hossein@test.com',
        password_hash: 'Admin@123', // در محیط واقعی حتماً تغییر داده شود
        role_id: adminRole.id,
      });
      console.log('کاربر ادمین پیش‌فرض ایجاد شد: hossein@test.com / Admin@123');
    } else {
      console.log('کاربر ادمین از قبل وجود دارد.');
    }

    process.exit(0);
  } catch (err) {
    if (err.original?.code === '42P01' || /relation .* does not exist/i.test(err.message || '')) {
      console.error(
        '\n❌ به نظر می‌رسد migration ها اجرا نشده‌اند.\n' +
          '   لطفاً ابتدا دستور زیر را اجرا کنید:\n' +
          '   npm run migrate\n' +
          '   سپس دوباره: npm run seed\n'
      );
      process.exit(1);
    }
    console.error('خطا در اجرای seed:', err);
    process.exit(1);
  }
}

seed();
