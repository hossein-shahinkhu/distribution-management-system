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
  invoice_number: '',
  purchase_order_id: '',
  supplier_id: '',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  subtotal: '',
  tax_amount: '',
  total_amount: '',
};

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
      setInvoices(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError('');
    Promise.all([suppliersApi.getAll({ limit: 100 }), purchaseOrdersApi.getAll({ limit: 100 })]).then(([s, po]) => {
      setSuppliers(s.data.data);
      setPurchaseOrders(po.data.data);
    });
    setModalOpen(true);
  }

  function handlePurchaseOrderChange(purchaseOrderId) {
    const po = purchaseOrders.find((p) => p.id === Number(purchaseOrderId));
    setForm({
      ...form,
      purchase_order_id: purchaseOrderId,
      supplier_id: po ? String(po.supplier_id) : form.supplier_id,
      subtotal: po ? po.total_amount : form.subtotal,
      total_amount: po ? po.total_amount : form.total_amount,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت فاکتور خرید ناموفق بود.');
    }
  }

  function openPaymentModal(invoice) {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  }

  return (
    <Layout title="فاکتورهای خرید">
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>+ ثبت فاکتور خرید</Button>
      </div>

      {loading ? (
        <p className="text-ink/40">در حال بارگذاری...</p>
      ) : invoices.length === 0 ? (
        <EmptyState title="هنوز فاکتور خریدی ثبت نشده" description="از سفارش خرید یا مستقیم فاکتور ثبت کنید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-navy-50 text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">شماره فاکتور</th>
                <th className="px-4 py-3 font-medium">تامین‌کننده</th>
                <th className="px-4 py-3 font-medium">مبلغ کل</th>
                <th className="px-4 py-3 font-medium">وضعیت پرداخت</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-navy-100">
                  <td className="px-4 py-3 tabular">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.Supplier?.name || '—'}</td>
                  <td className="px-4 py-3 tabular">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.payment_status} /></td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => openPaymentModal(inv)} className="text-navy-600 hover:underline">ثبت پرداخت</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ثبت فاکتور خرید" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="سفارش خرید (اختیاری)"
            value={form.purchase_order_id}
            onChange={(e) => handlePurchaseOrderChange(e.target.value)}
          >
            <option value="">بدون سفارش خرید (ثبت مستقیم)</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>{po.po_number} — {po.Supplier?.name}</option>
            ))}
          </Select>

          <Select
            label="تامین‌کننده"
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            disabled={!!form.purchase_order_id}
            required
          >
            <option value="">انتخاب تامین‌کننده...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>

          <Input
            label="شماره فاکتور تامین‌کننده"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="تاریخ صدور" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} required />
            <Input label="سررسید (اختیاری)" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="جمع جزء" type="number" min="0" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} required />
            <Input label="مالیات" type="number" min="0" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
            <Input label="مبلغ کل" type="number" min="1" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required />
          </div>

          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          <Button type="submit" className="w-full">ثبت فاکتور خرید</Button>
        </form>
      </Modal>

      <TreasuryQuickEntryModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        type="payment"
        purchaseInvoiceId={selectedInvoice?.id}
        onSuccess={load}
      />
    </Layout>
  );
}
