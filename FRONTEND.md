# Frontend design and behavior

Read PROJECT.md and BACKEND.md. Build an original React/TypeScript SPA using HTML5, CSS3 and Tailwind. No copied React Bits source or external app templates.

## Visual direction

A calm automotive inventory interface: warm white surfaces, charcoal typography, restrained teal accents, clear prices and aligned cards. Open directly on useful inventory rather than a large decorative landing page.

| Token | Initial choice |
| --- | --- |
| Page | #F6F7F5 |
| Surface | #FFFFFF |
| Primary text | #172126 |
| Secondary text | #52616B |
| Accent | #0F766E |
| Border | #DCE3E1 |
| Error | #B42318 |
| Spacing | 4, 8, 12, 16, 24, 32, 48 px |
| Radius | Cards 16 px, controls 8 px |
| Content | Centered, maximum 1280 px |
| Type | System sans-serif, 16 px base, 1.5 line height |

Verify actual contrast; tokens alone do not prove accessibility. Restrained shadows and consistent headings. External fonts unnecessary initially.

## Screens

Authentication: focused labeled form, inline errors, accessible password visibility control, links between login/register. Optional modest desktop brand panel disappears on phones. Preserve nonsecret inputs after recoverable errors.

Inventory header: CarDeal IS, Inventory, admin-only Manage, account identity and logout. Title Vehicle inventory and result count from actual data.

Wide layout: approximately 260 px filter sidebar plus flexible card grid. Medium: two columns where they fit. Phone: one column with expandable filters. Support 360 px without horizontal scrolling, at least 16 px outer padding; 24-32 px on desktop.

Cards: make/model, category, INR price, quantity/stock label, Purchase button. Optional 16:10 image area with polished fallback. Align actions without truncating important information. Document asset rights and use suitable alt text.

Filters: make, model, category, min/max price, Apply filters and Clear filters. Category text field is acceptable until a complete category source exists. Show rupees; convert precisely to integer paise. Reject malformed currency rather than silently rounding. Explicit Apply avoids excessive keystroke requests.

Admin: Add, Edit, Delete and Restock. Desktop table can become phone cards. Consistent reusable forms. Edit excludes quantity. Restock requests an integer increment. Delete confirmation names the vehicle. Hide admin controls from regular users; backend authorization remains mandatory.

## States

| State | Behavior |
| --- | --- |
| Loading | Stable skeleton/progress, no fake records |
| Empty inventory | Explanation and admin add action |
| No matches | Active filters and clear action |
| Request failure | Useful error and safe retry |
| Zero stock | Label and disabled Purchase |
| Purchase pending | Disable that button, prevent duplicate submission |
| Purchase success | Use returned stock and accessible announcement |
| Stock conflict | Explain and refresh inventory |
| Uncertain purchase network outcome | Refresh; never automatically repeat purchase |
| Expired session | Clear session and explain login redirect |
| Forbidden | Explain restriction, never fake success |
| Invalid input | Field-linked errors and focus first invalid field |

Never report success before the API confirms it. Prevent stale search responses overwriting newer results. Finished screens use real API data; fixtures remain isolated to tests.

## Accessibility and motion

Semantic controls, labels, landmarks, clear headings, visible keyboard focus, usable touch targets and live status announcements. Modals require initial focus, focus containment, Escape and focus restoration; use inline forms when simpler.

Original CSS transitions around 120-200 ms. Respect prefers-reduced-motion. No cursor effects, scroll hijacking, infinite backgrounds or delayed essential content.

## Architecture and session

Small typed API client, reusable forms/cards and focused pages. Add global state libraries only when justified. Initial bearer token lives in memory; reload requires login. This is a documented tradeoff, not persistent-session support. Do not silently change storage/auth design.

## Verification

Behavior tests before functional changes: form validation, auth errors, filter parameters, zero-stock disablement, pending purchase prevention, conflicts and role controls. Isolated frontend tests may mock HTTP; also test end-to-end against actual backend/database.

Inspect screenshots at 360, 768 and 1440 px, including long names, large prices, many cards, empty/error states and zero stock. Verify keyboard and reduced motion. Do not claim responsive quality from source alone. Final README screenshots show the actual working app.
