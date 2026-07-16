#!/bin/bash
# بازگردانی دیتابیس PostgreSQL سیستم مدیریت پخش کالا از یک فایل بک‌آپ
# استفاده: ./restore-db.sh /path/to/backup.sql.gz

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "استفاده: $0 /path/to/backup.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "خطا: فایل بک‌آپ پیدا نشد: ${BACKUP_FILE}"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

DB_NAME="${DB_NAME:-distribution_management}"
DB_USER="${DB_USER:-postgres}"

echo "هشدار: این عملیات تمام داده‌های فعلی دیتابیس '${DB_NAME}' را با محتوای"
echo "فایل '${BACKUP_FILE}' جایگزین می‌کند و غیرقابل بازگشت است."
read -r -p "برای ادامه 'yes' را تایپ کنید: " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "عملیات لغو شد."
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] در حال بازگردانی دیتابیس '${DB_NAME}' از ${BACKUP_FILE} ..."

gunzip -c "${BACKUP_FILE}" | docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
  psql -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] بازگردانی با موفقیت انجام شد."
