# Duhok governorate discovery — 3 November 2026

This batch adds 60 Duhok records to `src/data/sites.json`, which brings Duhok from 3 records to 63.

- Every new record has `status: needs-review` and at least one source.
- Every new record has `alternativeNames` in Kurdish, Arabic, Syriac, historical or English spellings where sources give them. Search uses these names.
- 31 records have map pins.
- The batch is defined in `build_duhok_records.py`. Like the Erbil batch, it is safe to re-run.

## Coverage

| Area | Records |
|---|---|
| Duhok city and Mount Zawa: Maltai reliefs, Charsteen cave, church, mosque, bazaar | 5 |
| Simele, Sharya, Khanke and the Mosul Dam shore: Yazidi shrines, Mardaman, Kemune palace, Nemrik 9, tombs, churches | 11 |
| Navkur plain near Rovia: Neolithic sites | 2 |
| Zakho district: castles, bazaar, Jewish quarter, cathedral, border-village churches and monasteries | 8 |
| Amedi: Great Mosque, Tomb of Hazkiel, gates, staircase, Parthian reliefs, Qubahan, archdiocese, Issa bridge, Bamerne | 10 |
| Sapna valley and Barwari: Araden, Dere, Komane, Dehi, Bebadi, Dawodiya, Dooreh, Betanure, Mangesh, Deraluk | 10 |
| Akre district: Great Mosque, Qishla, castle, old quarters, Gunduk reliefs, Kondak church, Kalati mosque, Gali Zardak | 8 |
| Shekhan and Bardarash: Lalish, Khinnis, Jerwan, Baadre, Ain Sifni, Gir-e Gomel, Mohamed Rashan shrine | 7 |

## Decision for a reviewer

**Akre, Shekhan and Bardarash districts.** These districts are run by the Kurdistan Region from Duhok, but Nineveh Governorate claims them de jure.

- The KRG, the Duhok antiquities directorate, Wikidata and the 2025–26 news sources place their sites in Duhok, so they are recorded under Duhok.
- Each of these records carries an `administrative_note`.
- The earlier C1-01 pass left Lalish, Khinnis and Jerwan out of Duhok for this reason. If the project prefers the de jure boundary, change `governorate` on the 15 records that have an `administrative_note`.

## Review flags

**Coordinates**

- Coordinates are copied from the cited Wikidata item. One exception is Dawodiya, whose position comes from the Mesopotamia Heritage record.
- `coordinates_precision: settlement` means the pin marks the village or town, not the monument.
- Two Wikidata points were clearly wrong, so they were left out:
  - Great Mosque of Akre: the point falls about 130 km west of the town.
  - Tomb of Hazkiel: the point falls about 9 km west of Amedi.

**Existing records not changed.** Amedy city, Delal Bridge and the Faida canal and reliefs were already approved and were not touched. Their aliases (Zakho Bridge, Pira Delal and others) could be added during review.

**Weak sources.** Records whose only evidence is a search snippet or a single news report carry `review_notes`:

- Tell Gombass
- Old Bazaar of Duhok
- Gali Zardak
- Gir-e Gomel
- Qubad Pasha Castle

**Disputed or traditional claims, kept as such:**

- The Zoroastrian identity and age of Charsteen Cave
- Zakhiku at Kemune
- Who is buried in the Tomb of Hazkiel
- Akre Castle's "Prince Zand" date
- Founding traditions of the village monasteries

**Lost heritage.** Several church and monastery records describe buildings destroyed in 1975 or 1988, or lost earlier. Examples are Mar Atqen, Dayrabun and the old church of Dawodiya. They are kept because the record itself is heritage.

## Leads not entered

These leads need a source with more substance before they become records:

- The Bir Jab shrine (no location given)
- Kani Balavi, Hezany and Badarash churches (20th-century or undated buildings)
- Inishke cave (Arabic Wikipedia only)
- The Akre Virgin Mary cathedral (Wikidata only)
- The Khinis wine press (part of the Khinnis complex)
- The Surya 1969 massacre site
- Mount Zawa survey points
- The roughly 2,000 sites registered by the Duhok directorate, and the more than 1,150 recorded by the Land of Nineveh Archaeological Project, which are not published as a named list
