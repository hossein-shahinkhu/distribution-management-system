#!/bin/bash
# بک‌آپ‌گیری خودکار از دیتابیس PostgreSQL سیستم مدیریت پخش کالا
# استفاده: ./backup-db.sh
# برای اجرای خودکار روزانه با cron (مثال داخل DEPLOYMENT.md آمده است)

set -euo pipefail

# --- تنظیمات ---
# مسیر ریشه پروژه (جایی که docker-compose.yml قرار دارد)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
BACKUP_DIR="${PROJECT_DIR}/backups"
KEEP_DAYS=14

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

DB_NAME="${DB_NAME:-distribution_management}"
DB_USER="${DB_USER:-postgres}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] شروع بک‌آپ‌گیری از دیتابیس '${DB_NAME}' ..."

docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --clean --if-exists \
  | gzip > "${BACKUP_FILE}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] بک‌آپ با موفقیت ساخته شد: ${BACKUP_FILE}"

# حذف بک‌آپ‌های قدیمی‌تر از KEEP_DAYS روز
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${KEEP_DAYS} -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] بک‌آپ‌های قدیمی‌تر از ${KEEP_DAYS} روز پاک‌سازی شدند."
