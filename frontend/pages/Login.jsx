import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate   = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'اطلاعات ورود نادرست است. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas" dir="rtl">
      {/* ── Decorative left panel — hidden on mobile ── */}
      <div className="relative hidden flex-1 overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Background geometry */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Large hex pattern */}
          <svg className="absolute -bottom-20 -left-20 opacity-[0.04]" width="560" height="560" viewBox="0 0 560 560">
            <circle cx="280" cy="280" r="260" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="280" cy="280" r="190" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="280" cy="280" r="120" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="280" cy="280" r="60"  stroke="white" strokeWidth="1.5" fill="none" />
          </svg>
          {/* Grid dots */}
          <svg className="absolute top-0 right-0 h-full w-full opacity-[0.03]" viewBox="0 0 400 600">
            {Array.from({ length: 12 }, (_, r) =>
              Array.from({ length: 8 }, (_, c) => (
                <circle key={`${r}-${c}`} cx={c * 50 + 25} cy={r * 50 + 25} r="1.5" fill="white" />
              ))
            )}
          </svg>
        </div>

        {/* Brand */}
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 8l9-5 9 5v10l-9 5-9-5V8z" stroke="#1F4B73" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 3v18M3 8l9 5 9-5" stroke="#1F4B73" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-8 text-3xl font-bold leading-tight text-white">
            سیستم مدیریت<br />پخش و توزیع کالا
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/50">
            مدیریت یکپارچه سفارش‌ها، انبار، فاکتورها،<br />
            مسیرهای توزیع و گزارش‌های تحلیلی
          </p>
        </div>

        {/* Feature list */}
        <div className="relative space-y-5">
          {[
            {
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              ),
              text: 'مدیریت موجودی انبار و کالاها',
            },
            {
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              ),
              text: 'پیگیری مسیر و توزیع‌کنندگان',
            },
            {
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              text: 'گزارش‌های فروش و پورسانت',
            },
            {
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              text: 'خزانه‌داری و مدیریت فاکتورها',
            },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/60">
                {item.icon}
              </div>
              <span className="text-sm text-white/60">{item.text}</span>
            </div>
          ))}
        </div>

        <p className="relative text-xs text-white/20">نسخه ۱.۰ — سامانه مدیریت توزیع</p>
      </div>

      {/* ── Right: login form ── */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[480px] lg:shrink-0">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 8l9-5 9 5v10l-9 5-9-5V8z" stroke="#E2A63B" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-ink">پخش کالا</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-ink">خوش آمدید</h2>
            <p className="mt-1.5 text-sm text-muted">
              برای ادامه وارد حساب کاربری خود شوید
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="ایمیل"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="[email protected]"
              autoComplete="email"
              required
            />

            {/* Password with show/hide toggle */}
            <div className="relative">
              <Input
                label="رمز عبور"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute left-3 top-[2.25rem] text-muted transition hover:text-ink focus-visible:outline-none"
                aria-label={showPass ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPass ? (
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

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  در حال ورود...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ورود به سیستم
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted">
            سیستم مدیریت پخش کالا — نسخه ۱.۰
          </p>
        </div>
      </div>
    </div>
  );
}
