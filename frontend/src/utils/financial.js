export const FINANCIAL_CHANGE = 'dms:financial-change';
export const documentLabels = { active: 'فعال', cancelled: 'ابطال‌شده' };
export const settlementLabels = { unpaid: 'پرداخت‌نشده', partial: 'پرداخت جزئی', paid: 'تسویه‌شده', credit: 'بستانکار', not_due: 'بدون بدهی' };
export const formatMoney = (value) => new Intl.NumberFormat('fa-IR').format(value ?? 0) + ' تومان';
export const financialError = (error) => error.response?.data?.message || 'ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.';

// Treasury aggregate API: decimal strings in toman with exactly two decimals.
// Never pass exact aggregate strings through Number, parseFloat or rounding.
export function isNegativeExactMoney(value) {
  return typeof value === 'string' && /^-\d+\.\d{2}$/.test(value) && /[1-9]/.test(value);
}

export function formatExactMoney(value, { absolute = false } = {}) {
  if (typeof value !== 'string' || !/^-?\d+\.\d{2}$/.test(value)) return '—';
  const [integer, fraction] = value.replace(/^-/, '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const digits = text => text.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[digit]);
  return `${!absolute && isNegativeExactMoney(value) ? '−' : ''}${digits(grouped)}٫${digits(fraction)} تومان`;
}

// Order API exposes Sequelize's createdAt ISO timestamp; created_at is legacy.
export function formatPersianDate(value) {
  if (value == null || value === '') return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fa-IR') : '—';
}
