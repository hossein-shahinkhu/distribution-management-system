import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { usersApi } from '../api/users';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'مدیر سیستم' },
  { value: 'warehouse_keeper', label: 'انباردار' },
  { value: 'salesperson', label: 'فروشنده' },
  { value: 'distributor', label: 'توزیع‌کننده' },
];

const EMPTY_FORM = { full_name: '', email: '', password: '', phone: '', role_name: 'salesperson' };
const EMPTY_EDIT_FORM = { full_name: '', phone: '', role_name: '', is_active: true, commission_rate: 0 };

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

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    setLoading(true);
    usersApi.getAll().then((r) => { setUsers(r.data); setLoading(false); });
  }

  useEffect(load, []);

  function openCreate() { setForm(EMPTY_FORM); setError(''); setSuccess(''); setModalOpen(true); }

  function openEdit(u) {
    setEditForm({ full_name: u.full_name, phone: u.phone || '', role_name: u.Role?.name || 'salesperson', is_active: u.is_active, commission_rate: u.commission_rate || 0 });
    setEditingId(u.id); setError(''); setEditModalOpen(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault(); setError('');
    try { await usersApi.update(editingId, editForm); setEditModalOpen(false); load(); }
    catch (err) { setError(err.response?.data?.message || 'ویرایش کاربر ناموفق بود.'); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    try {
      await usersApi.register(form);
      setModalOpen(false);
      setSuccess(`کاربر «${form.full_name}» با موفقیت ساخته شد.`);
      load();
    } catch (err) { setError(err.response?.data?.message || 'ثبت کاربر ناموفق بود.'); }
  }

  function fForm(v) { setForm((p) => ({ ...p, ...v })); }
  function fEdit(v) { setEditForm((p) => ({ ...p, ...v })); }

  return (
    <Layout title="مدیریت کاربران">
      <div className="mb-5 flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          برای تست هر نقش، یک حساب کاربری با همان نقش بسازید و با اطلاعات آن وارد شوید.
        </p>
        <Button onClick={openCreate} className="shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          افزودن کاربر
        </Button>
      </div>

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-success/20 bg-success/8 px-4 py-3 text-sm text-success">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {success}
        </div>
      )}

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>ایمیل</th>
                <th>نقش</th>
                <th>وضعیت</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[28, 36, 20, 16, 12].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="کاربری یافت نشد" action={<Button onClick={openCreate} size="sm">افزودن کاربر</Button>} /></td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.full_name}</td>
                    <td className="tabular text-muted">{u.email}</td>
                    <td className="text-muted">{ROLE_OPTIONS.find((r) => r.value === u.Role?.name)?.label || u.Role?.name}</td>
                    <td>
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />غیرفعال
                        </span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => openEdit(u)} className="text-xs font-medium text-navy-600 hover:underline">ویرایش</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="افزودن کاربر جدید">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="نام کامل" value={form.full_name} onChange={(e) => fForm({ full_name: e.target.value })} required />
          <Input label="ایمیل" type="email" value={form.email} onChange={(e) => fForm({ email: e.target.value })} required />
          <Input label="رمز عبور" type="password" value={form.password} onChange={(e) => fForm({ password: e.target.value })} required />
          <Input label="شماره تماس (اختیاری)" value={form.phone} onChange={(e) => fForm({ phone: e.target.value })} />
          <Select label="نقش کاربر" value={form.role_name} onChange={(e) => fForm({ role_name: e.target.value })}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <ErrorAlert msg={error} />
          <Button type="submit" className="w-full">ثبت کاربر</Button>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="ویرایش کاربر">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input label="نام کامل" value={editForm.full_name} onChange={(e) => fEdit({ full_name: e.target.value })} required />
          <Input label="شماره تماس" value={editForm.phone} onChange={(e) => fEdit({ phone: e.target.value })} />
          <Select label="نقش کاربر" value={editForm.role_name} onChange={(e) => fEdit({ role_name: e.target.value })}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Input label="درصد پورسانت" type="number" min="0" max="100" step="0.01" value={editForm.commission_rate} onChange={(e) => fEdit({ commission_rate: e.target.value })} />
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 py-3 transition hover:bg-navy-50">
            <input type="checkbox" checked={editForm.is_active} onChange={(e) => fEdit({ is_active: e.target.checked })} className="h-4 w-4 accent-navy-600" />
            <span className="text-sm text-ink/80">حساب کاربری فعال باشد</span>
          </label>
          <ErrorAlert msg={error} />
          <Button type="submit" className="w-full">ذخیره تغییرات</Button>
        </form>
      </Modal>
    </Layout>
  );
}
