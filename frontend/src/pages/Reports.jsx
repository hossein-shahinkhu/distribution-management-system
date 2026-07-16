import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { reportsApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const STATUS_LABELS_FA = {
  pending: 'در انتظار',
  confirmed: 'تأییدشده',
  processing: 'آماده‌سازی',
  out_for_delivery: 'در مسیر',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
};

export default function Reports() {
  const { user } = useAuth();
  const [sales, setSales] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  const [commissionFrom, setCommissionFrom] = useState('');
  const [commissionTo, setCommissionTo] = useState('');
  const [commissions, setCommissions] = useState([]);
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
      .then((r) => {
        setCommissions(r.data);
        setCommissionsLoading(false);
      });
  }

  useEffect(() => {
    loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const ROLE_LABELS_FA = { salesperson: 'فروشنده', distributor: 'توزیع‌کننده' };

  if (loading) {
    return (
      <Layout title="گزارش‌ها">
        <p className="text-ink/40">در حال بارگذاری...</p>
      </Layout>
    );
  }

  const chartData = Object.entries(sales.byStatus || {}).map(([status, count]) => ({
    name: STATUS_LABELS_FA[status] || status,
    تعداد: count,
  }));

  return (
    <Layout title="گزارش‌ها">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="مجموع فروش" value={formatCurrency(sales.totalRevenue)} accent="navy" />
        <StatCard label="تعداد کل سفارش‌ها" value={sales.totalOrders} accent="navy" />
        <StatCard label="کالاهای کم‌موجود" value={inventory.lowStockCount} accent="amber" />
        <StatCard label="ارزش کل موجودی انبار" value={formatCurrency(inventory.totalInventoryValue)} accent="green" />
      </div>

      <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-5">
        <h3 className="mb-4 font-bold text-ink">توزیع وضعیت سفارش‌ها</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" />
            <XAxis dataKey="name" tick={{ fontFamily: 'Vazirmatn', fontSize: 12 }} />
            <YAxis tick={{ fontFamily: 'Vazirmatn', fontSize: 12 }} />
            <Tooltip contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl' }} />
            <Bar dataKey="تعداد" fill="#1F4B73" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 font-bold text-ink">وضعیت موجودی انبار</h3>
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">کالا</th>
                <th className="px-4 py-3 font-medium">موجودی</th>
                <th className="px-4 py-3 font-medium">آستانه سفارش مجدد</th>
              </tr>
            </thead>
            <tbody>
              {inventory.products.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-t border-navy-100">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 tabular">
                    <span className={p.stock_quantity <= p.reorder_level ? 'font-semibold text-[#C1443D]' : ''}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular text-ink/50">{p.reorder_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="mt-6">
          <h3 className="mb-3 font-bold text-ink">گزارش پورسانت</h3>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Input label="از تاریخ" type="date" value={commissionFrom} onChange={(e) => setCommissionFrom(e.target.value)} />
            </div>
            <div className="w-48">
              <Input label="تا تاریخ" type="date" value={commissionTo} onChange={(e) => setCommissionTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={loadCommissions}>اعمال فیلتر</Button>
          </div>

          {commissionsLoading ? (
            <p className="text-ink/40">در حال بارگذاری...</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
              <table className="w-full text-right text-sm">
                <thead className="bg-navy-50 text-ink/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">نام</th>
                    <th className="px-4 py-3 font-medium">نقش</th>
                    <th className="px-4 py-3 font-medium">تعداد سفارش</th>
                    <th className="px-4 py-3 font-medium">مبلغ کل</th>
                    <th className="px-4 py-3 font-medium">مبلغ پورسانت</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c, idx) => (
                    <tr key={idx} className="border-t border-navy-100">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-ink/60">{ROLE_LABELS_FA[c.role] || c.role}</td>
                      <td className="px-4 py-3 tabular">{c.order_count}</td>
                      <td className="px-4 py-3 tabular">{formatCurrency(c.total_amount)}</td>
                      <td className="px-4 py-3 tabular font-semibold text-[#2E7D5B]">{formatCurrency(c.commission_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
