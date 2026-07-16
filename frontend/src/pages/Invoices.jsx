import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { invoicesApi } from '../api/misc';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    invoicesApi.getAll().then((r) => {
      setInvoices(r.data);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function handlePaymentChange(id, status) {
    await invoicesApi.updatePaymentStatus(id, status);
    load();
  }

  return (
    <Layout title="فاکتورها">
      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : invoices.length === 0 ? (
        <EmptyState title="هنوز فاکتوری صادر نشده" description="از صفحه جزئیات سفارش می‌توانید فاکتور صادر کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">شماره فاکتور</th>
                <th className="px-4 py-3 font-medium">مشتری</th>
                <th className="px-4 py-3 font-medium">مبلغ کل</th>
                <th className="px-4 py-3 font-medium">وضعیت پرداخت</th>
                <th className="px-4 py-3 font-medium">تغییر وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 tabular">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.Order?.Customer?.full_name || '—'}</td>
                  <td className="px-4 py-3 tabular">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.payment_status} /></td>
                  <td className="px-4 py-3">
                    <Select value={inv.payment_status} onChange={(e) => handlePaymentChange(inv.id, e.target.value)} className="!py-1.5">
                      <option value="unpaid">پرداخت‌نشده</option>
                      <option value="partial">پرداخت جزئی</option>
                      <option value="paid">پرداخت‌شده</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
