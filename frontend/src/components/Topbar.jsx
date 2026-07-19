import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

const ROLE_LABELS = {
  admin:           'مدیر سیستم',
  warehouse_keeper:'انباردار',
  salesperson:     'فروشنده',
  distributor:     'توزیع‌کننده',
};

const BREADCRUMB_MAP = {
  '/':                  ['داشبورد'],
  '/orders':            ['سفارش‌ها'],
  '/products':          ['کالاها و انبار'],
  '/customers':         ['مشتریان'],
  '/routes':            ['مسیرها'],
  '/distributors':      ['توزیع‌کنندگان'],
  '/suppliers':         ['تامین‌کنندگان'],
  '/purchase-orders':   ['سفارش‌های خرید'],
  '/purchase-invoices': ['فاکتورهای خرید'],
  '/invoices':          ['فاکتورها'],
  '/treasury':          ['خزانه‌داری'],
  '/reports':           ['گزارش‌ها'],
  '/users':             ['مدیریت کاربران'],
};

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [modalOpen, setModalOpen]           = useState(false);
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [showCurrent, setShowCurrent]       = useState(false);
  const [showNew, setShowNew]               = useState(false);
  const [message, setMessage]               = useState('');
  const [error, setError]                   = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

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

  const breadcrumbs    = BREADCRUMB_MAP[location.pathname] || [];
  const isOrderDetail  = location.pathname.startsWith('/orders/') && location.pathname !== '/orders';

  // Role badge color
  const roleBg = {
    admin:           'bg-navy-100 text-navy-700',
    warehouse_keeper:'bg-amber-100 text-amber-700',
    salesperson:     'bg-success/10 text-success',
    distributor:     'bg-[#7C5CBF]/10 text-[#7C5CBF]',
  }[user?.role] || 'bg-navy-50 text-navy-600';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-white px-4 md:px-6">
      {/* ── Left: hamburger (mobile) + breadcrumb ── */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/50 transition hover:bg-navy-50 hover:text-ink lg:hidden"
          aria-label="منو"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="مسیر صفحات">
          {breadcrumbs.length === 0 && isOrderDetail ? (
            <>
              <span className="text-muted">سفارش‌ها</span>
              <span className="text-muted/40 text-xs">/</span>
              <span className="truncate font-semibold text-ink">{title}</span>
            </>
          ) : breadcrumbs.length > 0 ? (
            <span className="truncate font-semibold text-ink">{breadcrumbs[0]}</span>
          ) : (
            <span className="truncate font-semibold text-ink">{title}</span>
          )}
        </nav>
      </div>

      {/* ── Right: actions + profile ── */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Notification bell — visual indicator only */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-ink/40 transition hover:bg-navy-50 hover:text-ink"
          aria-label="اعلان‌ها"
          title="اعلان‌ها"
        >
          <svg className="h-4.5 w-4.5 h-[1.125rem] w-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Divider */}
        <div className="mx-0.5 h-6 w-px bg-border" />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-navy-50"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            {/* Avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-white">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            {/* Name + role — hidden on small screens */}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-ink">{user?.full_name}</p>
              <p className="text-2xs leading-tight text-muted">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
            <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="animate-scaleIn absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-white py-1 shadow-dropdown">
              {/* User info header */}
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-ink">{user?.full_name}</p>
                <p className="mt-0.5 text-xs text-muted">{user?.email}</p>
                <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold ${roleBg}`}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
              </div>

              {/* Change password */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setMessage('');
                  setError('');
                  setShowCurrent(false);
                  setShowNew(false);
                  setModalOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-ink/70 transition hover:bg-navy-50 hover:text-ink"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                تغییر رمز عبور
              </button>

              {/* Logout */}
              <div className="mt-1 border-t border-border pt-1">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-danger transition hover:bg-danger/5"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  خروج از سیستم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Change password modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تغییر رمز عبور">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password with toggle */}
          <div className="relative">
            <Input
              label="رمز عبور فعلی"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent((s) => !s)}
              className="absolute left-3 top-[2.2rem] text-muted hover:text-ink transition"
              aria-label={showCurrent ? 'پنهان کردن' : 'نمایش'}
            >
              {showCurrent ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* New password with toggle */}
          <div className="relative">
            <Input
              label="رمز عبور جدید (حداقل ۸ کاراکتر)"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="absolute left-3 top-[2.2rem] text-muted hover:text-ink transition"
              aria-label={showNew ? 'پنهان کردن' : 'نمایش'}
            >
              {showNew ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className="banner banner-error">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          {message && (
            <div className="banner banner-success">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </div>
          )}

          <Button type="submit" className="w-full">ذخیره رمز عبور جدید</Button>
        </form>
      </Modal>
    </header>
  );
}
