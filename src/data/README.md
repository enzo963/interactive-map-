# Visible card contract

A record in `sites.json` becomes a visible Heritage Bridge card (map, Explore, decks,
collections, site pages) only when it meets the minimum contract in
`src/utils/cardReadiness.js`. Records that fall short stay in the data, unseen, until
they are completed. `npm run check:cards` lists them and what each one lacks.

Required — a card is hidden until all of these hold:

| Field | Requirement |
|---|---|
| `id` | Stable, unique ID of lowercase letters, digits and hyphens. Never changed once published. |
| `name` | Site name. |
| `governorate` | A recognised governorate (`governorates.js`, spelling variants accepted). |
| `category` | What the site is (mosque, tell, bridge …), not its age-based card type. |
| `description` | Concise: 30–600 characters, and more than the name repeated. |
| `period` | Historical period or classification the sources support. When they give none, leave it empty and set `period_status: "not-established"`, so the gap is a recorded finding rather than an oversight. |
| `sources` | At least one credible source (tier 1–3 below): a named source with an http(s) link from a classified publisher. A coordinates lookup such as a Wikidata location entry places a site but does not document it, so it does not count on its own. |
| `status` | Publication status: `draft` and `withdrawn` stay hidden; `needs-review` is shown as awaiting review; `approved` is reviewed. |
| `image_status` | `none` (no cover), `pending-review` (a cover without full license and publication approval) or `approved` (a cover the card may show, see `coverApproval.js`). It must match `coverImage`. |

Enrichment — add whenever reliable information exists; a gap never hides a card:
coordinates (`latitude`/`longitude`, with `coordinates_source` and
`coordinates_precision`), civilization, `alternativeNames`, UNESCO status
(`unesco` true/false), preservation state (`preservation_status`,
`destruction_status` or `heritage_status`), `estimated_year`, and any other metadata
in the record contract below. `check:cards` counts these gaps among visible cards.

Every approved record must meet the contract; `npm test` and `check:cards` fail
otherwise. Discovery batch scripts and the map editor write `image_status` and
`period_status`; the editor saves new pins as hidden drafts.

## Primary images

Each card shows at most one primary image, and only an image of the site itself, not of
its town or region. The current covers come from a reviewed pass
(`tools/content-pipeline/data/images/cover-review-2026-11-03.json`, applied by
`tools/content-pipeline/apply_cover_review.py`):

1. **Candidate.** The Wikidata image (P18) of the card's own item: the item for the site
   itself. Items for a town, village, district or person are excluded.
2. **License.** Creator and license come from the Wikimedia Commons API. Only free
   licenses are accepted: CC0, CC BY, CC BY-SA and public domain, never NC, ND or fair use.
3. **Visual review.** Every candidate is viewed on a labelled contact sheet and approved
   only when it shows the site itself. Maps, plans, diagrams, artefacts from the site,
   close-ups of signs or plaques, crowd or military scenes, poor scans, and the same
   file already used for a more precise card are rejected. Each decision and its reason is
   in the review file.
4. **Record.** An approved cover stores `src` (a 1280 px rendition), `original_url`,
   `sourceUrl` (the Commons file page), `credit` (creator), `license` and `license_url`,
   `width`/`height`, `identity` (the item and how it was matched), `license_review` and
   `publication_approval`. `HeritageCard` shows the cover only when all of these check
   out, and `image_status` becomes `approved`.

### Optimized delivery

The app never sends the original file to a card. `tools/content-pipeline/optimize_images.py`
downloads each approved image once and writes renditions to `public/images/sites/<slug>/`.
It converts to sRGB and strips EXIF, colour profiles and other metadata. It never upscales.

| Role | Width | Formats | Used by |
|---|---|---|---|
| thumb | 320 | AVIF, WebP | gallery thumbnails, cards on narrow phones |
| card | 640 | AVIF, WebP, JPEG | card grids (the JPEG is the fallback) |
| gallery | 960 | WebP | Site Details viewer |
| full | 1280 | WebP | full view on large or high-density screens |

The image object gains `variants` (`base`, `width`, `height`, `color` and the widths per
format). `ResponsiveImage` renders a `<picture>` with AVIF and WebP `srcset`s and a `sizes`
value per role, so a phone picks a 320 or 640 file and a card never receives more than
640 px. Explicit `width`/`height` and the image's average colour hold its place while it
loads. Images load lazily, except the first grid row, the Site Details hero and the
opened viewer, which load at once with `fetchpriority="high"`.

File names carry a hash of the source and the encoder settings, so they never change
content under the same URL. `public/_headers`, and `vite/immutableAssets.js` for
`vite preview`, mark them and the hashed build assets as cacheable for a year. Run
`python3 optimize_images.py` after approving new images, and `--check` to list gaps;
`tests/images.test.mjs` fails while an approved image lacks its renditions or one exceeds
its size limit.

A card without an approved cover shows the Heritage Bridge fallback: the arch mark, the
site type and "No verified photograph". It never borrows a photograph of another place.

## Additional photographs (galleries)

Flagship records also carry `galleryImages`, shown in the Site Details gallery and listed one
by one under Credits. Flagships are the World Heritage properties, the largest archaeological
cities, and complexes (citadels, monasteries, shrines, palaces) whose plan, interior or setting
one photograph cannot show; the list is `FLAGSHIPS` in
`tools/content-pipeline/gallery_candidates.py`. A missing gallery never holds a record back.

1. **Candidates.** Photographs in the Wikimedia Commons category of the card's own Wikidata
   item and its direct sub-categories. Free licenses only (as for covers), JPEG of at least
   1200 px, never the cover file, never a near-duplicate of it, and never an object from the
   site now in a museum (except on museum cards).
2. **Review.** Each candidate is viewed on a contact sheet beside the cover and approved only
   when it shows the site itself and adds a viewpoint the cover and the other approved images
   do not: the setting or an aerial view, the plan, an interior, a carved detail, or another
   monument of the complex. Repeats of the cover's view, people- or vehicle-dominated scenes
   and unidentified views are rejected. Decisions and reasons are in
   `tools/content-pipeline/data/images/gallery-review-<date>.json`.
3. **Record.** Each image keeps its own attribution and approval: `caption` (the viewpoint),
   `alt`, `credit`, `license`, `license_url`, `sourceUrl` (the Commons file page),
   `original_url`, `identity` (item and Commons category), `license_review`,
   `license_tracking` and `publication_approval`, bound to the site and the image. At most
   six per record, and no file appears on two records.

`tests/images.test.mjs` checks the binding, attribution, renditions and these limits.

## Source verification

`source-credibility.json` rates every cited publisher (lower tier is stronger):

| Tier | Publishers | Supports a card |
|---|---|---|
| 1 | UNESCO and its advisory bodies, governmental heritage authorities | yes |
| 2 | Academic publications, universities, archaeological missions, museums, archives, research institutes, reputable cultural heritage organisations, official government bodies | yes |
| 3 | Encyclopaedias (including Wikipedia), established news organisations, non-specialist NGOs | yes, but queued for a stronger source |
| 4 | Tourism, travel, commercial and personal sites, user-contributed databases | no: discovery only |
| locator | Coordinate lookups and media hosting (Wikidata, Commons) | no |

A publisher not in the file supports nothing until someone classifies it, and the
tests fail while any cited domain is unclassified. When a weak host carries a
stronger work, such as a journal article copied to Kurdipedia, the source may set
`sourceType` (`academic-publication`, `excavation-report`, `news-report`) with a
`sourceTypeNote` saying what it is. Without the note the host's tier applies.

Cards list sources strongest first (`siteAdapter.js`), so a tourism page or
coordinate lookup never reads as the primary evidence. Within a tier the recorded
order is kept.

The workflow for a new candidate:

1. Discover from any source, including tourism sites and blogs.
2. Before the card is built, cite the strongest evidence available: tier 1–2
   wherever it exists, and tier 3 only when nothing stronger was found.
3. Run `npm run check:cards -- --queue`. Hidden records show what they lack. Visible
   cards in the review queue are flagged:
   - `reference-only`: best evidence is tier 3.
   - `needs-corroboration`: a UNESCO property, ancient city, historic town,
     citadel, complex with component cards, or destroyed or rebuilt site with
     fewer than two credible publishers.
   - `discovery-cited`: a tier-4 page is still cited.
   - `unclassified-source`: a publisher needs a tier.
4. Work the queue: replace or corroborate the weak evidence, then publish or approve.

The queue never hides a card; only the contract above does.

# Heritage record contract — P5-06

`sites.json` and unpublished prepared site records use `sites.schema.json` (JSON Schema draft 7).
Required fields: `id`, `name`, `governorate`, `category`, `period`, `description`,
`unesco`, `has3D`, `coverImage`, `galleryImages`, and `sources`.

- IDs and names are non-empty strings. Site IDs and slugs must be unique and stable.
- Governorates use consistent display names. Unknown category, period and description stay empty strings.
- Category describes the site, not its age-based card type.
- `unesco`: true means World Heritage inscription; false means known not inscribed
  (including a Tentative List entry); null means not established. Component buildings
  of tentative areas do not acquire separate listing status.
- `has3D`: true/false when recorded, null when availability is unknown. Missing evidence
  does not establish absence. The existing frontend Hatra record retains its recorded false value.
- `coverImage`: `{ src, alt, caption, credit, license }` or null when no cover is assigned.
- `galleryImages`: array of the same image objects. An explicitly selected cover may
  also occur in the gallery; migration preserves the gallery's former contents/order.
- Unknown image metadata stays empty. Unreviewed pipeline image candidates are not
  promoted to cover or gallery images.
- Optional coordinates, decks, chronology, provenance and verification metadata remain supported.

Every source contains `sourceName`, `url`, `evidenceId`, and `accessedAt`.
Use a real HTTP(S) URL or an empty string for a citation without an online link.
Unknown evidence IDs and access dates stay null. Known access dates are recorded
ISO dates or timezone-qualified timestamps; never substitute today's date.

`siteAdapter.js` preserves the existing component API: category → siteType,
coverImage → image/alt/credit, galleryImages → gallery, unesco → isUnesco,
and has3D → hasModel. Canonical fields are also exposed; unknown canonical flags
stay null while existing boolean UI predicates remain usable. The `images` alias
combines cover and gallery without duplicates for older consumers.

Legacy `images`, `main_image`, `gallery`, `site_type`, `historical_period`,
`full_description`, `unesco_status`, and `has_3d` imports remain readable.
UI pages and source display components are unchanged.

Run `python standardize_records.py` inside `tools/content-pipeline/` after collection.
It standardizes site-focused drafts and writes `data/prepared/heritage-sites.json`.
Review metadata, candidate fields and evidence are preserved; raw snapshots,
source extractions, evidence manifests and automatic page drafts keep their
research-specific schemas. The prepared catalog is not imported by the frontend.
Hatra reuses its existing site-001 identity in that catalog; no duplicate is added.
Earlier download ZIPs are point-in-time snapshots. The new standardized export
contains the current record shapes across all five collected governorates.

Card cover publication (P5-17/P5-18): image objects may also contain siteId,
license_status (verified/unverified/restricted/unknown), license_url, license_review,
license_tracking and publication_approval. The adapter preserves these fields.
HeritageCard requires verified image-bound licensing evidence and a separate
explicit image/site publication approval; a bare license label, legacy image
alias or gallery entry does not authorize a card cover. See
../../tools/content-pipeline/README.md for the review/approval metadata contract.
The frontend dataset is not populated automatically from pipeline review files.

## Site videos (optional)

`site-videos.json` links videos to cards for the Site Details page. A video is enrichment only: the
card contract (`src/utils/cardReadiness.js`) never reads it, and a card without video is complete.

- **Who may publish:** only institutions listed in `publishers`, each with a type from
  `publisherTypes` — intergovernmental bodies, heritage authorities, heritage foundations, museums,
  universities, archaeological missions, scholarly bodies, and `heritage-bridge` for our own
  documented media. News clips, travel vlogs and unattributed uploads are not listed.
- **Verification:** each video's channel must be its publisher's channel (`channelUrl`), checked with
  YouTube's oEmbed endpoint by `tools/content-pipeline/verify_videos.py`, and its published description
  read to confirm what it shows. A publisher's channel is accepted when the institution's own site
  links to it or names the video (see `note`).
- **Links:** `sites[]` names each card with a relation: `site` (the video is about this card), `part`
  (the card is one monument shown in a wider video) or `context` (related work nearby); `part` and
  `context` need a `note`, shown on the page. A card shows at most three videos, its own first.
- **Display:** a still panel with a play button; nothing is requested from YouTube until the visitor
  presses play, then the privacy-enhanced player (youtube-nocookie.com) loads. Each video credits its
  publisher, year, length, kind and language, with our one-line summary and a link to the original.
- **Adding a video:** add the publisher if new (with the reason its channel is official), add the
  video with `summary`, `kind`, `language`, `published`, `durationSeconds` and its card links, then run
  `python3 verify_videos.py --stamp` and `npm test`.

## 3D documentation (optional)

`digital-documentation.json` links 3D models (today all on Sketchfab) to cards. Like videos, it never
affects whether a card is published; a card with resources gains the 3D badge and a "3D documentation"
section on Site Details.

- **Two classes, never mixed:** `measured` — geometry captured from the place itself (photogrammetry,
  aerial photogrammetry, laser scanning), recording the site as it was when captured, damage included;
  `modeled` — built by hand (method `manual-modeling`), including reconstructions of a lost or earlier
  state. Site Details shows them in separate groups, measured first, with a solid badge for measured and
  a dashed one for modelled.
- **How the class is known:** `methodEvidence` is `stated` when the creator says how the model was made
  (description or tags) and `inferred` when it was judged from the model itself — a photo-textured mesh
  recording damage as found, versus clean geometry, regular forms or no texture. `methodNote` gives the
  reason and is shown on the page.
- **What it shows:** `depicts` names the state and, where known, the date (e.g. "the damaged complex
  during reconstruction, 2020" or "a reconstruction of the shrine around 1920").
- **Links:** `sites[]` with relation `site`, `part` (a building or element within the card's site) or
  `context` (related, e.g. the newer church beside an old one); `part` and `context` need a note.
  Portable objects now in museums are not linked to sites.
- **Creators:** listed in `creators` with a type (`heritage-bridge` for our own scans, heritage studio,
  archaeological mission, university, researcher, independent). Rights are recorded as published
  (`license`, `rightsHolder`, e.g. © UNESCO); models are embedded with Sketchfab's own viewer, loaded only
  when the visitor asks.
- **Adding a resource:** add it with its class, method, evidence, note and card links, then run
  `python3 tools/content-pipeline/verify_documentation.py --stamp` and `npm test`.

## Governorate coverage report (daily)

`npm run report:coverage` prints, for each of the nine governorates: discovered candidates, approved
records, published cards, cards with a primary image, with a gallery, with coordinates, with two or more
credible publishers, and records still needing review. It ranks the governorates on the mean of their
approved, image, gallery, coordinate and multiple-source shares of published cards, names the lagging one,
and says how many cards it needs on each measure to reach the median governorate.

Each run updates `reports/coverage/latest.md` and adds the day's snapshot to `reports/coverage/history.json`;
the next day's run shows the change in brackets. Definitions live in `src/utils/coverage.js`, which uses
the same rules as the site (card contract, approved covers, credible sources), and
`tests/coverage.test.mjs` checks that the totals match the published archive. Use `-- --no-write` to print
without updating the files.

## Field-completeness queue

`npm run report:fields` (rules in `src/utils/fieldQueue.js`) writes `reports/fields/field-queue.md` and
`field-queue.json`. It separates two kinds of gap:

- **Blocking**: a required field of the card contract is missing (description, category, period or
  `period_status: not-established`, a credible source, a recognised governorate, ID, name, status, image
  status), or an image the site shows lacks its credit, licence, source page or, for Creative Commons, its
  licence link. Blocking problems are fixed first and cannot be waived.
- **Enrichment**: place description, coordinates, period, a second credible source, alternative names,
  primary image (worked in the image queue), estimated year, preservation status, UNESCO status. These never
  hide a card. They are worked in passes, one field across all cards, highest-value cards first, each
  attempt time-boxed. A gap that cannot be filled in its time box is recorded as `not-found` in
  `tools/content-pipeline/data/fields/field-decisions.json` and leaves the queue.

The report's next batch lists each card at most once, so a batch never becomes perfecting one card.
`tests/field-queue.test.mjs` checks the rules; the script exits 1 if an approved record is blocked.

## Search discoverability

Search (`src/utils/search.js`) matches every query word against the start of a word in a card's
names, aliases, governorate, location text, type, period and tradition. It folds punctuation,
apostrophes and Arabic letter forms, tolerates common transliterations (Tell/Tal, Sheikh/Shaykh,
Qal'at/Kalat, Kadhimiya/Kazimiya, Ashur/Assur) and knows equivalent terms in English, transliterated
Arabic, Kurdish and Arabic (mosque/masjid/جامع, castle/qala/قلعة, Abbasid/عباسي). Every governorate
is searchable however it is written (Hawler, Slemani, Ninawa, دهوك …).

`npm run check:search` runs, for every record from a discovery batch, the searches a visitor would
type (name and its variants, each alias, name plus governorate spellings, category and its plural and
Arabic, period in English and Arabic), plus the real-world searches in
`tests/fixtures/search-expectations.json`. Add a line there whenever a search should have found a card
and did not. If a card cannot be found because a well-known name is missing, add it to the record's
`alternativeNames`. `tests/search-discoverability.test.mjs` runs the same checks and guards against
spelling tolerance returning unrelated cards.

## Controlled values (governorate and site type)

Each record stores one canonical governorate (`GOVERNORATE_NAMES` in `src/data/governorates.js`) and one
controlled site type (`CATEGORIES` in `src/data/categories.js`). Alternative spellings never go into a
record's `governorate` or `category`. They are listed once, in those files (`ALTERNATIVE_NAMES`,
`CATEGORY_ALIASES`): Ninewa, Ninawa Governorate, Nīnawā, نينوى and هەولێر all resolve to their
governorate, and "Mosque and Minaret" or "mosques" to Mosque. A site's own other names stay in its
`alternativeNames`.

The site adapter and the map editor's save API store or show the canonical value, so a variant never
becomes a separate filter option. `npm run check:values` lists records whose value is a variant or unknown.
`npm run check:values -- --write` stores the canonical value for recognised variants. Unknown values are never guessed: correct
the record or add the spelling to the alias table. `tests/controlled-values.test.mjs` checks that every
card appears under exactly its own governorate and type filters.

## Map positions

Only a verified position becomes a pin (`src/utils/mapPosition.js`): a point of the site itself
(`coordinates_precision: "site"`) with a recorded `coordinates_source`. A point known only to the town,
neighbourhood or area (`settlement` or `approximate`) is kept in the record but not drawn. A card without
a verified position is still published: the Map list and Site Details say "Approximate area only" or "No
map position yet". Coverage and the field queue count verified positions only.

`python3 tools/content-pipeline/verify_coordinates.py` checks every recorded point. It checks that the
source and precision are recorded and that the point is in Iraq. For a Wikidata source, it checks that
the item still gives the same point, is the site itself and lies in the card's governorate. It also
flags points shared with an unrelated card, components far from their parent site, and site points
rounded to one decimal. Each flag needs a manual decision in
`tools/content-pipeline/data/coordinates/coordinate-decisions.json`: `keep` (with the reason),
`downgrade` (precision lowered so the point is no pin) or `remove`. `tests/map-position.test.mjs` fails
while a flag is undecided or two unrelated pins share a point.
