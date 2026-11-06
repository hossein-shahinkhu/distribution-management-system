import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { suppliersApi } from '../api/suppliers';

const EMPTY_FORM = { name: '', contact_person: '', phone: '', address: '', tax_id: '', payment_terms_days: '' };

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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load(page = 1) {
    setLoading(true);
    suppliersApi.getAll({ search, page }).then((r) => {
      setSuppliers(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    });
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setError(''); setModalOpen(true); }

  function openEdit(s) {
    setForm({
      name: s.name, contact_person: s.contact_person || '', phone: s.phone,
      address: s.address || '', tax_id: s.tax_id || '', payment_terms_days: s.payment_terms_days || '',
    });
    setEditingId(s.id); setError(''); setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, payment_terms_days: form.payment_terms_days || null };
      if (editingId) await suppliersApi.update(editingId, payload);
      else await suppliersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('این تامین‌کننده غیرفعال شود؟')) return;
    await suppliersApi.remove(id); load(pagination.page);
  }

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  return (
    <Layout title="تامین‌کنندگان">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <Input placeholder="جستجوی نام، مسئول یا تلفن..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          افزودن تامین‌کننده
        </Button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام شرکت</th>
                <th>مسئول ارتباط</th>
                <th>تماس</th>
                <th>مهلت پرداخت (روز)</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[32, 28, 24, 16, 20].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="هنوز تامین‌کننده‌ای ثبت نشده" description="اولین تامین‌کننده خود را اضافه کنید." action={<Button onClick={openCreate} size="sm">افزودن تامین‌کننده</Button>} /></td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name}</td>
                    <td className="text-muted">{s.contact_person || '—'}</td>
                    <td className="tabular text-muted">{s.phone}</td>
                    <td className="tabular text-muted">{s.payment_terms_days ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="text-xs font-medium text-navy-600 hover:underline">ویرایش</button>
                        <span className="text-border">|</span>
                        <Link to={`/suppliers/${s.id}/statement`} className="text-xs font-medium text-[#7C5CBF] hover:underline">گردش مالی</Link>
                        <span className="text-border">|</span>
                        <button onClick={() => handleDeactivate(s.id)} className="text-xs font-medium text-danger hover:underline">غیرفعال</button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش تامین‌کننده' : 'افزودن تامین‌کننده'} saving={saving}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">اطلاعات شرکت</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input label="نام تامین‌کننده" value={form.name} onChange={(e) => f({ name: e.target.value })} required />
              <Input label="مسئول ارتباط" value={form.contact_person} onChange={(e) => f({ contact_person: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="شماره تماس" value={form.phone} onChange={(e) => f({ phone: e.target.value })} required />
              <Input label="شناسه / کد اقتصادی" value={form.tax_id} onChange={(e) => f({ tax_id: e.target.value })} />
            </div>
            <Input label="آدرس" value={form.address} onChange={(e) => f({ address: e.target.value })} />
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">شرایط تجاری</legend>
            <Input label="مهلت پرداخت (روز)" type="number" min="0" value={form.payment_terms_days} onChange={(e) => f({ payment_terms_days: e.target.value })} />
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
            ) : (editingId ? 'ذخیره تغییرات' : 'ثبت تامین‌کننده')}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
