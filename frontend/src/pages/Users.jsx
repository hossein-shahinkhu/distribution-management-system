import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { usersApi } from '../api/users';

/* ── Role configuration ─────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: 'admin',           label: 'مدیر سیستم' },
  { value: 'warehouse_keeper',label: 'انباردار' },
  { value: 'salesperson',     label: 'فروشنده' },
  { value: 'distributor',     label: 'توزیع‌کننده' },
];

/**
 * Role badge color map — mirrors the Topbar `roleBg` logic exactly so that
 * the same role always shows the same color everywhere in the UI.
 */
const ROLE_BADGE_CLASSES = {
  admin:           'bg-navy-100 text-navy-700',
  warehouse_keeper:'bg-amber-100 text-amber-700',
  salesperson:     'bg-success/10 text-success',
  distributor:     'bg-[#7C5CBF]/10 text-[#7C5CBF]',
};

function RoleBadge({ roleName }) {
  const label  = ROLE_OPTIONS.find((r) => r.value === roleName)?.label ?? roleName;
  const colors = ROLE_BADGE_CLASSES[roleName] ?? 'bg-navy-50 text-navy-600';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-2xs font-semibold ${colors}`}>
      {label}
    </span>
  );
}

/* ── Form defaults ──────────────────────────────────────────── */
const EMPTY_FORM = {
  full_name: '', email: '', password: '', phone: '', role_name: 'salesperson',
};
const EMPTY_EDIT_FORM = {
  full_name: '', phone: '', role_name: '', is_active: true, commission_rate: 0,
};

export default function Users() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editForm, setEditForm]     = useState(EMPTY_EDIT_FORM);
  const [editingId, setEditingId]   = useState(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  /* ── Client-side filter state ── */
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  function load() {
    setLoading(true);
    usersApi.getAll().then((r) => { setUsers(r.data); setLoading(false); });
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
      full_name:       u.full_name,
      phone:           u.phone || '',
      role_name:       u.Role?.name || 'salesperson',
      is_active:       u.is_active,
      commission_rate: u.commission_rate || 0,
    });
    setEditingId(u.id);
    setError('');
    setEditModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.register(form);
      setModalOpen(false);
      setSuccess(`کاربر «${form.full_name}» با موفقیت ساخته شد.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت کاربر ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    setSavingEdit(true);
    try {
      await usersApi.update(editingId, editForm);
      setEditModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'ویرایش کاربر ناموفق بود.');
    } finally {
      setSavingEdit(false);
    }
  }

  function fForm(v) { setForm((p) => ({ ...p, ...v })); }
  function fEdit(v) { setEditForm((p) => ({ ...p, ...v })); }

  /* ── Client-side filtering ── */
  const filtered = useMemo(() => {
    let result = users;
    if (roleFilter) {
      result = result.filter((u) => u.Role?.name === roleFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, search, roleFilter]);

  return (
    <Layout title="مدیریت کاربران">
      {/* ── Info + Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-muted">
          برای تست هر نقش، یک حساب کاربری با همان نقش بسازید و با اطلاعات آن وارد شوید.
        </p>
        <Button onClick={openCreate} className="shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          افزودن کاربر
        </Button>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <Input
            placeholder="جستجوی نام، ایمیل یا تلفن..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Role filter */}
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          wrapperClassName="w-44"
        >
          <option value="">همه نقش‌ها</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </Select>
      </div>

      {/* ── Success banner ── */}
      {success && (
        <div className="mb-5 banner banner-success">
          <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>ایمیل</th>
                {/* Role — always visible; the badge communicates the value clearly */}
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
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={users.length === 0 ? 'کاربری یافت نشد' : 'نتیجه‌ای یافت نشد'}
                      description={
                        users.length === 0
                          ? undefined
                          : 'فیلترها یا عبارت جستجو را تغییر دهید.'
                      }
                      action={
                        users.length === 0
                          ? <Button onClick={openCreate} size="sm">افزودن کاربر</Button>
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.full_name}</td>
                    <td className="tabular text-muted">{u.email}</td>
                    {/* Colored role badge */}
                    <td><RoleBadge roleName={u.Role?.name} /></td>
                    {/* Active status dot */}
                    <td>
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          غیرفعال
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                      >
                        ویرایش
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Create user modal
      ══════════════════════════════════════════════════════════ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="افزودن کاربر جدید" saving={saving}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="نام کامل"
            value={form.full_name}
            onChange={(e) => fForm({ full_name: e.target.value })}
            required
          />
          <Input
            label="ایمیل"
            type="email"
            value={form.email}
            onChange={(e) => fForm({ email: e.target.value })}
            required
          />
          <Input
            label="رمز عبور"
            type="password"
            value={form.password}
            onChange={(e) => fForm({ password: e.target.value })}
            required
          />
          <Input
            label="شماره تماس (اختیاری)"
            value={form.phone}
            onChange={(e) => fForm({ phone: e.target.value })}
          />
          <Select
            label="نقش کاربر"
            value={form.role_name}
            onChange={(e) => fForm({ role_name: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>

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
            ) : 'ثبت کاربر'}
          </Button>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          Edit user modal
      ══════════════════════════════════════════════════════════ */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="ویرایش کاربر" saving={savingEdit}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="نام کامل"
            value={editForm.full_name}
            onChange={(e) => fEdit({ full_name: e.target.value })}
            required
          />
          <Input
            label="شماره تماس"
            value={editForm.phone}
            onChange={(e) => fEdit({ phone: e.target.value })}
          />
          <Select
            label="نقش کاربر"
            value={editForm.role_name}
            onChange={(e) => fEdit({ role_name: e.target.value })}
          >
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
            onChange={(e) => fEdit({ commission_rate: e.target.value })}
          />
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 py-3 transition hover:bg-navy-50">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => fEdit({ is_active: e.target.checked })}
              className="h-4 w-4 accent-navy-600"
            />
            <span className="text-sm text-ink/80">حساب کاربری فعال باشد</span>
          </label>

          {error && (
            <div className="banner banner-error">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={savingEdit}>
            {savingEdit ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                در حال ذخیره...
              </span>
            ) : 'ذخیره تغییرات'}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
