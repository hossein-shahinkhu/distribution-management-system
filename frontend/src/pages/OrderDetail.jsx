import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Select from '../components/Select';
import StatusBadge from '../components/StatusBadge';
import { ordersApi } from '../api/orders';
import { distributorsApi, invoicesApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

/* ── Status workflow ─────────────────────────────────────── */
const STATUS_LABELS = {
  pending:          'در انتظار تأیید',
  confirmed:        'تأییدشده',
  processing:       'در حال آماده‌سازی',
  out_for_delivery: 'در مسیر تحویل',
  delivered:        'تحویل‌شده',
  cancelled:        'لغوشده',
};

// آینه state machine بک‌اند — گزینه‌های مجاز برای هر وضعیت فعلی
const ALLOWED_NEXT = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['processing', 'cancelled'],
  processing:       ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered:        [],
  cancelled:        [],
  quote:            [],
};

// Ordered pipeline (cancelled is not in the stepper flow)
const STATUS_PIPELINE = [
  { key: 'pending',          short: 'در انتظار',   icon: '⏳' },
  { key: 'confirmed',        short: 'تأیید‌شده',   icon: '✓' },
  { key: 'processing',       short: 'آماده‌سازی',  icon: '⚙' },
  { key: 'out_for_delivery', short: 'در مسیر',     icon: '🚚' },
  { key: 'delivered',        short: 'تحویل‌شده',   icon: '✅' },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 text-sm border-b border-border last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value || '—'}</span>
    </div>
  );
}

/* ── Timeline Stepper component ──────────────────────────── */
function StatusStepper({ currentStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="banner banner-error mb-5">
        <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        این سفارش لغو شده است.
      </div>
    );
  }

  const currentIndex = STATUS_PIPELINE.findIndex((s) => s.key === currentStatus);

  return (
    <div className="card rounded-2xl p-5 mb-5">
      <h3 className="mb-4 text-sm font-bold text-ink">پیشرفت سفارش</h3>
      <div className="stepper">
        {STATUS_PIPELINE.map((step, idx) => {
          const isDone   = idx < currentIndex;
          const isActive = idx === currentIndex;
          const stateClass = isDone ? 'done' : isActive ? 'active' : 'pending';

          return (
            <div key={step.key} className={`stepper-item ${stateClass}`}>
              <div className={`stepper-circle ${stateClass}`}>
                {isDone ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className={`stepper-label ${stateClass}`}>{step.short}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(true);

  function load() {
    ordersApi.getOne(id).then((r) => {
      setOrder(r.data);
      setSelectedDistributor(r.data.distributor_id || '');
      setLoading(false);
    });
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (user?.role === 'admin') {
      distributorsApi.getAll().then((r) => setDistributors(r.data));
    }
  }, [user]);

  async function handleStatusChange(status) {
    if (!status || status === order.status) return;
    try {
      await ordersApi.updateStatus(id, status);
      setMessage('وضعیت سفارش به‌روزرسانی شد.');
      setMessageType('success');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'به‌روزرسانی وضعیت ناموفق بود.');
      setMessageType('error');
    }
  }

  async function handleAssignDistributor() {
    if (!selectedDistributor) return;
    await ordersApi.assignDistributor(id, Number(selectedDistributor));
    setMessage('توزیع‌کننده با موفقیت تخصیص یافت.');
    setMessageType('success');
    load();
  }

  async function handleCreateInvoice() {
    try {
      await invoicesApi.createFromOrder(order.id);
      setMessage('فاکتور با موفقیت صادر شد.');
      setMessageType('success');
    } catch (err) {
      setMessage(err.response?.data?.message || 'صدور فاکتور ناموفق بود.');
      setMessageType('error');
    }
  }

  async function handleConvertToOrder() {
    try {
      await ordersApi.convertToOrder(order.id);
      setMessage('پیش‌فاکتور با موفقیت به سفارش قطعی تبدیل شد.');
      setMessageType('success');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'تبدیل به سفارش قطعی ناموفق بود.');
      setMessageType('error');
    }
  }

  const pageTitle = loading ? 'جزئیات سفارش' : `سفارش ${order?.order_number}`;

  if (loading) {
    return (
      <Layout title="جزئیات سفارش">
        <div className="space-y-4">
          {[80, 200, 140, 160].map((h, i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height: h }} />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle}>
      {/* ── Back link ── */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          بازگشت به سفارش‌ها
        </Link>
        {/* Quote badge */}
        {order.is_quote && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            پیش‌فاکتور
          </span>
        )}
      </div>

      {/* ── Status feedback banner ── */}
      {message && (
        <div className={`banner mb-5 ${messageType === 'success' ? 'banner-success' : 'banner-error'}`}>
          {messageType === 'success' ? (
            <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message}
        </div>
      )}

      {/* ── Status pipeline stepper ── */}
      <StatusStepper currentStatus={order.status} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Main content ── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Order items */}
          <div className="card overflow-hidden rounded-2xl">
            <div className="card-header">
              <h3>اقلام سفارش</h3>
              <StatusBadge status={order.status} />
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>کالا</th>
                    <th>تعداد</th>
                    <th>قیمت واحد</th>
                    <th>جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.Product?.name}</td>
                      <td className="tabular">{item.quantity}</td>
                      <td className="tabular">{formatCurrency(item.unit_price)}</td>
                      <td className="tabular font-semibold">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Total row */}
            <div className="flex items-center justify-between border-t border-border bg-navy-50/50 px-5 py-4">
              <span className="text-sm font-medium text-muted">مجموع کل سفارش</span>
              <span className="tabular text-base font-bold text-ink">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {/* Customer info */}
          <div className="card rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600">
                {order.Customer?.full_name?.charAt(0) || '؟'}
              </div>
              <h3 className="font-bold text-ink">اطلاعات مشتری</h3>
            </div>
            <InfoRow label="نام" value={order.Customer?.full_name} />
            <InfoRow label="تلفن" value={order.Customer?.phone} />
            <InfoRow label="آدرس" value={order.Customer?.address} />
            {order.Customer?.city && <InfoRow label="شهر" value={order.Customer?.city} />}
            {order.Route && <InfoRow label="مسیر" value={order.Route?.name} />}
          </div>

          {/* Delivery info */}
          {order.Distributor && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-3 font-bold text-ink">اطلاعات توزیع‌کننده</h3>
              <InfoRow label="نام" value={order.Distributor?.full_name} />
              <InfoRow label="تماس" value={order.Distributor?.phone} />
              <InfoRow label="پلاک خودرو" value={order.Distributor?.vehicle_plate} />
            </div>
          )}
        </div>

        {/* ── Sidebar actions ── */}
        <div className="space-y-4">
          {/* Quote conversion */}
          {order.is_quote && (
            <div className="card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-ink">پیش‌فاکتور</h3>
              </div>
              <p className="mb-4 text-sm text-muted">
                موجودی انبار برای این پیش‌فاکتور هنوز کسر نشده است.
              </p>
              <Button className="w-full" onClick={handleConvertToOrder}>
                تبدیل به سفارش قطعی
              </Button>
            </div>
          )}

          {/* Status change */}
          {(() => {
            const allowed = ALLOWED_NEXT[order.status] ?? [];
            // توزیع‌کننده فقط delivered می‌تواند انتخاب کند
            const roleFiltered = user?.role === 'distributor'
              ? allowed.filter((s) => s === 'delivered')
              : allowed;
            if (roleFiltered.length === 0) return null;
            return (
              <div className="card rounded-2xl p-5">
                <h3 className="mb-3 font-bold text-ink">تغییر وضعیت</h3>
                <div className="flex flex-col gap-2">
                  {roleFiltered.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition text-right
                        ${s === 'cancelled'
                          ? 'border-danger/30 bg-danger/5 text-danger hover:bg-danger/10'
                          : 'border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100'}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  فقط گزینه‌های مجاز از وضعیت فعلی نمایش داده می‌شوند.
                </p>
              </div>
            );
          })()}

          {/* Distributor assignment */}
          {user?.role === 'admin' && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-3 font-bold text-ink">تخصیص توزیع‌کننده</h3>
              <Select
                value={selectedDistributor}
                onChange={(e) => setSelectedDistributor(e.target.value)}
              >
                <option value="">انتخاب توزیع‌کننده...</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — {d.vehicle_plate || 'بدون پلاک'}
                  </option>
                ))}
              </Select>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={handleAssignDistributor}
                disabled={!selectedDistributor}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                تخصیص
              </Button>
            </div>
          )}

          {/* Invoice creation */}
          {(user?.role === 'admin' || user?.role === 'salesperson') && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-2 font-bold text-ink">صدور فاکتور</h3>
              <p className="mb-4 text-sm text-muted">
                فاکتور رسمی برای این سفارش صادر کنید.
              </p>
              <Button className="w-full" variant="amber" onClick={handleCreateInvoice}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                صدور فاکتور
              </Button>
            </div>
          )}

          {/* Order meta */}
          <div className="card rounded-2xl p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">اطلاعات سفارش</h3>
            <InfoRow label="شماره سفارش" value={order.order_number} />
            <InfoRow
              label="تاریخ ثبت"
              value={order.created_at
                ? new Date(order.created_at).toLocaleDateString('fa-IR')
                : '—'}
            />
            {order.salesperson_name && (
              <InfoRow label="فروشنده" value={order.salesperson_name} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
