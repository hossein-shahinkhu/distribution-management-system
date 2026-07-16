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
    usersApi.getAll().then((r) => {
      setUsers(r.data);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditForm({
      full_name: u.full_name,
      phone: u.phone || '',
      role_name: u.Role?.name || 'salesperson',
      is_active: u.is_active,
      commission_rate: u.commission_rate || 0,
    });
    setEditingId(u.id);
    setError('');
    setEditModalOpen(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await usersApi.update(editingId, editForm);
      setEditModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ویرایش کاربر ناموفق بود.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await usersApi.register(form);
      setModalOpen(false);
      setSuccess(`کاربر «${form.full_name}» با موفقیت ساخته شد. حالا می‌توانید با ایمیل و رمز عبور تعیین‌شده وارد شوید.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت کاربر ناموفق بود.');
    }
  }

  return (
    <Layout title="مدیریت کاربران">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink/50">
          برای اینکه بتوانید پنل هر نقش (انباردار، فروشنده، توزیع‌کننده) را تست کنید، یک حساب کاربری با همان نقش بسازید و با اطلاعات آن وارد شوید.
        </p>
        <Button onClick={openCreate}>+ افزودن کاربر</Button>
      </div>

      {success && (
        <div className="mb-4 rounded-2xl border border-[#2E7D5B]/30 bg-[#2E7D5B]/10 p-4 text-sm text-[#2E7D5B]">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : users.length === 0 ? (
        <EmptyState title="کاربری یافت نشد" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">ایمیل</th>
                <th className="px-4 py-3 font-medium">نقش</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 tabular text-ink/60">{u.email}</td>
                  <td className="px-4 py-3 text-ink/60">
                    {ROLE_OPTIONS.find((r) => r.value === u.Role?.name)?.label || u.Role?.name}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="text-xs font-medium text-[#2E7D5B]">فعال</span>
                    ) : (
                      <span className="text-xs font-medium text-[#C1443D]">غیرفعال</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openEdit(u)} className="text-navy-600 hover:underline">ویرایش</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="افزودن کاربر جدید">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="نام کامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <Input label="ایمیل" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="رمز عبور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input label="شماره تماس (اختیاری)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="نقش کاربر" value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">ثبت کاربر</Button>
        </form>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="ویرایش کاربر">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input label="نام کامل" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
          <Input label="شماره تماس" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Select label="نقش کاربر" value={editForm.role_name} onChange={(e) => setEditForm({ ...editForm, role_name: e.target.value })}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <Input
            label="درصد پورسانت"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={editForm.commission_rate}
            onChange={(e) => setEditForm({ ...editForm, commission_rate: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
            />
            حساب کاربری فعال باشد
          </label>
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">ذخیره تغییرات</Button>
        </form>
      </Modal>
    </Layout>
  );
}
