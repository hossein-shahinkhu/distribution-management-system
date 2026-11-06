import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { distributorsApi } from '../api/misc';
import { usersApi } from '../api/users';

const EMPTY_FORM = {
  full_name: '', phone: '', vehicle_plate: '',
  vehicle_type: '', user_id: '', commission_rate: 0,
};

const VEHICLE_TYPES = [
  'موتور سیکلت', 'وانت', 'نیسان', 'کامیونت', 'کامیون', 'سایر',
];

export default function Distributors() {
  const [list, setList]           = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  function load() {
    setLoading(true);
    Promise.all([distributorsApi.getAll(), usersApi.getAll()]).then(([d, u]) => {
      setList(d.data);
      setUsers(u.data.filter((usr) => usr.Role?.name === 'distributor'));
      setLoading(false);
    });
  }

  useEffect(load, []);

  function availableUsersFor(currentId) {
    const linked = list
      .filter((d) => d.id !== currentId && d.user_id)
      .map((d) => d.user_id);
    return users.filter((u) => !linked.includes(u.id));
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
    setSaving(true);
    try {
      const payload = { ...form, user_id: form.user_id || null };
      if (editingId) await distributorsApi.update(editingId, payload);
      else           await distributorsApi.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('این توزیع‌کننده غیرفعال شود؟')) return;
    await distributorsApi.remove(id);
    load();
  }

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  return (
    <Layout title="توزیع‌کنندگان">
      {/* ── Info banner (migrated to .banner CSS class) ── */}
      <div className="banner banner-info mb-5">
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          برای اینکه یک توزیع‌کننده بتواند وارد سیستم شود، باید حساب کاربری او
          (از صفحه «مدیریت کاربران») در فیلد «حساب کاربری برای ورود» به او متصل شود.
        </span>
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-5 flex justify-end">
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          افزودن توزیع‌کننده
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>تماس</th>
                <th>پلاک / نوع خودرو</th>
                <th>حساب کاربری متصل</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[28, 20, 24, 28, 16].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: w * 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="هنوز توزیع‌کننده‌ای ثبت نشده"
                      action={<Button onClick={openCreate} size="sm">افزودن توزیع‌کننده</Button>}
                    />
                  </td>
                </tr>
              ) : (
                list.map((d) => (
                  <tr key={d.id}>
                    {/* Name */}
                    <td className="font-medium">{d.full_name}</td>
                    {/* Phone */}
                    <td className="tabular text-muted">{d.phone}</td>
                    {/* Vehicle */}
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="tabular text-sm text-ink">
                          {d.vehicle_plate || '—'}
                        </span>
                        {d.vehicle_type && (
                          <span className="inline-flex w-fit items-center rounded-full bg-navy-50 px-2 py-0.5 text-2xs font-medium text-navy-600">
                            {d.vehicle_type}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Account link */}
                    <td>
                      {d.User ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {d.User.email}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                          متصل نیست
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(d)}
                          className="text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                        >
                          ویرایش
                        </button>
                        <span className="text-border">|</span>
                        <button
                          onClick={() => handleDeactivate(d.id)}
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

      {/* ── Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'ویرایش توزیع‌کننده' : 'افزودن توزیع‌کننده'}
        saving={saving}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal info */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
              اطلاعات شخصی
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="نام کامل"
                value={form.full_name}
                onChange={(e) => f({ full_name: e.target.value })}
                required
              />
              <Input
                label="شماره تماس"
                value={form.phone}
                onChange={(e) => f({ phone: e.target.value })}
                required
              />
            </div>
          </fieldset>

          {/* Vehicle info */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
              اطلاعات وسیله نقلیه
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="پلاک خودرو"
                value={form.vehicle_plate}
                onChange={(e) => f({ vehicle_plate: e.target.value })}
                placeholder="مثال: ۱۲۳ ب ۴۵"
              />
              <Select
                label="نوع وسیله نقلیه"
                value={form.vehicle_type}
                onChange={(e) => f({ vehicle_type: e.target.value })}
              >
                <option value="">انتخاب کنید...</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          </fieldset>

          {/* Account + commission */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
              حساب کاربری و پورسانت
            </legend>
            <Input
              label="درصد پورسانت (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commission_rate}
              onChange={(e) => f({ commission_rate: e.target.value })}
            />
            <Select
              label="حساب کاربری برای ورود (اختیاری)"
              value={form.user_id}
              onChange={(e) => f({ user_id: e.target.value })}
            >
              <option value="">بدون اتصال (فقط اطلاعات، بدون امکان ورود)</option>
              {availableUsersFor(editingId).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.email}
                </option>
              ))}
            </Select>
            {users.length === 0 && (
              <div className="banner banner-warning">
                <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                هنوز هیچ حساب کاربری با نقش «توزیع‌کننده» نساخته‌اید. اول از صفحه «مدیریت کاربران» یکی بسازید.
              </div>
            )}
          </fieldset>

          {/* Error */}
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
            ) : (editingId ? 'ذخیره تغییرات' : 'ثبت توزیع‌کننده')}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
