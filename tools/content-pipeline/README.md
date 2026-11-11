# History in Cards Content Pipeline — Phase 1.1

Phase 1.1 hardens the trusted-content ingestion foundation.

## Key upgrades

- Explicit `robots.txt` statuses:
  - `allowed`
  - `denied`
  - `unavailable`
  - `error`
- New `check` command to diagnose a URL before fetching.
- Structured diagnostic output.
- Safer redirect validation.
- Better HTTP/content-type errors.
- Per-domain throttling.
- Snapshot hashing with SHA-256.
- Evidence + extracted metadata + draft generation.
- No automatic publishing.
- No guessing when robots policy cannot be verified.

## Commands

List configured trusted sources:

```powershell
python main.py sources
```

Diagnose a page before fetching:

```powershell
python main.py check `
  --source unesco `
  --url "https://whc.unesco.org/en/list/1437/"
```

Fetch only when automated access is explicitly allowed:

```powershell
python main.py fetch `
  --source unesco `
  --governorate erbil `
  --url "https://whc.unesco.org/en/list/1437/"
```

Run self-tests:

```powershell
python -m unittest discover -s tests -v
```

## Important policy

`unavailable` and `error` are **not** treated as permission.

If `robots.txt` cannot be verified, Phase 1.1 stops and reports the reason.
Later source-specific adapters may use official APIs, feeds, dumps, or downloadable datasets instead of HTML scraping.

## Folder layout

```text
tools/content-pipeline/
├── config/
│   └── sources.json
├── data/
│   ├── raw/
│   ├── drafts/
│   └── logs/
├── hb_pipeline/
│   ├── __init__.py
│   ├── config.py
│   ├── diagnostics.py
│   ├── errors.py
│   ├── extractor.py
│   ├── fetcher.py
│   ├── models.py
│   ├── robots.py
│   ├── storage.py
│   └── utils.py
├── tests/
│   ├── test_registry.py
│   └── test_utils.py
├── main.py
├── requirements.txt
└── README.md
```


## P4-07 validation

- URLs must be absolute HTTP(S) public addresses without credentials, control characters,
  malformed escapes, or backslashes. The configured source allowlist is still required.
- Every page redirect is validated against the source allowlist and checked against
  robots policy **before** its destination is requested. Redirect loops and more than
  five redirects stop with an error. Redirected robots files, HTML responses, and
  files without a User-agent directive do not establish permission and are blocked.
- Extraction requires a title/heading of at least three characters and a description
  or paragraph of at least 40 characters. Error/challenge pages are rejected. Repeated
  paragraphs and image URLs are removed; invalid canonical/image URLs are discarded.
- A draft must have a safe ID, a name, a usable summary, known evidence references,
  and provenance for populated fields. Status stays `needs-review`, verification stays
  `unverified`, and image licenses stay `unverified`. Validation finishes before any
  evidence or draft file is saved. JSON records are replaced atomically.
- Within one source/governorate, identical HTML hashes reuse existing evidence instead
  of creating another draft, including when the URL differs. URL identities ignore
  fragments, hostname case, and default ports; query strings remain significant.
  Changed content at an existing URL is saved as a new revision with a reference to
  previous evidence. Corrupt evidence manifests stop ingestion with a repair path.
- The evidence manifest is written last as the completion marker. This is a local,
  single-process pipeline; concurrent ingestion and multi-file transactions are not
  supported. A failed write may leave intermediate files, but no completed manifest.

The tests use mocked HTTP and temporary storage; running them does not contact sources
or publish anything. No frontend connection is added.


## P5-06 site record standardization

After site-focused draft preparation, run:

```powershell
python standardize_records.py
```

This adds the required canonical site fields to `draft-*-p501` through `p505`
review records and writes an unpublished `data/prepared/heritage-sites.json`
catalog. Cover and gallery are separate, evidence and review status are preserved,
and unknown UNESCO/3D flags stay null. Hatra reuses its existing site-001 ID.
No reviewed draft is automatically published or copied into frontend data.
Automatic page drafts and raw/extracted/evidence research artifacts are not site
records and retain their original schemas. See `src/data/sites.schema.json` and
`src/data/README.md` for the shared contract.


## P5-07 / P5-08 — site record review

From this directory, review the standardized catalog and compare it read-only
with the existing frontend dataset:

```powershell
..\..\.venv\Scripts\python.exe review_records.py --compare ../../src/data/sites.json
```

Or review explicit JSON record files without touching them:

```powershell
python review_records.py data/prepared/heritage-sites.json --output data/review/heritage-review.json
```

Inputs can be arrays, single record objects, or `{ "sites": [...] }` files.
The default input is `data/prepared/heritage-sites.json`. `--compare` can be
repeated for other record files. The report is saved separately under
`data/review/`, which is ignored by Git. Source files, raw evidence, frontend
files and the prepared catalog are never rewritten by this command.

Validation checks required fields, string/boolean/media types, recognized
governorates, incomplete text, coordinates, source URLs, evidence IDs and actual
calendar dates. Unknown period/UNESCO/3D/image information produces review
warnings; it is not filled with invented values. Empty sources and malformed
records are errors. Bad JSON, duplicate JSON keys, non-standard numbers and
invalid UTF-8 are retained as review items with the original bytes in base64.
One bad item does not hide valid siblings. Original records are retained in the
report, alongside copies explicitly marked needs-review/unverified.

Duplicate candidates use primary/alternative names, governorate aliases, fuzzy
spelling and normalized source URLs. Both records are retained and flagged with
confidence, reasons and cross-references. Reused IDs are also flagged. Tracking
parameters and fragments do not affect URL matches; meaningful query IDs do.
A shared page alone is a weak signal, not proof of identity. Known related
landmarks and distinct evidence sections suppress URL-only false positives.
Different governorates are not matched by name alone; shared URLs can surface
conflicting geographic assignments for manual review. Cross-language names
need explicit aliases; the matcher does not translate names automatically.

Exit codes: 0 means automated checks found no issues (still not approval),
2 means review findings were saved, and 1 means report writing failed. Output
cannot overwrite an input file. No record is automatically approved, merged,
deleted, renamed, or published. Existing page-content hash deduplication remains
separate from this site-level duplicate review.

### Site identity: one place, one card

`dedupe_sites.py` runs the same duplicate detection on the frontend
`src/data/sites.json` and applies reviewed decisions from
`data/site-identity-decisions.json`. Run it after adding a discovery batch and
before publishing its cards:

```powershell
python dedupe_sites.py report   # pairs not yet settled by a decision; exit 2 if any
python dedupe_sites.py apply    # apply the decisions; safe to repeat
```

For the frontend data the detector also reads `parentSite`. A name shared by a
complex and a monument inside it is reported with `relation: component` rather
than as a plain duplicate. A shared source URL counts only when it is the first
source of both records, so a catalogue page cited by many sites does not pair
them; `--all` lists those low-confidence pairs too. Two records whose
site-precision coordinates come from the same Wikidata item are a
high-confidence match.

Each decision has a `reason` and one of three actions:

- `merge` — two cards describe one place. The `keep` record gains the other
  record's name (or the decision's `alias`, when the old card title is not a
  name), its alternative names in every language and its sources. Its own
  names are never removed. It gains coordinates only when it has none. The old
  id is listed in `mergedFrom`, and its components now point at `keep`.
- `component` — a monument inside a larger complex (a mosque on a mound, a gate
  of a city). Sets the child's `parentSite`. Both keep their own cards.
- `distinct` — similar names, different places (same saint in two towns,
  numbered survey sites). Nothing changes; the pair leaves the report.

Run `apply` again after rebuilding any batch, so merged records do not
reappear. `tests/schema.test.mjs` fails if a merged id is back, or if two cards
share a name or alternative name without a component link or a decision.

## P5-09 / P5-10 — multiple sources and reliability review

`attach_evidence.py` builds a separate, unpublished evidence view for one site.
It accepts a single site, array, or `{ "sites": [...] }` catalog and a claims
file whose `siteId` selects exactly one record. Each assertion records a field,
value, saved evidence ID, and a locator into captured source content:

```json
{
  "siteId": "site-erbil-erbil-citadel",
  "assertions": [{
    "assertionId": "erbil-name-unesco",
    "field": "name",
    "value": "Erbil Citadel",
    "evidenceId": "unesco-20261031T171953Z-183f6bd893",
    "locator": {
      "artifact": "data/raw/erbil/unesco/unesco-20261031T171953Z-183f6bd893.extracted.json",
      "json_pointer": "/paragraphs/0",
      "text_match": "Erbil Citadel is a fortified settlement"
    }
  }]
}
```

The example IDs refer to local collection artifacts, which are ignored by Git.
Use IDs and content from your own saved evidence on a fresh checkout. HTML
locators use `selector` instead of `json_pointer`. Every text match must occur
in the selected artifact and in the hash-checked raw snapshot. Retrieval must
have succeeded with an allowed robots decision and a registered source domain.
Text matching checks traceability; a reviewer must still assess whether the
passage supports the interpreted value and refers to the correct site.

From this directory, run the collected examples:

```powershell
..\..\.venv\Scripts\python.exe attach_evidence.py data/drafts/erbil/draft-erbil-citadel-p501-20261031.json data/claims/site-erbil-erbil-citadel.claims.json
..\..\.venv\Scripts\python.exe attach_evidence.py data/drafts/duhok/draft-delal-bridge-p502-20261031.json data/claims/site-duhok-delal-bridge.claims.json
```

Default output: `data/evidence_views/<siteId>.json`. Use `--output` for another
separate review file. Input files, raw evidence and frontend files cannot be
output targets. Claims and views are ignored by Git. The command only reads
local artifacts; it does not fetch sources or publish records.

- `evidence_assertions` retains every input assertion, its original form, source
  identity, URL, evidence ID, access date, locator and validation findings.
- `field_evidence` groups equivalent values and retains all alternatives and
  supporting assertion/evidence/source IDs. Simple name/period spelling and
  governorate aliases are normalized for comparison; semantic differences are
  conservatively left for review.
- `sources`, `source_evidence` and field `provenance` retain earlier references
  and add validated evidence. Existing site fields are never overwritten.
- `reliability_review` flags disagreements, differences from existing values,
  and invalid assertions. All output remains needs-review/unverified.

The current registry is authoritative for ranking: lower `trust_tier` is
stronger. UNESCO, SBAH (`iraqi-antiquities`) and KRG are all tier 1, so a tie
between their differing values has no preferred value. Commons is tier 2 and
may support image metadata, not historical facts or UNESCO designation.
Stronger eligible evidence gives a *preferred value for review* while retaining
weaker alternatives and the conflict flag. Source count, input order, and
recency do not break tier ties. Snapshot tiers are retained for audit; a changed
registry tier generates a warning and the current policy controls preference.
Caller-supplied tiers cannot raise reliability. Null/empty and invalid values
are retained but cannot determine a preference. Existing canonical values have
no inferred tier and are not used as ranked source assertions.

To add another batch, select the previous evidence view as the site input and
write to a new output. Earlier assertions are retained. Identical reruns do
not multiply assertions; reuse of an assertion ID for a changed claim retains
both versions as invalid for review. An existing review view is regenerated
from all its retained original claims against the current source policy.

The local Erbil example has two agreeing name assertions from UNESCO and KRG.
The Delal Bridge example retains KRG's Roman attribution alongside its more
uncertain Roman-or-medieval wording; both tier-1 statements are flagged for
review without claiming a definitive historical contradiction. No new SBAH or
Commons collection is implied; their support is verified using test fixtures.

Exit codes: 0 = no automated conflict/error (manual review still required),
2 = review findings saved, 1 = command/input/output failure. Missing or tampered
snapshots, ambiguous IDs, unsupported content scopes, malformed locators and
source impersonation are rejected as usable assertions without deleting them.
Run all Python checks with:

```powershell
..\..\.venv\Scripts\python.exe -m unittest discover -s tests -q
```

P5-09/P5-10 validation: 89 Python tests pass, including 25 evidence/reliability
cases. The command was also run against the two saved collection examples.
Frontend files and source registry tiers are unchanged.

## P5-11 through P5-14 — extraction, site-specific images and cover review

The extractor prefers main/article content and content headings over a portal
masthead. It retains useful paragraphs, lists and definition text; deduplicates
text; falls back to useful content for missing descriptions; normalizes language
metadata and relative canonical URLs; and removes scripts, navigation, footers,
hidden elements, related modules, link-heavy text and other page furniture.
Article headers remain eligible. Missing language stays unknown. This remains
a static-HTML heuristic: JavaScript-rendered content is not executed, and
page-wide descriptions and canonical metadata still require human verification.
Multi-site pages retain their content; a target argument does not turn page-wide
facts or titles into site-specific facts.

Image discovery supports lazy image attributes, srcset/picture variants, social
image metadata, captions, image titles, explicit figure-level license hints and
credits. Decorative/very small images and invalid URLs are excluded. Each
candidate stores its URL, alt, source mechanism, source ID/name, actual source
page URL, license_status, context, declared dimensions and review state. Fetches
and saved-evidence reprocessing also record evidenceId. License hints are never
proof of reuse permission; every new license remains unverified. No image bytes
are downloaded and declared dimensions have not been independently checked.

### Target identity

For a new trusted-source fetch, supply an explicit stable site ID and name:

```powershell
python main.py fetch --source unesco --governorate erbil --url https://whc.unesco.org/en/list/1437/ --site-id site-erbil-erbil-citadel --site-name "Erbil Citadel" --site-alias "Citadel of Erbil"
```

Both identity arguments are required together. `--site-alias` is repeatable.
Without a target, images remain unassigned. A repeat fetch of identical HTML
still uses the existing content-deduplication policy; use the offline command
below to apply new extraction logic to existing evidence.

An image receives `siteId` only when its own alt, caption or image title names
the requested site or an explicit alias. The association is matched-unverified
with recorded matching text and review_required=true. A filename match alone
is uncertain and retains siteId=null. A governorate name, page title, section
heading, social image without its own identifying alt, or nearby page placement
cannot assign a site. Generic/governorate-only names do not establish identity.
Candidates without sufficient identity evidence retain targetSiteId only as the
requested review target; it is not an association. Unknown images are preserved
for review, not silently assigned or used as covers.

The offline command uses all names/aliases in the supplied catalog to detect
images naming other sites or several sites. It also compares observations of
the same image URL across sources. Conflicting identity observations remove the
siteId from all affected observations and retain their earlier interpretations
for review. Single-record inputs can detect only the names supplied in that
record; pass the full catalog for stronger ambiguity checks. Matching does not
perform translation or visual recognition. Human review remains necessary.

### Reprocess existing evidence and select a cover

From this directory:

```powershell
..\..\.venv\Scripts\python.exe prepare_images.py data/prepared/heritage-sites.json --site-id site-erbil-erbil-citadel
```

The command defaults to the selected site's `source_evidence`. Override with
repeatable `--evidence <saved-id>` arguments. `--output` selects a separate JSON
file; default output is `data/image_reviews/<siteId>.json` (ignored by Git).
Inputs may be one site, an array, or `{ "sites": [...] }`; IDs must be unique.
Snapshots are checked against their hash, registered domain, retrieval metadata
and robots decision. Missing, ambiguous or damaged evidence becomes a review
error. Raw snapshots and old extraction JSON are never rewritten, so existing
field-evidence locators remain stable. The command uses local HTML only.

Output contains the review copy, new image_candidates, image_extractions,
cover_selection and image_review. Every observation retains evidenceId and
accessedAt from the actual capture. Earlier candidate metadata is retained in
image_review.original_image_candidates. Existing source/evidence/provenance
references are preserved and new references are added.

Cover ranking accepts only unambiguous site-specific matches on registered
trusted source pages. Lower current registry trust_tier ranks first, then the
strength of explicit name evidence and declared image area. Caller-supplied
tiers do not change ranking. Small images and wrong/unassigned sites are
excluded. Equal best ranks require manual selection. Repeated observations of
the same URL are retained but the URL ranks only once.

If there is one best proposal and the review copy has no existing cover, its
coverImage is populated with that unverified proposal. An existing cover stays
unchanged and the new proposal remains under cover_selection.proposed_coverImage.
No eligible candidate or a tied ranking leaves a missing cover unassigned.
All proposals include siteId, source, evidence, unverified license/identity
status and review_required=true. All records stay needs-review/unverified;
no frontend dataset is updated and no image is approved or published.

Exit codes: 0 = a proposal was prepared without automated findings (still needs
manual review); 2 = uncertainties, missing cover, tie or evidence errors were
saved; 1 = input/output failure. Input files, raw artifacts and src/ cannot be
output targets.

Validation: 129 Python tests pass, including content cleanup, language/canonical
fallbacks, lazy/responsive images, explicit site identity, aliases, ambiguities,
cross-source identity conflicts, license review, cover ranking and ingestion.
All 20 locally prepared sites were reprocessed into separate review files:
43 image observations, 2 explicit unverified matches/cover proposals (Erbil
Citadel and Hatra), no evidence errors. Other images remain unassigned. A
checksum check confirmed that 188 source/draft/catalog/frontend files stayed
unchanged. These counts describe the saved local sources, not visual approval.

## P5-15 / P5-16 — gallery preparation and image URL checks

Install the pipeline dependencies (including Pillow for actual image decoding):

```powershell
..\..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Prepare all local image-review records into a separate gallery catalog:

```powershell
..\..\.venv\Scripts\python.exe prepare_galleries.py
```

Default inputs are `data/image_reviews/*.json` from `prepare_images.py`; output
is `data/gallery_reviews/heritage-sites.json` with `sites`, `summary` and
`url_checks`. This generated directory is ignored by Git. Specify individual
files, catalogs (arrays or `{sites:[...]}`), or a unique site selection:

```powershell
python prepare_galleries.py data/image_reviews/site-erbil-erbil-citadel.json --site-id site-erbil-erbil-citadel --output data/gallery_reviews/erbil.json
```

Each review copy gets `galleryImages` from eligible candidates. The command
rechecks explicit site-name/alias evidence, target siteId, trusted source page,
saved evidence reference and unverified review metadata. Unrelated, uncertain,
ambiguous and malformed candidates are retained in the audit but excluded from
the gallery; no image GET is performed for those candidates. Pass the complete
catalog for cross-site name checks. A governorate or page location never makes
an image eligible. Within a batch, a final image URL claimed by distinct site
IDs is removed from both galleries and flagged for identity review.

URLs are normalized for host/default-port/fragment differences. Equal requested
URLs are checked once per run. Different URLs that redirect to the same final
URL produce one gallery entry while preserving every source observation and
URL-check result. Meaningful query parameters are preserved. Different URLs
with identical bytes are not automatically merged. The cover may also appear
in the gallery; this command does not alter cover selection.

Every gallery entry preserves source/evidence/access-date references, alt,
caption, credit, reported license and license URL, plus original source
observations. Conflicting or incomplete attribution remains visible. Unknown
licenses are not invented or approved. The selected primary metadata comes
from the strongest current source trust tier; other observations remain
attached. Earlier `galleryImages` and their provenance are kept under
`gallery_review`, and original `image_candidates` remain intact. Inputs are
never rewritten. Only separate review copies receive the new galleries.

### Technical image validation

`hb_pipeline.image_validation.ImageURLValidator` performs a streamed GET,
rather than trusting the extension or a HEAD response. Each requested and
redirected host must be in the existing trusted source registry and its robots
policy must permit access. Missing/unverifiable policies are recorded as
policy-blocked, not as proof that the image is broken. Third-party CDNs outside
the registry are excluded for review, without automatically expanding trust.

A valid result requires HTTP 200, a supported image MIME type, agreement with
the decoded format, successful structure verification and full frame decoding.
Supported raster formats: JPEG, PNG, WebP, GIF and AVIF when supported by Pillow.
SVG and other formats are recorded as unsupported for review. Files are read
into bounded memory for validation and are not saved as image assets.

Defaults: 5-second connect/10-second read timeouts, at most five redirects,
1.5-second per-host spacing between image GETs, 8 MiB response limit,
40 million total decoded frame pixels, and at most 50 animation frames.
HTTP failures, timeouts, transport errors, oversized/corrupt/truncated images,
HTML masquerading as image content and MIME mismatches become structured
findings. A failure does not stop sibling images or other sites. Broken JSON
inputs and malformed site records also become batch report findings when
possible. Redirect destinations are checked before requesting them.

Each attempted image has requested/final URLs, checkedAt, HTTP/content type,
redirect/robots history, status and reason. Passing checks additionally record
decoded dimensions, format, frames and a SHA-256 digest. Checks are cached only
within a run; rerunning makes fresh requests. Validity is a point-in-time
technical result, not visual identification, reuse permission or approval.

All output stays needs-review/unverified; galleries and licenses require manual
review. The command never publishes to the frontend. Output cannot overwrite
an input file, raw artifact or file under src/. Exit codes: 0 = galleries were
prepared without automated findings; 2 = review findings or empty galleries
were saved; 1 = command/input-selection/output failure.

Validation: 155 Python tests pass (26 new tests), covering real raster fixtures,
redirect policy, corrupt/truncated bytes, non-image content, timeouts, HTTP
errors, limits, URL deduplication, source/license retention, identity conflicts,
malformed inputs and continuation after failures. Live validation of the two
eligible local candidates passed. Across 20 site records, two gallery entries
were prepared (Erbil Citadel and Hatra); 41 unrelated/uncertain image groups
were skipped without requesting their bytes. No input or record errors occurred.
Checksums confirmed 211 existing raw/draft/catalog/image-review/evidence-view/
frontend files were unchanged. The generated galleries remain unpublished.

## P5-17 / P5-18 — license states and approved card covers

Image licensing uses exactly four `license_status` values:

- `unknown`: no recorded licensing information/state.
- `unverified`: reported terms or an existing pending review, without verified evidence.
- `restricted`: an explicit restriction; excluded from automatic cover/gallery preparation.
- `verified`: a named, dated human licensing review supported by saved, image-specific evidence.

New extraction without license hints starts unknown; reported license hints
start unverified. Existing explicit pending-review states remain unverified.
Source trust, Commons hosting, an HTTP success, a decoded image, a license-looking
label or a bare `verified` string cannot establish publication permission.
A restricted observation blocks that image URL even when another observation
has no restriction. Licensing remains separate from site identity verification.

Audit the locally prepared gallery catalog without rewriting it:

```powershell
..\..\.venv\Scripts\python.exe track_image_licenses.py
```

Default input is `data/gallery_reviews/heritage-sites.json`; default output is
`data/license_reviews/heritage-sites.json` (ignored by Git). Use an explicit input
and `--output` for another separate audit. The wrapper contains `records` (the
input shape with image metadata audited), `license_summary`, repository issues,
and manual-review flags. With the default input, sites are under `records.sites`.
Counts describe image occurrences, including repeated observations and audit
copies, not unique photographs. Source citations are not treated as images.
Image byte assets are not downloaded or altered by this command.

Every cover, gallery image, candidate and nested source image observation gets
a state. Original license/credit/source/evidence information is preserved.
`license_tracking` records the claimed state, evidence checks and issues. Invalid
states and unsupported verification claims stay review findings. Stale generic
safe-for-publication flags are retained only as audit claims and are removed
from the image; this process never synthesizes publication approval.

A reviewer claiming verified licensing must provide this image-specific shape:

```json
{
  "license_status": "verified",
  "license_review": {
    "permission": "publication-permitted",
    "reviewedBy": "Named human reviewer",
    "reviewedAt": "2026-11-01",
    "license": "Exact license or documented permission and applicable conditions",
    "image_url": "https://trusted.example/exact-image.jpg",
    "evidence": [{
      "evidenceId": "actual-saved-evidence-id",
      "source_url": "https://trusted.example/image-permission-page",
      "image_url": "https://trusted.example/exact-image.jpg",
      "locator": {
        "artifact": "data/raw/.../actual-saved-evidence-id.html",
        "selector": "figcaption",
        "text_match": "Exact captured licensing or permission text"
      },
      "image_locator": {
        "artifact": "data/raw/.../actual-saved-evidence-id.html",
        "selector": "img",
        "text_match": "https://trusted.example/exact-image.jpg"
      }
    }]
  }
}
```

These example domains/IDs are placeholders, not approved sources or collected
permissions. Use actual registry-approved saved captures. The audit checks the
snapshot hash, registered source, captured license passage, exact image reference,
reviewer/date and URL bindings. Missing/damaged/ambiguous evidence or an altered
image URL leaves the claim unverified. Human interpretation of rights and
conditions is required; text matching checks provenance, not legal meaning.
Changing permission to `restricted` always preserves the restriction.

### Card publication approval

HeritageCard now reads only the normalized canonical coverImage. The adapter
preserves optional licensing/approval metadata; the shared image schema permits
the four license states. Legacy image aliases or gallery-only images do not
bypass approval. Existing pages and source datasets are not rewritten.

A card image requires all of the following: license_status=verified; a complete
image-bound licensing review; successful saved-evidence checks from the audit;
and a separate named/dated `publication_approval` with:

```json
{
  "status": "approved",
  "siteId": "the-actual-site-id",
  "site_verified": true,
  "image_url": "https://trusted.example/exact-image.jpg",
  "reviewedBy": "Named publishing editor",
  "reviewedAt": "2026-11-01"
}
```

Store that object on the image, alongside its matching siteId. No current command
creates it. License evidence and publication approval must refer to the exact
cover URL, and the approval must refer to this site. Replacing the image or
site invalidates a stale approval. Only authored trusted dataset metadata is
read by the card; it does not fetch or verify source evidence in the browser.

Missing/unapproved/restricted covers show the existing styled Image pending
fallback with a site-specific accessible label. A failed approved image shows
Image unavailable. A changed cover or site gets a fresh load attempt. Loading
priority, alt text, card links, badges and existing responsive styling remain.
There are no image searches, fallback image services or React search requests.

Validation: 169 Python tests, 29 JavaScript tests, lint and production build pass.
The current local audit has no verified licensing or newly approved images;
production cards therefore retain their fallback until explicit reviewed cover
metadata is integrated. Existing data, raw snapshots and other UI pages remain
unchanged. The audit returns 2 for pending/restricted/unknown states or repository
issues (review output saved), 0 when there are no such findings (not approval),
and 1 for input/output failure. Inputs, raw snapshots and src/ are protected
against audit output overwrites.

## P5-19 through P5-22 — Site Details media and resilient collection

Site Details now uses the canonical coverImage plus galleryImages, deduplicated
by src. It supports cover-only records, explicit empty galleries, descriptive
alt text, per-image source/credit information, and unavailable states in both
the grid and native-dialog viewer. Failed thumbnails cannot be reopened; viewer
navigation skips failed items and still permits closing the dialog. Site changes
reset gallery state. Only authored image URLs are rendered: the page does not
search for images, discover new media or call an image-fetch API.

Per-image attribution includes safe source links and any available credits,
including additional source observations. The adapter retains source metadata
and both license_status and legacy licenseStatus. Unverified or unknown terms
are never rendered as a license grant; the page explicitly says reuse permission
has not been confirmed. A verified license label/link requires matching audited
licensing review metadata. Contradictory unknown/unverified aliases cannot be
used to upgrade it, and restrictions take precedence. Restricted and explicitly
wrong-site images are excluded. Existing card publication approval remains
required for HeritageCard; no pipeline record is automatically imported or
approved by this page integration.

### Shared request policy

HTML fetches, robots requests and image validation now share the same retry
implementation. Default: at most three total attempts per requested URL/hop,
with exponential delays of 1 then 2 seconds (configurable cap: 8 seconds).
HTML/image redirects remain limited to five, and domain/robots checks occur
before destination requests. HTML and image GETs retain per-host spacing.

Temporary timeouts, connection interruptions and incomplete response streams
can retry. HTTP 408/425/429 and 5xx responses retry, except permanent 501/505.
HTTP 400/401/403/404/410 and other permanent statuses do not retry. Certificate
failures, denied robots policies, invalid content, bad data and image decoding
failures do not enter retry loops. A missing robots file still follows the
existing conservative stop policy. These are per-request rules; explicitly
listing the same URL in several independent jobs is not automatic retry work.

Retry-After seconds and HTTP dates are respected. A server-requested wait above
30 seconds is deferred for manual/later retry rather than capped to an earlier
request. All automatic sleeps are bounded to 30 seconds or less. Request
attempts and delays are retained in reports and robots decisions. Passing a
retry budget does not bypass domain, robots, source trust or image licensing.

Default connect timeout is at most 5 seconds. HTML read timeout is 25 seconds,
robots at most 15 seconds (10 for image validation), and images 10 seconds.
These are connect/read timeouts, not a whole-batch deadline. Stream limits are
5 MiB for HTML, 256 KiB for robots and the existing 8 MiB for images. Failed or
rejected responses are closed. The image stream is read within the retry unit,
so a transport failure can retry the full GET without approving partial bytes.

For single-page collection, tune the bounded policy as needed:

```powershell
python main.py fetch --source unesco --governorate erbil --url https://whc.unesco.org/en/list/1437/ --max-attempts 3 --timeout 20 --retry-delay 1 --max-retry-delay 8
```

`--max-attempts` accepts 1 through 5. Read timeout must be positive and at most
30 seconds; delay caps are at most 30 seconds. Python callers can supply a
RequestPolicy to TrustedFetcher, RobotsChecker or ImageURLValidator. Their
existing default usage also receives bounded retries.

### Site-isolated batch collection

Create a jobs JSON file (an array or `{jobs:[...]}`), for example:

```json
{
  "jobs": [
    {"source": "unesco", "governorate": "erbil", "url": "https://whc.unesco.org/en/list/1437/", "siteId": "site-erbil-erbil-citadel", "name": "Erbil Citadel"},
    {"source": "unesco", "governorate": "nineveh", "url": "https://whc.unesco.org/en/list/277/", "siteId": "site-001", "name": "Hatra"}
  ]
}
```

Source, governorate and URL are required. Optional siteId/name must be supplied
together; alternativeNames is an optional string array for image matching.
Collection still honors robots and content deduplication; repeating an existing
unchanged page does not regenerate old image/extraction artifacts. Use the
separate preparation commands for those artifacts.

```powershell
python main.py batch jobs.json --report data/logs/my-batch.json --max-attempts 3 --timeout 20
```

Reports default to a separate timestamped file in ignored data/logs/. Each item
retains its job, outcome, needs-review status and approval=false. Expected
failures include a machine-readable code, exception type, message, HTTP status,
retryable flag and attempt history. Invalid records/HTML and even unexpected
individual-site errors are recorded while the next job proceeds. Successful
records remain unpublished review drafts; partial file-system writes are not
approval. Global invalid manifests/configuration or an unwritable report remain
command-level failures. The report cannot overwrite its input, raw evidence or
frontend files.

Batch exit codes: 0 means every job processed (including content duplicates),
2 means per-job failures were saved and the batch continued. Command-level
failures print their error and return the existing main.py error code 2.
The summary distinguishes failed jobs from processed jobs; none is approved.

Validation: 192 Python tests, 33 JavaScript tests, lint and production build pass.
New tests cover status-specific retries, backoff/Retry-After, transport/stream
failures, robots decisions, image retry behavior, invalid HTML/data, per-site
isolation, cover/gallery merging, attribution, license claim suppression and
thumbnail/viewer failures. A temporary mocked four-job batch recorded three
failures (404, invalid data, invalid HTML) and still created the later valid
fixture draft. This did not collect new real site data. Checksums confirmed 115
existing data/evidence/config files stayed unchanged during that verification.

## P5-23 through P5-26 — logging, source revisions, review and approved exports

### Structured operation logs

Core fetch/batch, source checks, image URL validation/preparation, gallery
preparation, license audits, evidence attachment, review decisions/listing and
export commands emit atomic JSON events under:

`data/logs/pipeline/<UTC date>/<time>-<unique event id>.json`

Every event contains timestamp (timezone-qualified UTC), event/run IDs,
operation, result, source, URL, governorate, errors and evidence_id, plus
operation-specific details. Aggregate or pre-evidence events use null where
context is not available. Each complete event is saved atomically in its own
file, avoiding interleaved JSON lines. Existing batch reports and research
manifests remain separate. data/logs/ is ignored by Git.

Fetch logs distinguish started, failed, saved, unchanged and duplicate-content
outcomes. Comparisons include old/new SHA-256 values, previous evidence IDs,
final URLs and change type. Saved events identify the new draft/evidence and
request-attempt history. Image URL logs retain source/evidence/site context when
called by gallery preparation. Failed operations include structured exception,
HTTP and retry details. Missing log storage is an error, not silent auditing.

### Latest-source hash comparison

Within the existing governorate/source collection scope, compare the latest
capture of the same normalized requested/final URL before considering content
duplicates at other URLs. Host/default-port/fragment differences normalize;
meaningful query parameters remain. An unchanged hash logs the existing evidence
ID and creates no extra HTML/extraction/evidence/draft files. Same content at a
new URL can reuse existing evidence without another draft, with its comparison
recorded in the logs.

Changed valid content creates an unpublished review draft and a linked new
snapshot (`change_type`, `previous_evidence_id`, `previous_sha256`). Previous
captures are preserved. A return to older content (A -> B -> A) is still a change
against the latest B capture and gets a new review revision. New capture times
have microsecond precision and IDs include a unique suffix. Conflicting legacy
captures tied at the latest timestamp are flagged for evidence review rather
than resolved by filename order. Bad/invalid changed content is logged but
cannot become a new valid draft or an unchanged successful capture.

### Explicit review decisions

From this directory, list the default standardized catalog requiring review:

```powershell
python review_drafts.py list
python review_drafts.py list --status all
```

Default input: `data/prepared/heritage-sites.json`. Use `--input` for a single
record, array, `{sites:[...]}` catalog, or license-audit `{records: ...}` wrapper.
Listings include validation and available source-conflict/duplicate flags.
Missing or stale decisions always require review; a raw `status: approved`
property is not an approval. Duplicate IDs cannot be approved ambiguously.
Automatic page drafts must first be standardized into actual heritage records
before approval for export. They can still be listed/rejected by draft ID.

After human inspection, use one explicit record decision at a time:

```powershell
python review_drafts.py approve site-erbil-erbil-citadel --reviewer "MSR" --note "Reviewed canonical values, source evidence and remaining unknowns."
python review_drafts.py reject site-erbil-erbil-citadel --reviewer "MSR" --note "Explain why this revision is rejected."
```

These are command examples; they are not run automatically. A named reviewer
and a non-empty rationale are required. Approval validates the canonical
required fields and real saved source references/hashes/URLs. Incomplete but
valid unknown values remain unknown, with warnings retained in the decision.
The reviewer must consider the recorded source/duplicate findings; approval
signs off the canonical values already present. It does not choose competing
claims, invent facts, verify image rights or publish anything.

Effective status and full decision history are stored separately in
`data/review/decisions.json`. Original prepared records/drafts are preserved,
including their original needs-review fields. The decision ledger is the
status authority for these commands and the exporter. Approval/rejection binds
the exact record hash; approval also binds referenced source hashes, latest
captured versions and current source trust tiers. Changed data, newer captures,
tampered evidence or changed trust policy make approval stale and return the
record to effective needs-review. A new explicit decision is then required.
Rejecting or reapproving retains earlier decisions and snapshots in history.

Decision writes are atomic and guarded by an exclusive .lock file to prevent
concurrent reviewers losing updates. A busy lock gives a clear error. After a
crashed/interrupted process, inspect a stale lock before manually removing it;
the command does not remove another process's lock automatically. --ledger can
select another separate decision store; it cannot overwrite inputs/raw/src/.
No existing real record was approved as part of implementing these tasks.

### Export only current approvals

```powershell
python export_approved.py
```

Default output: `data/exports/heritage-sites.approved.json`, a clean JSON array
matching the website's heritage schema. A companion
`heritage-sites.approved.report.json` records inclusion/exclusion reasons and
image omissions. --input, --ledger and --output select explicit separate paths.
Exports are point-in-time artifacts: rerun after review/data/source changes.
The exporter never replaces src/data/sites.json, writes to other frontend files,
or publishes the site.

Only records with current explicit ledger approval are included. Needs-review,
rejected, stale, invalid, duplicate-ID or ambiguous-route records are excluded.
Directly editing a record's status does not bypass review. Known optional route,
location, historical and model/video metadata is retained when valid. Internal
candidate text, evidence assertions, research reports and review snapshots are
removed; source citations are retained. Source evidence is checked again.

Record approval does not approve its media. Exported cover/gallery images need
current image-specific license evidence and a separate named/dated publication
approval bound to the exact image URL and siteId. Unverified/unknown/restricted,
unapproved or broken-evidence media is omitted with report findings; an approved
text record can still export with coverImage=null and galleryImages=[]. Repeated
gallery URLs deduplicate. Required attribution and compact review/approval
metadata remain so existing card/source display gates continue to work. Raw
artifact paths and internal image locators are not included in website JSON.
No new image network requests or image rights grants occur during export.

Use the original reviewed record as future workflow input; the compact export
is a website artifact, not a replacement for full source/license evidence.
The exporter protects inputs, the ledger, raw snapshots and src/ against output
overwrites. List/decision command success is exit 0; invalid review operations
are exit 1. Export exits 0 for ordinary inclusion/exclusion (including an empty
approved set), 2 for media omissions or stale/invalid approval findings, and 1
for input/output/ledger failure. Logs and the report explain the outcome.

Validation: 220 Python tests pass, including 28 new logging/revision/review/
export tests. Both the real empty export and a separate synthetic approved
record with image evidence passed the website JSON schema. The synthetic data
used temporary fixture storage, not real collection records. The local catalog
contains 20 needs-review sites, zero approved/rejected sites; its actual export
is therefore []. No real approval decision or frontend dataset was changed.
Checksums confirmed 214 source/draft/catalog/config/frontend files stayed
unchanged during read-only workflow/export verification.

## P5-27 / P5-28 — stress and end-to-end verification

These tasks add test runners and measured scalability fixes, not application
features. All synthetic data, test approvals and test exports use temporary or
explicit isolated storage. They do not change the real prepared catalog,
editorial decision ledger or frontend dataset. Generated `data/testing/` files
are ignored by Git. Production rendering, routing and source trust rules are
unchanged.

### Large synthetic batch

From this directory:

```powershell
..\..\.venv\Scripts\python.exe tests/stress_pipeline.py --records 1000 --approvals 100 --output data/testing/stress-1000.json
```

The runner uses synthetic heritage-shaped records and mocked network/image
responses, while running the real extraction, validation, duplicate detection,
evidence persistence, image decoding/association, logging, review and exporter.
It injects timeouts, invalid HTML and image failures. It also injects duplicate
names/near spellings and checks conservative image/route exclusions. This is
local processing/I/O stress, not a 1,000-request crawl of external sources.

Final observed Windows run:

- 1,000 jobs; 980 collected; exactly 20 injected collection failures handled.
- Zero unexpected failures; all 980 stored evidence SHA-256 checks passed.
- All 18 injected duplicate pairs found; no injected pairs missed.
- 962 image requests simulated; 20 injected image failures handled; 18 ambiguous
  image associations excluded; 942 gallery candidates prepared for review.
- 100 fixture approval decisions and 10 fixture rejections exercised. Only 98
  records exported: two approved records with colliding website routes were
  excluded. Pending/rejected records and unverified media did not export.
- All 5,174 structured log files parsed with required fields; zero invalid logs.
- 132.72 seconds total including fixture assembly, disk accounting and audits;
  peak process working set 92.62 MiB. Temporary artifacts totaled 14.20 MB.

Stage timings (seconds): fetch/extract/evidence/logging 50.36; validation 0.05;
duplicates 4.04; images 9.72; evidence indexing 0.47; complete raw-hash audit 5.07;
review listing 0.10; 110 review decisions 10.18; export 0.29; log audit 21.30.
These figures depend on local storage, OS caching and machine load.

Measured hot spots justified the following internal changes:

- Cache parsed evidence metadata across repeated collection lookups, checking
  file size/time signatures every time and invalidating replacements, edits,
  deletions and new manifests. Return copies so callers cannot mutate the cache.
- Encode JSON once per atomic write instead of issuing a write per JSON token.
  Atomic replacement, fsync and JSON/Unicode/NaN handling stay intact.
- Index source URL aliases once per evidence repository for review/export,
  while still reading and hashing the referenced raw snapshots.
- Prepare catalog name/alias indexes once for bulk image association; exact
  matching, governorate-only exclusions and ambiguity rules remain conservative.

Eight regression tests cover those invariants and test-output protection.
Duplicate matching criteria and approval/license gates were not relaxed.
The audit harness uses four bounded evidence readers and eight log readers.
An earlier complete 1,000-item run spent 141.20 seconds reading logs sequentially;
the bounded-reader audit took 21.30 seconds in the final run. Many small files
and review-ledger serialization remain the main I/O costs; no new production
log format or database was introduced.

### Selected real sites through the whole flow

```powershell
..\..\.venv\Scripts\python.exe tests/e2e_real_sites.py --mode live --output-dir data/testing/e2e
```

The live run fetched Erbil Citadel and Hatra from their configured UNESCO
property URLs with the existing robots/domain/retry policy. HTML was extracted
and saved with evidence hashes; image candidates were associated with site IDs,
actual selected image URLs were requested and decoded, test-only review states
were exercised, and the export was passed into the real App/Card/Site Details
integration test. Both sources extracted the correct title; each had two image
candidates and one technically valid associated gallery image. The Python
flow took 11.11 seconds; no live-flow failures occurred.

Real photo rights were not verified. The export correctly removed those photos,
and the real-site frontend checks verified fallbacks, descriptions, navigation
and source links. A separate fully synthetic permission fixture verified the
positive approved-cover/gallery/attribution/lightbox path. Test decisions are
not editorial approvals and never enter the real ledger. Nothing is published.

The runner writes a unique isolated subdirectory plus `result.json`. Enable the
extra frontend test using that result's export_path:

```powershell
$env:HB_PIPELINE_E2E_EXPORT = (Get-Content data/testing/e2e/result.json -Raw | ConvertFrom-Json).export_path
Set-Location ../..
npm test
```

Without that environment variable, the extra test is skipped; the regular tests
still run. With the generated export, 34 JavaScript tests passed with no skips.
The test replaces the site's service cache only in memory. It does not replace
src/data/sites.json. DOM integration uses real React/App/router components;
headed-browser/device visual QA is not claimed. HTTP/decode checks run in Python.

`--mode replay` reuses saved real HTML instead of fetching the pages again;
image URL checks still use HTTP. A fresh checkout needs saved collection data
for replay, or an explicit live run. Source restrictions are never bypassed.

Repeated real-HTML extraction can be reproduced after an E2E run:

```powershell
..\..\.venv\Scripts\python.exe tests/stress_real_html.py --run data/testing/e2e/result.json --iterations 250 --output data/testing/real-html-stress.json
```

The measured 250 extractions used the saved 153,793-byte and 170,108-byte real
UNESCO pages with no repeated HTTP requests. Zero failures; 14.90 seconds total,
54.06 ms median and 97.96 ms p95 per extraction.

### Existing data integrity finding

A separate read-only audit verified 15 saved project snapshots and found one
older, unused capture with a hash mismatch:
`unesco-20261026T172135Z-aac0020406`. Its raw file predates these tests and is not
referenced by the current prepared catalog. The existing integrity guard rejects
it. It was preserved and flagged in `data/review/p5-27-evidence-integrity.json`
and a structured needs-review event. Its recorded hash was not rewritten.
Current prepared references and the fresh E2E captures are unaffected. All 20
real records remain needs-review; zero real approvals or rejections were made.

Final checks: 228 Python tests, 34 JavaScript tests with E2E enabled, lint and
production build passed. Large-run figures measure synthetic local processing;
they do not establish live crawler throughput or capacity for arbitrary larger
pages/datasets. Full metrics and test-only traces are saved with the task report.

## Additional photographs for flagship records

Covers come from `apply_cover_review.py`; renditions from `optimize_images.py`. Flagship
records then receive additional reviewed photographs (`galleryImages`):

```bash
python3 gallery_candidates.py --date 2026-11-09 --sheets /path/to/contact-sheets   # add --only <ids> to resume
python3 apply_gallery_review.py data/images/gallery-review-2026-11-09.json
python3 optimize_images.py && python3 optimize_images.py --check
```

- `gallery_candidates.py` reads the Commons category of each flagship's own Wikidata item
  (P373, a Commons category sitelink, or the item's main category P910) and its direct
  sub-categories. It keeps free-license JPEGs of at least 1200 px, drops NC/ND, maps and
  drawings, objects now in museums (except on museum cards), the cover file and near-duplicates
  (difference hash), and writes `data/images/gallery-candidates-<date>.json` plus one contact
  sheet per site. It calls the APIs through `curl` with back-off for Wikimedia rate limits.
- The review file records a decision for every candidate: approved images name the viewpoint
  they add (it becomes the caption), rejected ones give the reason.
- `apply_gallery_review.py` writes each approved image with its own credit, license, license
  URL, Commons file page, identity, license review and publication approval bound to the site
  and the image, as covers have. It accepts free licenses only, skips the cover and files
  already present, and stops at six images per record.

## Site videos — verification

`verify_videos.py` checks `src/data/site-videos.json`: every video is still available on YouTube,
its title matches, its channel is its listed publisher's channel, and every linked card exists with a
known relation (`part` and `context` links need a note). `--stamp` records the check date when all
pass. Requests use curl with the `HistoryInCards-research/1.0` user agent; sites that refuse automated
requests (403/429) are not retried around. See `src/data/README.md` for the publisher rules.

    python3 verify_videos.py
    python3 verify_videos.py --stamp

## 3D documentation — verification

`verify_documentation.py` checks `src/data/digital-documentation.json` against the Sketchfab API: each
model is still public under the same title, creator account and license, every resource is classified
(measured or modeled, a known method, stated or inferred evidence with a note, and the state it shows),
manual modelling is never classed as measured, and every linked card exists. `--stamp` records the check
date when all pass.

    python3 verify_documentation.py
    python3 verify_documentation.py --stamp
