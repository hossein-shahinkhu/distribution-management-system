export const FINANCIAL_CHANGE = 'dms:financial-change';
export const documentLabels = { active: 'فعال', cancelled: 'ابطال‌شده' };
export const settlementLabels = { unpaid: 'پرداخت‌نشده', partial: 'پرداخت جزئی', paid: 'تسویه‌شده', credit: 'بستانکار', not_due: 'بدون بدهی' };
export const formatMoney = (value) => new Intl.NumberFormat('fa-IR').format(value ?? 0) + ' تومان';
export const financialError = (error) => error.response?.data?.message || 'ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.';
