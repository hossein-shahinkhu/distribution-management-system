# Changelog

All notable changes documented from repository evidence are listed here. Dates use ISO format.

## [Unreleased]

### Added

- **Backend refactor (service extraction)** — Transactional domain logic for sales orders and purchase orders extracted into Express-independent service modules:
  - `backend/src/services/orderService.js` — `createOrder`, `convertToOrder`, `updateOrderStatus`: no `req`/`res` dependency; thrown errors carry `statusCode` for controller forwarding.
  - `backend/src/services/purchaseOrderService.js` — `createPurchaseOrder`, `updatePurchaseOrderStatus`: same pattern.
  - `order.controller.js` and `purchaseOrder.controller.js` reduced to thin HTTP shells that call the service and map results/errors to responses.
  - All business invariants (state machine, inventory lock, stock compensation, server-side totals) remain in the service layer. Controllers no longer contain `sequelize.transaction()` directly.
- **Remaining validation coverage** — All previously unprotected write endpoints now have express-validator rules:
  - `POST /api/categories` — `createCategoryRules`; `category.controller` uses an explicit `ALLOWED_FIELDS` allowlist.
  - `PUT /api/suppliers/:id` — `updateSupplierRules`.
  - `PATCH /api/purchase-orders/:id/status` — `updatePurchaseOrderStatusRules`.
  - New validator files: `category.validators.js`.

- **TASK-08: Validation hardening** — Added express-validator rules to every previously unprotected write endpoint:
  - `PUT /api/customers/:id` — `updateCustomerRules` (optional fields, same constraints as POST)
  - `POST /api/routes` and `PUT /api/routes/:id` — `createRouteRules` / `updateRouteRules` (non-empty name)
  - `POST /api/distributors` and `PUT /api/distributors/:id` — `createDistributorRules` / `updateDistributorRules` (name, phone, commission_rate 0–100, user_id)
  - `PATCH /api/orders/:id/status` — `updateStatusRules` (status must be a valid sales-order status string)
  - `POST /api/invoices` — `createInvoiceRules` (order_id must be a positive integer)
  - `PATCH /api/invoices/:id/payment-status` — `updatePaymentStatusRules` (must be unpaid/partial/paid)
  - `PATCH /api/auth/users/:id` — `updateUserRules` (optional full_name, phone, is_active boolean, commission_rate 0–100, valid role_name)
  - New validator files: `distributor.validators.js`, `user.validators.js`, `route.validators.js`, `invoice.validators.js`; `customer.validators.js` and `order.validators.js` extended
- **`salesperson_id` auto-derive** — `POST /api/orders` no longer accepts a client-supplied `salesperson_id`. The value is now derived server-side from the authenticated user: set to `req.user.id` when the caller's role is `salesperson`, `null` otherwise. This prevents a salesperson from attributing an order to a different user.


- **Order list server-side filters** — `GET /api/orders` now accepts `date_from`, `date_to`, `amount_min`, `amount_max`. `Orders.jsx` advanced filter panel sends these to the backend instead of filtering client-side. 7 new tests in `order-filters.test.js`.
- **`OrderDetail` status change UX** — Replaced the flat dropdown (which showed all statuses including illegal ones) with action buttons showing only the allowed next states. Added `try/catch` so backend errors are shown in the existing banner. Distributor role sees only `delivered`. Terminal states render no widget.
- **Dashboard accurate KPIs** — `Dashboard.jsx` now fetches aggregate counts and revenue from `GET /api/reports/sales`. Recent orders table uses `limit: 10`.

- **Distributor ownership enforcement** — `GET /api/orders/:id` and `PATCH /api/orders/:id/status` now verify that a distributor user's linked `Distributor` record matches `order.distributor_id`, returning HTTP 403 otherwise. The list endpoint already applied this filter; the same logic is now shared via a `resolveDistributorId` helper. A distributor with no linked record receives an empty list and 403 on all direct-access endpoints. 12 new tests in `distributor-ownership.test.js`.

- **M-24: PostgreSQL orders status ENUM fix** — Migration `20260101000024` re-issues `ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'quote'` with `{ transaction: false }`, which is required because PostgreSQL forbids enum mutations inside an open transaction (the root cause of the silent failure in M-10). Migration 10 also updated to pass `{ transaction: false }`. Both are idempotent via `IF NOT EXISTS`. Down is a documented no-op. 4 application-level tests added in `migration-quote-enum.test.js`.
- **TASK-06 — Customer credit usage endpoint**: Fixed `GET /api/customers/:id/credit-usage`. Corrected `Op` import from `sequelize` directly (was incorrectly destructured from the model index). Rewrote outstanding-balance calculation: sums each unpaid/partial invoice's `total_amount` then subtracts non-voided treasury receipts linked to those invoices, yielding the true remaining balance rather than the overstated full invoice total. `available_credit` is `null` when `credit_limit` is 0 (unlimited). Frontend `Customers.jsx` fetches credit usage lazily for each row with a non-zero credit limit after the list loads, then renders a green/amber/red progress bar and a بدهی sub-label.
- **Order state machine** (`backend/src/utils/orderStateMachine.js`): defines explicit allowed transitions for sales orders and purchase orders. `PATCH /api/orders/:id/status` and `PATCH /api/purchase-orders/:id/status` now reject any transition not in the table; unknown or skip-step requests return HTTP 400 with a Persian message identifying the disallowed pair.
- **Sales-order inventory compensation**: cancelling a sales order from `pending`, `confirmed`, `processing`, or `out_for_delivery` restores the previously deducted stock inside the same database transaction. The new `stock_compensated` boolean on `orders` (migration M-22) prevents double restoration on retry. Cancelling from `delivered` or `cancelled` is rejected by the state machine.
- **Purchase-order terminal state enforcement**: `received` and `cancelled` are now terminal states. Any further transition attempt returns HTTP 400. This removes the previous gap where a `received` order could be re-marked `received`, double-increasing stock.
- **Migrations M-22/M-23**: add `stock_compensated` boolean to `orders` and `purchase_orders`.
- **Tests** `order-state-machine.test.js` (16 cases) and `purchaseOrder-state-machine.test.js` (9 cases) cover valid transitions, rejected skip-step and backward transitions, inventory restoration for each cancellable status, idempotency, and terminal-state protection.

### Changed

- `PATCH /api/orders/:id/status` now runs inside a Sequelize transaction (previously a plain `update`), enabling transactional stock compensation and consistent response shape including product details.
- Existing tests in `order.test.js` and `purchaseOrder.test.js` updated to reflect the enforced state machine (direct `pending→delivered` advance replaced with the valid chain; `draft→received` advance replaced with `draft→ordered→received`; `received→received` idempotency test updated to assert HTTP 400).


- Repository maintenance references: `PROJECT_STATE.md`, `DECISIONS.md`, `API_REFERENCE.md`, `DATABASE_REFERENCE.md`, and `CODING_STANDARDS.md`.

### Documented

- Current architecture, API contracts, database schema, completed modules, pending modules, technical debt, known issues, and recommended next tasks.
- Existing but currently broken implementation of `GET /api/customers/:id/credit-usage`, which was still shown as pending in `AI_TASKS.md`.
- Current PostgreSQL quote-status migration gap and resource-authorization risks.

## [1.0.0] - Current Codebase Baseline

### Added

- JWT authentication, role-based access, user administration, activation state, and password changes.
- Product categories, inventory products, search, pagination, soft deactivation, and low-stock reporting.
- Customer management, delivery routes, route assignment, and route-based order filtering.
- Transactional sales orders with stock deduction and document number generation.
- Quote creation without stock deduction and conversion into confirmed inventory-consuming orders.
- Sales invoices generated from orders with tax, due date, and payment status.
- Distributor management, optional account linkage, vehicle information, assignment, and delivery statuses.
- Salesperson and distributor commission rates and delivered-order commission reports.
- Treasury receipts and payments, voiding, filters, and balance reports.
- Automatic sales- and purchase-invoice payment-status synchronization from treasury transactions.
- Suppliers, purchase orders, transactional inventory receipt, and purchase invoices.
- Persian RTL React interface with protected routes, reusable components, responsive navigation, dashboards, forms, filters, tables, and status displays.
- Backend Jest/Supertest coverage for core authentication, sales, purchasing, routing, commission, and treasury flows.
- Docker Compose deployment with PostgreSQL, backend, frontend nginx, Caddy TLS, and database backup/restore scripts.

### Changed

- Backend startup validates critical JWT configuration and checks database connectivity.
- JWT role claims reduce authorization lookup overhead while retaining active-user database checks.
- Common list endpoints use bounded pagination and dialect-compatible case-insensitive search.
- Document numbers use cryptographic random suffixes rather than timestamp-only values.
- Production logs use structured JSON output.
- Performance indexes cover common order, invoice, treasury, purchasing, route, and distributor queries.

### Security

- Added Helmet headers, CORS configuration, bcrypt password hashing, login throttling, general API throttling, allowlisted updates, and request validation on sensitive create operations.

### Known Limitations

- The PostgreSQL order-status enum migration does not yet include `quote`.
- Distributor ownership is not enforced on direct order detail/status endpoints.
- Inventory is not compensated when sales orders are cancelled or received purchase orders are reversed.
- Customer credit usage overstates partially paid invoice exposure.
- Customer credit usage currently fails because its controller imports Sequelize `Op` from the wrong module.
- Frontend automated tests, linting, and CI configuration are not present.
