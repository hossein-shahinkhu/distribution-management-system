import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersApi.getAll({ limit: 100 }).then((r) => r.data.data).catch(() => []),
      user?.role === 'admin' || user?.role === 'warehouse_keeper'
        ? productsApi.lowStock().then((r) => r.data).catch(() => [])
        : Promise.resolve([]),
    ]).then(([o, ls]) => {
      setOrders(o);
      setLowStock(ls);
      setLoading(false);
    });
  }, [user]);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <Layout title={`خوش آمدید، ${user?.full_name || ''}`}>
      {loading ? (
        <p className="text-ink/40">در حال بارگذاری اطلاعات...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="تعداد کل سفارش‌ها" value={orders.length} accent="navy" />
            <StatCard label="در انتظار تأیید" value={pendingCount} accent="amber" />
            <StatCard label="تحویل‌شده" value={deliveredCount} accent="green" />
            <StatCard label="مجموع فروش" value={formatCurrency(totalRevenue)} accent="navy" />
          </div>

          {lowStock.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-100/40 p-4">
              <p className="font-semibold text-amber-600">
                ⚠ {lowStock.length} کالا به آستانه سفارش مجدد رسیده‌اند
              </p>
              <p className="mt-1 text-sm text-ink/60">
                {lowStock.slice(0, 4).map((p) => p.name).join('، ')}
                {lowStock.length > 4 ? ' و موارد دیگر...' : ''}
              </p>
            </div>
          )}

          <div className="mt-8">
            <h3 className="mb-3 text-base font-bold text-ink">آخرین سفارش‌ها</h3>
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
              <table className="w-full text-right text-sm">
                <thead className="bg-navy-50 text-ink/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">شماره سفارش</th>
                    <th className="px-4 py-3 font-medium">مشتری</th>
                    <th className="px-4 py-3 font-medium">مبلغ</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="border-t border-navy-100">
                      <td className="px-4 py-3 tabular">{o.order_number}</td>
                      <td className="px-4 py-3">{o.Customer?.full_name || '—'}</td>
                      <td className="px-4 py-3 tabular">{formatCurrency(o.total_amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-ink/40">
                        هنوز سفارشی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
