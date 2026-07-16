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
      setList(d.data);
      setUsers(u.data.filter((usr) => usr.Role?.name === 'distributor'));
      setLoading(false);
    });
  }

  useEffect(load, []);

  function availableUsersFor(currentDistributorId) {
    const linkedUserIds = list
      .filter((d) => d.id !== currentDistributorId && d.user_id)
      .map((d) => d.user_id);
    return users.filter((u) => !linkedUserIds.includes(u.id));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setModalOpen(true);
  }

  function openEdit(d) {
    setForm({
      full_name: d.full_name,
      phone: d.phone,
      vehicle_plate: d.vehicle_plate || '',
      vehicle_type: d.vehicle_type || '',
      user_id: d.user_id || '',
      commission_rate: d.commission_rate || 0,
    });
    setEditingId(d.id);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, user_id: form.user_id || null };
      if (editingId) {
        await distributorsApi.update(editingId, payload);
      } else {
        await distributorsApi.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('این توزیع‌کننده غیرفعال شود؟')) return;
    await distributorsApi.remove(id);
    load();
  }

  return (
    <Layout title="توزیع‌کنندگان">
      <div className="mb-4 rounded-2xl border border-navy-100 bg-navy-50/50 p-4 text-sm text-ink/60">
        💡 برای اینکه یک توزیع‌کننده بتواند وارد سیستم شود و سفارش‌های خودش را ببیند، باید حساب کاربری او (از صفحه «مدیریت کاربران») را در فیلد «حساب کاربری برای ورود» به او متصل کنید.
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>+ افزودن توزیع‌کننده</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : list.length === 0 ? (
        <EmptyState title="هنوز توزیع‌کننده‌ای ثبت نشده" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">نام</th>
                <th className="px-4 py-3 font-medium">تماس</th>
                <th className="px-4 py-3 font-medium">پلاک خودرو</th>
                <th className="px-4 py-3 font-medium">حساب کاربری متصل</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 font-medium">{d.full_name}</td>
                  <td className="px-4 py-3 tabular text-ink/60">{d.phone}</td>
                  <td className="px-4 py-3 tabular text-ink/60">{d.vehicle_plate || '—'}</td>
                  <td className="px-4 py-3">
                    {d.User ? (
                      <span className="text-xs font-medium text-[#2E7D5B]">{d.User.email}</span>
                    ) : (
                      <span className="text-xs font-medium text-[#C1443D]">متصل نیست</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openEdit(d)} className="ml-3 text-navy-600 hover:underline">ویرایش</button>
                    <button onClick={() => handleDeactivate(d.id)} className="text-[#C1443D] hover:underline">غیرفعال کردن</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'ویرایش توزیع‌کننده' : 'افزودن توزیع‌کننده'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="نام کامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <Input label="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="پلاک خودرو" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} />
            <Input label="نوع وسیله نقلیه" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} />
          </div>
          <Input
            label="درصد پورسانت"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.commission_rate}
            onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
          />
          <Select
            label="حساب کاربری برای ورود (اختیاری)"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          >
            <option value="">بدون اتصال (فقط اطلاعات، بدون امکان ورود)</option>
            {availableUsersFor(editingId).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>
            ))}
          </Select>
          {users.length === 0 && (
            <p className="text-xs text-amber-600">
              هنوز هیچ حساب کاربری با نقش «توزیع‌کننده» نساخته‌ای. اول از صفحه «مدیریت کاربران» یکی بساز.
            </p>
          )}
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">{editingId ? 'ذخیره تغییرات' : 'ثبت توزیع‌کننده'}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
