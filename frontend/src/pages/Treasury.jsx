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

const TYPE_LABELS_FA = { receipt: 'دریافت', payment: 'پرداخت' };
const METHOD_LABELS_FA = { cash: 'نقدی', bank_transfer: 'انتقال بانکی', card: 'کارت', cheque: 'چک' };

const EMPTY_FORM = {
  type: 'receipt',
  amount: '',
  method: 'cash',
  transaction_date: new Date().toISOString().slice(0, 10),
  description: '',
  customer_id: '',
  invoice_id: '',
};

export default function Treasury() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

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
    const timeout = setTimeout(() => load(1), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    Promise.all([customersApi.getAll({ limit: 100 }), invoicesApi.getAll()]).then(([c, inv]) => {
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
      (inv) => inv.Order?.Customer?.id === Number(customerId) && ['unpaid', 'partial'].includes(inv.payment_status)
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await treasuryApi.create({
        ...form,
        amount: Number(form.amount),
        customer_id: form.customer_id || null,
        invoice_id: form.type === 'receipt' ? form.invoice_id || null : null,
      });
      setModalOpen(false);
      load(pagination.page);
      // فاکتورها ممکن است payment_status‌شان تغییر کرده باشد
      invoicesApi.getAll().then((r) => setInvoices(r.data));
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت تراکنش ناموفق بود.');
    }
  }

  async function handleVoid(id) {
    if (!confirm('این تراکنش باطل شود؟')) return;
    await treasuryApi.void(id);
    load(pagination.page);
    invoicesApi.getAll().then((r) => setInvoices(r.data));
  }

  // محاسبه مانده تجمعی برای تراکنش‌های نمایش‌داده‌شده (به ترتیب زمانی صعودی)
  const chronological = [...transactions].reverse();
  let runningBalance = 0;
  const balanceById = {};
  for (const t of chronological) {
    if (!t.is_voided) {
      runningBalance += t.type === 'receipt' ? Number(t.amount) : -Number(t.amount);
    }
    balanceById[t.id] = runningBalance;
  }

  return (
    <Layout title="خزانه‌داری">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="w-48">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">همه تراکنش‌ها</option>
              <option value="receipt">دریافت</option>
              <option value="payment">پرداخت</option>
            </Select>
          </div>
          <div className="w-44">
            <Input type="date" placeholder="از تاریخ" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="w-44">
            <Input type="date" placeholder="تا تاریخ" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => openCreate()}>+ ثبت تراکنش جدید</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : transactions.length === 0 ? (
        <EmptyState title="هنوز تراکنشی ثبت نشده" description="اولین دریافت یا پرداخت را ثبت کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                <th className="px-4 py-3 font-medium">نوع</th>
                <th className="px-4 py-3 font-medium">مبلغ</th>
                <th className="px-4 py-3 font-medium">روش</th>
                <th className="px-4 py-3 font-medium">مشتری</th>
                <th className="px-4 py-3 font-medium">فاکتور</th>
                <th className="px-4 py-3 font-medium">مانده تجمعی</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className={`border-t border-navy-100 ${t.is_voided ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 tabular text-ink/60">
                    {new Date(t.transaction_date).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={t.type === 'receipt' ? 'font-medium text-[#2E7D5B]' : 'font-medium text-[#C1443D]'}>
                      {TYPE_LABELS_FA[t.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 text-ink/60">{METHOD_LABELS_FA[t.method]}</td>
                  <td className="px-4 py-3 text-ink/60">{t.Customer?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-ink/60">{t.Invoice?.invoice_number || '—'}</td>
                  <td className="px-4 py-3 tabular font-medium">{formatCurrency(balanceById[t.id])}</td>
                  <td className="px-4 py-3 text-left">
                    {t.is_voided ? (
                      <span className="text-xs text-ink/40">باطل‌شده</span>
                    ) : (
                      <button onClick={() => handleVoid(t.id)} className="text-[#C1443D] hover:underline">باطل کردن</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت تراکنش جدید">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="نوع تراکنش" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, invoice_id: '' })}>
            <option value="receipt">دریافت</option>
            <option value="payment">پرداخت</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="مبلغ (تومان)" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <Select label="روش" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="cash">نقدی</option>
              <option value="bank_transfer">انتقال بانکی</option>
              <option value="card">کارت</option>
              <option value="cheque">چک</option>
            </Select>
          </div>
          <Input label="تاریخ" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} required />
          <Select
            label="مشتری (اختیاری)"
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value, invoice_id: '' })}
          >
            <option value="">بدون مشتری مشخص</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </Select>
          {form.type === 'receipt' && form.customer_id && (
            <Select label="اتصال به فاکتور (اختیاری)" value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}>
              <option value="">بدون اتصال به فاکتور</option>
              {outstandingInvoicesFor(form.customer_id).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {formatCurrency(inv.total_amount)}
                </option>
              ))}
            </Select>
          )}
          <Input label="توضیحات (اختیاری)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">ثبت تراکنش</Button>
        </form>
      </Modal>
    </Layout>
  );
}
