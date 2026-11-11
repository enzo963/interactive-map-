# Nineveh (Ninewa) governorate discovery — 3 November 2026

This batch adds 154 Nineveh records and 1 Duhok record. Nineveh also gains 6 Shekhan-district records that were moved over from the Duhok batch (see below). Nineveh now has 167 records, up from 7; 89 of them have map pins.

- Every new record has `status: needs-review`, at least one source, and `alternativeNames` (Arabic, Syriac, Kurdish, historical and English spellings) where the sources give them.
- `build_nineveh_records.py` defines the batch. It stops if a slug would collide with an existing record.

## Coverage

| Area | Records |
|---|---|
| Mosul Islamic monuments: mosques, shrines, mausoleums, takiyas, plus a hammam and the Saray police station | 48 |
| Mosul fortifications, markets, houses and civic buildings: Bash Tapia, gates, Qara Saray, Bab al-Saray souq, Khan al-Gumruk, Beit al-Tutunji, synagogue, Barood Khana, museum, war cemetery | 11 |
| Mosul churches and monasteries | 13 |
| Nineveh Plain monasteries, plus Nahum's tomb | 8 |
| Nineveh Plain churches: Qaraqosh, Karamles, Bartella, Bashiqa, Alqosh, Baqofa, Tell Esqof, Batnaya | 16 |
| Yazidi temples, shrines and mausoleums: Bozan, Hatara, Bahzani, Bashiqa, Beban, Shexka, Baadre, Mahad, Sinjar | 13 |
| Sinjar and Tal Afar: Singara, Qutb al-Din minaret, Sitt Zaynab, Tal Afar citadel, Saad ibn Aqil shrine, Sharif Khan | 6 |
| Components of ancient Nineveh: mounds, palaces, Ishtar temple, six gates | 11 |
| Components of Nimrud: palaces, Ninurta temple, ziggurat | 7 |
| Assyrian towns: Khorsabad, Balawat, Tell Billa, Kar-Mullissi | 4 |
| Prehistoric and Bronze Age tells | 17 |

## Data corrections made with this batch

- **Duplicate Lalish removed.** The Duhok batch had added `site-duhok-lalish`, which repeated the approved `site-nineveh-lalish`. It has been removed.
- **Shekhan and Bardarash sites moved to Nineveh.** The approved Lalish record places the Shekhan district in Nineveh, so the following records now carry `governorate: Nineveh` and `site-nineveh-*` IDs. Their slugs did not change, so links still work.
  - Khinnis reliefs
  - Jerwan aqueduct
  - Baadre castle
  - Ain Sifni shrines
  - Gir-e Gomel
  - Mohamed Rashan shrine
- **Akre district stays under Duhok.** It keeps its `administrative_note`.
- **Mam Chevan filed under Duhok.** The Mesopotamia Heritage list groups its mausoleums with the Nineveh Plain, but its coordinates place it beside Khanke in Duhok.

## Sources and how they were used

- **Mesopotamia Heritage** monument pages give exact positions, dates and condition for 44 churches, monasteries and Yazidi shrines. Their coordinates are recorded as `mesopotamiaheritage:*`.
- **Czech Academy of Sciences catalogue of deliberate Islamic State destruction in Mosul.** The web page's layout scrambles part of its text. For each entry, only the name, quarter, catalogue period and destruction state were used. Descriptions were added only where the text names the monument explicitly. `destruction_status` repeats the catalogue. It does not describe present condition; Nabi Jirjis, Imam al-Bahir, Hamu al-Qadu, Shaykh Fathi and others have since been rebuilt.
- **UNESCO Tentative List dossier for the Old City of Mosul.** It names the gates, Qara Saray and seven mosques. Those mosque records are minimal and need their own sources.
- **University of Tokyo database, Heidelberg Nineveh project, ORACC and the French Ministry of Culture** cover the prehistoric tells and the Nineveh and Nimrud components.
- **Wikipedia and Wikidata** supply descriptions, coordinates and Arabic names.

## Review flags

- **Coordinates left out.** Three Wikidata points were clearly wrong, so those records have no pins:
  - Tell Arpachiyah: the point falls west of the Tigris.
  - Qermez Dere: the point falls by the Mosul Dam.
  - Tell Taya: its pin was kept, but it disagrees with the "20 km from Mosul" in the text.
- **Hamu al-Qadu destruction date.** The catalogue gives March 2015; Wikipedia gives March 2014.
- **Boundary to confirm.** M'lefaat and El Khan are near the Khazir boundary.
- **Approved records not changed.** Nineveh, Nimrud, Hatra, Old Mosul, al-Nouri, the Dominican church and Lalish have no aliases yet, so searching "Kalhu", "Ninawa" or "al-Hadr" does not find them. Adding aliases is a reviewer's decision.

## Not entered

- **Later 20th- and 21st-century churches** (Resurrection Church 2007, Mar Behnam and Sarah Qaraqosh 2008, al-Bichara 1970). These are in the Mesopotamia Heritage list but are not historic buildings.
- **Modern mosques** (Mosul Grand Mosque) and Rawdat al-Wadi Husayniya.
- **Most of Mosul Eye's 91 destroyed sites.** Their names appear only on an interactive map.
- **Numbered sub-mounds** of Telul eth-Thalathat and Yarim Tepe. They are covered by their parent site.
- **Over 500 heritage houses** documented for the UNESCO bid. No public list was found.
