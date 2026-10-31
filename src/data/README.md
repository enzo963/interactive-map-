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
