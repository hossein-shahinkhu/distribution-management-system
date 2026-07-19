import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { suppliersApi } from '../api/suppliers';

const EMPTY_FORM = { name: '', contact_person: '', phone: '', address: '', tax_id: '', payment_terms_days: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load(page = 1) {
    setLoading(true);
    suppliersApi.getAll({ search, page }).then((r) => {
      setSuppliers(r.data.data);
      setPagination(r.data.pagination);
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

  function openEdit(s) {
    setForm({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone,
      address: s.address || '',
      tax_id: s.tax_id || '',
      payment_terms_days: s.payment_terms_days || '',
    });
    setEditingId(s.id);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, payment_terms_days: form.payment_terms_days || null };
      if (editingId) await suppliersApi.update(editingId, payload);
      else await suppliersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('این تامین‌کننده غیرفعال شود؟')) return;
    await suppliersApi.remove(id);
    load(pagination.page);
  }

  return (
    <Layout title="تامین‌کنندگان">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="w-72">
          <Input placeholder="جستجوی نام، مسئول یا تلفن..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}>+ افزودن تامین‌کننده</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : suppliers.length === 0 ? (
        <EmptyState title="هنوز تامین‌کننده‌ای ثبت نشده" description="اولین تامین‌کننده خود را اضافه کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">مسئول ارتباط</th>
                <th className="px-4 py-3 font-medium">تماس</th>
                <th className="px-4 py-3 font-medium">مهلت پرداخت (روز)</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-ink/60">{s.contact_person || '—'}</td>
                  <td className="px-4 py-3 tabular text-ink/60">{s.phone}</td>
                  <td className="px-4 py-3 tabular text-ink/60">{s.payment_terms_days ?? '—'}</td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openEdit(s)} className="ml-3 text-navy-600 hover:underline">ویرایش</button>
                    <button onClick={() => handleDeactivate(s.id)} className="text-[#C1443D] hover:underline">غیرفعال کردن</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش تامین‌کننده' : 'افزودن تامین‌کننده'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="نام تامین‌کننده" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="مسئول ارتباط" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Input label="شناسه/کد اقتصادی" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          </div>
          <Input label="آدرس" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input
            label="مهلت پرداخت (روز)"
            type="number"
            min="0"
            value={form.payment_terms_days}
            onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
          />
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">{editingId ? 'ذخیره تغییرات' : 'ثبت تامین‌کننده'}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
