# P7-08–P7-11: digital heritage resources

Implemented locally on 6 November 2026 in `codex/production-browser-validation`, under `C:/Users/MSR/Documents/ChatGPT/enzo/history-in-cards-validation`.

## Visitor behavior

- **P7-08:** `/3d-archive` and `/decks/3d` show individual verified model resources. Search covers model and site metadata; format, method and governorate filters are preserved in the URL. Library browsing does not download models or load embedded viewers.
- **P7-09:** shared model information appears in both library entries and the viewer: title, site association, creator, method, year, source, license state, format, recorded byte size and review status. Unknown values remain unrecorded. Resource review does not establish copyright permission.
- **P7-10:** reviewed photogrammetry project records connect a site to independently eligible models, photographs and documentation. Site pages show recorded methods and reconstruction evidence/uncertainty. Our Work lists owned projects with their lifecycle status. Planned work does not become completed documentation.
- **P7-11:** reviewed editorial image pairs provide keyboard/touch reveal and side-by-side views, captions, dates, image kinds and both source credits. Missing dates stay unknown. Failed images produce an unavailable state. Gallery ordering never creates a comparison automatically.

## Authoring contract

The optional fields in `src/data/sites.schema.json` are `model_metadata`, `digital_assets`, `photogrammetry_projects` and `comparisons`. Existing legacy model records remain supported. Model metadata uses `title`, `creator`, `creationMethod`, `year`, `sourceName`, `sourceUrl`, `license`, `format`, `fileSizeBytes`, `siteId` and `verification_status`. An authored asset `id` is optional. Years are integers 1–9999; recorded byte sizes are nonnegative safe integers. Neither is fetched or guessed.

Projects require `id`, `title`, `siteId` and an explicit approved/verified `verification_status`. `our_work` identifies ownership independently of lifecycle `status` (`planned`, `in-progress`, `completed`, `archived`). `modelUrls` and `photographUrls` reference existing resources, not new approvals. Optional `documentation` entries need independent review and safe URLs; `reconstruction` holds authored description, evidence and uncertainties.

Comparison records require an authored identity/title, reviewed status, supported `type`, and distinct `before`/`after` image references with labels. Types are `historical-current`, `reconstruction` and `pre-post-destruction`. Dates are optional text. Reconstruction comparisons explicitly identify both sides as photograph/reconstruction, with at least one reconstruction. Site identity must agree when supplied.

All public views require approved sites. Model resources require their own supported review gates; explicit negative verification, contradictory review states, wrong-site associations and restricted resources are rejected. Comparison/project photographs additionally require verified licensing evidence and publication approval bound to their image URL and site. Project approval never approves linked resources.

The Python content exporter preserves these fields using explicit public allowlists, safe URL normalization and retained review/rights flags. Private research fields are excluded. Standalone public documentation is preserved without implying approval. The existing record review ledger and image-evidence checks remain in force.

## Dataset and release limits

The current dataset contains no verified 3D models, reviewed photogrammetry projects or approved comparison pairs. The public pages therefore show honest empty states. Populated browser tests use isolated synthetic records and original test drawings under ignored `.validation/`; they do not change the published dataset or deployment build.

The existing frozen `v1.0.0-rc.1` artifacts remain an earlier snapshot. These changes have not been deployed; hosting and public domain remain undecided.

## Verification

Reproduce frontend checks with `npm test`, `npm run lint`, `npm run check:i18n`, and `npm run build`. Run `npm run validate:digital` for the focused browser matrix; optional `HB_CHROME_EXECUTABLE` and `HB_FIREFOX_EXECUTABLE` select installed binaries. Its report is `.validation/digital-heritage/report.json`, including the production-build digest, browser versions, assertions and limitations.

Browser coverage includes Chrome, Edge, Firefox, WebKit and Android/iPhone emulation. Desktop comparison layouts are checked at 320, 768, 1280 and 1440 pixels. Mobile profiles are emulated; Windows WebKit is not retail Safari. This task does not claim physical-device testing.

Python exporter regressions live in `tools/content-pipeline/tests/test_digital_resource_export.py` and exercise actual record review/evidence-ledger export paths.

Final automated results: frontend 184 passed, two optional skipped, zero failed; Python pipeline 246 passed; ESLint passed; 673 interface translation keys covered. Production build completed without warnings and generated 68 page metadata heads. Canonical URLs and sitemap remain inactive until a public domain is configured. Research dataset and frozen release archive hashes match the existing release manifest.

The final focused browser matrix passed 136 assertions across all six profiles with zero local HTTP, runtime or CSP errors. Fixture HTML includes the mobile viewport declaration and checks device-width rendering. Screenshot review confirmed the narrow stacked comparison layout. The final production build digest matches the browser report.
