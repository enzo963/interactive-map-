# P6-22–P6-26: resilience, accessibility, responsive design and performance

Implement the user's requested audit and repairs in the existing History in Cards React/Vite application. Preserve the visual identity, approved dataset, stable IDs, routes, image licensing and activation-only model loading. Contact channels remain postponed. No deployment or external publishing.

## Approach

Use focused repairs and shared presentation components within the current architecture. A redesign or new router/library would add risk without helping these tasks. Add a reusable StatePanel for genuine empty, no-results, unavailable, error and loading conditions; keep synchronous JSON screens synchronous. Use lazy route modules with an accessible Suspense fallback and route-scoped error recovery to reduce initial JavaScript. Preserve aliases and deep links, including section scrolling after asynchronous route loading.

## Scope

- P6-22: distinguish missing pages, sites and decks; explain invalid map governorate/site selections and provide recovery that preserves unrelated filters. Known governorates with zero records remain valid empty destinations. Missing record geography stays explicitly unknown rather than creating broken links.
- P6-23: consistent title, explanation and recovery actions across Home, Map, Decks, Explore, Site Details and 3D. Loading is shown only during actual module/model work; errors retain navigation and provide reload/browse actions.
- P6-24: keyboard/focus audit, semantic headings/forms/status messages, image descriptions, dialog opening/closing/navigation, contrast, reduced motion and controls. Avoid live-announcing whole result grids or noisy repeated loading labels.
- P6-25: exercise every route family at 320, 390, 768, 1024, 1440 and 1920 CSS pixels. Inspect map, gallery, card grids, menus, long text and footer. Fix causes of overflow instead of hiding it globally.
- P6-26: record baseline and final build metrics using the same measurement script; inspect initial static module graph, optional chunks and image/font loading. Split page code, keep 3D optional, prioritize only visible hero content and remove unused requests. Browser timing is a local sample, not a field-performance or Lighthouse score.

## Validation

Use failing regression tests for route recovery, empty states, Suspense/error boundaries, keyboard focus, dialogs and pagination. Run full existing tests, lint and production build; inspect actual production pages across viewports. Document measurements, routes checked and limits in a final audit report. Native browser dialog tests use an isolated local fixture if approved images are unavailable; never add synthetic heritage content to the catalog.
