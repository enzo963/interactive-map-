# P6-22–P6-26 completion report

Date: 2026-11-02. Project: History in Cards. Local changes on `codex/site-quality-audit`.

## Delivered

- **P6-22:** polished generic 404 with archive/map/home recovery; specific missing-card/deck messaging; malformed IDs do not crash routing; recognized but unpopulated governorates have valid empty decks; invalid map selections are explained and recover without discarding unrelated filters. Missing site geography remains explicit and does not invent coordinates or deck links.
- **P6-23:** shared StatePanel for empty, no-results, unavailable, loading and error states across the main page families and model viewer. Synchronous local records do not receive fake loading delays. Route failures retain navigation, explain recovery and offer reload. Page imports use Suspense and pathname-scoped error recovery. Initial preloading is bounded to 150 ms so a stalled import cannot indefinitely hide navigation.
- **P6-24:** card/map pagination focuses the first new result and keeps progress output; collection heading hierarchy repaired; keyboard map focus brings points into view without moving pointer targets before click; gallery has explicit Tab/Shift+Tab containment, clear initial focus, image loading/failure/position announcements, Escape and safe focus return even when thumbnails fail. Existing labels, alt text, links, forms, reduced motion and focus/contrast rules were reviewed.
- **P6-25:** repaired a 5 px Home overflow caused by rotated decorative Special Decks cards. Gallery captions/controls wrap, modal height follows the dynamic viewport, and modal background scrolling is contained. Six widths and all page families checked below.
- **P6-26:** on-demand secondary pages, eager Home to avoid an initial route waterfall, grouped shared archive helpers, only the leading hero card prioritized, earlier font discovery/preconnects, build manifest and repeatable measurement/probe tools. Model-viewer remains activation-only.

## Verification

- `npm test`: **97 passed, 1 optional real-source export test skipped, 0 failures** (98 total).
- `npm run lint`: passed.
- `npm run build`: passed; existing optional model-viewer chunk-size warning remains.
- Production browser audit: **108 route/viewport combinations**, no document overflow, exactly one main h1 and no missing img alt attributes in checked states.
- Widths: **320, 390, 768, 1024, 1440, 1920 px**.
- Destinations: Home, Explore, Map, Decks, Nineveh deck, empty Basra deck, Hatra, UNESCO, 3D Archive, About, Methodology, Our Work, Contact, generic 404, invalid map selections, invalid site, invalid deck and no-results search.
- Native browser checks: 320 px gallery with synthetic local images, Tab containment, Next announcement, Escape and opener restoration; zoomed map pointer selection and visible keyboard focus; polished 404 and recovery links. Gallery fixtures live under scripts/ and are not heritage data or production build entries.
- One MutationObserver console entry appeared during the long iframe-probe/document-switch automation run. The application has no MutationObserver usage; the entry was not reproduced on an isolated production page, which had an empty error log. This is recorded as an automation caveat rather than a claimed application defect.

## Performance before and after

Baseline is committed HEAD `a2bf28ae3f3201ffa025df6702705fc2cb633387`, built in an isolated temporary export with the same installed dependencies. Byte comparisons use the same `scripts/measure-build.mjs` logic and Node gzip settings. These totals include the complete initial Home graph, not merely the bootstrap file.

| Measurement | Before | After | Change |
| --- | ---: | ---: | ---: |
| Initial Home JavaScript | 424,278 B | 335,986 B | **20.8% smaller** |
| Initial Home JavaScript, gzip | 119,744 B | 100,649 B | **15.9% smaller** |
| Initial Home CSS | 65,517 B | 53,161 B | **18.9% smaller** |
| Initial Home CSS, sum of gzip files | 12,632 B | 13,963 B | 10.5% larger from separate cached chunks |
| Initial JS + CSS, gzip | 132,376 B | 114,612 B | **13.4% smaller** |
| JavaScript requests | 1 | 8 | More independently cached chunks; fewer than the rejected fully-lazy candidate |
| Model-viewer requested before activation | No | No | Preserved |

Three ordinary same-browser local production samples, in milliseconds:

| Diagnostic | Before samples | After samples |
| --- | --- | --- |
| DOMContentLoaded | 190, 165, 116 | 113, 49, 44 |
| Full content observed by probe | 602, 287, 196 | 464, 103, 79 |

Caches, fonts, network and background activity were not controlled. These are diagnostic localhost samples, not Lighthouse scores, Core Web Vitals or a field speed guarantee. FCP was not compared because an iframe sample lacked a paint entry. A fully-lazy Home candidate was rejected after measured reveal delays; Home remains eager, while secondary routes stay lazy.

## Reproduce

```powershell
npm test
npm run lint
npm run build
node scripts/measure-build.mjs dist Home
node scripts/measure-build.mjs dist SiteDetails
```

For the optional browser probe, copy scripts/performance-probe.html to dist/__audit.html and serve the local production preview, then open `/__audit.html?path=/`. Remove that generated probe file before deployment. The source fixture at `/scripts/gallery-fixture.html` runs only through the Vite development server.

## Limits and retained behavior

No dataset, evidence, licensing, stable IDs, source pipeline or contact-channel changes. No new runtime dependencies. No deployment, commit or push. The pinned 3D renderer remains a large optional chunk; an actual public verified model is still absent from the current catalog. Keyboard/DOM/native browser audits do not constitute a full screen-reader or WCAG certification. SPA hosting must retain its existing index.html fallback for direct client routes.
