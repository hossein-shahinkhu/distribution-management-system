# راهنمای دیپلوی «سیستم مدیریت پخش کالا» روی VPS

این راهنما مرحله‌به‌مرحله توضیح می‌دهد چطور این پروژه را از صفر روی یک سرور
اوبونتو (Ubuntu 22.04 یا 24.04) با Docker و Docker Compose بالا بیاورید،
دامنه را وصل کنید، گواهی SSL رایگان بگیرید و بک‌آپ خودکار روزانه تنظیم کنید.

## پیش‌نیازها

- یک VPS با اوبونتو (حداقل ۲ گیگابایت RAM پیشنهاد می‌شود)
- یک دامنه که رکورد A آن به IP سرور اشاره کند
- دسترسی SSH با کاربری غیر از root که به گروه sudo اضافه شده باشد

## ۱. آماده‌سازی اولیه سرور

```bash
ssh user@YOUR_SERVER_IP

sudo apt update && sudo apt upgrade -y

# فایروال: فقط SSH و پورت‌های وب را باز بگذارید
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## ۲. نصب Docker و Docker Compose

```bash
curl -fsSL https://get.docker.com | sudo sh

# اضافه کردن کاربر فعلی به گروه docker (برای اجرا بدون sudo)
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

## ۳. دریافت کد پروژه

```bash
sudo apt install -y git
git clone <آدرس ریپازیتوری شما> distribution-management-system
cd distribution-management-system
```

اگر کد را به‌صورت git repository ندارید، می‌توانید با `scp` یا `rsync` کل پوشه
پروژه را از سیستم خودتان روی سرور کپی کنید.

## ۴. تنظیم متغیرهای محیطی

فایل نمونه را کپی کنید و مقادیر واقعی را وارد کنید:

```bash
cp .env.example .env
nano .env
```

مقادیر زیر را حتماً تغییر دهید:

| متغیر | توضیح |
|---|---|
| `DB_PASSWORD` | یک رمز قوی و تصادفی برای دیتابیس |
| `JWT_SECRET` | یک رشته تصادفی و طولانی (مثلاً با `openssl rand -hex 32` بسازید) |
| `CORS_ORIGIN` | آدرس دامنه‌ی نهایی، مثلاً `https://dms.example.com` |
| `DOMAIN` | همان دامنه‌ای که رکورد A آن به سرور اشاره می‌کند |
| `ACME_EMAIL` | ایمیل شما برای دریافت اعلان‌های Let's Encrypt |

نکته امنیتی: فایل `.env` حاوی اطلاعات حساس است و **نباید** commit یا در جایی
عمومی منتشر شود.

## ۵. بالا آوردن سرویس‌ها

```bash
docker compose build
docker compose up -d
```

این دستور چهار سرویس را بالا می‌آورد:

- **postgres**: دیتابیس PostgreSQL با volume برای persist شدن داده
- **backend**: API نود که هنگام استارت منتظر دیتابیس می‌ماند، migration ها را
  اجرا می‌کند و سپس سرور را روی پورت داخلی ۵۰۰۰ بالا می‌آورد
- **frontend**: اپ React که با nginx سرو می‌شود
- **caddy**: reverse proxy که پورت‌های ۸۰ و ۴۴۳ را به بیرون expose می‌کند و
  به‌صورت خودکار گواهی SSL از Let's Encrypt می‌گیرد

برای بررسی وضعیت و لاگ‌ها:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f caddy
```

نکته: caddy تنها زمانی می‌تواند گواهی SSL معتبر بگیرد که DNS دامنه از قبل به
IP سرور اشاره کند و پورت‌های ۸۰/۴۴۳ از بیرون در دسترس باشند.

## ۶. ساخت کاربر ادمین اولیه

اگر پروژه seeder برای ساخت نقش‌ها/کاربر ادمین دارد، آن را داخل کانتینر
backend اجرا کنید:

```bash
docker compose exec backend npm run seed
```

## ۷. بررسی نهایی

مرورگر را باز کنید و به آدرس `https://yourdomain.com` بروید. باید صفحه
لاگین اپلیکیشن React را ببینید و قفل SSL مرورگر سبز باشد.

بررسی مستقیم سلامت API:

```bash
curl https://yourdomain.com/api/health
```

## ۸. تنظیم بک‌آپ خودکار روزانه با cron

اسکریپت‌های `scripts/backup-db.sh` و `scripts/restore-db.sh` از قبل آماده‌اند.
اسکریپت بک‌آپ با `pg_dump` یک دامپ فشرده (`.sql.gz`) در پوشه `backups/`
می‌سازد و بک‌آپ‌های قدیمی‌تر از ۱۴ روز را خودش پاک می‌کند.

ابتدا اجرای دستی را تست کنید:

```bash
./scripts/backup-db.sh
ls -la backups/
```

سپس crontab کاربر را ویرایش کنید:

```bash
crontab -e
```

و خط زیر را اضافه کنید تا هر شب ساعت ۳ بامداد بک‌آپ گرفته شود (مسیر پروژه را
با مسیر واقعی روی سرورتان جایگزین کنید):

```cron
0 3 * * * /home/USER/distribution-management-system/scripts/backup-db.sh >> /home/USER/distribution-management-system/backups/backup.log 2>&1
```

برای بازگردانی یک بک‌آپ در صورت نیاز:

```bash
./scripts/restore-db.sh backups/distribution_management_2026-07-16_03-00-00.sql.gz
```

توصیه می‌شود علاوه بر نگه‌داری بک‌آپ روی خود سرور، به‌صورت دوره‌ای فایل‌های
پوشه `backups/` را به یک مکان خارج از سرور (مثلاً با `rsync` یا یک سرویس
ذخیره‌سازی ابری) هم منتقل کنید تا در صورت از دست رفتن کامل سرور هم داده‌ها
در دسترس باشند.

## ۹. به‌روزرسانی پروژه در آینده

```bash
git pull
docker compose build
docker compose up -d
```

از آنجا که migration ها در `docker-entrypoint.sh` سرویس backend به‌صورت
خودکار در هر استارت اجرا می‌شوند، لازم نیست migration را دستی اجرا کنید؛
فقط قبل از هر آپدیت مهم حتماً یک بک‌آپ دستی بگیرید:

```bash
./scripts/backup-db.sh
```

## ۱۰. عیب‌یابی سریع

| مشکل | راه‌حل |
|---|---|
| گواهی SSL گرفته نمی‌شود | مطمئن شوید DNS دامنه به IP سرور اشاره می‌کند و پورت‌های ۸۰/۴۴۳ در فایروال باز هستند؛ لاگ `docker compose logs caddy` را ببینید |
| backend بالا نمی‌آید | لاگ `docker compose logs backend` را چک کنید؛ معمولاً یا اتصال دیتابیس یا مقدار `JWT_SECRET`/`DB_PASSWORD` در `.env` است |
| صفحه فرانت‌اند خالی/۵۰۴ می‌دهد | مطمئن شوید سرویس backend سالم است (`docker compose ps`) و مسیر `/api` در nginx.conf به `backend:5000` اشاره می‌کند |
| داده‌ها بعد از ری‌استارت از بین می‌روند | مطمئن شوید volume دیتابیس (`postgres_data`) حذف نشده؛ هرگز از `docker compose down -v` استفاده نکنید مگر عمداً بخواهید داده‌ها پاک شوند |
