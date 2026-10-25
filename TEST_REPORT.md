# Automated Test Execution and Verification Report

**Project**: CarDeal-IS (Incubyte Round 1 Car Dealership Inventory System)  
**Date & Time**: 2026-10-25 21:18 IST  
**Git Commit Tested**: `33b8649309c4d8f009059cc55e3c35a32eb06b90` (Phase 3 Verified Head)  
**Execution Environment**:
- **Operating System**: Microsoft Windows 11 (win32 x64)
- **Node.js Runtime**: `v26.7.0` (using native built-in `node:sqlite` engine)
- **npm Version**: `11.19.0`
- **Test Framework**: Vitest `v2.1.9` with `@testing-library/react` `16.3.3` and `supertest` `7.3.1`
- **TypeScript**: `v5.9.3`

---

## 1. Executive Summary

| Scope | Test Suites | Total Tests | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Backend API** | 12 | 39 | 39 | 0 | **PASS (100%)** |
| **Frontend SPA** | 5 | 16 | 16 | 0 | **PASS (100%)** |
| **Total Combined** | **17** | **55** | **55** | **0** | **PASS (100%)** |

Both backend TypeScript compilation and frontend production builds completed successfully. PASS (100%) denotes the proportion of executed tests passing, not code coverage.

---

## 2. Test Suite Breakdown

### Backend API Test Suites (39 Tests in 12 Suites)

1. **`tests/canary.test.ts`** (1 test)
   - Baseline TypeScript and Node.js runtime validation.
2. **`tests/auth_registration.test.ts`** (1 test)
   - TDD Slice 1: Persists newly registered regular user in file-backed SQLite with secure salted `scrypt` hash.
3. **`tests/auth_validation.test.ts`** (5 tests)
   - TDD Slice 2: Email format validation, password length bounds (12–128 characters), duplicate email conflict handling (`409 CONFLICT`), and role tampering rejection.
4. **`tests/auth_login.test.ts`** (3 tests)
   - TDD Slice 3: Valid credential verification, signed JWT token issuance, and bad password rejection with generic `401 INVALID_CREDENTIALS`.
5. **`tests/auth_middleware_and_admin.test.ts`** (4 tests)
   - TDD Slice 4: Bearer token parsing, `401 UNAUTHORIZED` on missing/malformed token, `403 FORBIDDEN` on non-admin access, and admin CLI provisioning.
6. **`tests/vehicles_crud.test.ts`** (5 tests)
   - TDD Slice 5: Admin vehicle creation with integer paise price, input validation, zero-stock catalog listing, PUT detail update with quantity modification rejection, and vehicle deletion.
7. **`tests/vehicles_search.test.ts`** (6 tests)
   - TDD Slice 6: Substring make/model search, exact category filter, inclusive paise bounds, reversed bounds rejection (400), and SQL `LIKE` wildcard escaping.
8. **`tests/purchase_and_restock.test.ts`** (3 tests)
   - TDD Slice 7: Atomic 1-unit purchase, `409 OUT_OF_STOCK` handling, concurrent competing requests for the last remaining unit (atomic SQLite decrement: 1 succeeds, 1 gets 409, final stock 0), and admin additive restock.
9. **`tests/database_restart_persistence.test.ts`** (1 test)
   - TDD Verification: Closes and reopens the same SQLite file and reconstructs the Express app within one process. This does not restart the OS process or verify persistence of the final purchase through another reopen.
10. **`tests/e2e_integration_flow.test.ts`** (1 test)
    - Multi-step HTTP API integration test. It does not exercise the React UI through a browser.
11. **`tests/regression_fixes.test.ts`** (7 tests)
    - Independent review regression suite: explicit JWT secret enforcement, safe integer boundaries, brute-force login throttling (`429 TOO_MANY_REQUESTS`), expired token rejection, concurrent duplicate registration, and strict payload filtering.
12. **`tests/phase3_regressions.test.ts`** (2 tests)
    - Phase 3 regressions: Atomic SQL restock upper-bound predicate (`WHERE quantity <= MAX_SAFE_INTEGER - increment`) rejecting overflow under concurrency, and subprocess CLI provisioning verification honoring custom `DATABASE_PATH`.

### Frontend SPA Test Suites (16 Tests in 5 Suites)

1. **`src/utils/currency.test.ts`** (4 tests)
   - Rupee-to-paise conversion, rejection of fractional paise and malformed strings, and Indian Rupee currency formatting (`₹`).
2. **`src/components/VehicleCard.test.tsx`** (5 tests)
   - Card rendering, INR price formatting, zero-stock button disablement, purchase click handler, and in-flight loading spinner.
3. **`src/components/AuthView.test.tsx`** (1 test)
   - Verifies bad login credentials display invalid credentials error and do NOT erroneously trigger session expired banner.
4. **`src/components/AdminModal.test.tsx`** (4 tests)
   - Strict whole integer quantity parsing, rejection of fractional/malformed stock and increment inputs, ESC key dismiss listener, and focus trapping within open dialog.
5. **`src/App.test.tsx`** (2 tests)
   - Authentication view rendering on initial load and form validation.

---

## 3. Production Build Verification

### Backend Build Output (`npm run build:backend`)
```bash
> cardeal-is-backend@1.0.0 build
> tsc
# Completed with exit code 0
```

### Frontend Build Output (`npm run build:frontend`)
```bash
> cardeal-is-frontend@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 40 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.54 kB │ gzip:  0.36 kB
dist/assets/index-DkBPnZ6N.css   20.24 kB │ gzip:  4.45 kB
dist/assets/index-SKKR0JfL.js   177.60 kB │ gzip: 54.90 kB
✓ built in 1.40s
```

---

## 4. Full Verbatim Test Execution Log

Command: `npm test` (invoking `npm run test:backend && npm run test:frontend`)

```text
> cardeal-is@1.0.0 test
> npm run test:backend && npm run test:frontend


> cardeal-is@1.0.0 test:backend
> npm --prefix backend test


> cardeal-is-backend@1.0.0 test
> vitest run


 RUN  v2.1.9 D:/hahaha/CarDeal-IS/backend

 ✓ tests/canary.test.ts (1 test) 5ms
 ✓ tests/auth_registration.test.ts (1 test) 341ms
   ✓ TDD Slice 1: User Registration Persistence > persists a newly registered regular user in SQLite with a secure password hash 339ms
 ✓ tests/auth_validation.test.ts (5 tests) 366ms
 ✓ tests/database_restart_persistence.test.ts (1 test) 449ms
   ✓ TDD Verification: Restart Persistence on File-Backed SQLite > proves file-backed SQLite persists data across complete database and app restarts 448ms
 ✓ tests/auth_login.test.ts (3 tests) 545ms
   ✓ TDD Slice 3: User Login and Token Generation > authenticates valid credentials and returns a signed JWT token and user envelope 341ms
 ✓ tests/e2e_integration_flow.test.ts (1 test) 532ms
   ✓ End-to-End Integration Flow (Verification Requirements 1-7) > successfully executes all seven required business and security flows in sequence 530ms
 ✓ tests/auth_middleware_and_admin.test.ts (4 tests) 511ms
 ✓ tests/phase3_regressions.test.ts (2 tests) 759ms
   ✓ Phase 3 Focused Backend Regressions > verifies admin provisioning CLI executes as a real subprocess with custom DATABASE_PATH 618ms
 ✓ tests/regression_fixes.test.ts (7 tests) 1286ms
   ✓ Backend Regression Fixes > 3. throttles repeated failed login attempts with 429 TOO_MANY_REQUESTS 553ms
   ✓ Backend Regression Fixes > 7. verifies admin provisioning CLI honors custom DATABASE_PATH via subprocess 411ms
 ✓ tests/purchase_and_restock.test.ts (3 tests) 1415ms
   ✓ TDD Slice 7: Atomic Purchase, Restock and Concurrency > decrements quantity by 1 upon valid purchase 567ms
   ✓ TDD Slice 7: Atomic Purchase, Restock and Concurrency > handles competing requests for the last remaining unit: exactly 1 succeeds, 1 gets 409 conflict 435ms
   ✓ TDD Slice 7: Atomic Purchase, Restock and Concurrency > allows admin to restock with a positive integer increment 411ms
 ✓ tests/vehicles_crud.test.ts (5 tests) 1631ms
   ✓ TDD Slice 5: Vehicle Inventory CRUD Endpoints > allows admin to create a vehicle with integer paise price and valid fields 475ms
   ✓ TDD Slice 5: Vehicle Inventory CRUD Endpoints > rejects vehicle creation with invalid or missing fields, negative price, or fractional price 348ms
 ✓ tests/vehicles_search.test.ts (6 tests) 1912ms
   ✓ TDD Slice 6: Vehicle Search and Filtering > filters vehicles by case-insensitive substring on make and model 454ms
   ✓ TDD Slice 6: Vehicle Search and Filtering > filters vehicles by case-insensitive exact match on category 362ms

 Test Files  12 passed (12)
      Tests  39 passed (39)
   Start at  21:17:28
   Duration  3.97s (transform 1.02s, setup 0ms, collect 12.49s, tests 9.75s, environment 4ms, prepare 4.78s)


> cardeal-is@1.0.0 test:frontend
> npm --prefix frontend test


> cardeal-is-frontend@1.0.0 test
> vitest run


 RUN  v2.1.9 D:/hahaha/CarDeal-IS/frontend

 ✓ src/utils/currency.test.ts (4 tests) 21ms
 ✓ src/components/VehicleCard.test.tsx (5 tests) 160ms
 ✓ src/components/AuthView.test.tsx (1 test) 140ms
 ✓ src/App.test.tsx (2 tests) 150ms
 ✓ src/components/AdminModal.test.tsx (4 tests) 226ms

 Test Files  5 passed (5)
      Tests  16 passed (16)
   Start at  21:17:34
   Duration  3.48s (transform 408ms, setup 1.52s, collect 1.76s, tests 697ms, environment 9.08s, prepare 1.44s)
```

## Independent review confirmation and scope

On 25 October 2026 at approximately 21:34 IST, an independent review reran `npm test` and `npm run build` against an isolated copy of the application at `857944f3c7bf800ed3dcafdbedced4c30ffda7d1`. All 39 backend tests and 16 frontend tests passed, and both builds completed successfully. Runtime: Node.js 26.7.0, npm 11.19.0. Dependency versions above were corrected against the lockfiles during this review.

The review used copied installed dependencies; it does not establish a fresh-checkout installation. Desktop and mobile screenshots were visually inspected. A complete browser-driven business-flow test, cross-process database contention test and measured coverage report are not included. The stored execution log above remains the original earlier run, not a reconstruction of the independent run.
