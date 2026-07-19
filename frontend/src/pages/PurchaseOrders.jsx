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
    const timeout = setTimeout(() => load(1), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function openCreate() {
    setError('');
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setItems([{ product_id: '', quantity: 1, unit_cost: '' }]);
    Promise.all([suppliersApi.getAll({ limit: 100 }), productsApi.getAll({ limit: 100 })]).then(([s, p]) => {
      setSuppliers(s.data.data);
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
    setItems([...items, { product_id: '', quantity: 1, unit_cost: '' }]);
  }

  function removeItemRow(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        supplier_id: supplierId,
        expected_date: expectedDate || null,
        notes,
        items: items
          .filter((it) => it.product_id && it.quantity && it.unit_cost)
          .map((it) => ({
            product_id: Number(it.product_id),
            quantity: Number(it.quantity),
            unit_cost: Number(it.unit_cost),
          })),
      };
      await purchaseOrdersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت سفارش خرید ناموفق بود.');
    }
  }

  async function handleMarkReceived(id) {
    if (!confirm('این سفارش خرید دریافت‌شده علامت‌گذاری شود؟ موجودی انبار کالاهای آن افزایش می‌یابد.')) return;
    await purchaseOrdersApi.updateStatus(id, 'received');
    load(pagination.page);
  }

  return (
    <Layout title="سفارش‌های خرید">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="w-64">
            <Input placeholder="جستجوی شماره سفارش خرید..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-52">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <Button onClick={openCreate}>+ ثبت سفارش خرید جدید</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : purchaseOrders.length === 0 ? (
        <EmptyState title="هنوز سفارش خریدی ثبت نشده" description="اولین سفارش خرید را ثبت کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">شماره سفارش خرید</th>
                <th className="px-4 py-3 font-medium">تامین‌کننده</th>
                <th className="px-4 py-3 font-medium">مبلغ</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 tabular">{po.po_number}</td>
                  <td className="px-4 py-3">{po.Supplier?.name || '—'}</td>
                  <td className="px-4 py-3 tabular">{formatCurrency(po.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 text-left">
                    {(po.status === 'draft' || po.status === 'ordered') && (
                      <button onClick={() => handleMarkReceived(po.id)} className="text-navy-600 hover:underline">
                        علامت‌گذاری به‌عنوان دریافت‌شده
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت سفارش خرید جدید" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="تامین‌کننده" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">انتخاب تامین‌کننده...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>

          <div className="space-y-2">
            <span className="text-sm font-medium text-ink/70">اقلام سفارش خرید</span>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} required>
                    <option value="">انتخاب کالا...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-24">
                  <Input type="number" min="1" placeholder="تعداد" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} required />
                </div>
                <div className="w-32">
                  <Input type="number" min="1" placeholder="قیمت خرید واحد" value={item.unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} required />
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

          <div className="grid grid-cols-2 gap-3">
            <Input label="تاریخ تحویل موردانتظار (اختیاری)" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            <Input label="توضیحات (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">ثبت سفارش خرید</Button>
        </form>
      </Modal>
    </Layout>
  );
}
