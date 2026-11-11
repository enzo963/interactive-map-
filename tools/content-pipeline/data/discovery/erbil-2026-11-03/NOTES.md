# Erbil governorate discovery — 3 November 2026

65 new Erbil records were added to `src/data/sites.json`, bringing Erbil from 4 to 69. Every new record has `status: needs-review`, at least one source, and null UNESCO/3D flags. They appear on the map and in Explore with their review status shown. Collections that require approval, such as UNESCO and related cards, ignore them.

`build_erbil_records.py` is the single place that defines the batch. It writes `erbil-records.json` and adds only IDs and slugs that are not already in the dataset, so it can be re-run safely.

## Coverage

| Area | Records |
|---|---|
| Erbil city: citadel components, Khanqah, tombs, historic houses, museums | 12 |
| Ankawa churches and the Melqi/Mar Qardagh tradition | 3 |
| Erbil plain tells and ancient cities (EPAS, French, UCF, Bryn Mawr and UAB projects) | 24 |
| Shaqlawa, Harir and the Erbil–Rawanduz road: castles, shrine, rock relief | 5 |
| Soran, Rawanduz, Sidakan/Bradost and Barzan: caves, stelae, Iron Age sites, old town, church | 13 |
| Koya: old town, mosque, bazaar, khan, houses, and Armota churches | 8 |

## Method

The search covered districts (Erbil, Makhmur/Shamamok, Khabat, Shaqlawa/Harir, Soran/Rawanduz, Sidakan, Mergasor/Barzan, Choman, Koya, Taqtaq) and site types (tells, caves, castles, churches, mosques, shrines, steles, reliefs, bazaars, khans, houses). It used English and Arabic web searches, the Wikidata items located in Erbil Governorate, the Wikipedia list of Erbil archaeological sites, and the earlier C1-01 candidate file. Discovery stopped once new searches mostly returned sites already in the list.

## Review flags

- **Coordinates:** they are copied only from the cited Wikidata item (`coordinates_source`). When `coordinates_precision` is `settlement`, the pin marks the town, not the monument: Harir relief, Rawanduz, Koya and Armota. 42 records have no coordinates and need a field or published position.
- **Source strength:** `accessLevel: search-snippet` means the claim was seen in a search result, not read on the full page. Weak, single-source records (tombs near the bazaar, Diyan Cave, Mulla Kura House, Sheikh Ahmad site) carry `review_notes`.
- **Same site, two names:** Yadi Qzlar, the excavation name used by Kurdistan24, is the village on Kurd Qaburstan's lower town, so it is recorded as an alias, not as a second site.
- **Disputed claims, kept as disputed:** Musasir at Mudjesir; Saladin's birthplace at Dwin; the date of the Batas-Harir relief; custody of the Topzawa and Kelashin stelae; the founding date of the citadel Great Mosque.

## Leads not entered

These need more evidence first:

- About 100 further tells named only in the Wikipedia list, which gives no description or position.
- Sennacherib's canal to Arbela (Bastora).
- Aquian and Rost castles.
- The Koya Qishla.
- The Saruchawa Mosque.
- The Said Salim tea house.
- The Ankawa canal.
- The Iron Age grave at Khalifan, which is a find, not a site.
- The Baghlumnara mass grave.

Sherwana Castle was excluded because it is in Kalar (Sulaymaniyah). Bash Tapia Castle was excluded because it is in Mosul.
