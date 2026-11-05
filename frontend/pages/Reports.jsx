import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Input from '../components/Input';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { reportsApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const STATUS_LABELS_FA = {
  pending:          'در انتظار',
  confirmed:        'تأییدشده',
  processing:       'آماده‌سازی',
  out_for_delivery: 'در مسیر',
  delivered:        'تحویل‌شده',
  cancelled:        'لغوشده',
};

const ROLE_LABELS_FA = { salesperson: 'فروشنده', distributor: 'توزیع‌کننده' };
const CHART_COLORS   = ['#1F4B73', '#E2A63B', '#7C5CBF', '#2E7D5B', '#4A7BA5', '#C0392B'];

export default function Reports() {
  const { user } = useAuth();
  const [sales,     setSales]     = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading,   setLoading]   = useState(true);

  const [commissionFrom,    setCommissionFrom]    = useState('');
  const [commissionTo,      setCommissionTo]      = useState('');
  const [commissions,       setCommissions]       = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  useEffect(() => {
    Promise.all([reportsApi.sales({}), reportsApi.inventory()]).then(([s, inv]) => {
      setSales(s.data);
      setInventory(inv.data);
      setLoading(false);
    });
  }, []);

  function loadCommissions() {
    if (user?.role !== 'admin') return;
    setCommissionsLoading(true);
    reportsApi
      .commissions({ from: commissionFrom || undefined, to: commissionTo || undefined })
      .then((r) => { setCommissions(r.data); setCommissionsLoading(false); });
  }

  useEffect(() => {
    loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <Layout title="گزارش‌ها">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 skeleton h-72 rounded-2xl" />
        <div className="mt-4 skeleton h-64 rounded-2xl" />
      </Layout>
    );
  }

  const chartData = Object.entries(sales.byStatus || {}).map(([status, count]) => ({
    name: STATUS_LABELS_FA[status] || status,
    تعداد: count,
    status,
  }));

  // Top 5 products by revenue from inventory
  const topProducts = [...(inventory.products || [])]
    .sort((a, b) => (b.stock_quantity * b.unit_price) - (a.stock_quantity * a.unit_price))
    .slice(0, 5);

  return (
    <Layout title="گزارش‌ها">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="مجموع فروش"
          value={formatCurrency(sales.totalRevenue)}
          accent="navy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="کل سفارش‌ها"
          value={sales.totalOrders}
          accent="navy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="کالاهای کم‌موجود"
          value={inventory.lowStockCount}
          accent="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label="ارزش موجودی انبار"
          value={formatCurrency(inventory.totalInventoryValue)}
          accent="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>

      {/* ── Charts row ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status distribution chart */}
        <div className="card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">توزیع وضعیت سفارش‌ها</h3>
            <span className="text-xs text-muted">{sales.totalOrders} کل</span>
          </div>
          {chartData.length === 0 ? (
            <EmptyState title="داده‌ای موجود نیست" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
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
          )}
        </div>

        {/* Inventory status table */}
        <div className="card overflow-hidden rounded-2xl">
          <div className="card-header">
            <h3>وضعیت موجودی انبار</h3>
            <span className="text-xs text-muted">
              {inventory.lowStockCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  ⚠ {inventory.lowStockCount} کم‌موجود
                </span>
              )}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>کالا</th>
                  <th>موجودی</th>
                  <th>آستانه</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {inventory.products.slice(0, 8).map((p) => {
                  const isLow = p.stock_quantity <= p.reorder_level;
                  const pct   = p.reorder_level > 0
                    ? Math.min(100, (p.stock_quantity / (p.reorder_level * 3)) * 100)
                    : 100;
                  return (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td className="tabular">{p.stock_quantity}</td>
                      <td className="tabular text-muted">{p.reorder_level}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div
                              className={`progress-bar-fill ${isLow ? 'bg-danger' : 'bg-success'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {isLow && (
                            <span className="text-2xs font-semibold text-danger">کم</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Commission report — admin only ── */}
      {user?.role === 'admin' && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-ink">گزارش پورسانت فروشندگان و توزیع‌کنندگان</h3>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="از تاریخ"
                type="date"
                value={commissionFrom}
                onChange={(e) => setCommissionFrom(e.target.value)}
                wrapperClassName="w-44"
              />
              <Input
                label="تا تاریخ"
                type="date"
                value={commissionTo}
                onChange={(e) => setCommissionTo(e.target.value)}
                wrapperClassName="w-44"
              />
              <Button variant="outline" onClick={loadCommissions} className="mt-auto">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                اعمال فیلتر
              </Button>
            </div>
          </div>

          {commissionsLoading ? (
            <div className="skeleton h-40 rounded-2xl" />
          ) : (
            <div className="card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>نام</th>
                      <th>نقش</th>
                      <th>تعداد سفارش</th>
                      <th>مبلغ کل</th>
                      <th>مبلغ پورسانت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-sm text-muted">
                          داده‌ای برای نمایش وجود ندارد.
                        </td>
                      </tr>
                    ) : (
                      commissions.map((c, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{c.name}</td>
                          <td className="text-muted">
                            {ROLE_LABELS_FA[c.role] || c.role}
                          </td>
                          <td className="tabular">{c.order_count}</td>
                          <td className="tabular">{formatCurrency(c.total_amount)}</td>
                          <td className="tabular font-semibold text-success">
                            {formatCurrency(c.commission_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
