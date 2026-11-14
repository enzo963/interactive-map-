# P7-08 through P7-11 — model library and documentation

Goal: searchable verified-model entries, standardized metadata, site-bound photogrammetry projects and reusable reviewed image comparisons, continuing the existing local-only application.

Design: keep `/3d-archive` and its existing alias, but present individual model resources rather than only site cards. Search covers model and site metadata; format/method/governorate filters live in the URL. Reuse one metadata component in library entries and the opt-in viewer. Legacy supported model records remain readable; explicit negative verification or wrong-site binding takes priority. Missing creator/year/size/license remains unrecorded, not guessed or fetched automatically.

Optional project records reference existing verified model URLs and reviewed site image URLs. Only approved sites and reviewed, explicitly site-bound projects enter project views; ownership and lifecycle status remain separate from verification. Reconstruction text is interpretation, with recorded uncertainty. Optional comparison records reference two distinct, independently publication-approved images; pairs need review and matching site identity. Never infer before/after from gallery order. Provide native keyboard/touch range controls, a side-by-side view, source credits and unavailable-image handling.

No new live data, fabricated models/projects/pairs, dependencies, public deployment or mutation of the frozen release dataset.

- [x] Shared model metadata/library selectors and regression tests.
- [x] Publication-aware comparison normalization/component and regression tests.
- [x] Project normalization, schema contracts, site/project integration and regression tests.
- [x] Model library UI, metadata reuse, translations and initial metadata.
- [x] Full tests/lint/build, focused browser fixtures and independent review; document data and device limits.
