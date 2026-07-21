# Project State

Last reviewed: 2026-07-21

## Summary

This repository contains a Persian, RTL distribution management web application. It covers the operational flow from product and customer management through sales orders, inventory movement, invoicing, delivery assignment, treasury entries, purchasing, and management reports.

The application is implemented as:

- React 18 single-page frontend built with Vite and Tailwind CSS.
- Express 4 REST API using Sequelize 6.
- PostgreSQL in development and production.
- In-memory SQLite for automated backend tests.
- Docker Compose deployment with PostgreSQL, backend, frontend nginx, and Caddy TLS termination.

The source code is the authority for this document. Older overview documents do not describe every module currently present.

## Current Architecture

### Request flow

`React page -> Axios API client -> Express route -> authentication/authorization/validation middleware -> controller -> Sequelize model -> database`

The backend is a modular monolith. Domain logic currently lives primarily in controllers, with shared cross-domain operations in `backend/src/utils/`.

### Runtime topology

- Caddy accepts HTTP/HTTPS traffic.
- `/api/*` traffic is forwarded to the backend container.
- Other traffic is forwarded to the frontend nginx container.
- The backend waits for PostgreSQL, runs pending Sequelize migrations, then starts the API.
- PostgreSQL data, Caddy data, and Caddy configuration use Docker volumes.

### Security model

- JWT bearer authentication.
- Role-based route authorization for `admin`, `warehouse_keeper`, `salesperson`, and `distributor`.
- Active-user lookup on every authenticated request.
- Password hashing with bcrypt.
- Helmet security headers.
- Login and general API rate limiting outside the test environment.
- Express-validator on selected write endpoints.
- Production startup rejects a missing or shorter-than-32-character `JWT_SECRET`.

## Completed Modules

| Module | Implemented behavior |
|---|---|
| Authentication and users | Login, current-user lookup, admin-created accounts, user update, activation state, password change, roles, commission rate |
| Categories and products | Category listing/creation/removal, product CRUD, soft deactivation, pagination, search, low-stock query |
| Customers and routes | Customer CRUD, route CRUD, customer route assignment, order filtering by route, customer credit-usage endpoint |
| Sales orders | Transactional creation, stock locking and deduction, quote creation, quote conversion, pagination, status filtering, distributor assignment |
| Sales invoices | One invoice per order, fixed 9% tax calculation, 14-day due date, payment status |
| Distribution | Distributor records, optional user linkage, vehicle data, soft deactivation, assigned-order list restriction |
| Treasury | Receipts/payments, customer/sales-invoice/purchase-invoice linkage, pagination and filters, voiding, automatic payment-status synchronization |
| Suppliers and purchasing | Supplier CRUD, purchase orders and items, stock increase on first receipt transition, direct or PO-linked purchase invoices |
| Reports | Sales totals, inventory valuation and low-stock count, distributor performance, commissions, treasury balance |
| Frontend shell | Authentication context, protected routes, responsive RTL layout, reusable forms, modals, tables, banners, pagination, status components |
| Deployment | Docker images, Compose stack, Caddy TLS proxy, database backup and restore scripts |
| Backend tests | Authentication, products, orders, quotes, routes, suppliers, purchase orders, purchase invoices, treasury, and commissions |

## Pending Modules

These are documented product directions and are not present in the current source:

- Hierarchical product/customer grouping.
- General ledger, accounting documents, trial balance, and full financial accounting.
- Payroll.
- Iranian taxpayer-system integration.
- Batch/lot and expiration tracking.
- Mobile applications, GPS visitor tracking, online distribution manifests, and SMS integration.
- Multi-factor authentication and dedicated remote-access infrastructure.

## Technical Debt

### Medium priority

- No remaining validation gaps on write endpoints (category creation was the last one; now covered).
- Invoice tax is hard-coded at 9% and monetary/business configuration is not centralized.
- Several list endpoints are unpaginated (`categories`, `distributors`, `invoices`, `routes`, `users`, and reports).
- Controllers contain most business logic; service boundaries are only present for payment synchronization and small helpers.

### Lower priority

- No frontend automated test suite is configured.
- No lint or formatting scripts are configured in either package.
- No OpenAPI schema or generated client exists; API documentation is maintained manually.
- JWT tokens are stored in `localStorage`, which increases the impact of a successful XSS attack.
- Structured logging exists, but there is no request correlation ID, audit log, or metrics integration.
- The frontend loads the Vazirmatn font from Google Fonts, creating an external runtime dependency.

## Known Issues

- Backend tests and the frontend build could not be executed during the 2026-07-21 review because the environment exposes a Windows `npm` shim at `/mnt/c/nvm4w/nodejs/npm` but no runnable Linux `node` executable.
- `README.md` displays an obfuscated default admin email, while the seeder actually creates `hossein@test.com`.
- `AI_TASKS.md` still marks the customer credit endpoint as pending even though the backend route and controller exist.
- `ARCHITECTURE.md` shows only the original sales-domain tables and omits routes, treasury, suppliers, purchase orders, purchase invoices, commissions, and quote state.
- The reports page is available to salesperson and warehouse roles, but individual report requests are role-specific; rejected calls are handled through `Promise.allSettled`, so each role sees only its permitted datasets.

## Recommended Next Tasks

1. Enforce resource-level authorization for distributor order detail and status changes.
2. Expand request validation and negative authorization tests for every write endpoint.
3. Add backend support for date/amount range filters on the order list endpoint.
4. Establish Linux Node.js tooling in CI and run backend tests plus the frontend production build on every change.
5. Add frontend component/page tests for authentication, role routing, order creation, invoice payment, and treasury flows.

## Maintenance Workflow

For future work:

1. Analyze the requested behavior and compatibility constraints.
2. Inspect the current routes, controllers, models, migrations, frontend consumers, and tests.
3. State a brief implementation plan.
4. Reuse existing patterns and implement the smallest complete change.
5. Verify with focused tests, then broader tests/builds.
6. Update affected reference documents and changelog.
7. Report changed files, verification results, and remaining risks.

Database structure changes always require a new migration. Existing API contracts should remain backward compatible unless a versioned migration plan is explicitly approved.
