import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { purchaseOrdersApi } from '../api/purchaseOrders';
import { suppliersApi } from '../api/suppliers';
import { productsApi } from '../api/products';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'ordered', label: 'سفارش داده‌شده' },
  { value: 'received', label: 'دریافت‌شده' },
  { value: 'cancelled', label: 'لغوشده' },
];

function ErrorAlert({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 rounded-xl bg-danger/8 px-4 py-2.5 text-sm text-danger">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {msg}
    </p>
  );
}

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_cost: '' }]);

  function load(page = 1) {
    setLoading(true);
    purchaseOrdersApi.getAll({ search, status, page }).then((r) => {
      setPurchaseOrders(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function openCreate() {
    setError(''); setSupplierId(''); setExpectedDate(''); setNotes('');
    setItems([{ product_id: '', quantity: 1, unit_cost: '' }]);
    Promise.all([suppliersApi.getAll({ limit: 100 }), productsApi.getAll({ limit: 100 })]).then(([s, p]) => {
      setSuppliers(s.data.data);
      setProducts(p.data.data.filter((prod) => prod.is_active));
    });
    setModalOpen(true);
  }

  function updateItem(index, field, value) {
    const next = [...items]; next[index] = { ...next[index], [field]: value }; setItems(next);
  }
  function addItemRow() { setItems([...items, { product_id: '', quantity: 1, unit_cost: '' }]); }
  function removeItemRow(index) { setItems(items.filter((_, i) => i !== index)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await purchaseOrdersApi.create({
        supplier_id: supplierId, expected_date: expectedDate || null, notes,
        items: items.filter((it) => it.product_id && it.quantity && it.unit_cost)
          .map((it) => ({ product_id: Number(it.product_id), quantity: Number(it.quantity), unit_cost: Number(it.unit_cost) })),
      });
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت سفارش خرید ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkReceived(id) {
    if (!confirm('این سفارش خرید دریافت‌شده علامت‌گذاری شود؟ موجودی انبار کالاهای آن افزایش می‌یابد.')) return;
    await purchaseOrdersApi.updateStatus(id, 'received'); load(pagination.page);
  }

  return (
    <Layout title="سفارش‌های خرید">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <Input placeholder="جستجوی شماره سفارش خرید..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName="w-44">
            {STATUS_FILTER_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          ثبت سفارش خرید
        </Button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>شماره سفارش</th>
                <th>تامین‌کننده</th>
                <th>مبلغ کل</th>
                <th>وضعیت</th>
                <th className="w-44"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[24, 32, 24, 20, 36].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : purchaseOrders.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="هنوز سفارش خریدی ثبت نشده" description="اولین سفارش خرید را ثبت کنید." action={<Button onClick={openCreate} size="sm">ثبت سفارش خرید</Button>} /></td></tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="tabular font-mono text-xs text-muted">{po.po_number}</td>
                    <td className="font-medium">{po.Supplier?.name || '—'}</td>
                    <td className="tabular">{formatCurrency(po.total_amount)}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>
                      {(po.status === 'draft' || po.status === 'ordered') && (
                        <button
                          onClick={() => handleMarkReceived(po.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-success transition hover:underline"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ثبت دریافت
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت سفارش خرید جدید" width="max-w-2xl" saving={saving}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select label="تامین‌کننده" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">انتخاب تامین‌کننده...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <div>
            <p className="mb-2 text-sm font-medium text-ink/70">اقلام سفارش خرید</p>
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2.5">
                  <div className="flex-1">
                    <Select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} required>
                      <option value="">انتخاب کالا...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input type="number" min="1" placeholder="تعداد" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} required />
                  </div>
                  <div className="w-36">
                    <Input type="number" min="1" placeholder="قیمت خرید واحد" value={item.unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} required />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItemRow(idx)}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:bg-danger/5 hover:text-danger">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItemRow} className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              افزودن قلم دیگر
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="تاریخ تحویل موردانتظار (اختیاری)" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            <Input label="توضیحات (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <ErrorAlert msg={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                در حال ذخیره...
              </span>
            ) : 'ثبت سفارش خرید'}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
