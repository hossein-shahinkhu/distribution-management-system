# Treasury read API: exact aggregates

`GET /api/treasury?include_summary=true` returns `summary.total_receipts`,
`summary.total_payments`, `summary.net_balance`, and `data[].running_balance`
as **decimal strings in toman with exactly two decimal places**.
One integer unit is one toman; the fractional unit is one hundredth of a toman.

Examples: `"0.00"`, `"348.30"`, `"90999999999999.09"`,
`"-91999999999999.08"`. No BigInt is serialized into JSON.

PostgreSQL NUMERIC aggregation and window sums are cast to text. The backend
parses integer hundredths into BigInt and serializes strings without converting
to Number. Frontend consumers must retain the strings and use exact formatting,
not Number, parseFloat, Math.abs or client-side numeric aggregation.

Totals and running balances share the list filters, ownership and snapshot.
Voided transactions have zero financial effect. Running balances start at zero
**inside the selected filter range**, in ascending transaction_date/id order;
rows are displayed in reverse order. They are not the customer's account balance
or the treasury balance before the selected start date.

This replaces the numeric type of these four opt-in aggregate fields introduced
by the uncommitted treasury-summary work. The repository consumer is Treasury.jsx;
it is updated with the contract. External consumers, if any, must migrate these
fields together with the backend. The default paginated response, individual
transaction amounts, invoice/customer APIs and legacy money serializers retain
their previous contracts.
