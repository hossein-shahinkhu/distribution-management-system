import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { customersApi } from '../api/customers';
import { routesApi } from '../api/misc';

const EMPTY_FORM = { full_name: '', business_name: '', phone: '', address: '', city: '', credit_limit: 0, route_id: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load(page = 1) {
    setLoading(true);
    customersApi.getAll({ search, page }).then((r) => {
      setCustomers(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    });
  }

  useEffect(() => {
    routesApi.getAll().then((r) => setRoutes(r.data));
  }, []);

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

  function openEdit(c) {
    setForm({
      full_name: c.full_name,
      business_name: c.business_name || '',
      phone: c.phone,
      address: c.address || '',
      city: c.city || '',
      credit_limit: c.credit_limit,
      route_id: c.route_id || '',
    });
    setEditingId(c.id);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, route_id: form.route_id || null };
      if (editingId) await customersApi.update(editingId, payload);
      else await customersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('این مشتری حذف شود؟')) return;
    await customersApi.remove(id);
    load(pagination.page);
  }

  return (
    <Layout title="مشتریان">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="w-72">
          <Input placeholder="جستجوی نام، کسب‌وکار یا تلفن..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}>+ افزودن مشتری</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : customers.length === 0 ? (
        <EmptyState title="هنوز مشتری‌ای ثبت نشده" description="اولین مشتری خود را اضافه کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">کسب‌وکار</th>
                <th className="px-4 py-3 font-medium">تماس</th>
                <th className="px-4 py-3 font-medium">شهر</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 text-ink/60">{c.business_name || '—'}</td>
                  <td className="px-4 py-3 tabular text-ink/60">{c.phone}</td>
                  <td className="px-4 py-3 text-ink/60">{c.city || '—'}</td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openEdit(c)} className="ml-3 text-navy-600 hover:underline">ویرایش</button>
                    <button onClick={() => handleDelete(c.id)} className="text-[#C1443D] hover:underline">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش مشتری' : 'افزودن مشتری'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="نام کامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input label="نام کسب‌وکار" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Input label="شهر" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <Input label="آدرس" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Select label="مسیر" value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
            <option value="">بدون مسیر</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          <Input label="سقف اعتبار (تومان)" type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">{editingId ? 'ذخیره تغییرات' : 'ثبت مشتری'}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
