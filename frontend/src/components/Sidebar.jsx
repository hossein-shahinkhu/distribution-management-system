import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'داشبورد', roles: ['admin', 'warehouse_keeper', 'salesperson', 'distributor'] },
  { to: '/orders', label: 'سفارش‌ها', roles: ['admin', 'salesperson', 'warehouse_keeper', 'distributor'] },
  { to: '/products', label: 'کالاها و انبار', roles: ['admin', 'warehouse_keeper'] },
  { to: '/customers', label: 'مشتریان', roles: ['admin', 'salesperson'] },
  { to: '/distributors', label: 'توزیع‌کنندگان', roles: ['admin'] },
  { to: '/invoices', label: 'فاکتورها', roles: ['admin', 'salesperson'] },
  { to: '/reports', label: 'گزارش‌ها', roles: ['admin', 'salesperson', 'warehouse_keeper'] },
  { to: '/users', label: 'مدیریت کاربران', roles: ['admin'] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="flex h-screen w-64 flex-col bg-navy-900 text-white">
      {/* عنصر امضا: خط مسیر توزیع به‌عنوان الگوی بصری برند */}
      <div className="relative overflow-hidden px-6 pb-5 pt-6">
        <svg className="pointer-events-none absolute -left-4 top-2 opacity-20" width="140" height="60" viewBox="0 0 140 60">
          <path
            d="M0 45 C 30 45, 30 10, 60 10 S 90 45, 140 45"
            fill="none"
            stroke="#E2A63B"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
          <circle cx="0" cy="45" r="3" fill="#E2A63B" />
          <circle cx="140" cy="45" r="3" fill="#E2A63B" />
        </svg>
        <h1 className="relative font-display text-lg font-bold">پخش کالا</h1>
        <p className="relative text-xs text-white/50">سامانه مدیریت پخش و فروش</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `block rounded-xl px-4 py-2.5 text-sm transition ${
                isActive ? 'bg-white/10 font-semibold text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-white/40">
        نسخه ۱.۰ — پروژه درسی طراحی نرم‌افزار
      </div>
    </aside>
  );
}
