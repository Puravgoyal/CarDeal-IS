# CarDeal IS project agreement

Stage Zero specification only. No application behavior has been implemented or tested.

Repository: https://github.com/Puravgoyal/CarDeal-IS
Candidate Git identity: Puravgoyal <puravgoyal83@gmail.com>

## Authority

Follow the candidate's instructions and AI_Kata_Car_Dealership_Inventory_System_V2.docx. The JD, SCInternJD1 (1).docx, supplies craftsmanship context. Java appears in the JD but is not an approved backend choice for this assignment.

Read this file and the relevant BACKEND.md/FRONTEND.md before each stage. BACKEND.md owns the shared HTTP contract. Do not assume Antigravity automatically reads arbitrary Markdown files.

## Assignment requirements

- Backend: Node.js/TypeScript with Express/NestJS, Python with Django/FastAPI, or Ruby with Rails.
- Persistent database; an in-memory database alone is insufficient.
- POST /api/auth/register and POST /api/auth/login with token-based authentication.
- Protected POST/GET /api/vehicles, GET /api/vehicles/search, PUT /api/vehicles/:id.
- Admin-only DELETE /api/vehicles/:id and POST /api/vehicles/:id/restock.
- Protected POST /api/vehicles/:id/purchase, decreasing quantity.
- Vehicle unique ID, make, model, category, price and stock quantity.
- Search by make, model, category or price range.
- React, HTML5, CSS3 and Tailwind SPA with registration/login, inventory, search/filtering and purchase.
- Disable Purchase at zero stock; provide admin add/update/delete UI.
- Appealing responsive design.
- Tests before functionality, genuine Red-Green-Refactor commit history, meaningful coverage.
- Clean maintainable code, pragmatic SOLID principles, descriptive frequent commits.
- AI co-author attribution on every AI-assisted commit.
- Public repository; README overview, verified backend/frontend local setup, screenshots and exact heading My AI Usage.
- A real test report and root PROMPTS.md with raw unedited conversations or public chat links, not AI summaries.
- Deployment is optional. Plagiarized application code is prohibited.

## Proposed decisions, not additional recruiter requirements

- TypeScript/Express; file-backed SQLite with migrations; React/TypeScript/Tailwind with Vite.
- Verify a supported Node LTS and compatible package versions during setup; record versions and lockfile. Select the database driver then.
- Tests use isolated temporary database files. No fake persistence.
- Admin-only add/update aligns with admin UI; the brief explicitly restricts only delete/restock.
- Registration always creates regular users. A separate local command provisions an administrator; no public role selector or published default password.
- Purchase one unit per request; restock accepts a positive integer increment.
- After creation, quantity changes only through purchase/restock, not PUT.
- List zero-stock vehicles with out-of-stock labels and disabled buttons.
- Proposed currency INR; API price is integer paise, UI displays rupees.
- Original React/Tailwind design and CSS effects; no copied React Bits components or external app templates.
- Optional images require appropriate rights, documented origins and a designed fallback.
- No LLM feature, payment system, shopping cart or order history in core scope.

Review these decisions in Stage Zero before implementation.

## Stages and Consolidated Roadmap (Target Deadline: 10:00 PM IST)

1. Complete backend and tests — target 8:40 PM IST.
   - Minimal tooling, migrations, and test harness with file-backed SQLite (`node:sqlite`).
   - Registration, login, password hashing, and signed token authentication.
   - Validation, error shapes, role enforcement, and local administrator provisioning script.
   - Vehicle CRUD, parameterized search, and atomic purchase/restock with boundary checks.
   - Rigorous TDD with Red-Green-Refactor commit history and restart persistence verification.
2. Complete frontend and integration — target 9:25 PM IST.
   - Vite + React + Tailwind SPA with original design and responsive states.
   - Authentication, catalog browsing, search/filter controls, purchasing, and admin inventory management.
   - End-to-end integration against the real backend API.
3. Final fixes, verification, screenshots, documentation, conversation logs and GitHub submission — target 9:50 PM IST.
   - Viewport verification (360px, 768px, 1440px) and screenshot capture.
   - Real test report generation and README documentation update.
   - Assembly of verified conversation transcripts in PROMPTS.md.
   - Public visibility verification and final push.

Stages contain small reviewable slices. Do not generate the whole application in one shot.
