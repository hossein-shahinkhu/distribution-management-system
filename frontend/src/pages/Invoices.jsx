import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import TreasuryQuickEntryModal from '../components/TreasuryQuickEntryModal';
import { invoicesApi } from '../api/misc';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  function load() {
    setLoading(true);
    invoicesApi.getAll().then((r) => { setInvoices(r.data); setLoading(false); });
  }

  useEffect(load, []);

  async function handlePaymentChange(id, status) {
    await invoicesApi.updatePaymentStatus(id, status);
    load();
  }

  return (
    <Layout title="فاکتورها">
      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>مشتری</th>
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
                    {[24, 32, 28, 20, 32, 20].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="هنوز فاکتوری صادر نشده"
                      description="از صفحه جزئیات سفارش می‌توانید فاکتور صادر کنید."
                    />
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="tabular font-mono text-xs text-muted">{inv.invoice_number}</td>
                    <td className="font-medium">{inv.Order?.Customer?.full_name || '—'}</td>
                    <td className="tabular">{formatCurrency(inv.total_amount)}</td>
                    <td><StatusBadge status={inv.payment_status} /></td>
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
                    <td>
                      <button
                        onClick={() => { setSelectedInvoice(inv); setReceiptModalOpen(true); }}
                        className="text-xs font-medium text-navy-600 hover:underline"
                      >
                        ثبت دریافت
                      </button>
                    </td>
                  </tr>
                ))
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
