import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── SVG icon library ──────────────────────────────────────────
const Icon = ({ name, className = 'w-5 h-5' }) => {
  const icons = {
    dashboard: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    orders: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    products: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    customers: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    routes: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    distributors: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    suppliers: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    purchaseOrders: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    purchaseInvoices: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      </svg>
    ),
    invoices: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    treasury: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    reports: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    chevronLeft: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    ),
    chevronRight: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    ),
    menu: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    close: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };
  return icons[name] ?? null;
};

// ── Navigation structure ──────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'اصلی',
    items: [
      { to: '/', label: 'داشبورد', icon: 'dashboard', roles: ['admin', 'warehouse_keeper', 'salesperson', 'distributor'], exact: true },
      { to: '/orders', label: 'سفارش‌ها', icon: 'orders', roles: ['admin', 'salesperson', 'warehouse_keeper', 'distributor'] },
    ],
  },
  {
    label: 'انبار',
    items: [
      { to: '/products', label: 'کالاها و انبار', icon: 'products', roles: ['admin', 'warehouse_keeper'] },
      { to: '/suppliers', label: 'تامین‌کنندگان', icon: 'suppliers', roles: ['admin', 'warehouse_keeper'] },
      { to: '/purchase-orders', label: 'سفارش‌های خرید', icon: 'purchaseOrders', roles: ['admin', 'warehouse_keeper'] },
      { to: '/purchase-invoices', label: 'فاکتورهای خرید', icon: 'purchaseInvoices', roles: ['admin', 'warehouse_keeper'] },
    ],
  },
  {
    label: 'فروش',
    items: [
      { to: '/customers', label: 'مشتریان', icon: 'customers', roles: ['admin', 'salesperson'] },
      { to: '/invoices', label: 'فاکتورها', icon: 'invoices', roles: ['admin', 'salesperson'] },
      { to: '/treasury', label: 'خزانه‌داری', icon: 'treasury', roles: ['admin', 'salesperson'] },
    ],
  },
  {
    label: 'مدیریت',
    items: [
      { to: '/routes', label: 'مسیرها', icon: 'routes', roles: ['admin'] },
      { to: '/distributors', label: 'توزیع‌کنندگان', icon: 'distributors', roles: ['admin'] },
      { to: '/reports', label: 'گزارش‌ها', icon: 'reports', roles: ['admin', 'salesperson', 'warehouse_keeper'] },
      { to: '/users', label: 'مدیریت کاربران', icon: 'users', roles: ['admin'] },
    ],
  },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('dms_sidebar_collapsed');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('dms_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user?.role)),
  })).filter((group) => group.items.length > 0);

  const sidebarContent = (
    <aside
      className={`
        flex h-full flex-col bg-navy-900
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[4.25rem]' : 'w-64'}
      `}
    >
      {/* ── Logo / brand ─────────────────── */}
      <div className={`relative flex items-center overflow-hidden border-b border-white/8 px-4 py-5 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l9-5 9 5v10l-9 5-9-5V8z" stroke="#1F4B73" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 3v18M3 8l9 5 9-5" stroke="#1F4B73" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate font-display text-sm font-bold leading-tight text-white">پخش کالا</h1>
            <p className="truncate text-2xs text-white/40">سامانه مدیریت توزیع</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`absolute ${collapsed ? 'bottom-1.5 left-1/2 -translate-x-1/2' : 'left-3 top-1/2 -translate-y-1/2'} flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-white/10 hover:text-white`}
          aria-label={collapsed ? 'باز کردن منو' : 'بستن منو'}
        >
          <Icon name={collapsed ? 'chevronLeft' : 'chevronRight'} className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Navigation ───────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {filteredGroups.map((group, gi) => (
          <div key={gi} className="mb-3">
            {!collapsed && (
              <p className="section-title px-5 pb-1 pt-2 text-2xs font-semibold tracking-widest text-white/25">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.exact}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150
                      ${isActive
                        ? 'nav-active bg-white/10 text-white'
                        : 'text-white/55 hover:bg-white/6 hover:text-white/90'
                      }
                      ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`shrink-0 transition-colors ${isActive ? 'text-amber-400' : ''}`}>
                          <Icon name={item.icon} className="h-[1.1rem] w-[1.1rem]" />
                        </span>
                        {!collapsed && (
                          <span className="truncate text-sm">{item.label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────── */}
      <div className={`border-t border-white/8 px-4 py-3 ${collapsed ? 'text-center' : ''}`}>
        {collapsed ? (
          <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-white">
            {user?.full_name?.charAt(0) || '?'}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-white">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/80">{user?.full_name}</p>
              <p className="text-2xs text-white/35">نسخه ۱.۰</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden h-screen shrink-0 lg:flex">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 h-full transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {sidebarContent}
      </div>
    </>
  );
}

export { Icon };
