# Coding Standards

Last reviewed: 2026-07-21

These standards describe and formalize the patterns already used in the repository.

## General Principles

- Treat existing source code and migrations as the current system of record.
- Make focused, backward-compatible changes.
- Reuse current components, helpers, response shapes, and domain terminology.
- Do not add placeholder behavior or claim unimplemented functionality.
- Keep Persian user-facing text and RTL layout consistent.
- Do not change database structure without a new migration.
- Do not edit an applied migration to repair production state; add a forward migration.

## Repository Structure

- Backend application code: `backend/src/`
- Backend tests: `backend/tests/`
- Frontend application code: `frontend/src/`
- Deployment scripts: `scripts/`
- Root documentation: architecture, deployment, state, references, decisions, standards, and changelog

New code should stay within the established domain directories:

- `routes/`: endpoint definitions and role middleware
- `controllers/`: HTTP use-case orchestration
- `models/`: Sequelize models and associations
- `validators/`: express-validator rules
- `middleware/`: cross-cutting HTTP behavior
- `utils/` or a focused `services/` module: reusable domain operations
- `migrations/`: ordered schema evolution

## Backend JavaScript

- Use CommonJS (`require`, `module.exports`) to match the backend.
- Use `async`/`await`.
- Use descriptive camelCase variables and functions.
- Keep database column and request field names in snake_case where they mirror the schema/API.
- Return immediately after sending an HTTP response.
- Log server-side failures through `backend/src/utils/logger.js`.
- Do not return stack traces or internal database details in production responses.
- Use allowlists for updateable fields; never pass arbitrary `req.body` directly to `update()`.
- Use HTTP status codes consistently: 201 create, 400 validation/state, 401 authentication, 403 authorization, 404 missing record, 409 conflict.

## Routes and Authorization

- Mount routes under `/api` in `backend/src/app.js`.
- Put `authenticate` before protected controllers.
- Put `authorize(...)` at route level for role restrictions.
- Add controller-level ownership checks when access depends on the specific record.
- Add explicit validation middleware for all externally writable fields.
- Preserve existing paths and response shapes for backward compatibility.

## Controllers and Services

- Controllers should orchestrate validation beyond express-validator, model lookups, transactions, and response mapping.
- Move logic used by multiple controllers into a focused utility/service, as done for invoice payment synchronization.
- Wrap multi-record writes and inventory/financial mutations in Sequelize transactions.
- Lock mutable inventory rows when concurrent updates can cause lost updates.
- Roll back on every early failure inside an explicit transaction.
- Define valid state transitions, not only valid state names, for workflow entities.
- Make repeated operations idempotent when feasible, especially receipt, conversion, void, and status operations.

## Sequelize Models and Migrations

- Keep table names plural snake_case.
- Keep `underscored: true` and timestamps enabled.
- Define associations centrally in `backend/src/models/index.js`.
- Align model enum values, nullability, defaults, unique constraints, and indexes with migrations.
- Store monetary values as `DECIMAL`, convert deliberately when calculating in JavaScript, and avoid implicit string arithmetic.
- Add indexes for foreign keys and common filters.
- Use soft deletion/deactivation where records are referenced by historical transactions.
- Provide a safe `down` migration when reversal is possible without data loss.

## Validation

- Use express-validator for syntactic and range validation.
- Validate foreign-key existence in controllers.
- Validate cross-field invariants, such as invoice ownership or matching suppliers, in the domain layer.
- Validate both create and update endpoints.
- Do not trust client-supplied totals, unit prices, role identity, or ownership when the server can derive them.

## API Responses

- Paginated endpoints return `{ data, pagination }`.
- Non-paginated collections return arrays.
- Expected errors return a Persian `message`.
- Validation errors additionally return `{ errors: [{ field, message }] }`.
- Additive response fields are preferred over renaming or removing fields.

## Frontend React

- Use ES modules.
- Use functional components and hooks.
- Put API calls in `frontend/src/api/` and use the shared Axios client.
- Use `ProtectedRoute` for page-level role restrictions.
- Use shared components from `frontend/src/components/`.
- Preserve RTL and Persian copy.
- Use existing design tokens and utility patterns:
  - `.card` and `.card-header`
  - `.data-table`
  - `.banner.banner-*`
  - `.skeleton`
  - `Button`, `Input`, `Select`, `Modal`, `Pagination`, `StatusBadge`, `EmptyState`
- Group complex forms with `fieldset` and `legend`.
- Show API failures through the standard banner pattern.
- Keep tables horizontally scrollable and responsive.
- Use `Intl.NumberFormat('fa-IR')` for displayed currency/number formatting.

## Authentication Frontend

- Read/write authentication only through the existing `dms_token` and `dms_user` keys until a planned migration changes the storage model.
- Let the shared Axios interceptor attach the bearer token.
- Preserve automatic logout and redirect behavior on HTTP 401.
- Never log tokens or passwords.

## Testing

- Add focused backend tests under `backend/tests/` for new endpoints and domain behavior.
- Use existing `testUtils` role/user/token helpers.
- Test successful behavior, validation failures, authorization failures, and rollback/idempotency cases.
- Remember that SQLite does not validate PostgreSQL enum migrations, concurrent indexes, or exact locking behavior.
- For schema changes, add PostgreSQL migration verification in CI or a disposable Docker database.
- Add frontend tests only after selecting and configuring a repository-wide test runner; do not introduce isolated one-off tooling.

## Verification

For a normal change, run the narrowest relevant checks first, then:

```bash
cd backend
npm test

cd ../frontend
npm run build
```

For a migration:

```bash
cd backend
npm run migrate:status
npm run migrate
```

Also verify migration behavior against PostgreSQL when it uses PostgreSQL-specific enums, indexes, or locking.

## Documentation and Changelog

- Update `API_REFERENCE.md` for endpoint or contract changes.
- Update `DATABASE_REFERENCE.md` for schema, relationship, index, or invariant changes.
- Update `DECISIONS.md` when an architectural decision is introduced or replaced.
- Update `PROJECT_STATE.md` when completed modules, known issues, debt, or priorities change.
- Add a dated entry to `CHANGELOG.md` for user-visible or maintenance-significant changes.
