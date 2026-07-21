# API Reference

Last reviewed: 2026-07-21

## Conventions

- Base path: `/api`
- Authentication: `Authorization: Bearer <jwt>`
- Content type for request bodies: `application/json`
- Default paginated response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

- Pagination inputs: `page >= 1`, `1 <= limit <= 100`
- Validation failures return HTTP 400 with `message` and an `errors` array.
- Other expected errors use `{ "message": "..." }`.
- All endpoints except login and health require authentication.

Role abbreviations below:

- **A:** `admin`
- **W:** `warehouse_keeper`
- **S:** `salesperson`
- **D:** `distributor`
- **Any:** any authenticated role

## Health

| Method | Path | Access | Behavior |
|---|---|---|---|
| GET | `/health` | Public | Returns process uptime, package version, and database connectivity; returns 503 when the database is unavailable |

## Authentication and Users

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| POST | `/auth/login` | Public | Body: `email`, `password`; returns JWT and user summary; limited to 10 attempts per 15 minutes |
| GET | `/auth/me` | Any | Returns authenticated user ID, name, email, and role |
| POST | `/auth/register` | A | Body: `full_name`, `email`, `password`, `role_name`, optional `phone`; creates a user and also returns a token for that new user |
| GET | `/auth/users` | A | Returns all users with roles, excluding password hashes |
| PATCH | `/auth/users/:id` | A | Allowlisted body: `full_name`, `phone`, `role_name`, `is_active`, `commission_rate` |
| PATCH | `/auth/change-password` | Any | Body: `current_password`, `new_password`; new password minimum is 8 characters |

## Categories

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/categories` | Any | Returns all categories ordered by name |
| POST | `/categories` | A, W | Body: `name`, optional `description` |
| DELETE | `/categories/:id` | A | Physically deletes the category |

## Products

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/products` | Any | Paginated; query: `search`, `page`, `limit`; search matches name or SKU |
| GET | `/products/low-stock` | Any | Returns products whose `stock_quantity <= reorder_level` |
| GET | `/products/:id` | Any | Returns product with category |
| POST | `/products` | A, W | Required: `sku`, `name`, `unit_price`; optional category, unit, stock, reorder level |
| PUT | `/products/:id` | A, W | Allowlisted product fields; numeric fields are validated |
| DELETE | `/products/:id` | A, W | Soft-deactivates the product |

## Customers

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/customers` | Any | Paginated; query: `search`, `page`, `limit`; search matches name, business name, or phone |
| GET | `/customers/:id` | Any | Returns one customer |
| GET | `/customers/:id/credit-usage` | A, S | Intended to return `credit_limit`, `outstanding_balance`, `available_credit`, and unpaid invoice count |
| POST | `/customers` | A, S | Required: `full_name`, `phone`; optional business/contact/credit/route data |
| PUT | `/customers/:id` | A, S | Allowlisted customer fields |
| DELETE | `/customers/:id` | A | Physically deletes the customer |

Current issue: this endpoint currently returns HTTP 500 because the controller imports Sequelize `Op` from the model index, which does not export it. Once that import is corrected, the calculation will still overstate partially paid invoices because it sums their full invoice totals instead of subtracting non-voided receipts.

## Routes

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/routes` | Any | Returns all routes ordered by name |
| GET | `/routes/:id` | Any | Returns one route |
| POST | `/routes` | A | Body: `name`, optional `description` |
| PUT | `/routes/:id` | A | Allowlisted `name`, `description` |
| DELETE | `/routes/:id` | A | Physically deletes the route |

## Distributors

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/distributors` | Any | Returns distributors with optional linked user |
| POST | `/distributors` | A | Required: `full_name`, `phone`; optional vehicle, user link, commission rate |
| PUT | `/distributors/:id` | A | Updates allowlisted distributor fields |
| DELETE | `/distributors/:id` | A | Soft-deactivates the distributor |

One user account can be linked to at most one distributor by controller enforcement.

## Sales Orders and Quotes

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/orders` | Any | Paginated; query: `search`, `status`, `route_id`, `page`, `limit`; distributors see only assigned orders |
| GET | `/orders/:id` | Any | Returns customer, distributor, items, and products |
| POST | `/orders` | A, S | Body: `customer_id`, non-empty `items[{product_id,quantity}]`, optional `salesperson_id`, `distributor_id`, `notes`, `is_quote` |
| PATCH | `/orders/:id/status` | A, W, D | Body: `status`; accepted: `pending`, `confirmed`, `processing`, `out_for_delivery`, `delivered`, `cancelled` |
| PATCH | `/orders/:id/assign-distributor` | A | Body: `distributor_id`; assignment also sets `out_for_delivery` |
| POST | `/orders/:id/convert-to-order` | A, S | Converts a quote after locking products, checking stock, and deducting inventory |

Order creation uses a database transaction and row locks. Normal orders deduct stock; quotes do not.

Known access limitation: order detail and status update do not currently enforce distributor ownership.

## Sales Invoices

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/invoices` | Any | Returns all invoices with order, customer, items, and products |
| GET | `/invoices/:id` | Any | Returns one invoice with order details |
| POST | `/invoices` | A, S | Body: `order_id`; creates one invoice per order with 9% tax and a 14-day due date |
| PATCH | `/invoices/:id/payment-status` | A | Body: `payment_status` in `unpaid`, `partial`, `paid` |

Linked treasury receipts automatically recalculate sales-invoice payment status.

## Suppliers

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/suppliers` | A, W | Paginated; query: `search`, `page`, `limit` |
| GET | `/suppliers/:id` | A, W | Returns one supplier |
| POST | `/suppliers` | A, W | Required: `name`, `phone`; optional contact, address, tax ID, payment terms |
| PUT | `/suppliers/:id` | A, W | Updates allowlisted supplier fields |
| DELETE | `/suppliers/:id` | A, W | Soft-deactivates the supplier |

## Purchase Orders

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/purchase-orders` | A, W | Paginated; query: `search`, `status`, `supplier_id`, `page`, `limit` |
| GET | `/purchase-orders/:id` | A, W | Returns supplier and item details |
| POST | `/purchase-orders` | A, W | Body: `supplier_id`, non-empty `items[{product_id,quantity,unit_cost}]`, optional dates and notes |
| PATCH | `/purchase-orders/:id/status` | A, W | Body: `status` in `draft`, `ordered`, `received`, `cancelled` |

The first transition into `received` increases product stock transactionally. Later status changes do not reverse that increase.

## Purchase Invoices

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/purchase-invoices` | A, W | Paginated; query: `search`, `supplier_id`, `purchase_order_id`, `payment_status`, `page`, `limit` |
| GET | `/purchase-invoices/:id` | A, W | Returns supplier and optional purchase order |
| POST | `/purchase-invoices` | A, W | Required: supplier invoice number, subtotal, total; accepts direct `supplier_id` or derives it from `purchase_order_id` |

Supplier invoice number is unique within a supplier, not globally. Linked treasury payments automatically recalculate payment status.

## Treasury

| Method | Path | Access | Request / behavior |
|---|---|---|---|
| GET | `/treasury` | A, S | Paginated; query: `type`, `customer_id`, `invoice_id`, `purchase_invoice_id`, `from`, `to`, `page`, `limit` |
| POST | `/treasury` | A, S | Body: `type`, positive `amount`, `method`; optional reference, date, description, and entity links |
| PATCH | `/treasury/:id/void` | A, S | Sets `is_voided = true`; a second void attempt returns 400 |

Types: `receipt`, `payment`.

Methods: `cash`, `bank_transfer`, `card`, `cheque`.

## Reports

| Method | Path | Access | Query / response |
|---|---|---|---|
| GET | `/reports/sales` | A, S | Optional `from`, `to`; returns revenue, order count, and counts by status |
| GET | `/reports/inventory` | A, W | Returns products, low-stock count, and inventory value |
| GET | `/reports/distributor-performance` | A | Returns total and delivered order counts grouped by distributor |
| GET | `/reports/commissions` | A | Optional `from`, `to`; returns delivered-order commissions for users and distributors with positive rates |
| GET | `/reports/treasury-balance` | A | Optional `from`, `to`; returns receipts, payments, net balance, and totals by method, excluding voided entries |

## Status Codes

- `200`: successful read/update/void
- `201`: successful creation
- `400`: invalid input or invalid state
- `401`: missing, invalid, expired token, inactive user, or invalid current password
- `403`: authenticated but role is not permitted
- `404`: route or entity not found
- `409`: uniqueness conflict
- `429`: rate limit exceeded
- `500`: internal server error
- `503`: health check cannot connect to the database
