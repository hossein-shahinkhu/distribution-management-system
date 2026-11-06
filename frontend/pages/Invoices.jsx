import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import TreasuryQuickEntryModal from '../components/TreasuryQuickEntryModal';
import { invoicesApi } from '../api/misc';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

const PAYMENT_STATUS_LABELS = {
  unpaid:  'پرداخت‌نشده',
  partial: 'پرداخت جزئی',
  paid:    'پرداخت‌شده',
};

// An invoice is overdue if unpaid/partial and older than 30 days
function isOverdue(inv) {
  if (!['unpaid', 'partial'].includes(inv.payment_status)) return false;
  const date = inv.issue_date || inv.created_at;
  if (!date) return false;
  return (Date.now() - new Date(date).getTime()) > 30 * 24 * 60 * 60 * 1000;
}

/* ── Payment summary strip ────────────────────────────────── */
function PaymentSummary({ invoices }) {
  const total       = invoices.length;
  const totalAmount = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const paidAmount  = invoices.filter((i) => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0);
  const outstanding = totalAmount - paidAmount;
  const overdueCount = invoices.filter(isOverdue).length;

  return (
    <div className="border-b border-border bg-navy-50/40 px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">کل فاکتورها:</span>
          <span className="tabular font-semibold text-ink">{total}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">پرداخت‌شده:</span>
          <span className="tabular font-semibold text-success">{formatCurrency(paidAmount)}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">مانده بدهی:</span>
          <span className="tabular font-semibold text-danger">{formatCurrency(outstanding)}</span>
        </div>
        {overdueCount > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-sm">
              <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold text-amber-600">{overdueCount} فاکتور سررسید گذشته</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Invoices() {
  const [invoices, setInvoices]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice]   = useState(null);

  // Client-side filters
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');

  function load() {
    setLoading(true);
    invoicesApi.getAll().then((r) => { setInvoices(r.data); setLoading(false); });
  }

  useEffect(load, []);

  async function handlePaymentChange(id, status) {
    await invoicesApi.updatePaymentStatus(id, status);
    load();
  }

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter) result = result.filter((i) => i.payment_status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.Order?.Customer?.full_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, search, statusFilter]);

  return (
    <Layout title="فاکتورها">
      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <Input
              placeholder="جستجوی شماره فاکتور یا نام مشتری..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          {/* Status filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            wrapperClassName="w-44"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="unpaid">پرداخت‌نشده</option>
            <option value="partial">پرداخت جزئی</option>
            <option value="paid">پرداخت‌شده</option>
          </Select>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="card overflow-hidden rounded-2xl">
        {/* Payment summary strip — shown only when data loaded */}
        {!loading && invoices.length > 0 && (
          <PaymentSummary invoices={filtered} />
        )}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>مشتری</th>
                {/* Date hidden on very small screens */}
                <th className="hidden sm:table-cell">تاریخ صدور</th>
                <th>مالیات</th>
                <th>مبلغ کل</th>
                <th>وضعیت پرداخت</th>
                <th>تغییر وضعیت</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[24, 32, 20, 16, 28, 20, 32, 20].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: w * 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={invoices.length === 0 ? 'هنوز فاکتوری صادر نشده' : 'نتیجه‌ای یافت نشد'}
                      description={
                        invoices.length === 0
                          ? 'از صفحه جزئیات سفارش می‌توانید فاکتور صادر کنید.'
                          : 'فیلترها را تغییر دهید.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const overdue = isOverdue(inv);
                  return (
                    <tr
                      key={inv.id}
                      className={overdue ? 'bg-amber-50/60' : ''}
                    >
                      {/* Invoice number */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="tabular font-mono text-xs text-muted">
                            {inv.invoice_number}
                          </span>
                          {overdue && (
                            <span title="سررسید گذشته">
                              <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Customer */}
                      <td className="font-medium">{inv.Order?.Customer?.full_name || '—'}</td>
                      {/* Date — hidden on xs */}
                      <td className="hidden tabular text-sm text-muted sm:table-cell">
                        {formatDate(inv.issue_date || inv.created_at)}
                      </td>
                      {/* Tax rate */}
                      <td className="tabular text-sm text-muted">
                        {inv.tax_rate != null ? `${Number(inv.tax_rate)}٪` : '—'}
                      </td>
                      {/* Amount */}
                      <td className="tabular">{formatCurrency(inv.total_amount)}</td>
                      {/* Status badge */}
                      <td><StatusBadge status={inv.payment_status} /></td>
                      {/* Inline status change */}
                      <td>
                        <Select
                          value={inv.payment_status}
                          onChange={(e) => handlePaymentChange(inv.id, e.target.value)}
                          className="!py-1.5 text-xs"
                        >
                          <option value="unpaid">پرداخت‌نشده</option>
                          <option value="partial">پرداخت جزئی</option>
                          <option value="paid">پرداخت‌شده</option>
                        </Select>
                      </td>
                      {/* Quick receipt */}
                      <td>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setReceiptModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 transition hover:text-navy-700 hover:underline"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ثبت دریافت
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TreasuryQuickEntryModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        type="receipt"
        invoiceId={selectedInvoice?.id}
        customerId={selectedInvoice?.Order?.Customer?.id}
        onSuccess={load}
      />
    </Layout>
  );
}
