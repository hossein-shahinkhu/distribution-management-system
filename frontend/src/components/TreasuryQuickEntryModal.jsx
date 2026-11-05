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

export default function TreasuryQuickEntryModal({
  open, onClose, type, invoiceId, purchaseInvoiceId, customerId, onSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setError(''); setSaving(false); }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await treasuryApi.create({
        type, amount: Number(form.amount), method: form.method,
        transaction_date: form.transaction_date, description: form.description,
        invoice_id: invoiceId || null,
        purchase_invoice_id: purchaseInvoiceId || null,
        customer_id: customerId || null,
      });
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت تراکنش ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  const title = type === 'receipt' ? 'ثبت دریافت' : 'ثبت پرداخت';

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title={title} saving={saving}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="مبلغ (تومان)"
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => f({ amount: e.target.value })}
            required
          />
          <Select label="روش" value={form.method} onChange={(e) => f({ method: e.target.value })}>
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
          ) : title}
        </Button>
      </form>
    </Modal>
  );
}
