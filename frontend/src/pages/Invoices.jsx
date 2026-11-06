import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import TreasuryQuickEntryModal from '../components/TreasuryQuickEntryModal';
import { invoicesApi } from '../api/misc';
import useFinancialRefresh from '../hooks/useFinancialRefresh';
import { documentLabels, settlementLabels, formatMoney, financialError } from '../utils/financial';
import { useAuth } from '../context/AuthContext';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const sequence = useRef(0);
  async function load() {
    const seq = ++sequence.current;
    setLoading(true); setError('');
    try {
      const res = await invoicesApi.getAll({ include_summary: true, search,
        document_status: filter === 'cancelled' ? 'cancelled' : undefined,
        settlement_status: filter && filter !== 'cancelled' ? filter : undefined });
      if (seq === sequence.current) { setInvoices(res.data.data); setSummary(res.data.summary); }
    } catch (err) {
      if (seq === sequence.current) { setError(financialError(err)); setInvoices([]); setSummary(null); }
    } finally { if (seq === sequence.current) setLoading(false); }
  }
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => { clearTimeout(timer); sequence.current++; };
  }, [search, filter]);
  useFinancialRefresh(load);
  const canReceive = ['admin', 'salesperson'].includes(user?.role);
  return (
    <Layout title="فاکتورها">
      <div className="mb-5 flex flex-wrap gap-3">
        <Input placeholder="شماره فاکتور یا نام مشتری" value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">همه اسناد</option>
          <option value="unpaid">فعال — پرداخت‌نشده</option>
          <option value="partial">فعال — پرداخت جزئی</option>
          <option value="paid">فعال — تسویه‌شده</option>
          <option value="credit">فعال — مازاد دریافت</option>
          <option value="cancelled">ابطال‌شده</option>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>تازه‌سازی</Button>
      </div>
      {error && <div className="banner banner-error mb-5" role="alert">{error}<Button variant="ghost" onClick={load}>تلاش مجدد</Button></div>}
      {!loading && summary && <div className="card mb-5 flex flex-wrap gap-5 p-4 text-sm">
        <span>اسناد: {summary.count}</span>
        <span>مبلغ اصلی: {formatMoney(summary.original_total)}</span>
        <span>دریافت واقعی: {formatMoney(summary.received_amount)}</span>
        <span>اعتبار ابطال: {formatMoney(summary.credited_total)}</span>
        <span className="text-danger">مطالبات فاکتورها: {formatMoney(summary.outstanding_amount)}</span>
        <span className="text-success">مازاد دریافت فاکتورها: {formatMoney(summary.credit_balance)}</span>
        <span className="text-muted">مانده خالص مشتری در صفحه مشتریان نمایش داده می‌شود.</span>
      </div>}
      <div className="card overflow-hidden rounded-2xl"><div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>فاکتور / مشتری</th><th>تاریخ / سررسید</th><th>مبلغ اصلی</th><th>دریافت واقعی</th><th>اعتبار ابطال</th><th>خالص فروش</th><th>مانده مؤثر</th><th>وضعیت سند / تسویه</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9}><div className="skeleton h-24" /></td></tr>
              : invoices.length === 0 ? <tr><td colSpan={9}><EmptyState title={error ? 'اطلاعات دریافت نشد' : 'فاکتوری یافت نشد'} /></td></tr>
              : invoices.map(inv => <tr key={inv.id}>
                <td><span className="font-mono text-xs">{inv.invoice_number}</span><span className="block">{inv.Order?.Customer?.full_name}</span></td>
                <td className="text-xs">{new Date(inv.issue_date).toLocaleDateString('fa-IR')}<span className="block">سررسید: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fa-IR') : '—'}</span></td>
                <td className="tabular">{formatMoney(inv.original_total)}</td>
                <td className="tabular">{formatMoney(inv.received_amount)}</td>
                <td className="tabular">{formatMoney(inv.credited_total)}<span className="block font-mono text-xs">{inv.SalesCreditNote?.credit_number}</span></td>
                <td className="tabular">{formatMoney(inv.net_total)}</td>
                <td className="tabular"><span className="text-danger">بدهی: {formatMoney(inv.outstanding_amount)}</span>{inv.credit_balance > 0 && <span className="block text-success">مازاد دریافت: {formatMoney(inv.credit_balance)}</span>}</td>
                <td><span className={inv.document_status === 'cancelled' ? 'font-bold text-danger' : ''}>{documentLabels[inv.document_status]}</span><span className="block text-sm">{settlementLabels[inv.settlement_status]}</span></td>
                <td>{canReceive && inv.document_status === 'active' && inv.outstanding_amount > 0 && <Button variant="outline" onClick={() => setSelected(inv)}>ثبت دریافت</Button>}</td>
              </tr>)}
          </tbody>
        </table>
      </div></div>
      <TreasuryQuickEntryModal open={!!selected} onClose={() => setSelected(null)} type="receipt"
        invoiceId={selected?.id} customerId={selected?.Order?.Customer?.id} onSuccess={load} onConflict={load} />
    </Layout>
  );
}
