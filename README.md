# History in Cards

**An interactive digital heritage platform for exploring the historical and archaeological sites of Iraq.**

Every documented heritage site is a collectible-style **Heritage Card**. Cards live on an interactive map, in thematic and governorate **decks**, and on full site pages with history, galleries, 3D models, sources and digital documentation.

> **Design once, populate from data.** There is one reusable Card component and one reusable Site page. Every site is rendered from a record in `src/data/sites.json`; nobody hand-builds a page per site.

[![Deploy to GitHub Pages](../../actions/workflows/pages.yml/badge.svg)](../../actions/workflows/pages.yml)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![Languages](https://img.shields.io/badge/languages-EN%20%7C%20AR%20%7C%20DE-informational)

---

## Table of contents

1. [Highlights](#highlights)
2. [The archive at a glance](#the-archive-at-a-glance)
3. [Quick start](#quick-start)
4. [npm scripts](#npm-scripts)
5. [Site map and routes](#site-map-and-routes)
6. [The card system](#the-card-system)
7. [Decks and collections](#decks-and-collections)
8. [Interactive map](#interactive-map)
9. [Data model and the visible-card contract](#data-model-and-the-visible-card-contract)
10. [Languages and theme](#languages-and-theme)
11. [Project structure](#project-structure)
12. [Architecture notes](#architecture-notes)
13. [Content pipeline (Python)](#content-pipeline-python)
14. [Testing and quality](#testing-and-quality)
15. [Deployment](#deployment)
16. [Accessibility and performance](#accessibility-and-performance)
17. [Further documentation](#further-documentation)
18. [Contributing](#contributing)

---

## Highlights

- **Map-first experience.** The home page and the Map page open on a full-window Leaflet map with a control panel on the right: search, governorate selector, card preview, filters and results.
- **Heritage Cards.** Every site gets a card with a fixed layout: archive number, card type by age, image window, category, place, period and date.
- **Decks.** Cards are grouped into governorate decks, a UNESCO deck, a 3D deck and other special collections. A card can belong to several decks.
- **Site pages.** Overview, history, gallery, location (with neighbouring cards on a map), 3D model, video, sources and digital documentation.
- **Random discovery.** "Flip through history" and "Draw a Card" let visitors pull random cards.
- **Trilingual, bidirectional.** English, Arabic (right-to-left) and German, with light and dark themes.
- **Evidence-first content.** A card is only shown when it meets a documented contract: a credible source, a recognised governorate, a described period and a verified image status.
- **Static and fast.** No backend. The site builds to static files and deploys to GitHub Pages, with per-route entry pages so deep links and refreshes work.
- **Accessible by design.** Keyboard and screen-reader routes to everything the map shows, focus management on route changes, reduced-motion support.

## The archive at a glance

Figures from the coverage report of 2026-11-15 (`npm run report:coverage`). They change as content is reviewed.

| | |
|---|---|
| Records in `sites.json` | 683 |
| Visible cards | 682 |
| Governorates covered | 9: Baghdad, Nineveh, Salah al-Din, Kirkuk, Duhok, Erbil, Anbar, Sulaymaniyah, Diyala |
| Cards with a reviewed primary image | 215 |
| Cards with coordinates | about 286 |
| Cards with more than one source | 177 |

The archive is a work in progress: most records are still `needs-review`, and the site says so on each card.

---

## Quick start

**Requirements:** Node.js 22 (the version used in CI) and npm. Python 3 is only needed for the optional [content pipeline](#content-pipeline-python).

```bash
git clone <repository-url>
cd interactive-map-clone
npm install
npm run dev
```

Open the address Vite prints (by default <http://localhost:5173/>).

In development only, the Map page shows **"+ Add a place"**, **"Move this pin"** and **"Place on the map"**. These write to `src/data/sites.json` through a dev-only API (`vite/sitesApi.js`). New places are saved as hidden drafts. This API is not part of the production build.

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload and the dev-only map editor API. |
| `npm run build` | Production build into `dist/` (writes a build manifest). |
| `npm run build:pages` | Build for GitHub Pages: sets the base path from the repository name, copies `index.html` to `404.html` and to a directory index for every route, site and governorate deck. |
| `npm run preview` | Preview the production build. |
| `npm run lint` | ESLint (React hooks and React Refresh rules). |
| `npm test` | Node test runner over `tests/*.test.mjs`. |
| `npm run check:i18n` | Verifies translations, message keys, placeholders, vocabulary and language detection. |
| `npm run check:cards` | Lists records that do not meet the visible-card contract and what each lacks; reports enrichment gaps. Exits non-zero when a record is incomplete. |
| `npm run report:coverage` | Writes the governorate coverage report to `reports/coverage/` (`latest.md` and `history.json`). |

## Site map and routes

The router is a small History-API router with no dependency (`src/router/`). Pages are code-split and loaded on demand; Home is eager to avoid a loading waterfall on the first screen.

| Route | Page |
|---|---|
| `/` | Home: map-first landing, featured cards, draw a card, governorate decks, card types, special decks, documentation, about |
| `/explore` | Browse all cards with search, filters, sorting and a card grid |
| `/map` | Full map with filters, governorate selector, selection panel and result list |
| `/decks` | All decks |
| `/decks/:deckId` | One deck (a governorate or thematic deck) |
| `/decks/unesco`, `/unesco` | UNESCO collection |
| `/decks/3d`, `/3d-archive` | 3D model archive |
| `/sites/:slug` | Heritage site page |
| `/about`, `/methodology`, `/our-work`, `/contact` | Project pages |
| any other path | Not found page |

Query parameters are the shared, shareable state: `q`, `type`, `gov`, `kind`, `has`, `category`, `period`, `unesco`, `model`, `sort` on Explore and Map, plus `region` and `site` on Map.

---

## The card system

Every card is classified into one of **five types by the approximate age of the site**. Card type is not a deck.

| Type | Age band |
|---|---|
| I | 0–199 years |
| II | 200–499 years |
| III | 500–999 years |
| IV | 1000–1999 years |
| V (Legendary) | 2000+ years |
| Unclassified | Date not recorded. Used instead of guessing. |

The bands are provisional and defined in one place, `src/data/cardTypes.js`; components only consume the resulting object.

Cards use one visual system (`src/styles/heritage-card.css`): the same slots in the same order, so the image window keeps one proportion across a grid, single-line slots never wrap, the title always takes two lines, and tier ornaments never change the size of a row. Cards flip to a deck-specific back (`CardBack`, `FlipCard`).

## Decks and collections

- **Governorate decks:** one per governorate, generated from the data, each with its own card back.
- **Special collections:** UNESCO, 3D models, and others defined in `src/data/collections.js`. Some also act as filters (for example "Has video").
- **Thematic decks:** definitions only live in `src/data/decks.json`. Membership is never stored there: a site joins a deck by listing the deck id in its own `decks` array in `sites.json`. Reserved or duplicate ids are ignored with a development warning.

## Interactive map

- **Leaflet** with OpenStreetMap tiles (no API key; attribution is shown) and **marker clustering**.
- One pin per card with coordinates, coloured by card type; governorate labels show **live counts from the data**.
- Selecting a governorate flies the map to its pins and capital (`src/data/geo/governorateCentres.js`).
- A **verified boundary map** (`GovernorateMap`, SVG from GeoJSON via `scripts/geojson-to-svg.mjs`) is used when geometry exists in `src/data/geo/iraqGovernorates.js`; otherwise the coordinate map is used. Statistics and deck links never depend on geometry.
- The governorate buttons and result list beside the map are the keyboard and screen-reader route. Pins are focusable buttons.
- Map state is in the URL (`?region=…&site=…` plus the filters), so every view is shareable and Back works.

---

## Data model and the visible-card contract

All content is in `src/data/sites.json`, validated by `src/data/sites.schema.json`. A record becomes a visible card only when it meets the minimum contract in `src/utils/cardReadiness.js`. Records that fall short stay in the data, unseen, until completed. `npm run check:cards` lists them.

| Required field | Requirement |
|---|---|
| `id` | Stable, unique; lowercase letters, digits and hyphens. Never changed once published. |
| `name` | Site name. |
| `governorate` | A recognised governorate (spelling variants accepted). |
| `category` | What the site is (mosque, tell, bridge…), not its age-based card type. |
| `description` | 30–600 characters, more than the name repeated. |
| `period` | Period the sources support, or empty with `period_status: "not-established"`. |
| `sources` | At least one credible, classified source with an http(s) link. A coordinates lookup alone does not count. |
| `status` | `draft` and `withdrawn` stay hidden; `needs-review` is shown as awaiting review; `approved` is reviewed. |
| `image_status` | `none`, `pending-review` or `approved`; must match `coverImage`. |

**Enrichment** (never hides a card): coordinates with source and precision, civilization, alternative names, UNESCO status, preservation or destruction status, estimated year, translations.

**Images.** Each card shows at most one primary image, and only of the site itself. Covers must be freely licensed (CC0, CC BY, CC BY-SA, public domain), reviewed visually, and recorded with creator, license, source URL and publication approval. Originals are never sent to a card: optimized, metadata-stripped renditions are generated into `public/images/sites/<slug>/`.

**Source credibility.** Sources are classified into tiers (`src/data/source-credibility.json`); the Methodology page explains them.

Full contract and field reference: [`src/data/README.md`](src/data/README.md).

---

## Languages and theme

The interface is available in **English, Arabic (right-to-left) and German**, and in a **light and a dark theme**.

- **First visit:** the language follows the visitor's region: Iraq → Arabic, Germany → German, anywhere else → English. The region comes from the device time zone, then from the browser locale (no network request, no permission prompt).
- **After the visitor picks a language** (selector in the header) the choice is remembered and wins over the region. The theme works the same way: the device setting at first, then the saved choice.
- **UI text** lives in `src/i18n/messages/{en,ar,de}.js` (same keys in every file). **Names in the data** (governorates, site types, periods, civilizations, statuses) are in `src/i18n/vocabulary.js`; anything not listed there is shown as written.
- **Translating one site:** add a `translations` block to its record in `src/data/sites.json`:

  ```json
  "translations": {
    "ar": { "name": "الحضر", "short_description": "…", "full_description": "…" },
    "de": { "name": "Hatra", "short_description": "…" }
  }
  ```

  Supported fields: `name`, `short_description`, `full_description`, `city`, `site_type`, `historical_period`, `civilization`, `main_image_alt`. Missing fields fall back to the English record. Search finds a site by its Arabic or German name too.
- **Adding a language:** add it to `src/i18n/languages.js`, create `src/i18n/messages/<code>.js`, and extend `vocabulary.js`.
- **Checks:** `npm run check:i18n` verifies that every language has every message (with the same `{placeholders}`), that all keys used in the code exist, that every vocabulary entry is translated, and that region detection behaves as described.
- **Dark theme:** only the colour tokens in `src/styles/global.css` change (`:root[data-theme='dark']`). Heritage cards, deck piles and the always-dark bands keep the original palette.

---

## Project structure

```text
.
├── index.html
├── vite.config.js            Vite config: React, dev sites API, immutable assets, chunking
├── vite/
│   ├── sitesApi.js           Dev-only API that writes map edits to sites.json
│   └── immutableAssets.js    Cache headers for hashed assets
├── public/
│   ├── _headers              Cache and security headers
│   └── images/sites/         Optimized site images (per-site folders, multiple widths)
├── src/
│   ├── main.jsx, App.jsx, routes.jsx
│   ├── router/               History-API router, route matching, initial-route preload
│   ├── pages/                Home, Explore, Map, Decks, DeckPage, SiteDetails, About, …
│   ├── components/
│   │   ├── cards/            HeritageCard, CardBack, FlipCard
│   │   ├── map/              MapCanvas (Leaflet), GovernorateMap (SVG), RegionPanel, PlaceForm
│   │   ├── home/             Home sections and the map-first hero
│   │   ├── explore/          FilterPanel, ActiveFilters, DiscoveryBrowse
│   │   ├── site/             Gallery, ModelViewer, SiteSections, SiteLocation, ShareSite
│   │   ├── decks/, layout/, common/
│   ├── data/                 sites.json, schema, decks, collections, cardTypes, governorates, geo/
│   ├── services/             siteService, deckService (data access)
│   ├── utils/                filters, search, siteAdapter, cardReadiness, coordinates, images, …
│   ├── hooks/                useSiteFilters, useHeaderHeight, usePrefersReducedMotion, …
│   ├── i18n/                 Languages, messages (en/ar/de), vocabulary, detection, localisation
│   ├── theme/                Light/dark theme provider
│   └── styles/               Global tokens plus per-area stylesheets
├── scripts/                  build-pages, check-cards, check-i18n, coverage-report, geojson-to-svg, …
├── tests/                    Node test suites (integration, schema, i18n, images, cards, …)
├── tools/content-pipeline/   Python content ingestion and review tooling
├── docs/                     Audits and design notes
├── reports/                  Generated coverage and image reports
└── .github/workflows/        GitHub Pages deployment
```

## Architecture notes

- **Stack:** React 19, Vite 8 (Rolldown), Leaflet and `leaflet.markercluster`, Google `<model-viewer>` for 3D, plain CSS with design tokens. No state-management or router library.
- **Data flow:** `sites.json` → `siteService` → `siteAdapter` (normalises raw records into the shape components use: card type, image variants, href, translations) → pages and components. Filtering and searching are pure functions in `utils/`.
- **Code splitting:** pages load on demand; a shared `archive-shared` chunk holds data, services and utilities used by two or more pages; the Leaflet map and the 3D viewer are lazy.
- **URL as state:** filters and map selection are read from and written to the query string through `useSearchParams`, replacing history entries while typing so Back stays usable.
- **Routing on static hosting:** `build:pages` writes an `index.html` for every route, every site and every governorate deck, plus `404.html`.
- **Images:** responsive `srcset` variants with explicit dimensions to avoid layout shift; the first visible cards load with priority.
- **Styling:** colour, spacing and type tokens in `src/styles/global.css`; each area has its own stylesheet (for example `map-page.css`, `home-polish.css`, `heritage-card.css`).

---

## Content pipeline (Python)

`tools/content-pipeline/` is an optional, separate toolchain that gathers and prepares content. It never publishes automatically: its output is reviewed by people before it reaches `sites.json`.

- Fetches only from configured trusted sources, honouring `robots.txt` (`allowed`, `denied`, `unavailable`, `error` are distinct states; nothing is guessed when policy cannot be verified).
- Per-domain throttling, redirect validation, SHA-256 snapshot hashing, evidence and metadata extraction, draft generation.
- Review stages for records, covers, galleries and image licences; export of approved records; image optimization.

```bash
cd tools/content-pipeline
pip install -r requirements.txt     # requests, beautifulsoup4, Pillow
python main.py sources              # list trusted sources
```

See [`tools/content-pipeline/README.md`](tools/content-pipeline/README.md) for every command.

## Testing and quality

```bash
npm run lint
npm test
npm run check:i18n
npm run check:cards
npm run build
```

The suite (about 150 tests) mounts the real App, router, services, pages and components with React and jsdom. It covers navigation Home → card → site → deck, search and filters, the map and its selection states, galleries (focus trapping, announcements, failure recovery), 3D and video resources, i18n and Arabic, the data schema and card contract, image delivery, route errors and startup preloading. Production browser checks covered the main routes at 320 to 1920 px. Details: [`tests/README.md`](tests/README.md) and [`docs/P6-22-26-AUDIT.md`](docs/P6-22-26-AUDIT.md).

On Windows, git may check files out with CRLF line endings; tests that read source files normalise them.

## Deployment

The site deploys to **GitHub Pages** from `main` through `.github/workflows/pages.yml`: checkout, Node 22, `npm ci`, `npm run build:pages`, upload `dist/`, deploy.

The base path is derived from the repository name (`GITHUB_REPOSITORY`): `/<repo>/` for a project site, `/` for a `*.github.io` repository. Any static host works: run `npm run build` (or `build:pages`) and serve `dist/`; hashed assets are safe to cache immutably.

## Accessibility and performance

- Skip and landmark structure, focus moved to the page on route change, hash links scroll after loading.
- Keyboard route for the map (governorate buttons, result list, focusable pins); gallery focus trap and announcements.
- Right-to-left layout for Arabic, `lang` and `dir` set before first paint to prevent a flash.
- Respects `prefers-reduced-motion` and a future `data-motion` setting.
- Explicit loading, empty, no-result and error states instead of blank screens.
- Lazy map and 3D, responsive images, immutable asset caching, and a bounded preload of the first route.

## Further documentation

| Document | Contents |
|---|---|
| [`Documentation.md`](Documentation.md) | Full project specification: scope, structure, card and deck systems, map, site pages, data, content and sources, 3D, animation, architecture, roadmap |
| [`src/data/README.md`](src/data/README.md) | Visible-card contract, record fields, image and licence rules |
| [`tests/README.md`](tests/README.md) | Test coverage and verification history |
| [`tools/content-pipeline/README.md`](tools/content-pipeline/README.md) | Content ingestion commands |
| [`docs/P6-22-26-AUDIT.md`](docs/P6-22-26-AUDIT.md) | Resilience, accessibility and performance audit |

## Contributing

1. Create a branch from `main`.
2. For content, edit `src/data/sites.json` and make sure `npm run check:cards` and `npm test` pass. Every card needs a credible source; never add an image without a verified free licence.
3. For UI text, add keys to all three files in `src/i18n/messages/` and run `npm run check:i18n`.
4. Run `npm run lint`, `npm test` and `npm run build` before opening a pull request.

## Licence and credits

Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Boundary geometry credits are shown on the map where used. Image credits and licences are shown with each image and recorded per site. No software licence file is included yet; add one before reusing the code outside the project.
