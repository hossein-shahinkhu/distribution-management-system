const STATUS_MAP = {
  pending: { label: 'در انتظار تأیید', color: 'status-pending' },
  confirmed: { label: 'تأییدشده', color: 'status-confirmed' },
  processing: { label: 'در حال آماده‌سازی', color: 'status-processing' },
  out_for_delivery: { label: 'در مسیر تحویل', color: 'status-shipping' },
  delivered: { label: 'تحویل‌شده', color: 'status-delivered' },
  cancelled: { label: 'لغوشده', color: 'status-cancelled' },
  unpaid: { label: 'پرداخت‌نشده', color: 'status-cancelled' },
  partial: { label: 'پرداخت جزئی', color: 'status-shipping' },
  paid: { label: 'پرداخت‌شده', color: 'status-delivered' },
  quote: { label: 'پیش‌فاکتور', color: 'status-quote' },
  draft: { label: 'پیش‌نویس', color: 'status-pending' },
  ordered: { label: 'سفارش داده‌شده', color: 'status-confirmed' },
  received: { label: 'دریافت‌شده', color: 'status-delivered' },
};

const COLOR_STYLES = {
  'status-pending': 'bg-[#8A7A56]/10 text-[#8A7A56]',
  'status-confirmed': 'bg-navy-400/10 text-navy-600',
  'status-processing': 'bg-[#7C5CBF]/10 text-[#7C5CBF]',
  'status-shipping': 'bg-amber-400/10 text-amber-600',
  'status-delivered': 'bg-[#2E7D5B]/10 text-[#2E7D5B]',
  'status-cancelled': 'bg-[#C1443D]/10 text-[#C1443D]',
  'status-quote': 'bg-[#0E7C6B]/10 text-[#0E7C6B]',
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, color: 'status-pending' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_STYLES[config.color]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
