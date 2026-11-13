# Map layers, historical mode, clustering and viewer controls

Continue in the existing local worktree. Keep the current OpenStreetMap basemap, modern coordinates, source/attribution policy and undecided deployment. Do not invent historical borders, coordinates, disappeared status or available 3D models.

Map: optional archaeological/religious/UNESCO/disappeared/verified-3D/recorded-period layers combine as a union, then intersect the existing search/region filters. With none selected, show the normal map. A separate historical mode limits records to approved entries and supports the shared era vocabulary and exact recorded periods. Modern mode remains the default, on the same map surface. Options live in the URL; controls report honest empty states and missing coordinates.

Grouping: retain Leaflet marker clustering; improve zoom-dependent grouping, accessible cluster names and overlapping-marker behavior. Offer a clustering toggle, preserve the current view, and retain keyboard-accessible result lists.

Viewer: retain opt-in model loading, verification/site binding, attribution, progress, timeout, cache-safe retry and provider/download fallbacks. Add orbit/zoom/reset toolbar, fullscreen with a graceful expanded fallback, and model information. Real synthetic fixtures exercise the built viewer without entering heritage data.

- [x] Add map selection/grouping regressions, then implement model and controls.
- [x] Add viewer regressions, then implement controls and fallback behavior.
- [x] Integrate translations, run full tests/lint/build and inspect responsive layouts.
- [x] Run browser checks for map controls, clustering, URL recovery and actual model controls/fullscreen.
- [x] Document completed scope and remaining environment/data limits.

Results: `docs/MAP-VIEWER-UPGRADES.md`. 160 tests passed (two optional skips); 142 browser checks passed across six profiles, including twenty coincident markers and the actual React viewer with original test geometry.
