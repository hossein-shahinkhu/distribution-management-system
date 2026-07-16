import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Select from '../components/Select';
import StatusBadge from '../components/StatusBadge';
import { ordersApi } from '../api/orders';
import { distributorsApi } from '../api/misc';
import { invoicesApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'در انتظار تأیید' },
  { value: 'confirmed', label: 'تأییدشده' },
  { value: 'processing', label: 'در حال آماده‌سازی' },
  { value: 'out_for_delivery', label: 'در مسیر تحویل' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغوشده' },
];

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState('');
  const [message, setMessage] = useState('');
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
    await ordersApi.updateStatus(id, status);
    setMessage('وضعیت سفارش به‌روزرسانی شد.');
    load();
  }

  async function handleAssignDistributor() {
    if (!selectedDistributor) return;
    await ordersApi.assignDistributor(id, Number(selectedDistributor));
    setMessage('توزیع‌کننده با موفقیت تخصیص یافت.');
    load();
  }

  async function handleCreateInvoice() {
    try {
      await invoicesApi.createFromOrder(order.id);
      setMessage('فاکتور با موفقیت صادر شد.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'صدور فاکتور ناموفق بود.');
    }
  }

  if (loading || !order) {
    return (
      <Layout title="جزئیات سفارش">
        <p className="text-ink/40">در حال بارگذاری...</p>
      </Layout>
    );
  }

  return (
    <Layout title={`سفارش ${order.order_number}`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-navy-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-ink">اقلام سفارش</h3>
              <StatusBadge status={order.status} />
            </div>
            <table className="w-full text-right text-sm">
              <thead className="text-ink/50">
                <tr>
                  <th className="pb-2 font-medium">کالا</th>
                  <th className="pb-2 font-medium">تعداد</th>
                  <th className="pb-2 font-medium">قیمت واحد</th>
                  <th className="pb-2 font-medium">جمع</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id} className="border-t border-navy-100">
                    <td className="py-2">{item.Product?.name}</td>
                    <td className="py-2 tabular">{item.quantity}</td>
                    <td className="py-2 tabular">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 tabular">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end border-t border-navy-100 pt-3">
              <p className="font-bold text-ink">مجموع: {formatCurrency(order.total_amount)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-5">
            <h3 className="mb-3 font-bold text-ink">اطلاعات مشتری</h3>
            <p className="text-sm text-ink/70">{order.Customer?.full_name}</p>
            <p className="text-sm text-ink/50">{order.Customer?.phone}</p>
            <p className="text-sm text-ink/50">{order.Customer?.address}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-navy-100 bg-white p-5">
            <h3 className="mb-3 font-bold text-ink">تغییر وضعیت سفارش</h3>
            <Select value={order.status} onChange={(e) => handleStatusChange(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>

          {user?.role === 'admin' && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5">
              <h3 className="mb-3 font-bold text-ink">تخصیص توزیع‌کننده</h3>
              <Select value={selectedDistributor} onChange={(e) => setSelectedDistributor(e.target.value)}>
                <option value="">انتخاب کنید...</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name} — {d.vehicle_plate || 'بدون پلاک'}</option>
                ))}
              </Select>
              <Button className="mt-3 w-full" variant="outline" onClick={handleAssignDistributor}>
                تخصیص
              </Button>
            </div>
          )}

          {(user?.role === 'admin' || user?.role === 'salesperson') && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5">
              <h3 className="mb-3 font-bold text-ink">فاکتور</h3>
              <Button className="w-full" variant="amber" onClick={handleCreateInvoice}>
                صدور فاکتور برای این سفارش
              </Button>
            </div>
          )}

          {message && <p className="text-sm text-navy-600">{message}</p>}
        </div>
      </div>
    </Layout>
  );
}
