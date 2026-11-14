# P6-29 / P6-30 Attribution and Production Review Plan

**Goal:** Audit displayed provenance and licensing, then correct production configuration and security defects before deployment.

**Approach:** Reuse the existing React/Vite app, image evidence records and source display. Keep the canonical dataset intact, including research drafts. Add focused regression coverage for observed defects rather than changing editorial decisions. Domain and hosting remain undecided; do not deploy or fabricate public configuration.

## Review focus

- A license label must agree with its reviewed terms and bound media URL; contradictory or malformed evidence cannot verify rights.
- Attribution and uncertainty must accompany images, models, videos and downloadable assets. Model identity verification does not establish reuse rights.
- Reject unsafe URLs at data boundaries and media renderers; retain valid references and same-origin media paths.
- Keep write APIs, editor UI, draft research and local environment files out of deployable output. Protect the local write endpoint against cross-origin writes.
- Separate runtime dependencies from development findings; avoid forced downgrades and verify any patched override.

## Tasks

- [x] Audit current approved records, photo source pages, references, map/font/brand assets and optional media paths. Record exact inventory and limits in `docs/P6-29-30-AUDIT.md`.
- [x] Add failing tests for stale/mismatched license evidence and incomplete media attribution; implement shared evidence checks/display and preserve metadata during normalization. Add German translations.
- [x] Add regression tests for URL validation, dev-write safeguards and production output isolation; fix only confirmed issues in URL helpers, Vite plugins/config and ignore rules.
- [x] Review dependency advisories against primary sources; apply a narrow supported fix when validation permits, then re-run dependency audits.
- [x] Run relevant tests, full suite, translation check, lint, production build and HTTP artifact checks. Obtain independent read-only review, resolve findings and record remaining host/domain work.

**Verified:** 118 frontend tests passed, one optional export test skipped; 228 pipeline tests passed; lint, translation coverage (540 keys), production build and diff whitespace checks passed. Eight headless Edge route/viewport checks passed with production headers applied, no CSP violations or runtime exceptions. Independent review's evidence-binding issue was reproduced and fixed; the reviewer confirmed the fix. The browser-discovered asset initialization cycle is covered by a production-chunk regression.

**Rulings:** Build-time publication filtering is necessary because noindex does not prevent draft data downloading; preserve the canonical source file. Keep inline styles in CSP because React component styles and Leaflet positioning require them; move the theme initializer to an external script to block inline JavaScript. Retain unknown-media rendering with clear uncertainty for legacy detail records, while excluding restricted media and preserving the stricter cover publication gate.

Work stays local on the existing `codex/seo-metadata` branch to preserve prior tasks and user research changes. No commit, merge or deployment is authorized by this task.
