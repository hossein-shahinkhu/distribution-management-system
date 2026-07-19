import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { distributorsApi } from '../api/misc';
import { usersApi } from '../api/users';

const EMPTY_FORM = { full_name: '', phone: '', vehicle_plate: '', vehicle_type: '', user_id: '', commission_rate: 0 };

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

export default function Distributors() {
  const [list, setList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([distributorsApi.getAll(), usersApi.getAll()]).then(([d, u]) => {
      setList(d.data); setUsers(u.data.filter((usr) => usr.Role?.name === 'distributor')); setLoading(false);
    });
  }

  useEffect(load, []);

  function availableUsersFor(currentId) {
    const linked = list.filter((d) => d.id !== currentId && d.user_id).map((d) => d.user_id);
    return users.filter((u) => !linked.includes(u.id));
  }

  function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setError(''); setModalOpen(true); }

  function openEdit(d) {
    setForm({ full_name: d.full_name, phone: d.phone, vehicle_plate: d.vehicle_plate || '', vehicle_type: d.vehicle_type || '', user_id: d.user_id || '', commission_rate: d.commission_rate || 0 });
    setEditingId(d.id); setError(''); setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, user_id: form.user_id || null };
      if (editingId) await distributorsApi.update(editingId, payload);
      else await distributorsApi.create(payload);
      setModalOpen(false); load();
    } catch (err) { setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.'); }
  }

  async function handleDeactivate(id) {
    if (!confirm('این توزیع‌کننده غیرفعال شود؟')) return;
    await distributorsApi.remove(id); load();
  }

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  return (
    <Layout title="توزیع‌کنندگان">
      {/* Info banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3 text-sm text-navy-600">
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        برای اینکه یک توزیع‌کننده بتواند وارد سیستم شود، باید حساب کاربری او (از صفحه «مدیریت کاربران») در فیلد «حساب کاربری برای ورود» به او متصل شود.
      </div>

      <div className="mb-5 flex justify-end">
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          افزودن توزیع‌کننده
        </Button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>تماس</th>
                <th>پلاک خودرو</th>
                <th>حساب کاربری متصل</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[28, 20, 20, 28, 16].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="هنوز توزیع‌کننده‌ای ثبت نشده" action={<Button onClick={openCreate} size="sm">افزودن توزیع‌کننده</Button>} /></td></tr>
              ) : (
                list.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.full_name}</td>
                    <td className="tabular text-muted">{d.phone}</td>
                    <td className="tabular text-muted">{d.vehicle_plate || '—'}</td>
                    <td>
                      {d.User ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {d.User.email}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          متصل نیست
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(d)} className="text-xs font-medium text-navy-600 hover:underline">ویرایش</button>
                        <span className="text-border">|</span>
                        <button onClick={() => handleDeactivate(d.id)} className="text-xs font-medium text-danger hover:underline">غیرفعال</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش توزیع‌کننده' : 'افزودن توزیع‌کننده'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="نام کامل" value={form.full_name} onChange={(e) => f({ full_name: e.target.value })} required />
          <Input label="شماره تماس" value={form.phone} onChange={(e) => f({ phone: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="پلاک خودرو" value={form.vehicle_plate} onChange={(e) => f({ vehicle_plate: e.target.value })} />
            <Input label="نوع وسیله نقلیه" value={form.vehicle_type} onChange={(e) => f({ vehicle_type: e.target.value })} />
          </div>
          <Input label="درصد پورسانت" type="number" min="0" max="100" step="0.01" value={form.commission_rate} onChange={(e) => f({ commission_rate: e.target.value })} />
          <Select label="حساب کاربری برای ورود (اختیاری)" value={form.user_id} onChange={(e) => f({ user_id: e.target.value })}>
            <option value="">بدون اتصال (فقط اطلاعات، بدون امکان ورود)</option>
            {availableUsersFor(editingId).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>
            ))}
          </Select>
          {users.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-600">
              هنوز هیچ حساب کاربری با نقش «توزیع‌کننده» نساخته‌اید. اول از صفحه «مدیریت کاربران» یکی بسازید.
            </p>
          )}
          <ErrorAlert msg={error} />
          <Button type="submit" className="w-full">{editingId ? 'ذخیره تغییرات' : 'ثبت توزیع‌کننده'}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
