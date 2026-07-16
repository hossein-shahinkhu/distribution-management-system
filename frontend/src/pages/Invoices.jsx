import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { invoicesApi, treasuryApi } from '../api/misc';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const EMPTY_RECEIPT_FORM = {
  invoice_id: '',
  customer_id: '',
  amount: '',
  method: 'cash',
  transaction_date: new Date().toISOString().slice(0, 10),
  description: '',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState(EMPTY_RECEIPT_FORM);
  const [receiptError, setReceiptError] = useState('');

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

  function openReceiptModal(invoice) {
    setReceiptError('');
    setReceiptForm({
      ...EMPTY_RECEIPT_FORM,
      invoice_id: invoice.id,
      customer_id: invoice.Order?.Customer?.id || '',
    });
    setReceiptModalOpen(true);
  }

  async function handleReceiptSubmit(e) {
    e.preventDefault();
    setReceiptError('');
    try {
      await treasuryApi.create({
        type: 'receipt',
        invoice_id: receiptForm.invoice_id,
        customer_id: receiptForm.customer_id || null,
        amount: Number(receiptForm.amount),
        method: receiptForm.method,
        transaction_date: receiptForm.transaction_date,
        description: receiptForm.description,
      });
      setReceiptModalOpen(false);
      load();
    } catch (err) {
      setReceiptError(err.response?.data?.message || 'ثبت دریافت ناموفق بود.');
    }
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
                <th className="px-4 py-3 font-medium"></th>
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
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openReceiptModal(inv)} className="text-navy-600 hover:underline">ثبت دریافت</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="ثبت دریافت">
        <form onSubmit={handleReceiptSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="مبلغ (تومان)" type="number" min="1" value={receiptForm.amount} onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} required />
            <Select label="روش" value={receiptForm.method} onChange={(e) => setReceiptForm({ ...receiptForm, method: e.target.value })}>
              <option value="cash">نقدی</option>
              <option value="bank_transfer">انتقال بانکی</option>
              <option value="card">کارت</option>
              <option value="cheque">چک</option>
            </Select>
          </div>
          <Input label="تاریخ" type="date" value={receiptForm.transaction_date} onChange={(e) => setReceiptForm({ ...receiptForm, transaction_date: e.target.value })} required />
          <Input label="توضیحات (اختیاری)" value={receiptForm.description} onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })} />
          {receiptError && <p className="text-sm text-[#C1443D]">{receiptError}</p>}
          <Button type="submit" className="w-full">ثبت دریافت</Button>
        </form>
      </Modal>
    </Layout>
  );
}
