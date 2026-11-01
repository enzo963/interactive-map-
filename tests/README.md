# P5-00 integration tests

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

The real dataset contains one record. Additional records and empty datasets are
in-memory fixtures; tests never write to sites.json or pipeline storage. Real network
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
