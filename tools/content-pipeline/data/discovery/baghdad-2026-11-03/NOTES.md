# Baghdad governorate discovery — 3 November 2026

This batch adds 85 Baghdad records, which brings Baghdad from 6 records to 91. 81 of them have map pins.

- Every new record has `status: needs-review`, at least one source, and alternative names in Arabic and historical forms.
- `build_baghdad_records.py` defines the batch.
- The six approved Rusafa riverbank records (Mustansiriya, Abbasid Palace, Qishla, al-Wazir, al-Asifiyah, House of Wisdom building) were not changed or repeated.

## Coverage

| Theme | Records |
|---|---|
| Ancient and Abbasid archaeology: Round City, Khuld and Taj palaces, al-'Adudi bimaristan, Ctesiphon and Taq Kasra, Seleucia, the Kokhe church, Dur-Kurigalzu (Aqar Quf), Sippar, Tell ed-Der, Tell Harmal, Tell Muhammad, Tell al-Dhiba'i | 14 |
| Gates: Bab al-Wastani, Talisman Gate (destroyed 1917), Bab al-Mu'adham | 3 |
| Mosques, shrines and madrasas, Abbasid to royal era: Abu Hanifa, Kadhimiya, Qadiriyya, al-Khulafa, Qamariyya, Zumurrud Khatun, Suhrawardi, al-Musta'sim, Ibn Hanbal (Arif Agha), Buratha, Mirjan, al-Sarai, Muradiyya, Uzbek, Ahmadiyya, Haydar-Khana, Adila Khatun, Khilani, Siraj al-Din, Sayyid Sultan Ali, Shabandar, Fattah Pasha, al-Shawy, Ibn Bunnieh, Umm al-Tabul, Salman al-Farsi, Baba Nanak (Sikh) | 27 |
| Markets, streets and quarters: Khan Mirjan, Souk al-Safafeer, Shorja, Mutanabbi Street, al-Rashid Street, al-Maidan, Bab al-Sheikh, Bataween | 8 |
| Churches, 1639–1969, with exact positions from Mesopotamia Heritage | 11 |
| Jewish heritage: Great Synagogue, Meir Taweig, Shamash School, Habibiyah cemetery | 4 |
| Ottoman, royal-era and modern buildings: Baghdadi Museum, Qasim Museum, Iraq Museum, White Palace, al-Rehab, Republican Palace, Royal Mausoleum, Central Station, al-Markaziyya, the Gropius campus, the Le Corbusier gymnasium, Sarafiya bridge | 12 |
| Cemeteries: North Gate War Cemetery | 1 |
| 20th-century monuments: Freedom Monument, Kahramana, al-Shaheed, Unknown Soldier, Victory Arch | 5 |

## Sources

- **Monuments with Wikipedia articles.** Wikipedia supplied descriptions and Wikidata supplied coordinates.
- **Churches.** Mesopotamia Heritage pages, with exact positions.
- **Gates.** The Wikipedia "Gates of Baghdad" article, re-read for the Talisman Gate and Bab al-Mu'adham.
- **Souk al-Safafeer.** Al Jazeera.
- **Modernist buildings.** Monocle and Archnet.
- **Removed details.** Facts not found in a fetched source were taken out before the build: exact dates for Khan Mirjan, Haydar-Khana, the gymnasium and the campus, and one alternative name for the synagogue.

## Review flags

- **Approximate pins.** Lost Abbasid sites (Round City, Khuld and Taj palaces, al-'Adudi), Seleucia and the three tells inside New Baghdad have rounded coordinates, marked `approximate`.
- **No pin:**
  - Bab al-Mu'adham: the Wikidata point is on the wrong bank.
  - Mar Gorgis church in New Baghdad: the source coordinates are garbled.
  - Talisman Gate and Bab al-Sheikh: no reliable position.
- **Bab al-Wastani's pin** comes from an unlabelled Wikidata city-gate item beside the Suhrawardi mausoleum. Confirm that this is the gate.
- **Lost or damaged sites:**
  - Talisman Gate: destroyed in 1917.
  - Bab al-Mu'adham gate: demolished after 1917.
  - Syriac Catholic Immaculate Conception church: demolished in December 2018.
  - Baba Nanak shrine: damaged after 2003.
  - Sarafiya bridge: bombed in 2007, rebuilt.
- **Twentieth-century records.** These were chosen for architectural or civic significance: royal-era palaces, modernist works, Jawad Saleem's and Mohammed Ghani Hikmat's monuments, and 1930s–60s churches. Late Ba'ath-era monuments such as al-Shaheed and the Victory Arch are included as landmarks. Whether to keep them is an editorial decision.
- **Two tests changed.** They counted exactly 6 Baghdad records and now use only the approved records.

## Not entered

- **Wikidata-only items with no descriptive source:** the al-Adliya, al-Takarta, al-Asafi, al-Sulaymaniya, Sheikh Bashar and Sitt Nafisa mosques; the Bahlul tomb; the Khaisaran and Bab al-Mu'adham cemeteries; the Turkish soldiers' cemetery; Souq al-Saray and Souq al-Ghazl; the Rashid Ali al-Gaylani and al-Jawahiri houses.
- **Churches built after 1975:** the Narek, St Teresa, Patriarchal Virgin Mary and Greek Orthodox Mar Gorgis churches.
- **Modern mosques:** Umm al-Qura, al-Rahman, 17 Ramadan.
- **Baghdad's 1,800 registered heritage houses** have no public named list. The 2026 survey of the State Board of Heritage covers al-Rashid, A'dhamiyya, Bab al-Mu'adham, Kadhimiya and Karrada.
- **Nahrawan Canal.** It lies mostly outside Baghdad, and its Wikidata point is in Salah al-Din.

## Corroboration pass (3 November 2026)

This pass added institutional sources to 23 cards whose strongest evidence was Wikipedia. The `CORROBORATION` table in `build_baghdad_records.py` lists them. Baghdad's source review queue fell from 73 cards to 50.

- **Sources added:**
  - Archnet: 16 monuments, including the Mirjaniyya, Kadhimiya, Qadiriyya, Zumurrud Khatun, Suhrawardi, Murad Pasha, Khan Mirjan, the Wastani and Talisman gates, the Khulafa mosque and minaret, Haydar-Khana, Ahmadiyya, the gymnasium, the university and two monuments.
  - Encyclopaedia Iranica: Ctesiphon, Seleucia and the Round City.
  - UNESCO: the Tentative List entry for Aqar Quf.
  - Others: the DAI library record of the Tell ed-Der publication, the CWGC page for North Gate, and Diarna for the Meir Tweg synagogue and the Shamash School.
- **UNESCO status.** Dur-Kurigalzu is now `unesco: false`, with `heritage_status` recording its Tentative List entry of 31 January 2025.
- **Search-excerpt access only.** Archnet rate-limited automated requests (HTTP 429), Encyclopaedia Iranica and the CWGC refused them (403), and the Diarna archive was unreachable. None of these blocks was bypassed, so every added source is marked `search-snippet`. Each was added only where the result named the site itself.
- **Conflicts recorded, not resolved.** Where a source disagrees with a card, the description is unchanged and `review_notes` records the difference:
  - Murad Pasha mosque: 1578 or 1566.
  - Ahmadiyya: builder and start year.
  - Bab al-Wastani: built 1221 or c. 1100.
  - Talisman Gate: 1221 or 1220.
  - Khan Mirjan: restoration in 1976 or the 1980s.
  - Mirjaniyya: which part is "now destroyed".
  - North Gate: 4,487 or 4,480 graves.
- **Not added:**
  - Diarna's "Great Synagogue (Oldest)": it is not certain to be Shaf ve-Yativ.
  - The Iranica passage on Salman Pak: the excerpt did not show which article it came from.
- **Still reference-only:** most of the Ottoman and later mosques, the Abbasid palace sites, markets and streets, royal-era buildings, the Iraq Museum and the 20th-century monuments. Candidates for the next pass are the Iraqi Sunni and Shia endowment offices, the State Board of Antiquities and Heritage, the Iraq Museum and Archnet's Makiya and Munir archives.
