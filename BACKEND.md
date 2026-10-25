# Backend and shared API contract

Read PROJECT.md. These are proposed contract decisions to review before coding.

## Architecture and data

Use TypeScript/Express, file-backed SQLite, migrations and parameterized queries. Separate HTTP handling, business rules and database access without unnecessary generic abstractions.

Vehicle fields: id (server-generated opaque string), make, model, category, price (integer paise), quantity (integer units). For example, price 125000000 means INR 1,250,000. Category initially accepts nonempty free text.

User fields include unique normalized email, password hash and server-controlled role. Never return hashes. Use a vetted password-hashing library, with configuration recorded during implementation.

## Routes

All vehicle routes require Authorization: Bearer <token>. Check signature/expiry and trusted role; never accept body-supplied permissions.

| Route | Access | Request | Success |
| --- | --- | --- | --- |
| POST /api/auth/register | Public | email, password | 201 with user; log in separately |
| POST /api/auth/login | Public | email, password | 200 with token and user |
| POST /api/vehicles | Admin decision | make, model, category, price, quantity | 201 with vehicle |
| GET /api/vehicles | Authenticated | None | 200 with vehicles, including zero stock |
| GET /api/vehicles/search | Authenticated | Filters below | 200 with matches |
| PUT /api/vehicles/:id | Admin decision | Full make, model, category, price | 200 with updated vehicle |
| DELETE /api/vehicles/:id | Admin | None | 204 without body |
| POST /api/vehicles/:id/purchase | Authenticated | No body | 200 with vehicle after decrement by one |
| POST /api/vehicles/:id/restock | Admin | quantity: positive increment | 200 with updated vehicle |

Response envelopes: {vehicle: ...}, {vehicles: [...]}, {user: ...}, or login {token: "...", user: ...}. Returned user includes id, email, role.

Reject unknown mutation fields, including role on registration and quantity on PUT. This restriction on detail updates is a documented project decision.

Search parameters: make, model, category, minPrice, maxPrice. Price bounds are inclusive integer paise. Make/model: trimmed case-insensitive literal substring. Category: trimmed case-insensitive exact match. Combine with AND. No filters equals listing; ignore blank text filters. Reject malformed/repeated parameters and reversed bounds. Use stable ordering by id. Escape SQL LIKE wildcard characters to preserve literal matching.

## Validation and errors

- Trim make/model/category; require 1-100 characters. Normalize email consistently before uniqueness checks. Syntax validation does not prove ownership.
- Proposed password length 12-128 characters; do not trim silently. Verify the chosen hashing library does not truncate accepted passwords. Generic invalid-credentials response.
- Price and creation quantity: nonnegative safe integers. Restock increment: positive safe integer. Reject fractional/negative values, numeric strings in JSON and overflow.
- Database constraints enforce required fields, unique email and nonnegative price/stock.
- 400 malformed JSON/validation; 401 missing/invalid/expired credentials; 403 forbidden; 404 missing vehicle; 409 duplicate email/insufficient stock; generic 500 unexpected error.
- Error shape: {"error":{"code":"OUT_OF_STOCK","message":"This vehicle is out of stock."}}. Field errors may be added for validation.
- No secrets, SQL errors or stack traces in responses. Authenticate/authorize before mutations.
- Configure body limits, explicit development origins, testable login abuse protection and environment-based secrets. Never log passwords/tokens or commit environment secrets. Fail clearly on missing required configuration.
- Initial logout clears the browser token. Refresh/revocation are outside core scope; do not claim them.

## Inventory

Atomically decrement only while quantity is positive. A read followed by unconditional write is insufficient. Inspect affected rows, distinguish missing vehicle from zero stock safely, and atomically increment restock with overflow protection. Define busy/transaction handling for the actual driver; do not swallow database errors.

Test competing requests for the last unit with independent requests/connections where practical: one success, one stock conflict, final stock zero. Sequential tests alone are not concurrency evidence.

## TDD evidence

Write/run a meaningful failing test, confirm intended failure, preserve Red commit, implement minimally, run tests and preserve Green. Refactor when useful. Missing imports/tools are not the intended business-rule failure. Tooling setup is not falsely labeled business TDD.

Use focused unit tests plus real HTTP/middleware/database integration. Cover invalid inputs, duplicate accounts, role escalation, expired tokens, forbidden operations, /search routing, wildcard handling, price bounds, missing IDs, stock limits and failed writes. Do not mock persistence in persistence tests.

Prove restart persistence by writing, closing the app/database, reopening the same file and reading the record. Record actual commands/results, never invented coverage or successes.
