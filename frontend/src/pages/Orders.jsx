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
import { routesApi } from '../api/misc';
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

function Skeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-border">
      {[28, 36, 32, 20, 8].map((w, j) => (
        <td key={j} className="px-4 py-4">
          <div className={`skeleton h-4 w-${w}`} style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  ));
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [routeId, setRouteId] = useState('');
  const [routes, setRoutes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [isQuote, setIsQuote] = useState(false);

  const canCreate = user?.role === 'admin' || user?.role === 'salesperson';

  function load(page = 1) {
    setLoading(true);
    ordersApi.getAll({ search, status, route_id: routeId, page }).then((r) => {
      setOrders(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(1), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, routeId]);

  useEffect(() => {
    routesApi.getAll().then((r) => setRoutes(r.data));
  }, []);

  function openCreate() {
    setError('');
    setCustomerId('');
    setItems([{ product_id: '', quantity: 1 }]);
    setIsQuote(false);
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

  function addItemRow() { setItems([...items, { product_id: '', quantity: 1 }]); }
  function removeItemRow(index) { setItems(items.filter((_, i) => i !== index)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        customer_id: customerId,
        items: items
          .filter((it) => it.product_id && it.quantity)
          .map((it) => ({ product_id: Number(it.product_id), quantity: Number(it.quantity) })),
        is_quote: isQuote,
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
      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="absolute inset-y-0 right-3.5 flex items-center text-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <Input
              placeholder="جستجوی شماره سفارش..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName="w-44">
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          {routes.length > 0 && (
            <Select value={routeId} onChange={(e) => setRouteId(e.target.value)} wrapperClassName="w-40">
              <option value="">همه مسیرها</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          )}
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            ثبت سفارش جدید
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>شماره سفارش</th>
                <th>مشتری</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <Skeleton />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="هنوز سفارشی ثبت نشده" description="اولین سفارش را ثبت کنید." />
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="tabular font-mono text-xs text-muted">{o.order_number}</td>
                    <td className="font-medium">{o.Customer?.full_name || '—'}</td>
                    <td className="tabular">{formatCurrency(o.total_amount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      <Link
                        to={`/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                      >
                        جزئیات
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      {/* ── Create modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت سفارش جدید" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select label="مشتری" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">انتخاب مشتری...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.business_name ? ` — ${c.business_name}` : ''}
              </option>
            ))}
          </Select>

          <div>
            <p className="mb-2 text-sm font-medium text-ink/70">اقلام سفارش</p>
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2.5">
                  <div className="flex-1">
                    <Select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} required>
                      <option value="">انتخاب کالا...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (موجودی: {p.stock_quantity})</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min="1"
                      placeholder="تعداد"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
                      aria-label="حذف قلم"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-navy-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              افزودن قلم دیگر
            </button>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 py-3 transition hover:bg-navy-50">
            <input
              type="checkbox"
              checked={isQuote}
              onChange={(e) => setIsQuote(e.target.checked)}
              className="h-4 w-4 rounded accent-navy-600"
            />
            <span className="text-sm text-ink/80">این یک پیش‌فاکتور است (بدون کسر موجودی)</span>
          </label>

          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-danger/8 px-4 py-2.5 text-sm text-danger">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
          <Button type="submit" className="w-full">ثبت سفارش</Button>
        </form>
      </Modal>
    </Layout>
  );
}
