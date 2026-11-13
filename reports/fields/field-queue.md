# Field-completeness queue

Generated 2026-11-13 by `npm run report:fields`. Rules: `src/utils/fieldQueue.js`. Full list: `field-queue.json`.

683 records · **682 published cards** (34 approved, 648 shown as awaiting review) · **1 blocked**.

## 1. Blocking — fix these first

A record here is hidden from the site (it fails the card contract), or it shows an image without full attribution.
These are the only gaps that keep a card from being published. Each must be fixed, not settled.

| Record | Status | What blocks it |
|---|---|---|
| `site-nineveh-ahmadeya-synagogue` Ahmadeya Synagogue | needs-review | Source (at least one credible tier 1–3 source with a link) |

## 2. Enrichment — optional, worked in passes

None of these hides a card. Work **one pass at a time across all cards** (highest-value cards first:
approved, UNESCO, sites with component cards, strongest sources), within the time box. If the field
cannot be filled from a credible source in that time, record it in
`tools/content-pipeline/data/fields/field-decisions.json` as `not-found` and move to the next card.
Do not start a second field on the same card until the pass is finished.

| Pass | Field | Missing | Settled | Open | Share of cards complete | Time box | Why |
|---|---|---|---|---|---|---|---|
| 1 | Place description (`location`) | 26 | 0 | 26 | 96% | 5 min | Neither coordinates nor a place description: a reader cannot tell where in the governorate the site is. |
| 2 | Verified position (`coordinates`) | 459 | 0 | 459 | 33% | 10 min | Without a verified position of the site itself the card has no pin; town- or area-level points count as missing. |
| 3 | Historical period (`period`) | 298 | 0 | 298 | 56% | 10 min | The period was not established when the card was reviewed; a dated card can be found by era. |
| 4 | Second credible source (`corroboration`) | 220 | 0 | 220 | 68% | 15 min | Best evidence is an encyclopaedia or news report, or a complex site cites fewer than two credible publishers. |
| 5 | Alternative names (`alternativeNames`) | 209 | 0 | 209 | 69% | 5 min | Other spellings and Arabic or Kurdish names make the card findable in search. |
| 6 | Primary image (`primaryImage`) | 0 | 0 | 0 | 100% | own queue | Worked in the primary-image queue (reports/images/image-queue.md); cards it flagged have no usable image and are settled. |
| 7 | Estimated year (`date`) | 511 | 0 | 511 | 25% | 5 min | Places the card on the timeline. |
| 8 | Preservation or heritage status (`preservation`) | 535 | 0 | 535 | 22% | 5 min | Says whether the site survives, was damaged or rebuilt. |
| 9 | UNESCO status (`unesco`) | 672 | 0 | 672 | 1% | 1 min | Yes or no against the World Heritage and Tentative lists. |

Open enrichment gaps per card: 0 gaps: 1 cards · 1 gap: 20 cards · 2 gaps: 69 cards · 3 gaps: 114 cards · 4 gaps: 138 cards · 5 gaps: 177 cards · 6 gaps: 149 cards · 7 gaps: 13 cards · 8 gaps: 1 cards.

## 3. Next batch (25 tasks, one per card)

| # | Kind | Record | Field | Time box |
|---|---|---|---|---|
| 1 | blocking | `site-nineveh-ahmadeya-synagogue` Ahmadeya Synagogue | sources | fix |
| 2 | enrichment | `site-salah-al-din-samarra` Samarra Archaeological City | location | 5 min |
| 3 | enrichment | `site-kirkuk-kirkuk-citadel` Kirkuk Citadel | location | 5 min |
| 4 | enrichment | `site-nineveh-old-mosul` Old City of Mosul | location | 5 min |
| 5 | enrichment | `site-duhok-amedy-city` Amedy city | location | 5 min |
| 6 | enrichment | `site-nineveh-nimrud` Nimrud | location | 5 min |
| 7 | enrichment | `site-duhok-delal-bridge` Delal Bridge | location | 5 min |
| 8 | enrichment | `site-duhok-faida-canal-reliefs` Faida Archaeological Canal and Reliefs | location | 5 min |
| 9 | enrichment | `site-erbil-choli-minaret` Choli Minaret | location | 5 min |
| 10 | enrichment | `site-erbil-qaysari-bazaar` Qaysari Bazaar, Erbil | location | 5 min |
| 11 | enrichment | `site-erbil-shanidar-cave` Shanidar Cave | location | 5 min |
| 12 | enrichment | `site-kirkuk-green-dome` The Green Dome, Kirkuk Citadel | location | 5 min |
| 13 | enrichment | `site-kirkuk-mother-of-sorrows-church` Mother of Sorrows Church, Kirkuk Citadel | location | 5 min |
| 14 | enrichment | `site-kirkuk-prophet-daniel-mosque` Prophet Daniel Mosque, Kirkuk Citadel | location | 5 min |
| 15 | enrichment | `site-kirkuk-qaysariyah-market` Al-Qaysariyah Market, Kirkuk | location | 5 min |
| 16 | enrichment | `site-nineveh-dominican-church` Dominican Church and Clock Tower, Mosul | location | 5 min |
| 17 | enrichment | `site-nineveh-lalish` Lalish Temple | location | 5 min |
| 18 | enrichment | `site-salah-al-din-abu-dulaf` Abu Dulaf Mosque | location | 5 min |
| 19 | enrichment | `site-salah-al-din-caliphal-palace` Caliphal Palace (Qasr al-Khalifa) | location | 5 min |
| 20 | enrichment | `site-salah-al-din-great-mosque` Great Mosque of Samarra and Malwiya Minaret | location | 5 min |
| 21 | enrichment | `site-sulaymaniyah-bestansur` Bestansur Neolithic settlement | location | 5 min |
| 22 | enrichment | `site-sulaymaniyah-qalatga-darband` Qalatga Darband | location | 5 min |
| 23 | enrichment | `site-sulaymaniyah-red-terror-museum` Red Terror Museum, Slemani | location | 5 min |
| 24 | enrichment | `site-sulaymaniyah-tell-shemshara` Tell Shemshara | location | 5 min |
| 25 | enrichment | `site-diyala-prophet-daniel-shrine-diyala` Shrine of the Prophet Daniel (Diyala) | location | 5 min |
