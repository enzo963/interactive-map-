# Map layers, historical exploration and 3D viewer upgrades

Completed locally on **2026-11-05** in `codex/production-browser-validation`.

## Delivered behavior

| Request | Implementation |
| --- | --- |
| Optional heritage layers | Archaeological, religious, confirmed UNESCO, recorded disappeared heritage, verified 3D resources and recorded historical periods. Multiple layers combine as a union, then intersect search/region/period filters. With none selected, the ordinary map is shown. |
| Marker clustering and grouping | Zoom-dependent cluster radius, named keyboard-activatable groups, grouping toggle without recreating the map, selected-marker reveal, and separation of coincident markers at maximum zoom. The result list remains available for keyboard access and missing coordinates. |
| Historical mode | Approved-only exploration by shared civilization/era groups and existing exact-period filters, on the same OpenStreetMap basemap and recorded coordinates. Modern mode stays the default. Ancient borders and missing coordinates are not invented. |
| 3D viewer | Orbit/zoom buttons, reset to the initial loaded camera, native fullscreen or an expanded fallback, loading progress, model information, attribution, opt-in loading and graceful error/download/provider fallbacks. |

Map options use shareable URL parameters: repeated `layer`, `view=history`, `era`, and `cluster=off`. Existing search, governorate, selected-site and exact-period parameters continue to work. Layer/mode changes clear an obsolete selection; grouping-only changes preserve selection. Resetting map options preserves search/region context, while Clear all filters also clears map filtering. Missing-coordinate records remain in the results list. Boundary geometry, when configured, is available separately without replacing the main basemap.

Current normal-map layer counts are 277 archaeological, 232 religious, four UNESCO, zero recorded disappeared, zero verified 3D, and 23 approved records with recorded periods. These counts can overlap. The historical mode has 34 approved records overall, including records without an established period. Empty layers represent the current recorded data, not a claim that such heritage does not exist.

The viewer uses the installed model-viewer 4.4 public camera API. Reset restores orbit, target and field of view. Unsupported camera APIs disable the toolbar gracefully; Sketchfab retains its provider controls, and unsupported formats remain links/downloads. Progress rejects nonfinite values and stays within 0–100. Fullscreen fallback supports Escape, focus wrapping/restoration and scroll cleanup. Verification, site binding, source attribution, licensing states and failed-cache eviction remain intact. No new dependency was added.

## Validation

- **160 frontend tests passed**, two optional integrations skipped, zero failures. New tests cover layer unions, historical approval/era matching, URL state, grouping toggles, real control behavior through API-shaped fixtures, progress, fullscreen fallback and resource cleanup.
- Lint, script syntax and whitespace checks passed. All **630** detected translation keys have German entries.
- Final production build passed without warnings and generated 68 initial route heads. The largest JavaScript chunk remains 390,068 bytes.
- **142 browser checks passed** across six profiles: Chrome 156.0.8078.80 (27), Edge 156.0.4314.58 (23), Firefox automation build 159.0 (23), WebKit 27.2 (23), Android Chrome emulation (23), and iPhone WebKit emulation (23).
- Browser coverage includes layer union and empty states, historical mode, URL/refresh, grouping toggle, cluster keyboard activation, 320/768/1280/1440px layouts, attribution, real renderer orbit/zoom/reset, model information, native fullscreen and expanded fallback/Escape/focus restoration.
- Every profile exercised **20 synthetic markers at identical coordinates**. They initially formed one readable group; selecting a site separated all 20 markers. This caught and resolved a reduced-motion edge case in selected-marker reveal at maximum zoom.
- Every profile loaded an original synthetic GLB through the actual React viewer, first receiving an intentional 404 and then recovering through Retry. The fixture uses the actual renderer/cache adapter. Synthetic points and geometry exist only in the isolated local audit build and never enter the heritage dataset or public `dist`.
- Runtime, CSP and unexpected local HTTP checks passed. Console logs retain the intentional failed-model request. WebKit layout assertions wait for rendered dimensions; the final two WebKit results were rerun against the identical static build digest.
- Independent review caught an ungrouped-layer API mismatch; it was fixed and a toggle regression was added. Final reveal-listener cleanup and plugin reentrancy were reviewed without further important findings. Representative layer and viewer screenshots were inspected.

Evidence: `.validation/map-viewer-final/combined-report.json`, retaining the original and WebKit rerun report references. Validated static build digest: `7d288fbca006aac1b96498c1e5df4d40f57be8d259468b0cc64205a386b9432f`.

Reproduce with `npm run validate:map-viewer`. `HB_CHROME_EXECUTABLE` and `HB_FIREFOX_EXECUTABLE` select browser binaries; `HB_FEATURE_BROWSERS` selects profiles and `HB_FEATURE_OUT` retains separate evidence. The command builds the public application and then a separate, ignored test fixture. Do not rebuild public files during a running browser audit.

Mobile checks are emulation, and Windows WebKit is not retail Safari. The dataset currently contains no verified heritage 3D resources, so public site pages continue to display honest unavailable states until suitable records are approved. Hosting/domain and live deployment remain pending. Existing heritage data and the earlier frozen release archives keep their checksums; these upgrades are the subsequent working application state.
