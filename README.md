# CarDeal IS

A modern, full-stack Car Dealership Inventory System for Incubyte Round 1. Built with a Test-Driven Development (TDD) workflow, strict software craftsmanship practices, and transparent AI pairing.

## Planned vs. Implemented Functionality

- **User Authentication**: Token-based authentication using signed JWTs. Passwords hashed using non-truncating `scrypt` with salt and constant-time equality checks.
- **Role-Based Access**: Public registration defaults strictly to standard buyer privileges. Admin capabilities are managed server-side and provisioned via a dedicated local CLI tool.
- **Vehicle Catalog**: Protected browsing of inventory with stock quantity tracking, including zero-stock visibility.
- **Search & Filtering**: Multi-parameter search by make (case-insensitive substring), model (case-insensitive substring), category (case-insensitive exact match), and inclusive integer paise price bounds with SQL wildcard sanitization.
- **Atomic Transactions & Inventory**: Single-unit purchases with atomic stock decrement (`WHERE quantity > 0`) preventing negative inventory under concurrency. Admin-only additive restock increments with safe-integer validation.
- **Frontend SPA**: Original React, TypeScript, HTML5, CSS3, and Tailwind CSS user interface adhering to agreed visual tokens and responsive layouts.

## Architecture & Technology Stack

- **Backend API**: Node.js (`v26.7.0`), Express (`4.21.2`), TypeScript (`5.7.2`)
- **Database**: File-backed SQLite utilizing Node.js native built-in `node:sqlite` (`DatabaseSync` with WAL journal mode)
- **Security & Tokens**: Node built-in `crypto.scrypt`, `jsonwebtoken` (`9.0.2`) with brute-force rate limiting (`429 TOO_MANY_REQUESTS`)
- **Testing**: `vitest` (`2.1.8`), `supertest` (`7.0.0`), `@testing-library/react` (`16.1.0`), `@testing-library/jest-dom` (`6.6.3`)
- **Frontend SPA**: React (`18.3.1`), Vite (`5.4.11`), Tailwind CSS (`3.4.17`)

---

## Local Setup & Execution Guide

### Prerequisites
- **Node.js**: `v22.x` or `v26.x` (verified with `v26.7.0`, requiring built-in `node:sqlite`)
- **npm**: `11.x`+

### 1. Installation
Install dependencies for both backend and frontend from the repository root:
```bash
# Install backend packages
npm --prefix backend install

# Install frontend packages
npm --prefix frontend install
```

### 2. Environment Configuration
Create a `.env` file inside `backend/` (or copy from `backend/.env.example`):
```env
PORT=4000
DATABASE_PATH=./data/cardeal.db
# Generate a secure private key (e.g., openssl rand -hex 32)
JWT_SECRET=replace_with_a_secure_private_secret_at_least_32_characters_long
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```
*Note: The backend enforces that `JWT_SECRET` must be explicitly configured and at least 32 characters long; it will refuse to start with missing or fallback secrets.*

### 3. Local Administrator Provisioning
Provision an initial administrator account locally without exposing public role selectors or default passwords:
```bash
# From repository root:
npm run admin:provision admin@cardeal.com AdminPassword123!

# Or from backend directory:
npm --prefix backend run admin:provision admin@cardeal.com AdminPassword123!
```

### 4. Running the Complete Application

#### Start the Backend API (Port 4000)
```bash
# Development mode (auto-reload via tsx):
npm run dev:backend

# Or build and run production:
npm run build:backend
npm --prefix backend start
```

#### Start the Frontend SPA (Port 5173)
```bash
# In a separate terminal:
npm run dev:frontend
```
Open your browser to `http://localhost:5173`.

---

## Running the Test Suites

Both backend and frontend feature automated test suites running on Vitest. Comprehensive verification results and full terminal execution logs are documented in [TEST_REPORT.md](TEST_REPORT.md).

### Run All Tests (Root - 55 Tests across 17 Suites)
```bash
npm test
```

### Run Backend Tests Separately (39 Tests in 12 Suites)
```bash
npm run test:backend
```
Backend coverage includes:
- `canary.test.ts`: Tooling and TypeScript runtime verification.
- `auth_registration.test.ts`: User registration persistence in SQLite with scrypt password verification.
- `auth_validation.test.ts`: Email regex, password length bounds (12–128 chars), 409 duplicate email conflicts, and role escalation prevention.
- `auth_login.test.ts`: Credential verification, JWT issuance with expiration, and generic 401 INVALID_CREDENTIALS.
- `auth_middleware_and_admin.test.ts`: Bearer token authentication, 401/403 status enforcement, and admin CLI provisioning.
- `vehicles_crud.test.ts`: Admin vehicle creation, integer paise price validation, zero-stock catalog listing, PUT detail update with quantity modification rejection, and admin deletion.
- `vehicles_search.test.ts`: Substring make/model search, exact category filter, inclusive paise bounds, reversed bounds rejection (400), and SQL `LIKE` wildcard escaping.
- `purchase_and_restock.test.ts`: Atomic 1-unit purchase, 409 OUT_OF_STOCK handling, concurrent competing requests for the final unit (exactly 1 succeeds, 1 gets 409 conflict, final stock 0), and admin additive restock.
- `database_restart_persistence.test.ts`: Verifies records, hashes, and inventory changes survive process shutdown and database reopening.
- `regression_fixes.test.ts`: Regression suite verifying explicit secret enforcement, expired tokens, brute-force throttling, safe-integer boundaries, concurrent duplicate registration, and strict mutation payloads.
- `phase3_regressions.test.ts`: Focused regression suite verifying atomic SQL restock upper-bound overflow prevention and subprocess CLI execution with custom database path.
- `e2e_integration_flow.test.ts`: End-to-end multi-step integration test validating the complete business flow.

### Run Frontend Tests Separately (16 Tests in 5 Suites)
```bash
npm run test:frontend
```
Frontend coverage includes:
- `currency.test.ts`: Precise rupee-to-paise conversion, rejection of malformed currency and fractional paise, and Indian currency formatting (`₹`).
- `VehicleCard.test.tsx`: Card rendering, price formatting, zero-stock disablement, in-flight spinner state, and admin controls.
- `AdminModal.test.tsx`: Strict non-negative integer quantity validation, rejection of fractional/malformed inputs, ESC key close, and keyboard focus trap.
- `AuthView.test.tsx`: Authentication view error handling verifying invalid credentials do not misattribute as session expiration.
- `App.test.tsx`: Application view rendering and form validation bounds.

---

## Screenshots

Actual screenshots captured from the live application using headless Chrome across desktop, tablet, and mobile viewports with authenticated session state:

### Desktop Customer Catalog View (1440px Viewport)
![Desktop Catalog View](docs/screenshots/desktop_1440.png)

### Desktop Admin Management View (1440px Viewport)
![Desktop Admin View](docs/screenshots/admin_1440.png)

### Tablet Customer Catalog View (768px Viewport)
![Tablet View](docs/screenshots/tablet_768.png)

### Mobile Customer Catalog View (360px Viewport)
![Mobile View](docs/screenshots/mobile_360.png)

---

## Known Design Trade-offs & Current Limitations

1. **In-Memory Session Storage**: As specified in the architecture agreement, the client stores JWT bearer tokens in memory to eliminate local storage vulnerabilities. Refreshing or reloading the browser clears the session and requires re-authenticating.
2. **Node.js Runtime Requirement**: The backend utilizes Node.js native `node:sqlite`, which requires Node.js `v22.x` or `v26.x`.
3. **Currency Precision**: All prices are stored and communicated via the API as non-negative integer paise to eliminate floating-point rounding errors.

---

## My AI Usage

### Tools and Actual Use
- **ChatGPT**: Used for initial interpretation of the kata requirements, drafting architectural guidelines, and outlining the TDD strategy.
- **Antigravity with Gemini 3.8 Flash (High)**: Served as the interactive coding partner. Executed directory and tooling inspections, verified `node:sqlite` compatibility, drove Red-Green-Refactor test cycles for both backend and frontend, implemented services, controllers, routes, CLI tools, React components, and captured multi-viewport screenshots.
- **Attribution Correction**: Historical commit trailers were updated via an explicit Git history replacement bundle to use standard `@ai.invalid` co-author identities (`chatgpt@ai.invalid` and `gemini@ai.invalid`), preserving all 24 original commit trees, authors, and timestamps.

### Reflection
*The candidate's personal reflection will be added in their own voice prior to final submission.*

### Conversation Transparency
Full unedited chat logs and transcripts are preserved in [PROMPTS.md](PROMPTS.md).
