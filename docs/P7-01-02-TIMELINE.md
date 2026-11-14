# P7-01 / P7-02 — timeline and civilization exploration

Implemented and validated locally on 2026-11-04 in `codex/production-browser-validation`.

## Visitor experience

- `/timeline`: interactive era sequence, exact recorded-period/civilization selector, name/alias search and reusable heritage cards.
- `/civilizations`: civilization/era index with approved-record counts.
- `/civilizations/:eraId`: dedicated view, including Assyrian, Babylonian, Hellenistic, Parthian, Sasanian, Islamic, Ottoman and modern exploration.
- Primary navigation and footer expose both destinations. Era pages keep Civilizations active in navigation.
- Filters are represented in URLs. Era/period selection supports Back and refresh; search replaces its current history entry. Invalid timeline filters recover through Reset; invalid civilization IDs use the existing 404 page.
- Empty eras and no-results states have recovery links. Eleven approved records without a mapped era remain available under Other or unrecorded periods.

The approved dataset has period labels but no usable numeric dates for an exact-year timeline. The timeline therefore presents broad, overlapping historical groups. It does not assign dates or change historical records. Grouping reads only existing `period` and `civilization` fields, with case/Unicode normalization and whole-word matching. Islamic grouping accepts explicit Islamic or Abbasid labels; that relationship is explained in the dedicated view. A description, name, card age or unapproved record never determines membership.

## Approved coverage

| Era | Approved records |
| --- | ---: |
| Neolithic | 1 |
| Assyrian | 4 |
| Babylonian | 1 |
| Hellenistic | 1 |
| Parthian | 2 |
| Sasanian | 0 |
| Islamic / Abbasid | 6 |
| Medieval | 2 |
| Ottoman | 5 |
| 19th century | 1 |
| British period | 1 |
| Modern | 1 |
| Other or unrecorded periods | 11 |

There are **34 distinct approved records**. Multi-period places appear in each supported group, so the group counts are not additive. Sasanian correctly remains empty despite research candidates in the wider archive. No research candidate was approved or added to the new views.

## Integration and verification

- Lazy-loaded pages reuse the router, card grid, search, shared empty states, theme and language system. No dependency was added.
- Buttons, semantic navigation, labeled native selects, result announcements and keyboard controls support accessible use.
- Generated initial metadata includes the new routes and era pages. Empty era pages are noindex; invalid era pages use missing-page metadata. A public domain remains required before production canonicals/indexing/sitemap activation.
- German labels and plurals were added; all **590** detected translation keys have entries.
- Full frontend suite: **146 passed, two optional skips, zero failed**. Focused final UI and SEO regressions also pass.
- Production build and lint passed without warnings. The build emits **68 route heads**. The original card-visibility policy remains intact outside these approved-only views.
- Dedicated browser audit: **216 checks passed** across Chrome 156.0.8078.80 (66), Edge 156.0.4314.58 (30), Firefox automation build 159.0 (30), WebKit 27.2 (30), Android Chrome emulation (30), and iPhone WebKit emulation (30).
- Chrome layout checks cover 320, 768, 1280 and 1440px. Checks include keyboard era selection, period intersection, Back, refresh, unknown periods, civilization links, search/reset, empty/invalid views, German plurals, theme and local runtime/assets/CSP. Representative desktop and iPhone screenshots were inspected.
- The audit waits for rendered headings/results and DOM readiness; it does not require third-party photographs to finish before testing SPA history restoration.
- Independent read-only review found no important actionable issue.

Run `npm run validate:history` to build and rerun the browser audit. `HB_CHROME_EXECUTABLE` and `HB_FIREFOX_EXECUTABLE` can select isolated browser binaries. Evidence is saved under `.validation/p7/`. Mobile profiles are emulated, and Windows WebKit is not retail Safari. These are local checks, not a public deployment.

The heritage dataset and previously frozen v1.0.0-rc.1 ZIPs retain their checksums. P7 is the subsequent working application state; it is not included in that earlier frozen candidate. Hosting and domain remain pending.
