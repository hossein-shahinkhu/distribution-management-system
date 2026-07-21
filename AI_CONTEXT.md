# AI Context — Distribution Management System

## Project Overview
A full-stack Distribution Management System (سیستم مدیریت پخش کالا) built as a university capstone project.

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS (RTL, Persian/Farsi)
- **Backend**: Node.js + Express + PostgreSQL (Sequelize ORM)
- **Auth**: JWT stored in `localStorage` as `dms_token` + `dms_user`
- **Font**: Vazirmatn (Google Fonts, loaded in `frontend/index.html`)
- **Direction**: RTL (`dir="rtl"` on `<html>`)

## Roles
- `admin` — full access
- `warehouse_keeper` — inventory, products, suppliers, purchase orders
- `salesperson` — customers, orders, invoices, treasury
- `distributor` — view/update assigned orders

## Design System
- **Color tokens**: `navy-{50..900}`, `amber-{50..600}`, `canvas`, `surface`, `border`, `muted`, `ink`, `success`, `danger`, `warning`, `info`
- **CSS utility classes** (in `frontend/src/index.css`):
  - `.card` — white card with border + shadow
  - `.card-header` — flex header inside card (title + action)
  - `.data-table` — full-width responsive table
  - `.skeleton` — shimmer loading placeholder
  - `.banner` + `.banner-{info|success|warning|error}` — notification banners
  - `.quick-action` — dashboard shortcut button with hover lift
  - `.stepper` / `.stepper-item` / `.stepper-circle` / `.stepper-label` — order timeline
  - `.progress-bar` / `.progress-bar-fill` — stock level indicator
  - `.nav-active` — sidebar active link highlight
  - `.section-title` — uppercase muted section label
  - `.status-dot` — CSS-only dot + label
  - `.pill` — mini badge
  - `.tabular` — tabular-nums
- **Tailwind config**: `frontend/tailwind.config.js` — extended with full token scale + animations (shimmer, fadeIn, slideIn, scaleIn, spring easing)

## Component Library (`frontend/src/components/`)
| Component | Description |
|---|---|
| `Layout.jsx` | Responsive shell with mobile sidebar state |
| `Sidebar.jsx` | Collapsible nav (w-64 ↔ w-17), localStorage persistence, mobile drawer, exports `Icon` |
| `Topbar.jsx` | Sticky header, breadcrumbs, notification bell, profile dropdown with role badge, password change modal |
| `Button.jsx` | 6 variants (primary/amber/ghost/danger/outline/soft), 3 sizes |
| `Input.jsx` | useId, error/hint/required, wrapperClassName |
| `Select.jsx` | Custom chevron, same API as Input |
| `Modal.jsx` | Body scroll lock, Escape close, bottom-sheet on mobile |
| `StatCard.jsx` | Icon slot, trend indicator, top accent line |
| `StatusBadge.jsx` | Dot + label, semantic color map |
| `EmptyState.jsx` | Icon slot, action prop |
| `Pagination.jsx` | Numbered pages with ellipsis |
| `TreasuryQuickEntryModal.jsx` | Quick receipt/payment entry |

## Pages (`frontend/src/pages/`)
| Page | Route | Roles |
|---|---|---|
| Login | /login | public |
| Dashboard | / | all |
| Orders | /orders | all |
| OrderDetail | /orders/:id | all |
| Products | /products | admin, warehouse_keeper |
| Customers | /customers | admin, salesperson |
| Suppliers | /suppliers | admin, warehouse_keeper |
| PurchaseOrders | /purchase-orders | admin, warehouse_keeper |
| PurchaseInvoices | /purchase-invoices | admin, warehouse_keeper |
| Invoices | /invoices | admin, salesperson |
| Treasury | /treasury | admin, salesperson |
| Distributors | /distributors | admin |
| Routes | /routes | admin |
| Reports | /reports | admin, salesperson, warehouse_keeper |
| Users | /users | admin |

## API Layer (`frontend/src/api/`)
- `auth.js` — login, changePassword
- `client.js` — axios instance with JWT interceptor
- `customers.js`, `orders.js`, `products.js`, `suppliers.js`, `users.js`
- `purchaseOrders.js`, `purchaseInvoices.js`
- `misc.js` — routes, distributors, invoices, treasury, reports

## Key Patterns
- All forms use `<fieldset>/<legend>` grouping
- Error alerts use `.banner.banner-error` CSS class (not inline `<p>` tags)
- Skeleton loading uses `.skeleton` CSS class with explicit width
- Tables are wrapped in `<div class="card overflow-hidden rounded-2xl"><div class="overflow-x-auto">`
- Section headers in cards use `.card-header` CSS class
- Banners (info/warning/success/error) use `.banner .banner-{type}` CSS classes
- `formatCurrency(value)` = `new Intl.NumberFormat('fa-IR').format(value) + ' تومان'`
