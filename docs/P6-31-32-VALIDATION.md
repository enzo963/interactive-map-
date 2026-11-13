# P6-31 / P6-32 — Production and browser validation

Validated locally on 2026-11-03. No deployment, commit or redesign was performed.
The public domain is still undecided, so production indexing remains disabled.

## Production changes

- Resolved the remaining oversized-chunk warning by separating Three's renderer
  into a stable, independently cached chunk. The default warning threshold was
  retained. The 3D library and its cache adapter still share the same loader;
  ordinary archive routes do not request the 3D chunks.
- Added a favicon using the existing two-card project mark and linked it from
  every generated route. This removes the missing browser-icon request.
- Allowed WebAssembly compilation through CSP's `wasm-unsafe-eval`, required by
  the actual 3D loading pipeline. General JavaScript `eval`, inline scripts and
  object plugins remain blocked. Browser testing caught this configuration issue;
  it was not visible in DOM-only tests.
- Added a reproducible production audit and a chunk-budget regression. The audit
  fetches all generated routes, their initial resources and all manifest assets,
  then exercises the built app in isolated browser profiles with security headers
  explicitly applied to the local preview server.

| Minified 3D chunk | Before | After |
| --- | ---: | ---: |
| model-viewer | 637,361 bytes | 299,791 bytes |
| Three renderer | Included above | 337,442 bytes |
| CachingGLTFLoader implementation | 390,068 bytes | 390,068 bytes |

The cache adapter also has a 138-byte export facade. Splitting changes the cache
and request boundaries, not the total amount of renderer code. The largest final
JavaScript chunk is about 390 KB. The final build emits no warnings and generates
54 route HTML heads; sitemap generation remains inactive until a domain is set.

Final checks: **118 frontend tests passed**, one optional real-source export test
skipped; lint, all 540 translation keys, npm audit (zero vulnerabilities), and
the production build passed. The build emits no warnings.

## Browser configurations

| Configuration | Actual tested version | Method |
| --- | --- | --- |
| Chrome | 156.0.8078.80 | Current stable Chrome for Testing, desktop 1440 × 1000 |
| Edge | 156.0.4314.58 | Installed branded Edge, desktop 1440 × 1000 |
| Firefox | 159.0 | Playwright automation build, desktop 1440 × 1000 |
| WebKit | 27.2 | Playwright Windows build, desktop 1440 × 1000 |
| Android Chrome profile | 156.0.8078.80 | Pixel 7 viewport, touch, mobile UA and device scale emulation |
| iPhone WebKit profile | 27.2 | iPhone 13 viewport, touch, mobile UA and device scale emulation |

The pinned driver is Playwright 1.64.1. Its default Firefox download was 157;
Firefox 159 was downloaded separately using the pinned
`1.65.0-alpha-2026-11-03` browser installer and verified with the project's stable
driver. No prerelease Playwright dependency was added to the project. Mozilla's
release metadata listed retail Firefox 159.0.1 at audit time: the tested 159.0
automation build covers that release family, not that exact retail patch binary.

The machine's installed Chrome was 142, so the audit used the isolated current
Chrome for Testing instead of changing the user's installed browser. Chrome and
Firefox initially had Windows Side-by-Side activation failures in AppData; unchanged
workspace copies launched correctly. No manifests, OS policy, security settings
or installed user browsers were modified.

## Coverage and evidence

All six profiles passed: **582 browser assertions**, **54 generated HTML routes**
and **41 local manifest/entry assets**. Chrome completed 181 assertions, Edge 79,
Firefox 79, desktop WebKit 79 and the two mobile profiles 82 each. No unexpected
local asset, runtime, console or CSP errors remained in those checks. The deliberate
first-load model errors and transient remote-resource observations are recorded
separately rather than described as a completely silent console.

- Direct loading of Home, Explore, Map, Decks, collections and aliases, project
  pages, representative site pages, invalid sites/decks/routes and invalid map
  regions. Desktop Chrome additionally opens all 34 published heritage URLs.
- Global search, a result-to-site link, browser Back and no-results recovery.
- Native gallery dialog activation, attribution, Escape dismissal and opener focus.
- Theme switching, German/English selection and matching metadata locale.
- Mobile touch activation, Project submenu navigation, menu dismissal and keyboard
  Escape; map pin keyboard selection and visible OSM attribution.
- Horizontal overflow, current page/preview titles, console/runtime errors, failed
  local requests and CSP violations accumulated across navigation and interactions.
- Real built model-viewer and cache-adapter imports. An original synthetic triangle
  GLB intentionally returns 404 once, then cache eviction/remount/retry must make a
  fresh request and successfully load. This is a renderer test, not a new heritage
  resource; fixture routes exist only in the audit server and are not shipped.

Only the exact first synthetic model 404 and its recognized loader/resource console
messages are expected errors. Other fixture, CSP, asset and runtime errors fail the
audit. The current catalog has no approved model; the synthetic test establishes
loader/retry/CSP compatibility without fabricating a published model.

Firefox emitted some remote image/font warnings during rapid full-page navigation.
An isolated Firefox 159 probe then fully downloaded and decoded all five current
published photographs at their original dimensions, with no console errors.
These warnings were not reproduced as persistent broken images; they remain
recorded as external-resource observations in the raw reports. External hosting
availability is not guaranteed by a local build.

Detailed machine-readable reports and representative screenshots are stored in
`.validation/p6-31-32/` (intentionally ignored by Git). The reports contain the
SHA-256 of the complete built output, so focused reruns can only be combined when
they refer to identical artifacts. Browser setup/audit fixes were rechecked in the
affected profiles; the final report retains the provenance of those runs.

## Reproduce

```powershell
npm ci
npx playwright install firefox webkit
npm test
npm run lint
npm run check:i18n
npm audit
```

Use an installed current Chrome/Edge or configure `HB_CHROME_EXECUTABLE` for an
isolated Chrome for Testing. `HB_FIREFOX_EXECUTABLE` selects an isolated compatible
Firefox automation build. The runtime paths used on this machine are:

```powershell
$env:HB_CHROME_EXECUTABLE = 'C:/Users/MSR/Documents/ChatGPT/enzo/browser-runtime-probe/chrome-win64/chrome.exe'
$env:HB_FIREFOX_EXECUTABLE = 'C:/Users/MSR/Documents/ChatGPT/enzo/browser-runtime-probe/firefox-current/firefox-1572/firefox/firefox.exe'
npm run validate:production
```

These are local test-runtime paths, not public application environment variables.
On another machine, install equivalent browsers and change the paths. With no
override, Chrome uses a cached test build or the installed Chrome channel; Firefox
uses Playwright's pinned browser. Always read the actual versions in the report.

`HB_AUDIT_BROWSERS` can select comma-separated project names from the table's
script names (`chrome`, `edge`, `firefox`, `webkit`, `android-chrome-emulated`,
`iphone-webkit-emulated`). `HB_AUDIT_OUT` selects an artifact directory. An unavailable
browser or failed check produces a nonzero exit status; it is not silently skipped.

## Practical limits

Mobile coverage is emulation, not testing on physical Android/iPhone hardware.
Windows WebKit is not retail Safari on macOS/iOS; OS-specific codecs, native
sharing dialogs, device GPU/AR and real touch/pinch behavior need device testing.
This is a local compatibility audit, not a browser certification.

The chosen deployment host must still apply equivalent headers, clean-route HTML
handling, HTTPS and true HTTP 404 behavior. Vite preview does not automatically read
`_headers`; this audit injects the same policy. Public domain/canonical URLs, sitemap,
caching and external social previews remain deployment checks described in
`docs/SEO.md` and `docs/P6-29-30-AUDIT.md`.

Primary references: [Chrome stable test distributions](https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json),
[Mozilla release metadata](https://product-details.mozilla.org/1.0/firefox_versions.json),
[Playwright browser and emulation support](https://playwright.dev/docs/browsers),
[CSP WebAssembly allowance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src#unsafe_webassembly_execution).
