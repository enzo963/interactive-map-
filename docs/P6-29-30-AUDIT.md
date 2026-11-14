# P6-29 / P6-30 — Attribution and production audit

Reviewed 2026-11-03. Changes are local; nothing was deployed. The public domain and
hosting provider remain undecided.

## Attribution inventory

The source archive contains 414 records: 34 approved and 380 awaiting review.
Approved records have 43 reference entries, four cover photos and one additional
gallery photo. None currently supplies a published 3D model, video or digital
download. Research drafts remain in the source file, with their original status.

All approved records have named source references and valid HTTP(S) reference URLs.
Site pages retain their source names, links and any recorded citation details. No
missing author, date, partnership or permission is fabricated. This audit checks
provenance presentation and recorded rights; it does not repeat historical claim
verification for the entire research archive.

The five Commons file pages were checked for the recorded author and license:

| Photo/site | Recorded author | License | Source |
| --- | --- | --- | --- |
| Al-Mustansiriya Madrasa | Makaay31 | CC BY-SA 3.0 | [File page](https://commons.wikimedia.org/wiki/File:Mustansiriya_Madrasah5.jpg) |
| Abbasid Palace | Mohammed Qays Kazem / Mohammed Qays | CC BY-SA 4.0 | [File page](https://commons.wikimedia.org/wiki/File:Abbasid_Palace.jpg) |
| Al-Wazir Mosque | Mahmoudalrawi | CC BY-SA 3.0 | [File page](https://commons.wikimedia.org/wiki/File:Al_Wazeer_Mosque.jpg) |
| Samarra / Malwiya | Fakhri Mahmood | CC BY-SA 4.0 | [File page](https://commons.wikimedia.org/wiki/File:Samrraa_01.jpg) |
| Abu Dulaf Mosque | Lionel Aubert | CC BY-SA 4.0 | [File page](https://commons.wikimedia.org/wiki/File:Abu-Dulaf-mosque-with-minaret-samarra.jpg) |

Their existing source/terms links and image-specific review metadata remain intact.
Cards now show the photographer and license, with source/terms links where recorded.
Gallery thumbnails, the lightbox and image credits retain attribution. The display
notice explains scaling and possible card-thumbnail cropping; source images are not
edited by this change. No blanket license is asserted for the archive or its media.

OpenStreetMap tiles retain visible linked contributor attribution. Governorate
boundary geometry is currently absent; the existing geometry loader requires a
named source and license before rendering. The original social sharing graphic is
project artwork, rather than an externally sourced heritage photo. Google Fonts
are requested from Google's stylesheet/font service; no downloaded font binaries
are redistributed by this change. Unused legacy hero/Vite artwork is not displayed
as heritage evidence or assigned a new license.

## Attribution fixes

- Shared `mediaLicenseState` validates review permission, exact recorded terms,
  a valid review date, the bound media URL, and evidence IDs/source/media URLs
  against matching validation results. Every check must match reviewed evidence.
  A stale source URL, changed terms, missing check, invalid date, contradictory
  status or malformed evidence cannot retain verified licensing.
- Cards retain the separate site/image publication approval gate. License
  verification alone does not approve a cover for publication.
- Model identity verification is distinct from rights verification. Models,
  videos and downloads now retain credit/source metadata and show verified terms
  only with the same evidence checks. Otherwise they explicitly report unknown
  or unverified permission, without displaying an unsupported license label.
- Restricted models are not offered by the verified model collection; restricted
  videos/downloads are not embedded or linked. Existing restricted-photo exclusion
  remains in place. Attribution alone never grants permission.
- Media evidence records and validation are trusted editorial inputs, not a
  client-side cryptographic proof. New or changed media still needs source review
  and publication approval through the content workflow.

## Security findings and corrections

| Finding | Correction / evidence |
| --- | --- |
| All draft records were downloadable in browser JavaScript despite SEO exclusion | A build-only pre-JSON Vite transform includes approved records only. The production service also filters approved records. Tests scan every built JS asset for every record ID and verify the source archive is unchanged. |
| Editor code and source-file paths remained in production Map JS | Guarded the form with `CAN_EDIT` as well as editing state; tests check `/api/sites`, editor markup and the source path are absent. |
| Local write endpoint accepted cross-origin/plain-text requests and out-of-range coordinates | Requires a loopback socket, exact local browser Origin and JSON content type; checks coordinate bounds, malformed IDs, body shape and a 1 MB byte limit. Tests use a copied plugin and isolated temporary archive, including valid local create/move operations. |
| Reference validation relied on a URL prefix; the video helper accepted unsafe schemes | Shared parsed validation rejects executable schemes, credentials, control characters, backslashes and protocol-relative paths. Native media accepts explicit local paths; external model/video previews require HTTPS. YouTube embeds use exact supported hostnames. |
| Environment files lacked a comprehensive ignore rule | `.env*` is ignored except `.env.example`. Only `VITE_SITE_URL` is used by the frontend; the template explicitly warns that all `VITE_` values are public. No existing secret file or live secret disclosure was found in the inspected frontend/configuration files. |
| No deployable header policy | `public/_headers` supplies MIME protection, framing protection, a referrer policy, restricted browser permissions and CSP for compatible static hosts. The early theme script is external so script CSP needs no inline-script exception. |
| Production image lookup could crash due to circular split-chunk initialization | Deferred local image-map construction until first use. A regression imports the built metadata chunk in browser dependency order; the browser audit also exercises page startup. |

Vite development and preview bind to `127.0.0.1`; development CORS is disabled.
The local write endpoint is a development tool, not an authenticated public API.
Production consists of static files and has no write endpoint. Source maps remain
disabled. Only the generated `dist` directory should be published, never the
project root, `.venv`, source pipeline, evidence snapshots or environment files.

## Dependency review

Before remediation, `npm audit` reported six moderate entries, all in the ESLint
development chain through minimatch 10.2.6. A narrow override for ESLint and
`@eslint/config-array` selects minimatch 11.0.1. Lint, tests and production builds
validate the current use; no forced ESLint downgrade was applied. Remove the
override when upstream packages adopt a patched compatible dependency.
See [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

The Python pipeline pinned Requests 2.32.5, covered by a temporary-file utility
advisory. It now pins 2.34.2; the documented project virtual environment was updated
and its offline suite passed. Standard HTTP use was not the advisory's affected
utility, but the dependency is patched. See
[GHSA-gc5v-m9x4-r6x2](https://github.com/advisories/GHSA-gc5v-m9x4-r6x2).

After remediation: npm audit reports **zero vulnerabilities**. OSV queries for the
three pinned Python packages and their six installed runtime dependencies returned
no known advisories. This is a dated dependency check, not a guarantee against
unknown vulnerabilities. Both the documented root `.venv` and the separate
pipeline virtual environment were refreshed from the updated requirements.

## Verification results

- Frontend: **118 passed**, one optional real-source export test skipped.
- Python pipeline: **228 passed** using the documented root environment.
- Lint, production build and translation coverage passed (540 translated keys).
- Eight headless Edge route/viewport checks passed: Home, Explore, Abbasid Palace
  and Map at 390 and 1440 pixels, with the header policy explicitly applied.
  No runtime exceptions, CSP violations, horizontal overflow or credit-text clipping
  were observed. Mobile/desktop site screenshots were visually inspected.
- Built artifacts exclude all 380 draft IDs, retain approved IDs and initialize
  correctly. The canonical source data remains unchanged.
- Independent code review's evidence-binding finding was corrected and rechecked;
  no additional important findings remained in that review.

## Deployment settings still to verify

1. Choose the real HTTPS domain, set `VITE_SITE_URL` and rebuild. Until then,
   noindex/robots blocking, absent absolute preview URLs and no sitemap are deliberate.
2. Serve clean `.html` routes before the SPA fallback and serve `404.html` with
   HTTP 404 for unknown addresses, as described in `docs/SEO.md`.
3. Confirm the host applies `dist/_headers`, or configure equivalent response
   headers. Vite preview does not automatically consume this file. Browser testing
   explicitly injects the same policy locally; it does not verify a hosting provider.
4. CSP permits local scripts, the existing inline styles, Google Fonts, HTTPS
   images/media/connections and the supported video/model frame providers. It
   blocks inline scripts, object plugins, third-party framing and off-site form
   submissions. Test new model formats/decoders/providers against CSP before
   publishing them; the current catalog has no live approved model to exercise.
5. Verify HTTPS redirects, actual response headers, caching and public social
   previews on the chosen host. Consider HSTS after confirming HTTPS operation;
   no preload/subdomain commitment is made for an undecided domain.

The optional model-viewer bundle-size warning present during this audit was later
resolved in P6-31. P6-32 also exercised the actual renderer and cache retry with a
synthetic model and added the required WebAssembly-specific CSP allowance. See
`docs/P6-31-32-VALIDATION.md` for the final build and cross-browser evidence.
Official references:
[Vite public environment values](https://vite.dev/guide/env-and-mode.html),
[Netlify static header files](https://docs.netlify.com/manage/routing/headers/),
[CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy),
[OSM tile attribution requirements](https://operations.osmfoundation.org/policies/tiles/).
