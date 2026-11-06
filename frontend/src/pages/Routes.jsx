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
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    routesApi.getAll().then((r) => { setRoutes(r.data); setLoading(false); });
  }

  useEffect(load, []);

  function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setError(''); setModalOpen(true); }
  function openEdit(r) { setForm({ name: r.name, description: r.description || '' }); setEditingId(r.id); setError(''); setModalOpen(true); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) await routesApi.update(editingId, form);
      else await routesApi.create(form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('این مسیر حذف شود؟ مشتریان متصل به آن بدون مسیر خواهند شد.')) return;
    await routesApi.remove(id); load();
  }

  return (
    <Layout title="مسیرها">
      <div className="mb-5 flex items-start justify-between gap-4">
        <p className="text-sm text-muted">مسیرها برای گروه‌بندی جغرافیایی مشتریان و بهینه‌سازی مسیر توزیع‌کننده‌ها استفاده می‌شوند.</p>
        <Button onClick={openCreate} className="shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          افزودن مسیر
        </Button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام مسیر</th>
                <th>توضیحات</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[28, 48, 16].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : routes.length === 0 ? (
                <tr><td colSpan={3}><EmptyState title="هنوز مسیری ثبت نشده" description="اولین مسیر را اضافه کنید." action={<Button onClick={openCreate} size="sm">افزودن مسیر</Button>} /></td></tr>
              ) : (
                routes.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td className="text-muted">{r.description || '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="text-xs font-medium text-navy-600 hover:underline">ویرایش</button>
                        <span className="text-border">|</span>
                        <button onClick={() => handleDelete(r.id)} className="text-xs font-medium text-danger hover:underline">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش مسیر' : 'افزودن مسیر'} saving={saving}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="نام مسیر" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input label="توضیحات" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          {error && (
            <div className="banner banner-error">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                در حال ذخیره...
              </span>
            ) : (editingId ? 'ذخیره تغییرات' : 'ثبت مسیر')}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
