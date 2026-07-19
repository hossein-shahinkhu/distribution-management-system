import { useEffect, useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { treasuryApi } from '../api/misc';

const EMPTY_FORM = {
  amount: '',
  method: 'cash',
  transaction_date: new Date().toISOString().slice(0, 10),
  description: '',
};

// مودال ثبت سریع یک تراکنش خزانه‌داری، متصل به یک فاکتور فروش یا فاکتور خرید
// مشخص. برای فاکتور فروش: type="receipt" و invoiceId (+ customerId اختیاری).
// برای فاکتور خرید: type="payment" و purchaseInvoiceId.
export default function TreasuryQuickEntryModal({
  open,
  onClose,
  type,
  invoiceId,
  purchaseInvoiceId,
  customerId,
  onSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError('');
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await treasuryApi.create({
        type,
        amount: Number(form.amount),
        method: form.method,
        transaction_date: form.transaction_date,
        description: form.description,
        invoice_id: invoiceId || null,
        purchase_invoice_id: purchaseInvoiceId || null,
        customer_id: customerId || null,
      });
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت تراکنش ناموفق بود.');
    }
  }

  const title = type === 'receipt' ? 'ثبت دریافت' : 'ثبت پرداخت';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="مبلغ (تومان)"
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <Select label="روش" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
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
          onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
          required
        />
        <Input
          label="توضیحات (اختیاری)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {error && <p className="text-sm text-[#C1443D]">{error}</p>}
        <Button type="submit" className="w-full">{title}</Button>
      </form>
    </Modal>
  );
}
