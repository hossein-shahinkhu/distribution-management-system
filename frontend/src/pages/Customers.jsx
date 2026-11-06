import useFinancialRefresh from '../hooks/useFinancialRefresh';
import { financialError, formatMoney } from '../utils/financial';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { customersApi } from '../api/customers';
import { routesApi } from '../api/misc';

const EMPTY_FORM = {
  full_name: '', business_name: '', phone: '',
  address: '', city: '', credit_limit: 0, route_id: '',
};

export default function Customers() {
  const [customers, setCustomers]     = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, totalPages: 1 });
  const [search, setSearch]           = useState('');
  const [routes, setRoutes]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [editingId, setEditingId]     = useState(null);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  // map of customerId → { outstanding_balance, credit_limit, available_credit, unpaid_invoices }
  const [creditUsage, setCreditUsage] = useState({});
  const sequence = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [financialErrors, setFinancialErrors] = useState({});
  async function load(page = 1) {
    const seq = ++sequence.current;
    setLoading(true); setLoadError(''); setCreditUsage({}); setFinancialErrors({});
    try {
      const r = await customersApi.getAll({ search, page });
      if (seq !== sequence.current) return;
      setCustomers(r.data.data); setPagination(r.data.pagination);
      const rows = r.data.data;
      const results = await Promise.allSettled(rows.map(c => customersApi.getCreditUsage(c.id)));
      if (seq !== sequence.current) return;
      const values = {}, failures = {};
      results.forEach((result, index) => {
        const id = rows[index].id;
        if (result.status === 'fulfilled') values[id] = result.value.data;
        else failures[id] = financialError(result.reason);
      });
      setCreditUsage(values); setFinancialErrors(failures);
    } catch (err) {
      if (seq === sequence.current) { setLoadError(financialError(err)); setCustomers([]); }
    } finally { if (seq === sequence.current) setLoading(false); }
  }
  useFinancialRefresh(() => load(pagination.page));
  useEffect(() => {
    routesApi.getAll().then(r => setRoutes(r.data)).catch(err => setLoadError(financialError(err)));
    return () => { sequence.current++; };
  }, []);
  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
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
    setSaving(true);
    try {
      const payload = { ...form, route_id: form.route_id || null };
      if (editingId) await customersApi.update(editingId, payload);
      else           await customersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت اطلاعات ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('این مشتری حذف شود؟')) return;
    await customersApi.remove(id);
    load(pagination.page);
  }

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  // Route lookup helper
  const routeById = Object.fromEntries(routes.map((r) => [r.id, r]));

  return (
    <Layout title="مشتریان">
      {loadError && <div className="banner banner-error mb-4" role="alert">{loadError}</div>}<Button variant="outline" onClick={() => load(pagination.page)} disabled={loading}>تازه‌سازی مانده‌ها / تلاش مجدد</Button>
      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <Input
            placeholder="جستجوی نام، کسب‌وکار یا تلفن..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          افزودن مشتری
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>کسب‌وکار</th>
                <th>تماس</th>
                <th className="hidden md:table-cell">شهر / مسیر</th>
                <th className="hidden lg:table-cell">سقف اعتبار</th>
                <th>مانده حساب</th><th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[32, 28, 24, 20, 24, 20].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: w * 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="هنوز مشتری‌ای ثبت نشده"
                      description="اولین مشتری خود را اضافه کنید."
                      action={<Button onClick={openCreate} size="sm">افزودن مشتری</Button>}
                    />
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const route        = c.route_id ? routeById[c.route_id] : null;
                  const creditLimit  = Number(c.credit_limit) || 0;
                  const usage        = creditUsage[c.id];
                  const outstanding  = usage ? usage.outstanding_balance : null;
                  const usagePct     = (creditLimit > 0 && outstanding !== null)
                    ? Math.min(100, Math.round((outstanding / creditLimit) * 100))
                    : null;
                  // bar colour: green ≤ 60%, amber ≤ 85%, red > 85%
                  const barColor = usagePct === null ? 'bg-navy-300'
                    : usagePct > 85 ? 'bg-danger'
                    : usagePct > 60 ? 'bg-warning'
                    : 'bg-success';
                  return (
                    <tr key={c.id}>
                      {/* Name */}
                      <td className="font-medium">{c.full_name}</td>
                      {/* Business */}
                      <td className="text-muted">{c.business_name || '—'}</td>
                      {/* Phone */}
                      <td className="tabular text-muted">{c.phone}</td>
                      {/* City + Route badge */}
                      <td className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {c.city && (
                            <span className="flex items-center gap-1 text-sm text-muted">
                              <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {c.city}
                            </span>
                          )}
                          {route && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-2xs font-semibold text-navy-600">
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              {route.name}
                            </span>
                          )}
                          {!c.city && !route && <span className="text-muted">—</span>}
                        </div>
                      </td>
                      {/* Credit limit + usage */}
                      <td className="hidden lg:table-cell">
                        {c.credit_limit == null ? <span className="text-muted">—</span> : creditLimit > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="tabular text-sm text-ink">
                              {new Intl.NumberFormat('fa-IR').format(creditLimit)} تومان
                            </span>
                            <div className="progress-bar w-24">
                              <div
                                className={`progress-bar-fill ${barColor}`}
                                style={{ width: usagePct !== null ? `${usagePct}%` : '0%' }}
                              />
                            </div>
                            {outstanding !== null && outstanding > 0 && (
                              <span className="tabular text-2xs text-muted">
                                بدهی: {new Intl.NumberFormat('fa-IR').format(Math.round(outstanding))} تومان
                              </span>
                            )}
                            {usage?.credit_balance > 0 && (
                              <span className="tabular text-2xs text-success">بستانکاری: {new Intl.NumberFormat('fa-IR').format(usage.credit_balance)} تومان</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">بدون محدودیت{usage?.credit_balance > 0 && <span className="block text-success">بستانکاری: {new Intl.NumberFormat('fa-IR').format(usage.credit_balance)} تومان</span>}</span>
                        )}
                      </td>
<td>{financialErrors[c.id] ? <span className="text-danger" role="alert">{financialErrors[c.id]}</span> : usage ? <>{usage.scope === 'salesperson_orders' && <span className="block text-muted">فقط سفارش‌های شما</span>}<span className="block text-danger">بدهی: {formatMoney(usage.outstanding_balance)}</span><span className="block text-success">بستانکاری: {formatMoney(usage.credit_balance)}</span></> : <span>در حال دریافت مانده…</span>}</td>
                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                          >
                            ویرایش
                          </button>
                          <span className="text-border">|</span>
                          <Link
                            to={`/customers/${c.id}/statement`}
                            className="text-xs font-medium text-[#7C5CBF] transition hover:underline"
                          >
                            گردش مالی
                          </Link>
                          <span className="text-border">|</span>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs font-medium text-danger transition hover:text-danger/80 hover:underline"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      {/* ── Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'ویرایش مشتری' : 'افزودن مشتری'}
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
                label="نام کسب‌وکار"
                value={form.business_name}
                onChange={(e) => f({ business_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="شماره تماس"
                value={form.phone}
                onChange={(e) => f({ phone: e.target.value })}
                required
              />
              <Input
                label="شهر"
                value={form.city}
                onChange={(e) => f({ city: e.target.value })}
              />
            </div>
            <Input
              label="آدرس"
              value={form.address}
              onChange={(e) => f({ address: e.target.value })}
            />
          </fieldset>

          {/* Business settings */}
          <fieldset className="space-y-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
              تنظیمات تجاری
            </legend>
            <Select
              label="مسیر"
              value={form.route_id}
              onChange={(e) => f({ route_id: e.target.value })}
            >
              <option value="">بدون مسیر</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <Input
              label="سقف اعتبار (تومان)"
              type="number"
              min="0"
              value={form.credit_limit}
              onChange={(e) => f({ credit_limit: e.target.value })}
              hint="صفر = بدون محدودیت اعتبار"
            />
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
            ) : (editingId ? 'ذخیره تغییرات' : 'ثبت مشتری')}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
