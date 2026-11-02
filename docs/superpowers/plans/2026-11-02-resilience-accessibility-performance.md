# P6-22–P6-26 implementation plan

> Use superpowers:executing-plans inline with targeted test-driven changes and a final fresh review.

**Goal:** Make failures understandable, navigation accessible, layouts robust and initial downloads smaller.

**Spec:** ../specs/2026-11-02-resilience-accessibility-performance-design.md

**Architecture:** Shared StatePanel and route error/loading screens; existing custom router and data services; route-level code splitting; targeted keyboard/media/CSS repairs. No new runtime dependencies.

## Global constraints

Preserve dataset, archive IDs, existing routes/aliases and source/licensing gates. No contact service, redesign, publishing or unrelated pipeline changes. Keep work local on the existing task branch and preserve prior work.

## Review focus

Malformed route parameters, invalid map selections, known-but-empty governorates; navigation/section focus after delayed imports; empty/unavailable versus no-results copy; keyboard gallery/pagination/map focus; optional model chunks not fetched before activation; real overflow rather than body clipping.

## Task 1 — states and invalid content

- [x] Add failing tests for generic 404, malformed site routes, invalid map selections and empty datasets.
- [x] Add StatePanel and polished NotFound; use consistent empty/unavailable states across page families, preserve filters in recovery actions.
- [x] Verify focused regressions and record results.

## Task 2 — accessibility and responsive repairs

- [x] Reproduce focus/semantic defects found by code and browser audits with tests.
- [x] Repair gallery focus/loading/failure announcements, card pagination focus/status and map marker keyboard visibility.
- [x] Audit menus, labels, headings, touch targets, contrast, long text and viewport overflow; fix specific causes.
- [x] Verify focused tests and native browser behavior.

## Task 3 — loading and performance

- [x] Record build baseline: main JS 424.27 kB / gzip 120.77 kB, CSS 65.51 kB / gzip 12.67 kB; baseline tests 82 passing, 1 optional skip.
- [x] Add tests for route Suspense fallback/error recovery and section focus after delayed loading.
- [x] Lazy-load pages; keep navigation stable and model resources opt-in; optimize font discovery and eager image priorities.
- [x] Measure final static JS/CSS graph, route requests and local timings with the same tools.

## Task 4 — final verification

- [x] Full JavaScript suite, lint, build and diff whitespace check.
- [x] Browser coverage across all page families and six representative widths; native menu/gallery/keyboard checks.
- [x] Fresh final review and fixes, then concise user report with performance before/after and remaining limits.

## Progress

Initial audit in progress. Parallel read-only accessibility and performance reviews are independent; all implementation stays with the root agent.

Final: 97 tests passed, 1 optional skip; lint/build/diff checks passed. Browser verified 108 combinations and native gallery/map behavior. See docs/P6-22-26-AUDIT.md for measured improvements and review fixes. Home is eager after rejecting the initial all-lazy timing regression; secondary routes remain lazy and startup preloading is bounded to 150 ms. No changes to data or pipeline.
