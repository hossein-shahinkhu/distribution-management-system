import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { treasuryApi, invoicesApi } from '../api/misc';
import { customersApi } from '../api/customers';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const TYPE_LABELS_FA   = { receipt: 'دریافت', payment: 'پرداخت' };
const METHOD_LABELS_FA = { cash: 'نقدی', bank_transfer: 'انتقال بانکی', card: 'کارت', cheque: 'چک' };

const EMPTY_FORM = {
  type: 'receipt', amount: '', method: 'cash',
  transaction_date: new Date().toISOString().slice(0, 10),
  description: '', customer_id: '', invoice_id: '',
};

/* ── Balance summary hero card ───────────────────────────── */
function BalanceSummary({ transactions }) {
  const activeTransactions = transactions.filter((t) => !t.is_voided);
  const totalReceipts  = activeTransactions.filter((t) => t.type === 'receipt').reduce((s, t) => s + Number(t.amount), 0);
  const totalPayments  = activeTransactions.filter((t) => t.type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
  const netBalance     = totalReceipts - totalPayments;
  const isPositive     = netBalance >= 0;

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Total receipts */}
      <div className="card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">کل دریافتی</p>
            <p className="tabular mt-1 text-lg font-bold text-success">
              {formatCurrency(totalReceipts)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
            <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Total payments */}
      <div className="card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">کل پرداختی</p>
            <p className="tabular mt-1 text-lg font-bold text-danger">
              {formatCurrency(totalPayments)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
            <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Net balance */}
      <div className={`card rounded-2xl p-4 ${isPositive ? 'border-success/30 bg-success/3' : 'border-danger/30 bg-danger/3'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">مانده خالص</p>
            <p className={`tabular mt-1 text-lg font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '+' : ''}{formatCurrency(netBalance)}
            </p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPositive ? 'bg-success/10' : 'bg-danger/10'}`}>
            <svg className={`h-5 w-5 ${isPositive ? 'text-success' : 'text-danger'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Treasury() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, totalPages: 1 });
  const [typeFilter, setTypeFilter]     = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [customers, setCustomers]       = useState([]);
  const [invoices, setInvoices]         = useState([]);
  const [modalOpen, setModalOpen]       = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [error, setError]               = useState('');
  const [saving, setSaving]             = useState(false);

  function load(page = 1) {
    setLoading(true);
    treasuryApi
      .getAll({ type: typeFilter || undefined, from: dateFrom || undefined, to: dateTo || undefined, page })
      .then((r) => {
        setTransactions(r.data.data);
        setPagination(r.data.pagination);
        setLoading(false);
      });
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    Promise.all([customersApi.getAll({ limit: 100 }), invoicesApi.getAll()])
      .then(([c, inv]) => {
        setCustomers(c.data.data);
        setInvoices(inv.data);
      });
  }, []);

  function openCreate(prefill = {}) {
    setForm({ ...EMPTY_FORM, ...prefill });
    setError('');
    setModalOpen(true);
  }

  function outstandingInvoicesFor(customerId) {
    if (!customerId) return [];
    return invoices.filter(
      (inv) =>
        inv.Order?.Customer?.id === Number(customerId) &&
        ['unpaid', 'partial'].includes(inv.payment_status)
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await treasuryApi.create({
        ...form,
        amount: Number(form.amount),
        customer_id: form.customer_id || null,
        invoice_id: form.type === 'receipt' ? form.invoice_id || null : null,
      });
      setModalOpen(false);
      load(pagination.page);
      invoicesApi.getAll().then((r) => setInvoices(r.data));
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت تراکنش ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid(id) {
    if (!confirm('این تراکنش باطل شود؟')) return;
    await treasuryApi.void(id);
    load(pagination.page);
    invoicesApi.getAll().then((r) => setInvoices(r.data));
  }

  // Running balance (chronological reverse order)
  const chronological = [...transactions].reverse();
  let runningBalance = 0;
  const balanceById = {};
  for (const t of chronological) {
    if (!t.is_voided) {
      runningBalance += t.type === 'receipt' ? Number(t.amount) : -Number(t.amount);
    }
    balanceById[t.id] = runningBalance;
  }

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  return (
    <Layout title="خزانه‌داری">
      {/* ── Balance summary hero ── */}
      {!loading && <BalanceSummary transactions={transactions} />}
      {loading && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            wrapperClassName="w-44"
          >
            <option value="">همه تراکنش‌ها</option>
            <option value="receipt">دریافت</option>
            <option value="payment">پرداخت</option>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            wrapperClassName="w-44"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            wrapperClassName="w-44"
          />
        </div>
        <Button onClick={() => openCreate()}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          ثبت تراکنش جدید
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>نوع</th>
                <th>مبلغ</th>
                <th>روش</th>
                <th>مشتری</th>
                <th>فاکتور</th>
                <th>مانده تجمعی</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[20, 16, 24, 16, 28, 20, 24, 16].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: w * 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="هنوز تراکنشی ثبت نشده"
                      description="اولین دریافت یا پرداخت را ثبت کنید."
                      action={
                        <Button onClick={() => openCreate()} size="sm">
                          ثبت تراکنش
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const balance = balanceById[t.id];
                  const balancePositive = balance >= 0;
                  return (
                    <tr key={t.id} className={t.is_voided ? 'opacity-40 line-through' : ''}>
                      <td className="tabular text-muted text-sm">
                        {new Date(t.transaction_date).toLocaleDateString('fa-IR')}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            t.type === 'receipt'
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${t.type === 'receipt' ? 'bg-success' : 'bg-danger'}`} />
                          {TYPE_LABELS_FA[t.type]}
                        </span>
                      </td>
                      <td className={`tabular font-semibold ${t.type === 'receipt' ? 'text-success' : 'text-danger'}`}>
                        {t.type === 'payment' ? '−' : '+'}{formatCurrency(t.amount)}
                      </td>
                      <td className="text-muted text-sm">{METHOD_LABELS_FA[t.method]}</td>
                      <td className="text-muted">{t.Customer?.full_name || '—'}</td>
                      <td className="tabular text-xs text-muted">{t.Invoice?.invoice_number || '—'}</td>
                      <td className={`tabular font-bold text-sm ${balancePositive ? 'text-success' : 'text-danger'}`}>
                        {balancePositive ? '' : '−'}{formatCurrency(Math.abs(balance))}
                      </td>
                      <td>
                        {t.is_voided ? (
                          <span className="text-xs text-muted">باطل‌شده</span>
                        ) : (
                          <button
                            onClick={() => handleVoid(t.id)}
                            className="text-xs font-medium text-danger hover:underline"
                          >
                            باطل کردن
                          </button>
                        )}
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

      {/* ── Create modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت تراکنش جدید" saving={saving}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="نوع تراکنش"
            value={form.type}
            onChange={(e) => f({ type: e.target.value, invoice_id: '' })}
          >
            <option value="receipt">دریافت (ورود پول)</option>
            <option value="payment">پرداخت (خروج پول)</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="مبلغ (تومان)"
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => f({ amount: e.target.value })}
              required
            />
            <Select
              label="روش پرداخت"
              value={form.method}
              onChange={(e) => f({ method: e.target.value })}
            >
              <option value="cash">نقدی</option>
              <option value="bank_transfer">انتقال بانکی</option>
              <option value="card">کارت</option>
              <option value="cheque">چک</option>
            </Select>
          </div>
          <Input
            label="تاریخ"
            type="date"
            value={form.transaction_date}
            onChange={(e) => f({ transaction_date: e.target.value })}
            required
          />
          <Select
            label="مشتری (اختیاری)"
            value={form.customer_id}
            onChange={(e) => f({ customer_id: e.target.value, invoice_id: '' })}
          >
            <option value="">بدون مشتری مشخص</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </Select>
          {form.type === 'receipt' && form.customer_id && (
            <Select
              label="اتصال به فاکتور (اختیاری)"
              value={form.invoice_id}
              onChange={(e) => f({ invoice_id: e.target.value })}
            >
              <option value="">بدون اتصال به فاکتور</option>
              {outstandingInvoicesFor(form.customer_id).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {formatCurrency(inv.total_amount)}
                </option>
              ))}
            </Select>
          )}
          <Input
            label="توضیحات (اختیاری)"
            value={form.description}
            onChange={(e) => f({ description: e.target.value })}
          />
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
            ) : 'ثبت تراکنش'}
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
