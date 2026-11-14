# P5-00 integration tests

## P6-31 / P6-32: production build and browsers

`npm run validate:production` builds the real app and runs HTTP/Playwright checks.
Browser installation and executable overrides are described in
`docs/P6-31-32-VALIDATION.md`. The audit covers Chrome, Edge, Firefox, WebKit and
Android/iPhone emulation, including a real built 3D renderer/cache retry fixture.
Reports and screenshots go to ignored `.validation/p6-31-32/`; fixture routes are
local to the audit server and never enter the deployment build.

Final local results: 582 browser assertions passed across six profiles; 54 generated
routes and 41 local assets passed HTTP checks. The frontend suite has 118 passing
tests and one optional export skipped. Production chunk budgets pass and the build
has no warnings. Mobile emulation is not physical-device or retail Safari testing.

## P6-29 / P6-30: attribution and production security

Coverage checks the current published references/photos, stale or malformed media
evidence, card/gallery/model/video/download attribution, unsafe URLs, local editor
Origin/content-type/body/coordinate checks, and production exclusion of drafts,
editor code and source maps. The built metadata chunk is initialized to catch
asset-loading cycles. Editor tests copy the plugin into a temporary project and
never send write requests to the real archive.

On 2026-11-03, 118 frontend tests passed with one optional export test skipped;
228 Python pipeline tests passed after the Requests update. Lint, translations and
production build passed. Eight headless Edge checks covered Home, Explore, Site
Details and Map at 390/1440 px with the static-host CSP explicitly applied. See
`docs/P6-29-30-AUDIT.md` for evidence, policy limits and pending host/domain settings.

## P6-28: social sharing previews

`social-sharing.test.mjs` builds and serves production HTML, then checks Home and
every approved heritage URL as a sharing crawler without executing JavaScript.
It checks page-specific titles/descriptions, Open Graph/Twitter metadata, absolute
URLs, and the actual served preview PNG. The test uses an isolated temporary build
and a test-only origin; it never configures the public project domain.

## P6-27: SEO and metadata

Coverage includes page/site metadata, domain configuration, publication rules,
canonical aliases, query variants, escaping, generated HTML/robots/sitemap files,
and metadata replacement during navigation and language switching. On 2026-11-03,
110 tests passed and one optional export test skipped. See `docs/SEO.md` for
domain setup and the hosting requirements for generated route metadata.

## P6-22 through P6-26: resilience, accessibility and performance

Regression coverage includes invalid routes and map selections, known-empty
governorates, missing geography, empty versus filtered results, pagination focus,
gallery trapping/announcements/failure recovery, keyboard versus pointer map focus,
actual suspended routes, section scrolling after loading, route errors and bounded
startup preloading. On 2026-11-02, 97 tests passed and one optional export test skipped.

Production browser checks covered 108 route/viewport combinations at
320/390/768/1024/1440/1920 px. See `docs/P6-22-26-AUDIT.md` for fixes, measured
before/after performance, tools and practical validation limits.

## P6-17 through P6-21: project pages and navigation

The integration suite covers direct links to `/about`, `/methodology`, `/our-work`
and `/contact`, source-tier explanations, approved-only project documentation,
unavailable contact channels, header/footer destinations, route aliases and trailing
slashes, menu Escape/focus behavior, navigation dismissal and repeated global searches.

Local verification on 2026-11-01: 82 tests passed and the optional real-source export
test was skipped; lint and production build passed. Browser checks covered all four
pages at 320/390/768/1440 px, plus mobile/desktop navigation and keyboard dismissal.
Official email/social links are intentionally postponed; the contact page has no
submission form. The existing model-viewer bundle-size warning remains.

Run from the project root:

```powershell
npm test
npm run lint
npm run build
```

The suite mounts the real App, router, services, pages, and components using React
and jsdom. It covers Home, Explore/Cards, Map, Decks, Site Details, and the existing
3D Archive route together, including:

- Navigation from Home through a card to its site and governorate deck.
- Random draws, deck filtering/sorting, shared search, and URL-driven selections.
- Map focus previews, counts, zoom, keyboard pan, and suppression of clicks after a drag.
- Canonical images and sources, gallery open/next/close, model links and related cards.
- Broken images, missing records, empty datasets, and shared stylesheet deduplication.
- History URL restoration through simulated popstate events.

Count-sensitive tests select one baseline record from the real catalog. Additional
records and empty datasets are in-memory fixtures; tests never write to sites.json or pipeline storage. Real network
requests and external media are not loaded. Gallery native-dialog methods, matchMedia,
scrolling, and pointer capture are simulated where needed.

These tests verify DOM behavior and React state, not visual layout. Responsive CSS,
actual touch gestures, native dialog focus trapping, real browser history controls,
and rendering external images/3D embeds still require browser/device verification.

Result for the merged Phase 4 work: 16 tests passed; full lint and the production
build passed. No application integration bug was reproduced, so no application
logic or UI was changed for P5-00.

P5-06 adds nine schema/adapter tests to npm test: 25 JavaScript tests passed with
the local prepared catalog. The optional catalog check is skipped on fresh
checkouts without ignored collection data. The Python suite now has 30 passing
tests, including standardization identity, idempotence and unknown flags.

P5-27/P5-28 add manual isolated stress/live-flow runners under
`tools/content-pipeline/tests/`. See that pipeline README for commands and the
measured results. The large synthetic run never crawls 1,000 live URLs and never
writes real approvals. `e2e_real_sites.py --mode live` fetches the selected real
UNESCO pages/images into its explicit isolated output directory; replay mode
reuses saved HTML but still validates image URLs over HTTP.

Set `HB_PIPELINE_E2E_EXPORT` to the runner's `export_path` before `npm test` to
exercise its exported records through the real App/Card/Site Details tree. This
extra integration test is skipped if the environment variable is absent. It
loads data only into the test process's service cache. The ordinary frontend
JSON and editorial review ledger are never replaced. Real unverified images
must remain absent from the export; an independently generated synthetic
permission fixture covers the positive approved-image path.


## P6-06 through P6-11: search and exploration

The frontend now contains 34 approved records from the reviewed northern/central export, including alternative names from the same approved revisions. No schema migration is required. Unknown UNESCO/3D values remain distinct from explicit negatives.

`npm test` includes alias/Unicode search, combined filters, disjunctive facet counts, repeated URL period parameters, URL/history behavior, governorate Map-to-Explore handoff, discovery links, mobile filter closure/focus, and clickable source-backed map locations. Existing map gesture regressions use a deterministic selected-site baseline; the new tests also exercise the complete imported catalog.

Try these local routes after `npm run dev`:

- `/explore?q=Qasr%20al-Khalifa` — search an alternative name.
- `/explore?gov=baghdad&period=Ottoman&unesco=unknown&model=unknown` — combined filters.
- `/explore?category=cultural` — category exploration.
- `/explore?period=Abbasid` — period exploration.
- `/map?region=nineveh&q=mosque` — regional results and the governorate collection link.

Browser validation covered 320/390px phones, a 768px tablet and 1440px desktop. Search and filter panels occupy document flow on mobile; the results action closes filters and returns focus to results. Only three property locations are supported by the existing source snapshots; other sites remain unplotted. All sites remain accessible through governorate results. No 3D models are claimed when availability is unrecorded.

## P6-12 through P6-16: collections, viewer, recommendations and sharing

- `/unesco` shows only approved World Heritage properties; tentative-list and component records are not separately counted. `/decks/unesco` remains a compatible deep link.
- `/3d-archive` shows approved sites with verified model/reconstruction resources; `/decks/3d` remains supported. The current catalog has no verified models, so it presents an empty state.
- The reusable viewer supports interactive GLB/glTF and opt-in Sketchfab embeds. Other supported model formats are downloads; unsupported external providers remain links. No iframe is created for arbitrary websites.
- Primary model availability requires an approved record, an explicit `has3D: true` and a valid `model_3d_url`. Structured `digital_assets` require an approved record and an asset `verification_status` of `approved` or `verified`; a supplied `siteId` must match. A URL or a deck tag alone never verifies a resource.
- The viewer library is loaded only after activation. Timeout, dependency failure, resource errors, retry and source replacement are covered by tests. Downloads remain available if rendering fails.
- Related cards use approved candidates, governorate aliases, site/heritage category and recorded historical context. Same-age cards or a common UNESCO badge alone do not create a recommendation. Visible reasons explain the relationship.
- All 34 existing slugs are persisted. Site Details exposes a canonical URL, native sharing, clipboard copying and manual selection when browser clipboard access is unavailable. Query strings and section hashes are excluded from shared URLs; cancelling native share does not trigger copying.

The added tests cover these collection gates and model/share interactions. Browser validation uses an isolated synthetic renderer fixture; it is never added to heritage data or the public asset folder.
The renderer is pinned to version 4.4.0. Its narrow failed-URL cache adapter is covered by a real 404-to-success browser recovery check; re-run that check before upgrading the renderer. Initial site section fragments such as `/sites/hatra#gallery` are also supported, while Copy Link shares the canonical site URL.
