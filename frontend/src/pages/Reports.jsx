import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { reportsApi } from '../api/misc';

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
  const [sales, setSales] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportsApi.sales({}), reportsApi.inventory()]).then(([s, inv]) => {
      setSales(s.data);
      setInventory(inv.data);
      setLoading(false);
    });
  }, []);

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
    </Layout>
  );
}
