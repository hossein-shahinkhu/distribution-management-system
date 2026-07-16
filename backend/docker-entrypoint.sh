#!/bin/sh
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

echo "در حال انتظار برای بالا آمدن دیتابیس روی ${DB_HOST}:${DB_PORT} ..."

until node -e "
const net = require('net');
const socket = net.createConnection(${DB_PORT}, '${DB_HOST}');
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
"; do
  echo "دیتابیس هنوز آماده نیست، تلاش مجدد در ۲ ثانیه..."
  sleep 2
done

echo "دیتابیس در دسترس است. اجرای migration ها..."
npm run migrate

echo "شروع سرور..."
exec "$@"
