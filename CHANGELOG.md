# Changelog

All notable changes documented from repository evidence are listed here. Dates use ISO format.

## [Unreleased]

### Added

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
