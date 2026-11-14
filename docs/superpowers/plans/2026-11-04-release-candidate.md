# Final QA and release candidate plan

**Goal:** Validate the current application and freeze a rollback-ready Version 1.0 candidate. Hosting and the domain remain undecided; deployment and stable release are pending.

**Architecture:** Preserve the default visible-card policy. Build the release with `HB_RELEASE_APPROVED_ONLY=1`, including matching route metadata. Keep the deployable static ZIP separate from private source and research snapshots.

**Scope:** P6-33 through P6-36, continuing the user-approved implementation. No public deployment, stable tag, or dataset approval is implied by packaging.

- [x] Complete English/source presentation QA, preserving recorded uncertainty and existing translations.
- [x] Test the connected visitor journey and settled theme colors across the six available browser profiles.
- [x] Add reproducible candidate packaging with approved snapshot, SHA-256 inventory, private application source snapshot, and static deployment ZIP. Refuse to overwrite existing candidates.
- [x] Run tests, lint, translations, clean production builds, ZIP integrity checks and independent review. Record exact evidence and browser limitations.
- [x] Document deployment configuration, HTTPS/routing smoke checks and rollback. Leave hosting/domain and stable release explicitly pending.

Evidence: `docs/P6-33-36-RELEASE-QA.md`. Local candidate prepared; public deployment and stable release remain pending.

Review focus: candidate data and metadata agree; archive numbering survives filtering; private files never enter deployment ZIP; artifacts are immutable; mobile emulation is labelled accurately.
