import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { customersApi } from '../api/customers';
import useFinancialRefresh from '../hooks/useFinancialRefresh';

function formatCurrency(v) {
  return new Intl.NumberFormat('fa-IR').format(v) + ' تومان';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fa-IR');
}

const TYPE_LABEL = { invoice: 'فاکتور فروش', receipt: 'رسید دریافت', sales_credit_note: 'اعتبار لغو فروش' };
const TYPE_COLOR = {
  invoice: 'bg-danger/8 text-danger',
  receipt: 'bg-success/8 text-success',
  sales_credit_note: 'bg-success/8 text-success',
};

export default function CustomerStatement() {
  const { id } = useParams();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  const sequence = useRef(0);
  const applied = useRef({ from: '', to: '' });
  async function load(filters = { from, to }) {
    const seq = ++sequence.current;
    applied.current = filters;
    setLoading(true); setError(''); setStatement(null);
    try {
      const r = await customersApi.getStatement(id, { from: filters.from || undefined, to: filters.to || undefined });
      if (seq === sequence.current) setStatement(r.data);
    } catch (err) {
      if (seq === sequence.current) setError(err.response?.data?.message || 'دریافت گردش مالی ناموفق بود.');
    } finally { if (seq === sequence.current) setLoading(false); }
  }
  useEffect(() => { load(); return () => { sequence.current++; }; }, [id]);
  useFinancialRefresh(() => load(applied.current));
  const title = statement
    ? `گردش مالی — ${statement.customer.full_name}`
    : 'گردش مالی مشتری';

  return (
    <Layout title={title}>
      {/* Back link */}
      <div className="mb-5">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          بازگشت به مشتریان
        </Link>
      </div>

      {/* Customer summary */}
      {statement && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card rounded-2xl p-4">
            <p className="text-xs text-muted">مشتری</p>
            <p className="mt-1 font-bold text-ink">{statement.customer.full_name}</p>
          </div>
          <div className="card rounded-2xl p-4">
            <p className="text-xs text-muted">سقف اعتبار</p>
            <p className="tabular mt-1 font-bold text-ink">
              {statement.customer.credit_limit == null ? '—' : statement.customer.credit_limit > 0
                ? formatCurrency(statement.customer.credit_limit)
                : 'بدون محدودیت'}
            </p>
          </div>
          <div className={`card rounded-2xl p-4 ${statement.closing_balance > 0 ? 'border-danger/20 bg-danger/3' : 'border-success/20 bg-success/3'}`}>
            <p className="text-xs text-muted">مانده پایان بازه{statement.scope === 'salesperson_orders' && ' — فقط سفارش‌های شما'}</p><p className="text-danger">بدهی: {formatCurrency(statement.outstanding_balance)}</p><p className="text-success">بستانکاری: {formatCurrency(statement.credit_balance)}</p>
            <p className={`tabular mt-1 text-lg font-bold ${statement.closing_balance > 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(Math.abs(statement.closing_balance))}
              {statement.closing_balance > 0 ? ' (بدهکار)' : statement.closing_balance < 0 ? ' (بستانکار)' : ' (بدون بدهی)'}
            </p>
          </div>
        </div>
      )}

      {/* Date filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Input
          label="از تاریخ"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          wrapperClassName="w-44"
        />
        <Input
          label="تا تاریخ"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          wrapperClassName="w-44"
        />
        <Button variant="outline" onClick={() => load()} className="mb-0.5" disabled={loading}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          اعمال فیلتر
        </Button>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); load({ from: '', to: '' }); }} className="mb-0.5">
            پاک کردن
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 banner banner-error">
          <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <Button variant="ghost" onClick={() => load()}>تلاش مجدد</Button>
        </div>
      )}

      {/* Statement table */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>نوع</th>
                <th>مرجع</th>
                <th className="text-danger">بدهکار</th>
                <th className="text-success">بستانکار</th>
                <th>مانده</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[20, 24, 36, 24, 24, 24].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4" style={{ width: w * 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !statement || statement.entries.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="هیچ تراکنشی در این بازه وجود ندارد"
                      description="بازه تاریخ را تغییر دهید یا فیلتر را پاک کنید."
                    />
                  </td>
                </tr>
              ) : (
                statement.entries.map((entry, i) => {
                  const isPositive = entry.balance >= 0;
                  return (
                    <tr key={i}>
                      <td className="tabular text-sm text-muted">{formatDate(entry.date)}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLOR[entry.type] || 'bg-navy-50 text-navy-600'}`}>
                          {TYPE_LABEL[entry.type] || entry.type}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-muted">{entry.reference}</td>
                      <td className="tabular font-medium text-danger">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                      </td>
                      <td className="tabular font-medium text-success">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </td>
                      <td className={`tabular font-bold text-sm ${isPositive ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(Math.abs(entry.balance))}
                        {isPositive ? ' د' : ' ب'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer totals */}
        {statement && statement.entries.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-navy-50/40 px-5 py-3 text-sm">
            <span className="text-muted">
              مانده نهایی:
              <span className={`mr-1 font-bold ${statement.closing_balance > 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(Math.abs(statement.closing_balance))}
                {statement.closing_balance > 0 ? ' (بدهکار)' : statement.closing_balance < 0 ? ' (بستانکار)' : ' (بدون بدهی)'}
              </span>
            </span>
            <span className="text-muted tabular">{statement.entries.length} ردیف</span>
          </div>
        )}
      </div>
    </Layout>
  );
}
