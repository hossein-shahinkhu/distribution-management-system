# Database Reference

Last reviewed: 2026-07-21

## Database Strategy

- Production/development dialect: PostgreSQL.
- Automated test dialect: in-memory SQLite.
- ORM: Sequelize.
- Naming: snake_case tables and columns, with `created_at` and `updated_at` timestamps.
- Schema changes: Sequelize CLI migrations in `backend/src/migrations/`.
- Runtime startup: migrations are applied by `backend/docker-entrypoint.sh` before the API starts in Docker.

## Entity Relationships

```text
roles 1 --- * users
users 1 --- 0..1 distributors
categories 1 --- * products
routes 1 --- * customers
customers 1 --- * orders
users 1 --- * orders (salesperson_id)
distributors 1 --- * orders
orders 1 --- * order_items
products 1 --- * order_items
orders 1 --- 1 invoices
customers 1 --- * treasury_transactions
invoices 1 --- * treasury_transactions
purchase_invoices 1 --- * treasury_transactions
users 1 --- * treasury_transactions (created_by)
suppliers 1 --- * purchase_orders
purchase_orders 1 --- * purchase_order_items
products 1 --- * purchase_order_items
suppliers 1 --- * purchase_invoices
purchase_orders 1 --- * purchase_invoices
```

## Tables

All tables include integer `id` primary keys and Sequelize timestamps unless stated otherwise.

### `roles`

| Column | Type | Constraints / meaning |
|---|---|---|
| `name` | enum | Unique; `admin`, `warehouse_keeper`, `salesperson`, `distributor` |
| `description` | string | Optional display description |

### `users`

| Column | Type | Constraints / meaning |
|---|---|---|
| `full_name` | string | Required |
| `email` | string | Required, unique |
| `password_hash` | string | Required; bcrypt hash created by model hooks |
| `phone` | string | Optional |
| `role_id` | integer FK | Required, references `roles.id` |
| `is_active` | boolean | Defaults true |
| `commission_rate` | decimal(5,2) | Required, defaults 0 |

### `categories`

| Column | Type | Constraints / meaning |
|---|---|---|
| `name` | string | Required, unique |
| `description` | text | Optional |

### `products`

| Column | Type | Constraints / meaning |
|---|---|---|
| `sku` | string | Required, unique |
| `name` | string | Required |
| `category_id` | integer FK | Optional, references `categories.id` |
| `unit_price` | decimal(12,2) | Required, defaults 0 |
| `unit` | string | Defaults `عدد` |
| `stock_quantity` | integer | Required, defaults 0 |
| `reorder_level` | integer | Defaults 10 |
| `is_active` | boolean | Defaults true; soft deletion flag |

### `routes`

| Column | Type | Constraints / meaning |
|---|---|---|
| `name` | string | Required, unique |
| `description` | text | Optional |

### `customers`

| Column | Type | Constraints / meaning |
|---|---|---|
| `full_name` | string | Required |
| `business_name` | string | Optional |
| `phone` | string | Required |
| `address` | text | Optional |
| `city` | string | Optional |
| `credit_limit` | decimal(12,2) | Defaults 0 |
| `route_id` | integer FK | Optional, references `routes.id` |

### `distributors`

| Column | Type | Constraints / meaning |
|---|---|---|
| `user_id` | integer FK | Optional, references `users.id`; controller enforces one distributor per linked user |
| `full_name` | string | Required |
| `phone` | string | Required |
| `vehicle_plate` | string | Optional |
| `vehicle_type` | string | Optional |
| `is_active` | boolean | Defaults true; soft deletion flag |
| `commission_rate` | decimal(5,2) | Required, defaults 0 |

### `orders`

| Column | Type | Constraints / meaning |
|---|---|---|
| `order_number` | string | Required, unique, generated as `ORD-YYYYMMDD-random` |
| `customer_id` | integer FK | Required, references `customers.id` |
| `salesperson_id` | integer FK | Optional, references `users.id` |
| `distributor_id` | integer FK | Optional, references `distributors.id` |
| `status` | enum | Model values: `pending`, `confirmed`, `processing`, `out_for_delivery`, `delivered`, `cancelled`, `quote` |
| `is_quote` | boolean | Required, defaults false |
| `total_amount` | decimal(14,2) | Required, defaults 0 |
| `order_date` | date/time | Defaults now |
| `delivery_date` | date/time | Optional; set when status becomes delivered |
| `notes` | text | Optional |

Important schema issue: the original `create-orders` migration defines the enum without `quote`, and the later quote migration adds only `is_quote`. A new PostgreSQL migration must add the enum value.

### `order_items`

| Column | Type | Constraints / meaning |
|---|---|---|
| `order_id` | integer FK | Required, references `orders.id` |
| `product_id` | integer FK | Required, references `products.id` |
| `quantity` | integer | Required; model validates minimum 1 |
| `unit_price` | decimal(12,2) | Required; snapshot of product price |
| `line_total` | decimal(14,2) | Required |

### `invoices`

| Column | Type | Constraints / meaning |
|---|---|---|
| `invoice_number` | string | Required, unique, generated as `INV-YYYYMMDD-random` |
| `order_id` | integer FK | Required, unique, references `orders.id` |
| `issue_date` | date/time | Defaults now |
| `due_date` | date/time | Optional; controller sets 14 days after creation |
| `subtotal` | decimal(14,2) | Required |
| `tax_amount` | decimal(14,2) | Defaults 0; controller currently applies 9% |
| `total_amount` | decimal(14,2) | Required |
| `payment_status` | enum | `unpaid`, `partial`, `paid`; defaults unpaid |

### `treasury_transactions`

| Column | Type | Constraints / meaning |
|---|---|---|
| `type` | enum | Required; `receipt` or `payment` |
| `amount` | decimal(14,2) | Required, positive by API validation |
| `method` | enum | Required; `cash`, `bank_transfer`, `card`, `cheque` |
| `reference_number` | string | Optional |
| `transaction_date` | date/time | Required, defaults now |
| `description` | text | Optional |
| `customer_id` | integer FK | Optional, references `customers.id` |
| `invoice_id` | integer FK | Optional, references `invoices.id` |
| `purchase_invoice_id` | integer FK | Optional, references `purchase_invoices.id` |
| `created_by` | integer FK | Required, references `users.id` |
| `is_voided` | boolean | Required, defaults false |

### `suppliers`

| Column | Type | Constraints / meaning |
|---|---|---|
| `name` | string | Required |
| `contact_person` | string | Optional |
| `phone` | string | Required |
| `address` | text | Optional |
| `tax_id` | string | Optional |
| `payment_terms_days` | integer | Optional |
| `is_active` | boolean | Required, defaults true |

### `purchase_orders`

| Column | Type | Constraints / meaning |
|---|---|---|
| `po_number` | string | Required, unique, generated as `PO-YYYYMMDD-random` |
| `supplier_id` | integer FK | Required, references `suppliers.id` |
| `status` | enum | `draft`, `ordered`, `received`, `cancelled` |
| `total_amount` | decimal(14,2) | Required, defaults 0 |
| `order_date` | date/time | Defaults now |
| `expected_date` | date/time | Optional |
| `notes` | text | Optional |

### `purchase_order_items`

| Column | Type | Constraints / meaning |
|---|---|---|
| `purchase_order_id` | integer FK | Required, references `purchase_orders.id` |
| `product_id` | integer FK | Required, references `products.id` |
| `quantity` | integer | Required |
| `unit_cost` | decimal(12,2) | Required |
| `line_total` | decimal(14,2) | Required |

### `purchase_invoices`

| Column | Type | Constraints / meaning |
|---|---|---|
| `invoice_number` | string | Required; supplier-provided number |
| `purchase_order_id` | integer FK | Optional, references `purchase_orders.id` |
| `supplier_id` | integer FK | Required, references `suppliers.id` |
| `issue_date` | date/time | Defaults now |
| `due_date` | date/time | Optional |
| `subtotal` | decimal(14,2) | Required |
| `tax_amount` | decimal(14,2) | Defaults 0 |
| `total_amount` | decimal(14,2) | Required |
| `payment_status` | enum | `unpaid`, `partial`, `paid`; defaults unpaid |

Unique constraint: `(supplier_id, invoice_number)`.

## Inventory Rules

- Normal sales order creation locks each referenced product and subtracts quantity in one transaction.
- Quote creation stores items and totals without changing stock.
- Quote conversion locks products, checks availability, subtracts stock, and changes the order to pending.
- Purchase order creation does not change stock.
- The first transition of a purchase order into `received` locks products and adds quantities.
- Current cancellation/status reversal paths do not compensate inventory.

## Payment Rules

- A non-voided `receipt` linked to a sales invoice contributes to its paid amount.
- A non-voided `payment` linked to a purchase invoice contributes to its paid amount.
- Total paid `<= 0` produces `unpaid`.
- Total paid below invoice total produces `partial`.
- Total paid equal to or above invoice total produces `paid`.
- Voiding a linked transaction triggers recalculation.

## Indexes

Migrations create unique and query indexes for:

- User email.
- Product SKU.
- Order status, customer, distributor, salesperson, and order date.
- Order-item order and product.
- Invoice order and payment status.
- Customer route.
- Distributor user.
- Treasury type, customer, sales invoice, purchase invoice, and transaction date.
- Purchase-order status and supplier.
- Purchase-order-item purchase order.
- Purchase-invoice supplier/invoice number uniqueness.

The performance-index migration requests PostgreSQL concurrent index creation and suppresses individual index errors. This avoids duplicate-index failures but can also hide deployment-specific index failures; migration status and actual database indexes should be inspected after deployment.

## Migration Rules

1. Create a new timestamped migration for every schema change.
2. Keep model definitions and migrations aligned.
3. Preserve existing data and API behavior.
4. Add indexes for new foreign keys and frequent filters.
5. Test PostgreSQL-specific migrations against PostgreSQL, not only SQLite.
6. Back up production before applying significant migrations.
7. Do not use `sequelize.sync()` in production.
