# P6-27 SEO and Metadata Implementation Plan

**Goal:** Add route/site metadata, share previews, crawler directives and build-time sitemap generation to History in Cards.

**Design:** Retain React/Vite and the existing title hook. Share a pure metadata resolver between browser navigation and a post-build generator; use existing site/deck services through Vite's module loader so publication and membership rules do not drift. Generate route HTML heads for non-JavaScript preview crawlers. The domain remains unset as confirmed by the user; `VITE_SITE_URL` activates absolute canonical/OG URLs and sitemap generation. No new runtime dependencies.

**Files:** `src/seo/{metadata,head,context}.js`, `src/hooks/useDocumentTitle.js`, `scripts/build-seo.mjs`, `tests/seo.test.mjs`, integration coverage, `public/social-card.png`, `.env.example`, `docs/SEO.md`, package build command and index metadata marker.

**Review focus:** No guessed deployment host; remove stale/duplicate head tags during navigation; unapproved/missing sites and empty/invalid decks do not enter the sitemap; alias/filter URLs have deliberate canonical/noindex behavior; escaped HTML/XML cannot become markup; unavailable pages clear site previews.

- [x] Write failing behavior tests for domain validation, routing, site metadata, canonical aliases, noindex, escaping, head replacement and generated artifacts.
- [x] Implement the shared resolver and browser hook integration, preserving translated page titles.
- [x] Generate production route heads, default share graphic, robots.txt, conditional sitemap.xml and noindex 404.html; document hosting and domain configuration.
- [x] Run the new checks, full test suite, lint, default build and configured-domain build. Inspect generated HTML/XML and preview HTTP responses. Record actual limitations.

Verified 2026-11-03: 110 tests passed, one optional export test skipped; lint and production build passed. A temporary configured-domain build passed inspection of all 54 generated HTML heads, 51 unique sitemap URLs and seven HTTP checks. Independent review identified the Open Graph locale format; corrected to en_US/de_DE and verified navigation/language switching. The existing model-viewer bundle-size warning remains. Default production output keeps crawling disabled until a public domain is configured.

Implementation runs in this session on `codex/seo-metadata`. Existing research artifacts and the separate Leaflet change are preserved. No deployment or commit is part of this task.
