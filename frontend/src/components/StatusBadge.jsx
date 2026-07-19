const STATUS_MAP = {
  pending:          { label: 'در انتظار تأیید',    color: 'pending' },
  confirmed:        { label: 'تأییدشده',            color: 'confirmed' },
  processing:       { label: 'در حال آماده‌سازی',  color: 'processing' },
  out_for_delivery: { label: 'در مسیر تحویل',       color: 'shipping' },
  delivered:        { label: 'تحویل‌شده',           color: 'delivered' },
  cancelled:        { label: 'لغوشده',              color: 'cancelled' },
  unpaid:           { label: 'پرداخت‌نشده',         color: 'cancelled' },
  partial:          { label: 'پرداخت جزئی',         color: 'shipping' },
  paid:             { label: 'پرداخت‌شده',          color: 'delivered' },
  quote:            { label: 'پیش‌فاکتور',          color: 'quote' },
  draft:            { label: 'پیش‌نویس',            color: 'pending' },
  ordered:          { label: 'سفارش داده‌شده',      color: 'confirmed' },
  received:         { label: 'دریافت‌شده',          color: 'delivered' },
};

const COLOR_CLASSES = {
  pending:    'bg-[#92805A]/10 text-[#6b5e40]',
  confirmed:  'bg-navy-400/10 text-navy-600',
  processing: 'bg-[#7C5CBF]/10 text-[#6045a8]',
  shipping:   'bg-amber-400/10 text-amber-600',
  delivered:  'bg-success/10 text-success',
  cancelled:  'bg-danger/10 text-danger',
  quote:      'bg-[#0E7C6B]/10 text-[#0E7C6B]',
};

const DOT_CLASSES = {
  pending:    'bg-[#92805A]',
  confirmed:  'bg-navy-500',
  processing: 'bg-[#7C5CBF]',
  shipping:   'bg-amber-500',
  delivered:  'bg-success',
  cancelled:  'bg-danger',
  quote:      'bg-[#0E7C6B]',
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, color: 'pending' };
  const colorCls = COLOR_CLASSES[config.color] || COLOR_CLASSES.pending;
  const dotCls   = DOT_CLASSES[config.color]   || DOT_CLASSES.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colorCls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      {config.label}
    </span>
  );
}
