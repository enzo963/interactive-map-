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

- [ ] Add failing tests for generic 404, malformed site routes, invalid map selections and empty datasets.
- [ ] Add StatePanel and polished NotFound; use consistent empty/unavailable states across page families, preserve filters in recovery actions.
- [ ] Verify focused regressions and record results.

## Task 2 — accessibility and responsive repairs

- [ ] Reproduce focus/semantic defects found by code and browser audits with tests.
- [ ] Repair gallery focus/loading/failure announcements, card pagination focus/status and map marker keyboard visibility.
- [ ] Audit menus, labels, headings, touch targets, contrast, long text and viewport overflow; fix specific causes.
- [ ] Verify focused tests and native browser behavior.

## Task 3 — loading and performance

- [ ] Record build baseline: main JS 424.27 kB / gzip 120.77 kB, CSS 65.51 kB / gzip 12.67 kB; baseline tests 82 passing, 1 optional skip.
- [ ] Add tests for route Suspense fallback/error recovery and section focus after delayed loading.
- [ ] Lazy-load pages; keep navigation stable and model resources opt-in; optimize font discovery and eager image priorities.
- [ ] Measure final static JS/CSS graph, route requests and local timings with the same tools.

## Task 4 — final verification

- [ ] Full JavaScript suite, lint, build and diff whitespace check.
- [ ] Browser coverage across all page families and six representative widths; native menu/gallery/keyboard checks.
- [ ] Fresh final review and fixes, then concise user report with performance before/after and remaining limits.

## Progress

Initial audit in progress. Parallel read-only accessibility and performance reviews are independent; all implementation stays with the root agent.
