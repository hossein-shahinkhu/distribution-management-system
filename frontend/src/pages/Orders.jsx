import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { ordersApi } from '../api/orders';
import { customersApi } from '../api/customers';
import { productsApi } from '../api/products';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'pending', label: 'در انتظار تأیید' },
  { value: 'confirmed', label: 'تأییدشده' },
  { value: 'processing', label: 'در حال آماده‌سازی' },
  { value: 'out_for_delivery', label: 'در مسیر تحویل' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغوشده' },
];

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

  const canCreate = user?.role === 'admin' || user?.role === 'salesperson';

  function load(page = 1) {
    setLoading(true);
    ordersApi.getAll({ search, status, page }).then((r) => {
      setOrders(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(1), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function openCreate() {
    setError('');
    setCustomerId('');
    setItems([{ product_id: '', quantity: 1 }]);
    Promise.all([customersApi.getAll({ limit: 100 }), productsApi.getAll({ limit: 100 })]).then(([c, p]) => {
      setCustomers(c.data.data);
      setProducts(p.data.data.filter((prod) => prod.is_active));
    });
    setModalOpen(true);
  }

  function updateItem(index, field, value) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function addItemRow() {
    setItems([...items, { product_id: '', quantity: 1 }]);
  }

  function removeItemRow(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        customer_id: customerId,
        items: items
          .filter((it) => it.product_id && it.quantity)
          .map((it) => ({ product_id: Number(it.product_id), quantity: Number(it.quantity) })),
      };
      await ordersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت سفارش ناموفق بود.');
    }
  }

  return (
    <Layout title="سفارش‌ها">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="w-64">
            <Input placeholder="جستجوی شماره سفارش..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-52">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>
        {canCreate && <Button onClick={openCreate}>+ ثبت سفارش جدید</Button>}
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : orders.length === 0 ? (
        <EmptyState title="هنوز سفارشی ثبت نشده" description="اولین سفارش را ثبت کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">شماره سفارش</th>
                <th className="px-4 py-3 font-medium">مشتری</th>
                <th className="px-4 py-3 font-medium">مبلغ</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 tabular">{o.order_number}</td>
                  <td className="px-4 py-3">{o.Customer?.full_name || '—'}</td>
                  <td className="px-4 py-3 tabular">{formatCurrency(o.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-left">
                    <Link to={`/orders/${o.id}`} className="text-navy-600 hover:underline">جزئیات</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت سفارش جدید" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="مشتری" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">انتخاب مشتری...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name} {c.business_name ? `— ${c.business_name}` : ''}</option>
            ))}
          </Select>

          <div className="space-y-2">
            <span className="text-sm font-medium text-ink/70">اقلام سفارش</span>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} required>
                    <option value="">انتخاب کالا...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (موجودی: {p.stock_quantity})</option>
                    ))}
                  </Select>
                </div>
                <div className="w-28">
                  <Input type="number" min="1" placeholder="تعداد" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} required />
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(idx)} className="mb-2.5 text-[#C1443D]">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItemRow} className="text-sm text-navy-600 hover:underline">
              + افزودن قلم دیگر
            </button>
          </div>

          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">ثبت سفارش</Button>
        </form>
      </Modal>
    </Layout>
  );
}
