import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { productsApi, categoriesApi } from '../api/products';

const EMPTY_FORM = { sku: '', name: '', category_id: '', unit_price: '', unit: 'عدد', stock_quantity: '', reorder_level: 10 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load(page = 1) {
    setLoading(true);
    Promise.all([productsApi.getAll({ search, page }), categoriesApi.getAll()]).then(([p, c]) => {
      setProducts(p.data.data);
      setPagination(p.data.pagination);
      setCategories(c.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(1), 300); // debounce جستجو
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setModalOpen(true);
  }

  function openEdit(product) {
    setForm({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id || '',
      unit_price: product.unit_price,
      unit: product.unit,
      stock_quantity: product.stock_quantity,
      reorder_level: product.reorder_level,
    });
    setEditingId(product.id);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, category_id: form.category_id || null };
      if (editingId) {
        await productsApi.update(editingId, payload);
      } else {
        await productsApi.create(payload);
      }
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('این کالا غیرفعال شود؟')) return;
    await productsApi.remove(id);
    load(pagination.page);
  }

  return (
    <Layout title="کالاها و انبار">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="w-72">
          <Input placeholder="جستجوی نام یا کد کالا..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}>+ افزودن کالای جدید</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : products.length === 0 ? (
        <EmptyState title="هنوز کالایی ثبت نشده" description="برای شروع، اولین کالای خود را اضافه کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">کد کالا</th>
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">دسته‌بندی</th>
                <th className="px-4 py-3 font-medium">قیمت واحد</th>
                <th className="px-4 py-3 font-medium">موجودی</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 tabular text-ink/60">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-ink/60">{p.Category?.name || '—'}</td>
                  <td className="px-4 py-3 tabular">{new Intl.NumberFormat('fa-IR').format(p.unit_price)}</td>
                  <td className="px-4 py-3 tabular">
                    <span className={p.stock_quantity <= p.reorder_level ? 'font-semibold text-[#C1443D]' : ''}>
                      {p.stock_quantity} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openEdit(p)} className="ml-3 text-navy-600 hover:underline">
                      ویرایش
                    </button>
                    <button onClick={() => handleDeactivate(p.id)} className="text-[#C1443D] hover:underline">
                      غیرفعال کردن
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش کالا' : 'افزودن کالای جدید'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="کد کالا (SKU)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            <Input label="نام کالا" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <Select label="دسته‌بندی" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">بدون دسته‌بندی</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label="قیمت واحد (تومان)" type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required />
            <Input label="واحد شمارش" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Input label="موجودی اولیه" type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
          </div>
          <Input label="آستانه سفارش مجدد" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">{editingId ? 'ذخیره تغییرات' : 'ثبت کالا'}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
