# CarDeal IS

A full-stack Car Dealership Inventory System for Incubyte Round 1.

**Status: Backend Complete & Fully Tested (Consolidated Stage 1). Frontend implementation pending (Stage 2).**

## Functionality Overview

- **Authentication & Authorization**: User registration with scrypt password hashing, login with signed JWT issuance, and server-side role enforcement (`user` vs. `admin`).
- **Vehicle Catalog**: Protected vehicle listing including zero-stock visibility with out-of-stock indicators.
- **Search & Filtering**: Multi-parameter search by make (case-insensitive substring), model (case-insensitive substring), category (case-insensitive exact match), and inclusive integer paise price bounds with SQL wildcard sanitization.
- **Atomic Transactions & Inventory**: Single-unit purchases with atomic stock decrement (`WHERE quantity > 0`) preventing negative inventory under concurrency. Admin-only additive restock increments with positive integer validation.
- **Persistent Storage**: Persistent file-backed SQLite database with automated migration application on startup.

## Technology Stack

- **Backend**: Node.js (`v26.7.0`), TypeScript (`5.7.2`), Express (`4.21.2`)
- **Database**: File-backed SQLite utilizing Node.js built-in `node:sqlite` (`DatabaseSync` with WAL journal mode)
- **Security & Tokens**: Node built-in `crypto.scrypt` (salt + timing-safe equality), `jsonwebtoken` (`9.0.2`)
- **Testing**: `vitest` (`2.1.8`), `supertest` (`7.0.0`)
- **Frontend (Pending Stage 2)**: React, TypeScript, HTML5, CSS3, Tailwind CSS with Vite

## Guides & Specifications

- [Requirements and Decisions](PROJECT.md)
- [Backend and Shared API Contract](BACKEND.md)
- [Frontend Design and Visual States](FRONTEND.md)
- [Development and Review Workflow](WORKFLOW.md)
- [AI Conversation Records](PROMPTS.md)

## Verified Local Backend Setup

### Prerequisites
- Node.js `v22.x` or `v26.x` (verified with `v26.7.0` using built-in `node:sqlite`)
- npm `11.x`+

### 1. Installation
From the repository root:
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in `backend/` (or copy from `backend/.env.example`):
```bash
PORT=4000
DATABASE_PATH=./data/cardeal.db
JWT_SECRET=cardeal_secure_dev_jwt_secret_key_at_least_32_chars!
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### 3. Local Administrator Provisioning
Provision an administrator account locally without public role selectors or default passwords:
```bash
# From backend directory:
npm run admin:provision <email> <password>

# Example:
npm run admin:provision admin@cardeal.com AdminPassword123!
```

### 4. Running the Backend Server
```bash
# Development mode (auto-reload via tsx):
npm run dev

# Or compile and start production build:
npm run build
npm start
```
The API server will listen on `http://localhost:4000`.

## Verified Tests & Test Suite Execution

All 29 integration and domain tests run against isolated temporary SQLite files and clean up automatically.

To execute the test suite:
```bash
# From backend directory:
npm test

# From repository root:
npm run test:backend
```

### Test Suite Summary
- `tests/canary.test.ts`: Infrastructure and TypeScript execution verification.
- `tests/auth_registration.test.ts`: User registration persistence in SQLite with scrypt password hash verification against correct and incorrect passwords.
- `tests/auth_validation.test.ts`: Email regex, password length bounds (12-128 chars), 409 duplicate email conflicts, and role escalation prevention.
- `tests/auth_login.test.ts`: Login credential verification, JWT token issuance with expiration, and generic 401 INVALID_CREDENTIALS.
- `tests/auth_middleware_and_admin.test.ts`: Bearer token authentication middleware, 401 UNAUTHORIZED/INVALID_TOKEN, 403 FORBIDDEN enforcement, and admin provisioning CLI.
- `tests/vehicles_crud.test.ts`: Admin vehicle creation with integer paise price validation, zero-stock catalog listing, PUT detail update with quantity modification rejection, and admin deletion.
- `tests/vehicles_search.test.ts`: Case-insensitive substring make/model search, exact category filter, inclusive paise bounds, reversed bounds rejection (400), and SQL LIKE wildcard escaping (`%` and `_`).
- `tests/purchase_and_restock.test.ts`: Atomic 1-unit purchase, 409 OUT_OF_STOCK handling, competing concurrent requests for the final unit (exactly 1 succeeds, 1 gets 409 conflict, final stock 0), and admin additive restock.
- `tests/database_restart_persistence.test.ts`: Full application and database restart verification proving persisted records, hashes, and inventory changes survive process shutdown and database reopening.

## Frontend Application

*Status: Pending Stage 2 implementation (Target: 9:25 PM IST).*

## Screenshots

*Status: Pending Stage 3 browser review on desktop and mobile viewports.*

## My AI Usage

### Tools and Actual Use
- **ChatGPT**: Assisted with interpreting the assignment and JD, structuring the initial guides, and planning test cases.
- **Antigravity with Gemini 3.8 Flash**: Executed repository inspection, verified `node:sqlite` compatibility on Node 26, drove genuine Red-Green-Refactor TDD slices, implemented database schema/migrations, services, controllers, routes, CLI provisioning, and restart persistence tests.

### Reflection
*Pending the candidate's personal reflection after complete workflow conclusion.*

### Conversation Transparency
[PROMPTS.md](PROMPTS.md) is currently incomplete and will be populated with verified raw unedited transcripts/links prior to final submission.
