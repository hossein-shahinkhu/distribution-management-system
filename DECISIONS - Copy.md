# Architecture Decisions

Last reviewed: 2026-07-21

This file records decisions already expressed by the current implementation. It does not introduce new product behavior.

## ADR-001: Modular monolith

**Status:** Accepted

The system uses one Express API and one relational database rather than separately deployed domain services.

**Reasoning:** The current scope is cohesive, operational transactions cross multiple domains, and a single deployable backend keeps development and deployment simple.

**Consequence:** Domain boundaries are directory- and route-based. Cross-module changes must be tested carefully because all modules share models and process state.

## ADR-002: Layered HTTP backend

**Status:** Accepted

Routes define endpoints and role checks, controllers implement use cases, Sequelize models define persistence, and middleware handles authentication, authorization, validation, rate limiting, and errors.

**Consequence:** New endpoints should follow `route -> middleware -> controller -> model/service`. Business logic shared by multiple controllers should move to a focused service or utility rather than be duplicated.

## ADR-003: Sequelize migrations are the schema authority

**Status:** Accepted

Production schema changes use ordered files in `backend/src/migrations/`. Runtime startup does not use `sequelize.sync()`.

**Consequence:** Never modify deployed schema without a new migration. Never rewrite an already-applied migration to fix a production database; add a forward migration with a reversible `down` operation where safe.

## ADR-004: PostgreSQL production and SQLite test database

**Status:** Accepted with constraints

PostgreSQL is used outside tests. Jest uses in-memory SQLite through the same Sequelize models.

**Consequence:** Query helpers account for dialect differences such as `ILIKE`. PostgreSQL-specific schema behavior, enum changes, indexes, locking, and migrations still require PostgreSQL validation because SQLite tests cannot prove them.

## ADR-005: JWT bearer authentication with database activation checks

**Status:** Accepted

JWTs contain user ID, role ID, and role name. Authentication verifies the signature and loads the user to ensure the account still exists and is active. The role claim avoids a role-table join on every request.

**Consequence:** Role changes take effect only after token renewal, while deactivation takes effect immediately. JWT claim changes must preserve existing middleware expectations.

## ADR-006: Route-level role authorization

**Status:** Accepted

The `authorize()` middleware defines allowed roles on each protected route.

**Consequence:** New routes must explicitly choose access. Role authorization does not replace resource ownership checks; controllers must also enforce ownership where data belongs to a particular distributor or user.

## ADR-007: Transactional inventory mutation

**Status:** Accepted

Sales order creation and quote conversion lock product rows and deduct stock inside database transactions. Purchase order receipt locks product rows and adds stock inside a transaction.

**Consequence:** Inventory-changing flows must remain atomic. New cancellation, return, or reversal behavior must use compensating transactions and prevent duplicate application.

## ADR-008: Quotes reuse the order aggregate

**Status:** Accepted

A quote is represented by an `Order` with `is_quote = true` and `status = quote`. It uses the same order items and total calculation but does not deduct inventory until conversion.

**Consequence:** Order queries and user interfaces must handle the quote state. PostgreSQL migrations must include the `quote` enum value before this behavior is safe in production.

## ADR-009: Soft deactivation for referenced master data

**Status:** Accepted

Products, distributors, and suppliers are deactivated with `is_active = false` rather than physically deleted.

**Consequence:** Historical foreign-key references remain valid. List behavior must deliberately decide whether inactive records are included; current controllers generally include them.

## ADR-010: Treasury entries are voided, not deleted

**Status:** Accepted

Treasury transactions retain an audit trail through `is_voided`. Voiding a sales receipt or purchase payment recalculates the linked invoice payment status.

**Consequence:** Financial totals must exclude voided entries unless an audit view explicitly requests them. Future edits should prefer corrective entries or void-and-replace semantics.

## ADR-011: Payment status is derived from linked treasury activity

**Status:** Accepted with legacy exception

Sales invoice status is synchronized from non-voided receipts, and purchase invoice status from non-voided payments. An admin-only sales-invoice endpoint can also set payment status directly.

**Consequence:** Treasury synchronization is the preferred source of truth. The direct status endpoint is retained for backward compatibility but can create a temporary mismatch until the next linked treasury operation.

## ADR-012: Document numbers use date plus cryptographic randomness

**Status:** Accepted

Generated order, purchase-order, and sales-invoice numbers use a prefix, local date, and a random hexadecimal suffix.

**Consequence:** Database unique constraints remain required. External supplier invoice numbers are not generated and are unique only per supplier.

## ADR-013: React SPA with centralized Axios client

**Status:** Accepted

The frontend uses React Router, an authentication context, protected routes, and an Axios client rooted at `/api`.

**Consequence:** API consumers should be added to `frontend/src/api/` instead of issuing ad hoc requests in pages. A 401 response clears local authentication state and redirects to login.

## ADR-014: Persian RTL design system

**Status:** Accepted

The product UI is Persian and RTL, using shared Tailwind tokens and reusable components.

**Consequence:** New UI must preserve RTL layout, Persian labels, semantic status colors, existing form and banner patterns, and responsive behavior.

## ADR-015: Containerized production topology

**Status:** Accepted

Docker Compose runs PostgreSQL, backend, frontend nginx, and Caddy. Caddy terminates TLS and routes API and SPA traffic.

**Consequence:** Production configuration is environment-driven. Backend startup waits for the database and runs migrations before listening.

## ADR-016: Backward-compatible maintenance

**Status:** Accepted

Existing routes, response shapes, role behavior, and stored data should be preserved during maintenance.

**Consequence:** Breaking changes require a versioned API or explicit migration period. Additive fields and endpoints are preferred.
