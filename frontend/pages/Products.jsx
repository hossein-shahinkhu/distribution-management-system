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

function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 rounded-xl bg-danger/8 px-4 py-2.5 text-sm text-danger">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </p>
  );
}

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
  const [saving, setSaving] = useState(false);

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
    const timeout = setTimeout(() => load(1), 300);
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
    setSaving(true);
    try {
      const payload = { ...form, category_id: form.category_id || null };
      if (editingId) await productsApi.update(editingId, payload);
      else await productsApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('این کالا غیرفعال شود؟')) return;
    await productsApi.remove(id);
    load(pagination.page);
  }

  function f(v) { return setForm((prev) => ({ ...prev, ...v })); }

  return (
    <Layout title="کالاها و انبار">
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="absolute inset-y-0 right-3.5 flex items-center text-muted pointer-events-none">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <Input
            placeholder="جستجوی نام یا کد کالا..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          افزودن کالا
        </Button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>کد کالا</th>
                <th>نام کالا</th>
                <th>دسته‌بندی</th>
                <th>قیمت واحد</th>
                <th>موجودی</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[16, 32, 24, 20, 16, 24].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="هنوز کالایی ثبت نشده"
                      description="برای شروع، اولین کالای خود را اضافه کنید."
                      action={<Button onClick={openCreate} size="sm">افزودن کالای اول</Button>}
                    />
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td className="tabular font-mono text-xs text-muted">{p.sku}</td>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-muted">{p.Category?.name || '—'}</td>
                    <td className="tabular">{new Intl.NumberFormat('fa-IR').format(p.unit_price)} تومان</td>
                    <td className="tabular">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-medium ${p.stock_quantity <= p.reorder_level ? 'text-danger' : 'text-ink'}`}>
                          {p.stock_quantity} {p.unit}
                        </span>
                        <div className="progress-bar w-20">
                          <div
                            className={`progress-bar-fill ${p.stock_quantity <= p.reorder_level ? 'bg-danger' : 'bg-success'}`}
                            style={{
                              width: `${p.reorder_level > 0
                                ? Math.min(100, (p.stock_quantity / (p.reorder_level * 3)) * 100)
                                : 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                        >
                          ویرایش
                        </button>
                        <span className="text-border">|</span>
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          className="text-xs font-medium text-danger transition hover:text-danger/80 hover:underline"
                        >
                          غیرفعال
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش کالا' : 'افزودن کالای جدید'} saving={saving}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">اطلاعات پایه</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input label="کد کالا (SKU)" value={form.sku} onChange={(e) => f({ sku: e.target.value })} required />
              <Input label="نام کالا" value={form.name} onChange={(e) => f({ name: e.target.value })} required />
            </div>
            <Select label="دسته‌بندی" value={form.category_id} onChange={(e) => f({ category_id: e.target.value })}>
              <option value="">بدون دسته‌بندی</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">قیمت و موجودی</legend>
            <div className="grid grid-cols-3 gap-3">
              <Input label="قیمت واحد (تومان)" type="number" value={form.unit_price} onChange={(e) => f({ unit_price: e.target.value })} required />
              <Input label="واحد شمارش" value={form.unit} onChange={(e) => f({ unit: e.target.value })} />
              <Input label="موجودی اولیه" type="number" value={form.stock_quantity} onChange={(e) => f({ stock_quantity: e.target.value })} />
            </div>
            <Input
              label="آستانه سفارش مجدد"
              type="number"
              value={form.reorder_level}
              onChange={(e) => f({ reorder_level: e.target.value })}
              hint="هنگامی که موجودی به این عدد برسد، هشدار نمایش داده می‌شود."
            />
          </fieldset>

          <ErrorAlert message={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                در حال ذخیره...
              </span>
            ) : (editingId ? 'ذخیره تغییرات' : 'ثبت کالا')}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
