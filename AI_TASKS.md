# AI Tasks — Distribution Management System UI Redesign

## Completed ✅

- [x] Design system — `tailwind.config.js` extended tokens + `index.css` utility classes
- [x] `Sidebar.jsx` — collapsible, icon-only collapsed state, mobile drawer, localStorage persistence
- [x] `Topbar.jsx` — sticky, breadcrumbs, notification bell, profile dropdown with role badge, password change + toggle
- [x] `Layout.jsx` — responsive shell
- [x] `Button.jsx` — 6 variants, 3 sizes, focus ring
- [x] `Input.jsx` — useId, error/hint/required, wrapperClassName
- [x] `Select.jsx` — custom chevron, wrapperClassName
- [x] `Modal.jsx` — scroll lock, Escape close, mobile bottom-sheet
- [x] `StatCard.jsx` — icon, trend, accent line
- [x] `StatusBadge.jsx` — dot indicator, semantic colors
- [x] `EmptyState.jsx` — icon slot, action prop, improved padding
- [x] `Pagination.jsx` — numbered pages, ellipsis
- [x] `TreasuryQuickEntryModal.jsx` — consistent error banner
- [x] `Login.jsx` — split-panel, password toggle, SVG feature icons
- [x] `Dashboard.jsx` — KPI cards, bar chart, quick actions grid, low-stock banner, recent orders
- [x] `Orders.jsx` — search, status/route filters, create modal
- [x] `OrderDetail.jsx` — status timeline stepper, back link, delivery info, order meta card
- [x] `Products.jsx` — search, stock progress bar, category filter, fieldset modal
- [x] `Customers.jsx` — search, fieldset modal (personal/business sections)
- [x] `Suppliers.jsx` — search, fieldset modal
- [x] `PurchaseOrders.jsx` — search, status filter, receipt action
- [x] `PurchaseInvoices.jsx` — create modal with PO auto-fill
- [x] `Invoices.jsx` — skeleton rows, inline payment select
- [x] `Treasury.jsx` — balance summary hero (receipts/payments/net), colored running balance, type pill badges
- [x] `Reports.jsx` — KPIs, status bar chart, inventory progress bars, commission date filter
- [x] `Distributors.jsx` — info banner, connection status dots
- [x] `Routes.jsx` — clean table + modal
- [x] `Users.jsx` — success banner, create/edit modals

## Next Tasks 📋

- [x] **TASK-01**: `Invoices.jsx` — Added date column, payment summary strip (total/paid/outstanding/overdue count), search + status filter toolbar, overdue row highlight with ⚠ icon for invoices older than 30 days.

- [x] **TASK-02**: `Customers.jsx` — Added route name badge + pin icon in "شهر / مسیر" column, credit limit row with progress bar (hidden on mobile/tablet via `hidden lg:table-cell`), migrated `ErrorAlert` to `.banner.banner-error`.

- [x] **TASK-03**: `Distributors.jsx` — Migrated info banner to `.banner.banner-info`. Added vehicle type dropdown (predefined list) in modal + vehicle type badge in table. Reorganized modal with three fieldsets (Personal / Vehicle / Account+Commission). Migrated `ErrorAlert` and warning to `.banner.banner-error/.banner-warning`.

- [x] **TASK-04**: `Routes.jsx` — Migrated inline `<p>` error to `.banner.banner-error`.

- [x] **TASK-05**: `Orders.jsx` — Collapsible advanced filter panel (date range + amount range). Draft-then-apply UX so filters only commit when "اعمال فیلتر" is clicked. Active-filter count badge on toggle button. Active-filter chip strip shown when panel is collapsed. Amount column hidden below `sm` breakpoint.

- [x] **TASK-06**: Backend `GET /api/customers/:id/credit-usage` — Fixed broken `Op` import (was importing from `../models`, now from `sequelize`). Fixed outstanding-balance calculation to subtract non-voided receipts from each unpaid/partial invoice instead of summing full invoice totals. Frontend `Customers.jsx` now fetches credit usage per row (for customers with a credit limit) and shows a real progress bar coloured green/amber/red by usage percentage, plus the outstanding amount in تومان below the bar.

- [x] **TASK-07**: `Users.jsx` — Colored role badges (`RoleBadge` component) matching Topbar `roleBg` color map exactly. Search bar (name/email/phone) + role dropdown filter. Migrated `ErrorAlert` inline component and success banner to `.banner.banner-{error|success}` CSS classes.

## Rules
- Never generate placeholder code — production-ready only
- Do not break existing functionality
- Follow existing patterns (`.banner.banner-*`, `.card-header`, `.data-table`, etc.)
- All changes must compile (`npm run build` passes with 0 errors)
- RTL layout must be preserved throughout
