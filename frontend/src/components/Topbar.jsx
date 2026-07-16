import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

const ROLE_LABELS = {
  admin: 'مدیر سیستم',
  warehouse_keeper: 'انباردار',
  salesperson: 'فروشنده',
  distributor: 'توزیع‌کننده',
};

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleChangePassword(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage('رمز عبور با موفقیت تغییر کرد.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'تغییر رمز عبور ناموفق بود.');
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-navy-100 bg-white px-8 py-4">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setModalOpen(true);
            setMessage('');
            setError('');
          }}
          className="text-left hover:opacity-70"
        >
          <p className="text-sm font-medium text-ink">{user?.full_name}</p>
          <p className="text-xs text-ink/40">{ROLE_LABELS[user?.role] || user?.role}</p>
        </button>
        <Button variant="outline" onClick={logout}>
          خروج
        </Button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تغییر رمز عبور">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="رمز عبور فعلی"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="رمز عبور جدید (حداقل ۸ کاراکتر)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-[#C1443D]">{error}</p>}
          {message && <p className="text-sm text-[#2E7D5B]">{message}</p>}
          <Button type="submit" className="w-full">تغییر رمز عبور</Button>
        </form>
      </Modal>
    </header>
  );
}
