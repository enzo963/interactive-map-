# Version 1.0 release candidate

Status: **local candidate; public deployment and stable release pending**. Hosting and the public domain have not been chosen.

The candidate includes the 34 currently approved heritage records, archive browsing, search/filtering, map, decks, site details, available photographs and citations, informational pages, and honest unavailable states for missing digital resources. Research candidates are not publication approval. This release does not claim completed field projects or verified models where none are recorded.

## Prepare and verify

Use Node 22.16 or newer on Windows with PowerShell and the locked dependencies:

```powershell
npm ci --ignore-scripts
npm test
npm run lint
npm run check:i18n
npm run release:prepare
$env:HB_AUDIT_DIST = '.release/v1.0.0-rc.1/site'
node scripts/validate-production.mjs
```

`release:prepare` refuses to overwrite an existing candidate. Advance the candidate version in package.json and package-lock.json when preparing a changed build. It does not commit, tag, publish, or approve data. Ordinary development builds keep the broader visible-card policy; this candidate explicitly uses approved records only.

The manifest records the exact source snapshot, approved snapshot, static file inventory and ZIP checksums. The private source ZIP preserves the uncommitted application state as well as the Git base. Keep the candidate folder and browser report together. A failed preparation is not a validated release.

## Deploy after hosting is chosen

1. Select the hosting account and confirm the final HTTPS origin. Set `VITE_SITE_URL` to that origin and prepare a new candidate. Without a domain, indexing remains disabled and no canonical URLs or sitemap are emitted.
2. Upload **only the contents of the static ZIP**. Keep the private source ZIP, dataset snapshot and manifest outside the web root. Do not upload `.env`, research tools or local validation fixtures.
3. Configure clean URLs to serve existing `path.html` files first, assets as files, and application routes through `index.html` as fallback. Return the generated `404.html` with HTTP 404 for unknown routes where the host supports it. Preserve site and deck deep links on refresh. Do not rewrite missing JS/image assets to HTML.
4. Apply the response policy in `site/_headers`; hosts that do not interpret that file need equivalent settings. Verify actual HTTPS responses, certificates, redirects, MIME types and security headers on the chosen host.
5. Smoke-test Home → Search → Filter → Map → Governorate → Card → Details → Gallery → Sources → 3D → Decks → About/Our Work. Test direct links and refresh, invalid addresses, mobile navigation, source links, attribution and unavailable states. Check the production console and network panel.
6. Only after the live checks and final dataset approval: create the stable Version 1.0 release/tag against the exact application state, record the public URL and build checksums, and preserve the previous deployment.

## Roll back

Keep each deployed static ZIP and manifest unchanged. To roll back, restore the last validated static ZIP contents as one deployment, including its hashed assets and HTML files. Restore that deployment's origin/header/routing configuration, then repeat the live smoke checks. No database migration is involved. Rebuilding old source is not required for a static rollback.
