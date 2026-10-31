# Heritage record contract

`sites.json` is an array of records governed by `sites.schema.json` (JSON Schema draft 7).
Every record must include `id`, `name`, `governorate`, `category`, `period`,
`description`, `images`, `unesco`, `has3D`, and `sources`.

- IDs and names are non-empty strings. IDs and slugs must remain unique and stable.
- Governorate, category, period, and description are strings. Unknown text stays empty.
- `category` describes the site (for example, Archaeological Site), not its age-based card type.
- `unesco` and `has3D` are booleans. Existing detailed `unesco_status` and model URL
  metadata remain available; no classifications or model availability are invented.
- `description` carries existing descriptive text. Hatra's existing short description
  supplies this field because its previous full description was empty.
- `images` is an array of `{ src, alt, caption, credit, license }` objects. The first
  image is the cover. Unknown image text stays empty; no images means `[]`.
- Optional existing fields, including coordinates, dates, decks, documentation and
  verification status, remain supported. This cleanup does not discard them.

Each `sources` entry has this shape:

```json
{
  "sourceName": "Authored source or citation name",
  "url": "",
  "evidenceId": null,
  "accessedAt": null
}
```

Use an absolute HTTP(S) URL when known, or an empty string for a citation without
an online link. `evidenceId` must reference a real saved evidence record; leave it
`null` when unavailable. `accessedAt` is the recorded ISO date or timestamp (with
a timezone), or `null` when unknown. Never substitute today's date. Existing
citation metadata such as title, author, publisher, and year can be retained.
Hatra currently has no recorded source references, so its `sources` stays `[]`.

`siteAdapter.js` reads this contract and keeps the existing component API:
`category` → `siteType`, `images` → `gallery`/cover image, `unesco` → `isUnesco`,
and `has3D` → `hasModel`. It also exposes the canonical fields. Source records
retain `sourceName`, `url`, `evidenceId`, and `accessedAt`, alongside the existing
`title` and `detail` presentation fields. Source display components are unchanged.
Legacy imports using `site_type`, `historical_period`, `full_description`,
`main_image`, `gallery`, `unesco_status`, or `has_3d` remain readable by the adapter.
