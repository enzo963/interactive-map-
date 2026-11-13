# C1-01 — Master Heritage Site Discovery

Research snapshot: **2 November 2026**. **551 discovery candidates**, covering all nine target governorates, 19 categories and **110 distinct source URLs** (including boundary-review evidence). All candidates remain `candidate-needs-review`.

This is a broad, source-linked discovery baseline, not an exhaustive governmental register or a list of approved website additions. Counts include parent complexes, individually named components and provisional provincial assignments; they must not be presented as counts of independently verified settlements.

## Review files

| File | Purpose |
| --- | --- |
| [master-candidates.csv](master-candidates.csv) | One reviewable list; UTF-8 with BOM, suitable for importing into spreadsheet software. |
| [master-candidates.json](master-candidates.json) | Authoritative assembled catalog, preserving all source metadata and locators. |
| [sources.json](sources.json) | Source register with candidate backreferences, institutions and access levels. |
| [identity-review.json](identity-review.json) | 25 possible identity/component comparisons; none silently merged. |
| [boundary-holds-and-exclusions.json](boundary-holds-and-exclusions.json) | Two records withheld from target totals. |
| [validation-report.json](validation-report.json) | Counts, flags and structural validation results. |
| [parts](parts) | Regional research contributions and their original qualifications. |
| [build_catalog.py](build_catalog.py) | Reproducible local assembler; does not fetch, approve or publish content. |

## Geographic coverage

| Governorate | Candidate records |
| --- | ---: |
| Erbil | 36 |
| Duhok | 21 |
| Ninewa | 154 |
| Sulaymaniyah | 94 |
| Kirkuk | 21 |
| Anbar | 27 |
| Baghdad | 82 |
| Salah al-Din | 25 |
| Diyala | 91 |
| **Total** | **551** |

Coverage is uneven because accessible institutional inventories differ greatly. Dense Mosul, Shahrizor and Hamrin inventories should not be interpreted as evidence that other governorates contain fewer heritage sites.

## Sources and method

Research combined governmental/UNESCO dossiers, SBAH museum resources, KRG statements, university excavation and survey publications, museum databases, archaeological archives, academic papers and recognized heritage organizations. Each record retains its source URL, title, institution, access level and a section/page/inventory locator. Source support varies by field: a publication naming a site does not necessarily establish its current governorate or survival.

Principal source groups include:

- [UNESCO World Heritage Centre](https://whc.unesco.org/en/statesparties/iq): inscribed-site dossiers and Iraqi tentative submissions, including the [Baghdad Rusafa ensemble](https://whc.unesco.org/en/tentativelists/5880/), [Lalish](https://whc.unesco.org/en/tentativelists/6467/) and [Aqar Quf](https://whc.unesco.org/en/tentativelists/6797/). Tentative inclusion is never treated as World Heritage inscription.
- [SBAH](https://sbah.gov.iq/museums/), Iraqi provincial/National Investment Commission resources and KRG publications.
- Columbia University's [Mapping Mesopotamian Monuments](https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/catalogue), the Czech Academy's [Mosul monument catalog](https://monumentsofmosul.com/destroyedmonuments.htm), and [Mesopotamia Heritage](https://www.mesopotamiaheritage.org/en/monuments/).
- Harvard-led Erbil Plain Archaeological Survey, UCL-led Shahrizor publications, Kokushikan inventories, Chicago ISAC, university excavation projects, and the Haditha/Hamrin salvage literature.
- [Open Context / Global Heritage Fund](https://opencontext.org/projects/b0a915f3-43cd-1d81-cc89-043d7e11e7c9), [Archnet](https://www.archnet.org/sites/15578), the Foundation for Jewish Heritage/ASOR and Commonwealth War Graves Commission.

Names were retained as published, with supported alternatives. An empty alias array means no alternative was captured in this research pass. Exact normalized primary names within a governorate are the only automatic merge criterion; this run made zero such merges. Similar names and survey subdivisions are retained for review. Categories are discovery classifications, not legal designations. No coordinates were invented, and no present-day visiting/accessibility claims are made.

## Review limitations

- **158 candidates need current-governorate review.** Historical Sulaymaniyah inventories can include today's Halabja; Hamrin assignments can be inferred from basin context. Source-assigned labels elsewhere also remain independently unverified.
- **120 candidates have at least one limited-access source** (`search-snippet` or `published-extract`). This includes records with additional fuller sources. `full-text` and `full-page` describe what the researcher accessed, not verification approval; excerpts must be checked against originals before promotion.
- **Four localities remain unresolved** beyond provincial evidence: Prophet Danial Shrine, Tel Abu Uthaina, Tel Shihab and Zindan. Their fields explicitly record that limitation rather than supplying invented localities.
- **Bakr Awa is excluded from the nine-governorate total:** a [University of Warsaw report](https://www.anthropology.uw.edu.pl/11/bne-11-03.pdf), p. 63, places it in Halabja Province. **Gurga Chiya is held** pending current boundary resolution. Other Shahrizor records remain provisional, rather than being silently asserted to fall within modern Sulaymaniyah.
- Khinnis has conflicting provincial labels: Columbia specifies Nineveh while [UNDP](https://www.undp.org/iraq/stories/reviving-khinnis-preserving-heritage) describes Duhok. Jerwan/Gunduk and reservoir/border sites also require jurisdiction checks. Historical inventory geography, legal administration and heritage-management jurisdiction must be distinguished.
- Named monuments and their parent complexes coexist, for example Saray/Qishla, Lalish/shrines, Aqar Quf/ziggurat, and numbered archaeological mounds. `entityScope`, notes and the review file identify these relationships; unflagged scope still requires human review.
- Reservoir surveys do not establish whether remains are currently submerged, visible, preserved or accessible. Destroyed, rebuilt and relocated heritage needs survival/authenticity review.

## Coverage expansion backlog

Further discovery remains possible and is explicitly tracked here:

1. Obtain/query full SBAH and provincial antiquities registers and Arabic gazette notifications. The [2011 Gazette issue 4197 hosted by Al-Qadisiyah University](https://qu.edu.iq/wp-content/uploads/2017/12/4197.pdf) contains Baghdad designation tables; its damaged text extraction needs visual transcription. Its untranscribed buildings are **not counted**.
2. Transcribe the remaining building inventories in [Ihsan Fethi's Sheffield thesis](https://etheses.whiterose.ac.uk/id/eprint/10302/). Large PDFs exceeded browser fetching limits; the unprocessed inventory is **not represented as individual candidates**.
3. Expand full survey inventories from [LoNAP/PARTeN](https://italiana.esteri.it/italiana/sedi/progetto-archeologico-regionale-terra-di-ninive-parten/), the Eastern Khabur, Erbil Plain, Shahrizor and other salvage surveys. Request controlled archaeological database access where appropriate; no restricted records were presumed accessed.
4. Expand Anbar desert/Islamic monuments, Diyala historic urban/religious fabric, Duhok small sites and rural heritage throughout all nine governorates. Resolve modern boundaries and original-map readings before geocoding.

## Rebuild and verification

From the project root:

```powershell
python tools/content-pipeline/data/discovery/c1-01/build_catalog.py
```

The command checks required fields, controlled categories, all-nine coverage, candidate status, unique IDs and source URL syntax/metadata. It exits nonzero on structural errors. CSV and JSON exports must also agree on record IDs and count. This validation does not certify each historical fact or perform a live health check of every URL.

These are research artifacts only. Frontend site records, map markers, pipeline source permissions, publication statuses and approval evidence are not modified by the assembler.
