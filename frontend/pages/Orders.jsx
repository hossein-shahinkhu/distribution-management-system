import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { ordersApi } from '../api/orders';
import { customersApi } from '../api/customers';
import { productsApi } from '../api/products';
import { routesApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'pending',          label: 'در انتظار تأیید' },
  { value: 'confirmed',        label: 'تأییدشده' },
  { value: 'processing',       label: 'در حال آماده‌سازی' },
  { value: 'out_for_delivery', label: 'در مسیر تحویل' },
  { value: 'delivered',        label: 'تحویل‌شده' },
  { value: 'cancelled',        label: 'لغوشده' },
];

const EMPTY_ADVANCED = {
  dateFrom:   '',
  dateTo:     '',
  amountMin:  '',
  amountMax:  '',
};

/** Returns the number of active advanced-filter fields */
function countActiveAdvanced(adv) {
  return Object.values(adv).filter(Boolean).length;
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-border">
      {[28, 36, 32, 20, 8].map((w, j) => (
        <td key={j} className="px-4 py-4">
          <div className="skeleton h-4" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  ));
}

/** Chevron icon — points up when open, down when closed */
function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/** Sliders / filter icon */
function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>
  );
}

export default function Orders() {
  const { user } = useAuth();

  /* ── Server-side filter state ── */
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [routeId, setRouteId] = useState('');

  /* ── Advanced (server-side) filter state ── */
  const [advanced, setAdvanced]       = useState(EMPTY_ADVANCED);
  const [panelOpen, setPanelOpen]     = useState(false);
  // draft holds edits until the user clicks Apply
  const [draft, setDraft]             = useState(EMPTY_ADVANCED);

  /* ── Data state ── */
  const [orders, setOrders]           = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, totalPages: 1 });
  const [routes, setRoutes]           = useState([]);
  const [customers, setCustomers]     = useState([]);
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);

  /* ── New-order form state ── */
  const [customerId, setCustomerId]   = useState('');
  const [items, setItems]             = useState([{ product_id: '', quantity: 1 }]);
  const [isQuote, setIsQuote]         = useState(false);

  const canCreate = user?.role === 'admin' || user?.role === 'salesperson';

  /* ── Server fetch ── */
  const load = useCallback((page = 1) => {
    setLoading(true);
    ordersApi
      .getAll({
        search,
        status,
        route_id:    routeId || undefined,
        date_from:   advanced.dateFrom  || undefined,
        date_to:     advanced.dateTo    || undefined,
        amount_min:  advanced.amountMin !== '' ? advanced.amountMin : undefined,
        amount_max:  advanced.amountMax !== '' ? advanced.amountMax : undefined,
        page,
      })
      .then((r) => {
        setOrders(r.data.data);
        setPagination(r.data.pagination);
        setLoading(false);
      });
  }, [search, status, routeId, advanced]);

  /* Re-fetch when server-side filters change (debounced for search) */
  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, routeId, advanced]);

  /* Load routes once */
  useEffect(() => {
    routesApi.getAll().then((r) => setRoutes(r.data));
  }, []);

  // فیلتر advanced روی backend انجام می‌شود؛ orders مستقیم نمایش داده می‌شود
  const filtered = orders;
  const activeAdvancedCount = countActiveAdvanced(advanced);

  /* ── Advanced panel handlers ── */
  function openPanel() {
    setDraft(advanced);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  function applyAdvanced() {
    setAdvanced(draft);
    setPanelOpen(false);
  }

  function clearAdvanced() {
    setDraft(EMPTY_ADVANCED);
    setAdvanced(EMPTY_ADVANCED);
    setPanelOpen(false);
  }

  function setD(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Create-order modal ── */
  function openCreate() {
    setError('');
    setCustomerId('');
    setItems([{ product_id: '', quantity: 1 }]);
    setIsQuote(false);
    Promise.all([
      customersApi.getAll({ limit: 100 }),
      productsApi.getAll({ limit: 100 }),
    ]).then(([c, p]) => {
      setCustomers(c.data.data);
      setProducts(p.data.data.filter((prod) => prod.is_active));
    });
    setModalOpen(true);
  }

  function updateItem(index, field, value) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function addItemRow() {
    setItems([...items, { product_id: '', quantity: 1 }]);
  }

  function removeItemRow(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        customer_id: customerId,
        items: items
          .filter((it) => it.product_id && it.quantity)
          .map((it) => ({
            product_id: Number(it.product_id),
            quantity:   Number(it.quantity),
          })),
        is_quote: isQuote,
      };
      await ordersApi.create(payload);
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت سفارش ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="سفارش‌ها">
      {/* ══════════════════════════════════════════════════════════
          Toolbar row: search + status + route + advanced toggle
      ══════════════════════════════════════════════════════════ */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {/* Filters group */}
        <div className="flex flex-1 flex-wrap gap-3">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <Input
              placeholder="جستجوی شماره سفارش..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Status */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            wrapperClassName="w-44"
          >
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>

          {/* Route */}
          {routes.length > 0 && (
            <Select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              wrapperClassName="w-40"
            >
              <option value="">همه مسیرها</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          )}

          {/* Advanced filter toggle */}
          <button
            type="button"
            onClick={panelOpen ? closePanel : openPanel}
            className={[
              'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600',
              activeAdvancedCount > 0
                ? 'border-navy-400 bg-navy-50 text-navy-600 hover:bg-navy-100'
                : 'border-border bg-white text-ink/70 hover:bg-navy-50 hover:text-ink',
            ].join(' ')}
            aria-expanded={panelOpen}
            aria-controls="advanced-filter-panel"
          >
            <FilterIcon />
            <span className="hidden sm:inline">فیلتر پیشرفته</span>
            {activeAdvancedCount > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-navy-600 px-1 text-2xs font-bold text-white">
                {activeAdvancedCount}
              </span>
            )}
            <ChevronIcon open={panelOpen} />
          </button>
        </div>

        {/* Create button */}
        {canCreate && (
          <Button onClick={openCreate}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            ثبت سفارش جدید
          </Button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          Advanced filter panel (collapsible)
      ══════════════════════════════════════════════════════════ */}
      {panelOpen && (
        <div
          id="advanced-filter-panel"
          role="region"
          aria-label="فیلترهای پیشرفته"
          className="animate-fadeIn mb-4 rounded-2xl border border-border bg-white p-4 shadow-sm"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            فیلترهای پیشرفته
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Date from */}
            <Input
              label="از تاریخ"
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setD('dateFrom', e.target.value)}
            />
            {/* Date to */}
            <Input
              label="تا تاریخ"
              type="date"
              value={draft.dateTo}
              onChange={(e) => setD('dateTo', e.target.value)}
            />
            {/* Amount min */}
            <Input
              label="حداقل مبلغ (تومان)"
              type="number"
              min="0"
              step="1000"
              placeholder="مثال: ۵۰۰۰۰۰"
              value={draft.amountMin}
              onChange={(e) => setD('amountMin', e.target.value)}
            />
            {/* Amount max */}
            <Input
              label="حداکثر مبلغ (تومان)"
              type="number"
              min="0"
              step="1000"
              placeholder="مثال: ۱۰۰۰۰۰۰"
              value={draft.amountMax}
              onChange={(e) => setD('amountMax', e.target.value)}
            />
          </div>

          {/* Panel actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            {activeAdvancedCount > 0 && (
              <Button variant="ghost" size="sm" type="button" onClick={clearAdvanced}>
                پاک کردن فیلترها
              </Button>
            )}
            <Button variant="outline" size="sm" type="button" onClick={closePanel}>
              انصراف
            </Button>
            <Button size="sm" type="button" onClick={applyAdvanced}>
              اعمال فیلتر
            </Button>
          </div>
        </div>
      )}

      {/* Active-filter summary strip */}
      {!panelOpen && activeAdvancedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">فیلترهای فعال:</span>
          {advanced.dateFrom && (
            <span className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-600">
              از: {new Date(advanced.dateFrom).toLocaleDateString('fa-IR')}
            </span>
          )}
          {advanced.dateTo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-600">
              تا: {new Date(advanced.dateTo).toLocaleDateString('fa-IR')}
            </span>
          )}
          {advanced.amountMin !== '' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-600">
              حداقل: {new Intl.NumberFormat('fa-IR').format(advanced.amountMin)} تومان
            </span>
          )}
          {advanced.amountMax !== '' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-600">
              حداکثر: {new Intl.NumberFormat('fa-IR').format(advanced.amountMax)} تومان
            </span>
          )}
          <button
            type="button"
            onClick={clearAdvanced}
            className="text-xs font-medium text-danger transition hover:text-danger/80 hover:underline"
          >
            پاک کردن همه
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          Orders table
      ══════════════════════════════════════════════════════════ */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>شماره سفارش</th>
                {/* Customer — always visible */}
                <th>مشتری</th>
                {/* Amount — hidden on xs, shown from sm up */}
                <th className="hidden sm:table-cell">مبلغ</th>
                <th>وضعیت</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={
                        orders.length === 0
                          ? 'هنوز سفارشی ثبت نشده'
                          : 'نتیجه‌ای یافت نشد'
                      }
                      description={
                        orders.length === 0
                          ? 'اولین سفارش را ثبت کنید.'
                          : 'فیلترها را تغییر دهید.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id}>
                    {/* Order number */}
                    <td className="tabular font-mono text-xs text-muted">
                      {o.order_number}
                    </td>
                    {/* Customer */}
                    <td className="font-medium">{o.Customer?.full_name || '—'}</td>
                    {/* Amount — hidden on xs */}
                    <td className="hidden tabular sm:table-cell">
                      {formatCurrency(o.total_amount)}
                    </td>
                    {/* Status */}
                    <td><StatusBadge status={o.status} /></td>
                    {/* Detail link */}
                    <td>
                      <Link
                        to={`/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                      >
                        جزئیات
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onChange={load}
      />

      {/* ══════════════════════════════════════════════════════════
          Create order modal
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ثبت سفارش جدید"
        width="max-w-2xl"
        saving={saving}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="مشتری"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">انتخاب مشتری...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.business_name ? ` — ${c.business_name}` : ''}
              </option>
            ))}
          </Select>

          {/* Order items */}
          <div>
            <p className="mb-2 text-sm font-medium text-ink/70">اقلام سفارش</p>
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2.5">
                  <div className="flex-1">
                    <Select
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">انتخاب کالا...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (موجودی: {p.stock_quantity})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min="1"
                      placeholder="تعداد"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
                      aria-label="حذف قلم"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-navy-600 transition hover:text-navy-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              افزودن قلم دیگر
            </button>
          </div>

          {/* Quote toggle */}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 py-3 transition hover:bg-navy-50">
            <input
              type="checkbox"
              checked={isQuote}
              onChange={(e) => setIsQuote(e.target.checked)}
              className="h-4 w-4 rounded accent-navy-600"
            />
            <span className="text-sm text-ink/80">
              این یک پیش‌فاکتور است (بدون کسر موجودی)
            </span>
          </label>

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
            ) : 'ثبت سفارش'}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
