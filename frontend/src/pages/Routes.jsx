import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { routesApi } from '../api/misc';

const EMPTY_FORM = { name: '', description: '' };

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    routesApi.getAll().then((r) => {
      setRoutes(r.data);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setModalOpen(true);
  }

  function openEdit(route) {
    setForm({ name: route.name, description: route.description || '' });
    setEditingId(route.id);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) await routesApi.update(editingId, form);
      else await routesApi.create(form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('این مسیر حذف شود؟ مشتریان متصل به آن بدون مسیر خواهند شد.')) return;
    await routesApi.remove(id);
    load();
  }

  return (
    <Layout title="مسیرها">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink/50">
          مسیرها برای گروه‌بندی جغرافیایی مشتریان و بهینه‌سازی مسیر توزیع‌کننده‌ها استفاده می‌شوند.
        </p>
        <Button onClick={openCreate}>+ افزودن مسیر</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : routes.length === 0 ? (
        <EmptyState title="هنوز مسیری ثبت نشده" description="اولین مسیر را اضافه کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">نام مسیر</th>
                <th className="px-4 py-3 font-medium">توضیحات</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-ink/60">{r.description || '—'}</td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openEdit(r)} className="ml-3 text-navy-600 hover:underline">ویرایش</button>
                    <button onClick={() => handleDelete(r.id)} className="text-[#C1443D] hover:underline">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش مسیر' : 'افزودن مسیر'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="نام مسیر" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">{editingId ? 'ذخیره تغییرات' : 'ثبت مسیر'}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
