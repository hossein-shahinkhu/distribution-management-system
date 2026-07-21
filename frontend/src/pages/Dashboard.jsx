import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { reportsApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

function SkeletonRows({ count = 5, cols = 4 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="border-b border-border">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className="skeleton h-4" style={{ width: j === 0 ? 96 : j === 1 ? 128 : j === 2 ? 80 : 72 }} />
        </td>
      ))}
    </tr>
  ));
}

const STATUS_LABELS_FA = {
  pending: 'در انتظار',
  confirmed: 'تأیید‌شده',
  processing: 'آماده‌سازی',
  out_for_delivery: 'در مسیر',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
};

const CHART_COLORS = ['#4A7BA5', '#E2A63B', '#7C5CBF', '#2E7D5B', '#1F4B73', '#C0392B'];

/* ── Quick action definition ─────────────────────────────── */
const QUICK_ACTIONS = [
  {
    label: 'سفارش جدید',
    to: '/orders',
    roles: ['admin', 'salesperson'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'مشتریان',
    to: '/customers',
    roles: ['admin', 'salesperson'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'فاکتورها',
    to: '/invoices',
    roles: ['admin', 'salesperson'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'خزانه‌داری',
    to: '/treasury',
    roles: ['admin', 'salesperson'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'کالاها',
    to: '/products',
    roles: ['admin', 'warehouse_keeper'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'گزارش‌ها',
    to: '/reports',
    roles: ['admin', 'salesperson', 'warehouse_keeper'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // آمار کلی از reports API (همه سفارش‌ها، نه فقط ۱۰۰ تا)
  const [salesStats, setSalesStats]   = useState(null);
  // آخرین سفارش‌ها برای جدول (فقط ۱۰ تا آخر)
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock]         = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      reportsApi.sales().then((r) => r.data).catch(() => null),
      ordersApi.getAll({ limit: 10 }).then((r) => r.data.data).catch(() => []),
      user?.role === 'admin' || user?.role === 'warehouse_keeper'
        ? productsApi.lowStock().then((r) => r.data).catch(() => [])
        : Promise.resolve([]),
    ]).then(([stats, recent, ls]) => {
      setSalesStats(stats);
      setRecentOrders(recent);
      setLowStock(ls);
      setLoading(false);
    });
  }, [user]);

  const totalRevenue    = salesStats?.totalRevenue   ?? 0;
  const totalOrders     = salesStats?.totalOrders    ?? 0;
  const pendingCount    = salesStats?.byStatus?.pending ?? 0;
  const deliveredCount  = salesStats?.byStatus?.delivered ?? 0;
  const processingCount = salesStats?.byStatus?.processing ?? 0;

  const chartData = salesStats
    ? Object.entries(salesStats.byStatus || {}).map(([status, count]) => ({
        name: STATUS_LABELS_FA[status] || status,
        تعداد: count,
        status,
      }))
    : [];

  const visibleActions = QUICK_ACTIONS.filter((a) =>
    a.roles.includes(user?.role)
  );

  return (
    <Layout title="داشبورد">
      {/* ── Greeting strip ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">
            خوش آمدید،{' '}
            <span className="text-navy-600">{user?.full_name || ''}</span> 👋
          </h2>
          <p className="mt-1 text-sm text-muted">
            خلاصه‌ای از وضعیت جاری سیستم در زیر نمایش داده شده است.
          </p>
        </div>
        {/* Today at a glance */}
        {!loading && (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white px-5 py-3 text-center shadow-sm">
            <div>
              <p className="text-2xs text-muted">کل</p>
              <p className="text-lg font-bold tabular text-ink">{totalOrders.toLocaleString('fa-IR')}</p>
              <p className="text-2xs text-muted">سفارش</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-2xs text-muted">در انتظار</p>
              <p className="text-lg font-bold tabular text-amber-500">{pendingCount}</p>
              <p className="text-2xs text-muted">سفارش</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-2xs text-muted">تحویل‌شده</p>
              <p className="text-lg font-bold tabular text-success">{deliveredCount}</p>
              <p className="text-2xs text-muted">سفارش</p>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="کل سفارش‌ها"
          value={loading ? '—' : totalOrders.toLocaleString('fa-IR')}
          sublabel={loading ? '' : `${processingCount} در حال پردازش`}
          accent="navy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="در انتظار تأیید"
          value={loading ? '—' : pendingCount.toLocaleString('fa-IR')}
          accent="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="تحویل‌شده"
          value={loading ? '—' : deliveredCount.toLocaleString('fa-IR')}
          accent="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="مجموع فروش"
          value={loading ? '—' : formatCurrency(totalRevenue)}
          accent="navy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Low stock alert ── */}
      {!loading && lowStock.length > 0 && (
        <div className="banner banner-warning mt-5">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">
              {lowStock.length} کالا به آستانه سفارش مجدد رسیده‌اند
            </p>
            <p className="mt-0.5 opacity-80">
              {lowStock.slice(0, 4).map((p) => p.name).join('، ')}
              {lowStock.length > 4 ? ` و ${lowStock.length - 4} مورد دیگر...` : ''}
            </p>
          </div>
          <Link
            to="/products"
            className="mr-auto shrink-0 rounded-lg border border-amber-400/50 px-3 py-1 text-xs font-semibold hover:bg-amber-100 transition"
          >
            مشاهده کالاها
          </Link>
        </div>
      )}

      {/* ── Quick actions ── */}
      {visibleActions.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">دسترسی سریع</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {visibleActions.map((action) => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="quick-action"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* ── Chart ── */}
        <div className="card rounded-2xl p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">توزیع وضعیت سفارش‌ها</h3>
            {!loading && chartData.length > 0 && (
              <span className="text-xs text-muted">{totalOrders.toLocaleString('fa-IR')} سفارش</span>
            )}
          </div>
          {loading ? (
            <div className="skeleton h-48 w-full rounded-xl" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontFamily: 'Vazirmatn', fontSize: 10, fill: '#8896A4' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: 'Vazirmatn', fontSize: 10, fill: '#8896A4' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'Vazirmatn',
                    borderRadius: '10px',
                    border: '1px solid #DDE3EB',
                    fontSize: 12,
                    direction: 'rtl',
                  }}
                  cursor={{ fill: '#EEF3F9' }}
                />
                <Bar dataKey="تعداد" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted">
              داده‌ای موجود نیست
            </div>
          )}
        </div>

        {/* ── Recent orders ── */}
        <div className="card rounded-2xl xl:col-span-3">
          <div className="card-header">
            <h3>آخرین سفارش‌ها</h3>
            <Link
              to="/orders"
              className="flex items-center gap-1 text-xs font-medium text-navy-600 transition hover:text-navy-700"
            >
              مشاهده همه
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>شماره</th>
                  <th>مشتری</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={6} />
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-muted">
                      هنوز سفارشی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link
                          to={`/orders/${o.id}`}
                          className="tabular font-mono text-xs text-navy-600 hover:underline"
                        >
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="font-medium">{o.Customer?.full_name || '—'}</td>
                      <td className="tabular text-sm">{formatCurrency(o.total_amount)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
