# Heritage Bridge Content Pipeline — Phase 1.1

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
