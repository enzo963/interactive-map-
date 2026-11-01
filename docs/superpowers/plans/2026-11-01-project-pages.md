# History in Cards Project Pages Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver P6-17 through P6-21 as accessible, truthful public pages and connected navigation.

**Architecture:** Extend the current React router, PageHeader and SmartLink conventions. Keep content in page components, share editorial CSS and reuse approved documentation selectors.

**Tech Stack:** React, Vite, CSS, Node test runner, jsdom.

**Spec:** ../specs/2026-11-01-project-pages-design.md (approved in chat).

## Global Constraints

- No new runtime dependencies or heritage data/pipeline changes.
- Contact details and social links are postponed; no functioning submission service is represented.
- Do not invent completed work, partnerships or verified models.
- Preserve existing routes, collections and card-reading guidance.
- Deliver local changes without deployment, commit or push.

## Review Focus

- Direct links, history changes and same-page links must leave navigation usable.
- Nested UNESCO/3D aliases must highlight the correct destination only.
- Keyboard Escape must close the appropriate menu and return focus.
- Empty or unapproved documentation must never appear as completed published work.
- Mobile layouts must keep all destinations reachable without overflow.

## Task 1: Public pages

Files: modify src/pages/About.jsx and src/routes.jsx; create src/pages/Methodology.jsx, src/pages/OurWork.jsx, src/pages/Contact.jsx and src/styles/project-pages.css; extend tests/integration.test.mjs.

Interfaces: consume getAllSites(), getDocumentationSummary(sites), isApprovedSite(site); expose default page components on /about, /methodology, /our-work and /contact.

- [x] Add route/content tests, including no contact form and empty/approved/draft work states.
- [x] Run focused tests and observe missing content/routes fail.
- [x] Implement mission, scope, methodology, source tiers, areas of work and contribution guidance with current visual tokens.
- [x] Run focused tests; expected all pass.

## Task 2: Navigation and footer

Files: modify src/data/navigation.js, src/components/layout/Navbar.jsx, src/components/layout/Footer.jsx and src/styles/layout.css; extend tests/integration.test.mjs.

Interfaces: PRIMARY_NAV contains archive links; PROJECT_NAV contains four project links. Navbar and Footer consume these lists. Project disclosure is native details/summary with Escape/focus handling.

- [x] Add tests for project/footer links, route aliases, Escape focus, same-page link closure and history-driven menu closure.
- [x] Run focused tests and observe missing navigation behavior fail.
- [x] Implement grouped desktop/mobile navigation and footer; preserve global search and Draw a Card.
- [x] Run focused tests; expected all pass.

## Task 3: Verification and review

- [x] Run npm test, npm run lint and npm run build; expected zero failures (optional environment-dependent tests may skip).
- [x] Inspect desktop/mobile pages and menu interactions in a real browser if available.
- [x] Obtain a fresh final code review; resolve material findings and rerun affected checks.
- [x] Report changes and verification concisely, noting postponed contact details.

## Execution record

- User approved proceeding on 2026-11-01 and requested a simple completion report.
- Implement inline in the requested local folder; use a feature branch to protect main. No separate worktree needed for these bounded frontend changes.
- Existing docs/ contains only the design created in this chat; do not modify unrelated files.
- Baseline: 63 tests passed, one optional real-source export test skipped.
- New tests first failed for missing routes/content/navigation behavior. Two multi-route tests were corrected to mount a fresh router per case, matching direct-link behavior.
- Final review caught search focus/value loss caused by remounting the header. Reproduced in a failing test and fixed by resetting menu state while preserving the header/search DOM. Trailing-slash highlighting also received failing-then-passing regression coverage.
- Final verification: 82 tests passed, one optional real-source export test skipped; lint and build passed; git diff --check passed. Vite still warns about the existing model-viewer chunk exceeding 500 kB.
- Browser: all four pages checked at 320, 390, 768 and 1440 px widths with no horizontal overflow; no JavaScript errors recorded. Desktop dropdown, mobile menu, Contact page/footer and Escape focus restoration were inspected in the browser.
- Delivery: local, uncommitted changes on codex/project-pages; contact channels and social URLs remain postponed. No heritage records, pipeline logic or runtime dependencies were changed.
