import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import TreasuryQuickEntryModal from '../components/TreasuryQuickEntryModal';
import { purchaseInvoicesApi } from '../api/purchaseInvoices';
import { purchaseOrdersApi } from '../api/purchaseOrders';
import { suppliersApi } from '../api/suppliers';

function formatCurrency(value) {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

const EMPTY_FORM = {
  invoice_number: '', purchase_order_id: '', supplier_id: '',
  issue_date: new Date().toISOString().slice(0, 10), due_date: '',
  subtotal: '', tax_amount: '', total_amount: '',
};

function ErrorAlert({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 rounded-xl bg-danger/8 px-4 py-2.5 text-sm text-danger">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {msg}
    </p>
  );
}

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  function load(page = 1) {
    setLoading(true);
    purchaseInvoicesApi.getAll({ page }).then((r) => {
      setInvoices(r.data.data); setPagination(r.data.pagination); setLoading(false);
    });
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM); setError('');
    Promise.all([suppliersApi.getAll({ limit: 100 }), purchaseOrdersApi.getAll({ limit: 100 })]).then(([s, po]) => {
      setSuppliers(s.data.data); setPurchaseOrders(po.data.data);
    });
    setModalOpen(true);
  }

  function handlePurchaseOrderChange(id) {
    const po = purchaseOrders.find((p) => p.id === Number(id));
    setForm((prev) => ({
      ...prev, purchase_order_id: id,
      supplier_id: po ? String(po.supplier_id) : prev.supplier_id,
      subtotal: po ? po.total_amount : prev.subtotal,
      total_amount: po ? po.total_amount : prev.total_amount,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    try {
      await purchaseInvoicesApi.create({
        ...form,
        purchase_order_id: form.purchase_order_id || null,
        supplier_id: form.supplier_id || null,
        due_date: form.due_date || null,
        subtotal: Number(form.subtotal),
        tax_amount: Number(form.tax_amount || 0),
        total_amount: Number(form.total_amount),
      });
      setModalOpen(false); load(pagination.page);
    } catch (err) { setError(err.response?.data?.message || 'ثبت فاکتور خرید ناموفق بود.'); }
  }

  function f(v) { setForm((p) => ({ ...p, ...v })); }

  return (
    <Layout title="فاکتورهای خرید">
      <div className="mb-5 flex justify-end">
        <Button onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          ثبت فاکتور خرید
        </Button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>تامین‌کننده</th>
                <th>مبلغ کل</th>
                <th>وضعیت پرداخت</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[24, 32, 24, 20, 24].map((w, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: `${w * 4}px` }} /></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="هنوز فاکتور خریدی ثبت نشده" description="از سفارش خرید یا مستقیم فاکتور ثبت کنید." action={<Button onClick={openCreate} size="sm">ثبت فاکتور خرید</Button>} /></td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="tabular font-mono text-xs text-muted">{inv.invoice_number}</td>
                    <td className="font-medium">{inv.Supplier?.name || '—'}</td>
                    <td className="tabular">{formatCurrency(inv.total_amount)}</td>
                    <td><StatusBadge status={inv.payment_status} /></td>
                    <td>
                      <button onClick={() => { setSelectedInvoice(inv); setPaymentModalOpen(true); }}
                        className="text-xs font-medium text-navy-600 hover:underline">
                        ثبت پرداخت
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت فاکتور خرید" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="سفارش خرید (اختیاری)" value={form.purchase_order_id} onChange={(e) => handlePurchaseOrderChange(e.target.value)}>
            <option value="">بدون سفارش خرید (ثبت مستقیم)</option>
            {purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.po_number} — {po.Supplier?.name}</option>)}
          </Select>

          <Select label="تامین‌کننده" value={form.supplier_id} onChange={(e) => f({ supplier_id: e.target.value })} disabled={!!form.purchase_order_id} required>
            <option value="">انتخاب تامین‌کننده...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <Input label="شماره فاکتور تامین‌کننده" value={form.invoice_number} onChange={(e) => f({ invoice_number: e.target.value })} required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="تاریخ صدور" type="date" value={form.issue_date} onChange={(e) => f({ issue_date: e.target.value })} required />
            <Input label="سررسید (اختیاری)" type="date" value={form.due_date} onChange={(e) => f({ due_date: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="جمع جزء" type="number" min="0" value={form.subtotal} onChange={(e) => f({ subtotal: e.target.value })} required />
            <Input label="مالیات" type="number" min="0" value={form.tax_amount} onChange={(e) => f({ tax_amount: e.target.value })} />
            <Input label="مبلغ کل" type="number" min="1" value={form.total_amount} onChange={(e) => f({ total_amount: e.target.value })} required />
          </div>

          <ErrorAlert msg={error} />
          <Button type="submit" className="w-full">ثبت فاکتور خرید</Button>
        </form>
      </Modal>

      <TreasuryQuickEntryModal
        open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}
        type="payment" purchaseInvoiceId={selectedInvoice?.id} onSuccess={load}
      />
    </Layout>
  );
}
