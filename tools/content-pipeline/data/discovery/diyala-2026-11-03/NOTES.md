# Diyala governorate discovery — 3 November 2026

This batch adds 96 Diyala records. Diyala had no records before. 18 of them have map pins.

- Every new record has `status: needs-review` and at least one source.
- `build_diyala_records.py` defines the batch.
- **New field: `evidence_level`.** Each record says how well it is documented:
  - `documented` (31 records): an excavation report, institutional page or encyclopaedia entry describes the site and its period.
  - `limited` (65 records): the site is known only as a name on a survey map, in a government list or in one news item. The description says what is missing. Nothing was filled in.

## Coverage

| Area | Records |
|---|---|
| Lower Diyala, the Oriental Institute's Diyala project: Eshnunna (Tell Asmar), Khafajah (Tutub), Tell Agrab, Tell Ishchali | 4 |
| Mandali: Choga Mami (earliest canal irrigation, c. 6000 BC) | 1 |
| Hamrin basin, excavated in the 1977–80 salvage campaign: Tell Abada, Rashid, Madhur, Saadiya, Suleimah, Yelkhi, Me-Turan, the Uch Tepe group (Razuk, Ahmed al-Mughir, Ajamat, Atiqeh), Gubba, Songor, Tellul Hamediyat, Rubeidheh, Abu Husaini, Hassan, Kesaran, Kheit Qasim, Abu Qasim | 21 |
| Hamrin basin, names on Yaseen's map only (`limited`, named "… (Hamrin tell)") | 54 |
| Sasanian and Islamic: Dastagird, Tell al-Zendan fortress, the ancient Adhaim dam, Hawsh Kuri palace, Khan Bani Saad caravanserai (1688) | 5 |
| Towns: Alwand Bridge and the war cemetery at Khanaqin, the old Saray of Baqubah | 3 |
| Kifri: Eski Kifri, Bawa Shaswar quarter, Saray, Qaysari bazaar, Majid Pasha palace, Dawood Zarifa house | 6 |
| National Investment Commission list only: Tel Abu Uthaina, Tel Shihab, Prophet Daniel shrine | 3 |

## Sources

- **Excavations:** University of Chicago ISAC (Diyala project, *Uch Tepe I*, News & Notes, OIP 147), Kokushikan University, Centro Scavi di Torino, Forest 1980 (Paléorient), Athar al-Rafidain.
- **Wikipedia** for the sites that have articles; **Wikidata** for coordinates.
- **Yaseen 2005 (Adumatu 11)**, Map 1, through a search excerpt, for the Hamrin map names.
- **Government and news:** the National Investment Commission investment map, Shafaq News (Tell al-Zendan, Adhaim dam), ALIPH (Khan Bani Saad), Kurdistan24 and PUKmedia (Kifri), a University of Sulaimani article (Kifri) and a University of Diyala thesis (Khanaqin district).
- **Details removed** before the build because no fetched source supported them: a temple dedication at Ishchali, a "burnt" Ubaid house at Madhur, and a construction period for the Alwand Bridge.

## Review flags

- **Hamrin sites are flooded.** Most Hamrin tells lie in or beside Lake Hamrin and show only when the water is low. Their records say so.
- **Map names are thin.** The 54 map-name records come from a search excerpt of Yaseen's map list. Their governorate is inferred from the Hamrin basin, and they have no position. Reading the full article would confirm them or allow merging them.
- **Possible duplicates:**
  - Kumeideh and Tell Rubeidheh. Tell Rubeidheh is ar-Rubeideh (map no. 69), which has its own section in OIP 147. Yaseen's map labels no. 44 Kumeideh, but his text calls no. 44 Rubeidheh. Kumeideh stays a separate card until the original map is checked.
  - Khibet al-Qasim (map no. 14) is probably Tell Abu Qasim.
- **No pin:**
  - Eshnunna and Khafajah: Wikidata gives both the same rounded point.
  - Uch Tepe tells, Yelkhi, Gubba and others: no source coordinates.
- **Approximate pins** (rounded source coordinates): Tell Agrab, Choga Mami, Abada, Rashid, Madhur, Saadiya, Songor and Rubeidheh.
- **Settlement pins:** Khan Bani Saad is on the town of Bani Saad; the Bawa Shaswar quarter is on Kifri.
- **Governorate checks:**
  - Tell Ishchali lies about 3 miles south-east of Baghdad; it may belong to Baghdad governorate.
  - Kifri is in Diyala governorate but administered by the Kurdistan Region.
- **Unconfirmed claims:**
  - The Shafaq report dates Tell al-Zendan to the 2nd–3rd century CE, which is early for a Sasanian fortress.
  - The Adhaim dam is called Abbasid by the investment map and 4th-century by Shafaq. Its reported listing proposal has no official source.
- **Kifri records** (Saray, bazaar, palace, house) rest on news excerpts that only name them.
- **Khanaqin War Cemetery** has only a Wikidata source; the CWGC page should be added.

## Not entered

- **Tell Shemshara, Tell Basmusian and other sites of the Dokan and Rania plain** belong to Sulaymaniyah.
- **Shrines and mosques of Baqubah, Muqdadiya, Khalis and Balad Ruz:** no heritage-specific source was found.
- **Jalawla, Sadiyah and Mandali old towns:** no source on surviving historic buildings.
- **Kifri Hill Gate:** mentioned once in a news excerpt as a lost structure; too thin to enter.
