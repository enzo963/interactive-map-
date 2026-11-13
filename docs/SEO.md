# P6-27 — SEO and metadata

History in Cards uses a shared metadata system for browser navigation and generated production HTML. Each main page has its own title and description. Heritage records use their saved name, description, governorate and slug. Decks use the existing collection services. Open Graph and Twitter preview metadata share a project-owned 1200 × 630 PNG; no unreviewed site photograph is selected for previews.

## Domain configuration

The public domain has not been decided. `.env.example` deliberately leaves `VITE_SITE_URL` empty. In this state:

- Titles and descriptions still work.
- Pages have `noindex, follow` and the generated `robots.txt` disallows crawling.
- No canonical URL, `og:url`, absolute preview-image URL or sitemap is fabricated from localhost or a placeholder domain.

When the domain is ready, set the real origin in the deployment's build environment or in an ignored `.env.local` file:

```dotenv
VITE_SITE_URL=https://your-domain.tld
```

The value above illustrates the format; it is not a configured project domain. Use an HTTP(S) origin with no path, credentials, query or fragment. Localhost/loopback values are rejected. The application currently supports deployment at the domain root. Rebuild the entire application after changing the value; Vite embeds it in the browser bundle.

```powershell
npm run build
npm run preview
```

For custom Vite modes, use matching modes for both stages:

```powershell
npx vite build --mode staging
npm run build:seo -- --mode staging
```

## Generated files and indexing

`npm run build` runs Vite, then `scripts/build-seo.mjs`. The generator evaluates the UI's actual normalized site and deck services through Vite; it does not import the C1 research catalog. It emits:

- `dist/index.html` and clean-route HTML files such as `dist/about.html` and `dist/sites/hatra.html`, with page-specific metadata already in the response.
- `dist/404.html` with noindex metadata.
- `dist/robots.txt` on every build.
- `dist/sitemap.xml` only when a public origin is configured.

The sitemap contains canonical main pages, approved site records, and dynamic decks with approved content. Missing/unapproved sites, empty or draft-only dynamic decks, aliases, query variants and the 404 page are excluded. Sitemap generation does not fabricate modification dates. With the current dataset, a configured build produces **54 HTML heads and 51 sitemap URLs**; these counts change with the archive.

Production JSON bundling also excludes unapproved research records through
`vite/publishedSites.js`; SEO exclusion alone does not keep data out of browser assets.

`/decks/unesco` canonicalizes to `/unesco`; `/decks/3d` to `/3d-archive`. Governorate aliases resolve through the existing deck service. Filters/search/selection queries receive noindex and retain the clean page canonical; ordinary campaign tracking parameters retain the page's indexing policy. Invalid routes and unavailable-page errors remove canonical and `og:url` tags. Navigation replaces old tags, including when moving between site records and informational pages.

The browser preserves existing translated tab titles and sets the matching Open Graph locale. Build-time descriptions and initial HTML metadata use English. There are no separate language URLs, so no language-alternate URLs are invented.

## Hosting contract

Serve existing files before the SPA fallback. Clean requests such as `/about` and `/sites/hatra` must resolve to the corresponding `.html` files; Vite preview supports this and was checked over HTTP. A hosting rule that rewrites every request straight to `index.html` would hide route-specific metadata from preview crawlers.

Configure unknown addresses to serve `404.html` with HTTP **404** where the host supports it. Client navigation also renders the existing recovery page and sets noindex. An SPA fallback returning HTTP 200 cannot itself guarantee a server-side 404; that status is a hosting setting. Preserve `robots.txt`, `sitemap.xml`, `/assets/` and `/social-card.png` as directly served files.

Also serve `/theme-init.js`. The generated `_headers` file supplies security policy
for compatible hosts; other hosts need equivalent response-header configuration.
See `docs/P6-29-30-AUDIT.md` for the reviewed policy and deployment checks.

This change generates HTML **heads**, not server-rendered page bodies. Interactive page content still renders in React. Link previews can read the initial metadata; content indexing still depends on JavaScript rendering. After deployment, verify real public URLs with the intended host and search/social inspection tools.

## P6-28 — Social sharing previews

Home shares the project name and archive description. Each approved heritage URL
shares the place's name and its recorded description (or a name/governorate fallback).
Both Open Graph and Twitter metadata use the original branded `social-card.png`:
1200 × 630 pixels, about 54 KB. Its alt text describes the graphic. Site photographs
are not required for a complete preview; the brand graphic works for every record.

`tests/social-sharing.test.mjs` builds the production app in a temporary directory
with a test-only origin, then fetches Home and every approved site through Vite
preview using a sharing-crawler user agent. It reads the response HTML without
running JavaScript and verifies unique page descriptions, site names, one set of
Open Graph/Twitter tags, canonical sharing URLs and the image response's MIME type,
PNG signature, dimensions and size. Run it with:

```powershell
node --test tests/social-sharing.test.mjs
```

This covers Home plus the current 34 published heritage records. The test origin is
never saved as the project's domain. Public sharing remains pending a domain and
deployment: local URLs cannot be fetched by external sharing services, and the
domain-free build deliberately omits absolute image/URL tags and disallows crawling.
Once deployed with `VITE_SITE_URL`, check a Home URL and a site URL with the actual
sharing services; refresh their cached previews after changes. Final presentation
depends on each service. Metadata follows the [Open Graph protocol](https://ogp.me/).

## Maintenance and checks

- Page copy/canonical rules: `src/seo/metadata.js`.
- Publication and collection lookup: `src/seo/context.js`.
- Browser/HTML/XML serialization: `src/seo/head.js`.
- Browser integration: `src/hooks/useDocumentTitle.js`; pages retain their existing title calls.
- Build generator: `scripts/build-seo.mjs`. `npm run build:seo` can regenerate heads in an existing build using the same domain/mode as its browser bundle.
- Original preview graphic: `public/social-card.png`; optionally regenerate with `scripts/create-social-card.py` using Pillow and system fonts.

Run `npm test`, `npm run lint`, and `npm run build`. SEO tests cover explicit-domain handling, aliases and filters, publication exclusions, escaping, tag replacement and actual generated HTML/XML. Integration tests cover metadata changes during navigation. Two existing verification blockers were corrected: Windows file-URL conversion in the translation checker, and Leaflet global initialization before its marker-cluster plugin (retaining the added marker styles).

Implementation references: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Open Graph protocol](https://ogp.me/), [Vite environment configuration](https://vite.dev/guide/env-and-mode).
