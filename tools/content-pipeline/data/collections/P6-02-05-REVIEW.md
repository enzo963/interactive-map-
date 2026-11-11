# P6-02 to P6-05 — completed dataset work

Saved directly in `C:\Users\MSR\Desktop\Web-Crads\interactive-map-backup\tools\content-pipeline` on 1 November 2026 (Baghdad time). No frontend, routing, pipeline implementation, or trusted-source configuration was changed. No data was published.

| Task | Result |
|---|---|
| P6-02 — Salah al-Din | Five source-backed site records, source snapshots, evidence, drafts, review decisions and a separate approved export. |
| P6-03 — dataset review | 34 canonical records checked across seven governorates; every required field exists, active evidence hashes and locators resolve. |
| P6-04 — coverage | Numerical balance checked by governorate and heritage theme; three market/museum records added; spatial gaps and 17 research leads documented. |
| P6-05 — image review | Five exact original images visually inspected and technically validated; identity, attribution and license evidence checked; two repeated gallery instances removed and one cover moved to a detail gallery. |

The five Salah al-Din records are Samarra Archaeological City, the Great Mosque and Malwiya Minaret, Abu Dulaf Mosque, the Caliphal Palace, and Ashur (Qal'at Sherqat). The [UNESCO Samarra property page](https://whc.unesco.org/en/list/276/) and [Ashur property page](https://whc.unesco.org/en/list/1130/) provide the historical evidence. Samarra's component monuments remain distinct records with a recorded parent relationship; they are not claimed as separately inscribed properties.

| Governorate | Before | Final records | Grouped locations / ensembles |
|---|---:|---:|---:|
| Ninewa / Nineveh | 7 | 7 | 5 |
| Erbil | 3 | 4 | 4 |
| Duhok | 3 | 3 | 3 |
| Sulaymaniyah | 3 | 4 | 4 |
| Kirkuk | 4 | 5 | 1 |
| Baghdad | 6 | 6 | 1 |
| Salah al-Din | 0 | 5 | 2 |
| **Total** | **26** | **34** | **20** |

The three balance additions are Qaysari Bazaar in Erbil, Al-Qaysariyah Market in Kirkuk, and the Red Terror Museum in Slemani. [The KRG's dated report](https://gov.krd/english/news-and-announcements/posts/2024/may/krg-s-council-of-ministers-deliberates-on-critical-issues/) supports the Erbil market record; the other records cite the already captured approved-source pages in the catalog. Names referring to different markets were not merged.

The largest governorate share is 7/34 (20.6%). Archaeology and religious architecture each account for 10/34 (29.4%); no broad theme exceeds 40%. Practical Phase 6 checks used a minimum of three named records per governorate and a maximum governorate share of 25%. These are editorial working thresholds, not an archaeological completeness standard.

The grouped counts prevent component monuments from exaggerating geographic breadth. Kirkuk is still concentrated in its citadel, Baghdad in its Rusafa riverbank ensemble, and Salah al-Din in Samarra and Ashur. The separate research queue identifies possible next collections, including Tikrit, Balad and prehistoric locations, sites outside Kirkuk Citadel, additional Baghdad districts, Khinnis/Bavian and Akre, Jarmo/Qizqapan, and other regional landmarks. These are **research leads, not verified records**; their exact identity, boundaries and governorate must be established from adequate trusted evidence before approval. The collection is not an exhaustive regional inventory.

The approved export contains 34 records after explicit source-based **AI review by Codex**. Human-curator or field verification is not claimed. The revision-bound ledger identifies the reviewer, note and exact source/record hashes. Original source drafts remain `needs-review`; effective approval comes from this separate ledger. Earlier governorate catalogs and approval ledgers were preserved as previous versions. Use the new combined catalog and its matching ledger for this release.

Data quality findings:

- Zero missing required fields and zero active source hash failures. All 26 source snapshots referenced by the final catalog passed hash verification.
- Three low-confidence duplicate signals came only from shared overview URLs. Their named sites and passages were reviewed as distinct; the signals and decisions are preserved. The frontend and prepared Hatra entries are two representations of `site-001`, not two destinations; the combined catalog uses one evidence-rich prepared identity and leaves both inputs unchanged.
- Three descriptions were strengthened and five previously blank periods were populated conservatively from saved evidence. Eleven uncertain periods remain blank; unknown UNESCO flags and all 34 unknown 3D flags remain null. No dates or digital assets were invented.
- The KRG tourism overview contains contradictory wording about Erbil's inscription status. That anomaly remains documented; the separate UNESCO property page supplies inscription status. Uncertain bridge origins and competing citadel founding attributions were not turned into exact facts.
- One old unused raw snapshot, `unesco-20261026T172135Z-aac0020406`, still has a hash mismatch. It is flagged and excluded from this export; the original evidence was not rewritten.
- One proposed Erbil source could not be collected because the pipeline's conservative robots policy stopped on unavailable robots.txt. The failure is retained, and an accessible official KRG article was used instead.

| Retained photo | Final role | Attribution / license |
|---|---|---|
| Al-Mustansiriya Madrasa portal | Cover | Makaay31 — CC BY-SA 3.0 |
| Abbasid Palace entrance | Cover | Mohammed Qays Kazem — CC BY-SA 4.0 |
| Al-Wazir Mosque interior | Gallery detail; cover cleared | Mahmoudalrawi — CC BY-SA 3.0 |
| Malwiya minaret, Samarra | Cover | Fakhri Mahmood — CC BY-SA 4.0 |
| Abu Dulaf Mosque | Cover; historical 2001 view | Lionel Aubert — CC BY-SA 4.0 |

File-specific evidence: [Mustansiriya](https://commons.wikimedia.org/wiki/File:Mustansiriya_Madrasah5.jpg), [Abbasid Palace](https://commons.wikimedia.org/wiki/File:Abbasid_Palace.jpg), [Al-Wazir](https://commons.wikimedia.org/wiki/File:Al_Wazeer_Mosque.jpg), [Malwiya](https://commons.wikimedia.org/wiki/File:Samrraa_01.jpg), [Abu Dulaf](https://commons.wikimedia.org/wiki/File:Abu-Dulaf-mosque-with-minaret-samarra.jpg). Exact visually inspected originals are archived with credits and SHA-256 hashes under the pipeline image-review folder. Rights evidence and publication decisions are bound to the exact image URL and site. Attribution, license links and applicable ShareAlike requirements must accompany reuse. Historical photos do not certify present physical condition. The portrait Malwiya photo is flagged for future wider cover curation. No unverified, restricted or uncertain image was inserted to fill a gap.

Only five sites currently have reviewed media; four have covers and one has a gallery detail only. Thirty records retain cover fallbacks. Previously rate-limited/unverified candidates remain outside the export. Missing media is an explicit follow-up, not a fabricated completeness claim.

Verification completed:

- Python suite: **228 passed**.
- Existing JavaScript suite: **33 passed, 1 skipped, 0 failed**. The skipped test requires a separate synthetic fixture export.
- Actual new export: schema and adapter checks passed; all **34 cards and 34 Site Details views** rendered in a test process using the existing React app. Show-more pagination, source links, the four covers, the gallery-only image, fallbacks and UNESCO flags were checked. No frontend data file was replaced.

Main project artifacts:

```text
C:\Users\MSR\Desktop\Web-Crads\interactive-map-backup\tools\content-pipeline\data\prepared\northern-central-reviewed-sites.json
C:\Users\MSR\Desktop\Web-Crads\interactive-map-backup\tools\content-pipeline\data\prepared\salah-al-din-heritage-sites.json
C:\Users\MSR\Desktop\Web-Crads\interactive-map-backup\tools\content-pipeline\data\review\northern-central-decisions.json
C:\Users\MSR\Desktop\Web-Crads\interactive-map-backup\tools\content-pipeline\data\exports\northern-central-heritage-sites.approved.json
C:\Users\MSR\Desktop\Web-Crads\interactive-map-backup\tools\content-pipeline\data\exports\salah-al-din-heritage-sites.approved.json
```

Detailed validation, overlap, source quality, integrity, coverage, image and website-compatibility reports are under the same pipeline's `data\review\` folder with `p6-02-05`, `p6-03`, `p6-04` or `p6-05` prefixes.

To list current approvals from the pipeline folder:

```powershell
..\..\.venv\Scripts\python.exe review_drafts.py list --input data/prepared/northern-central-reviewed-sites.json --ledger data/review/northern-central-decisions.json --status approved
```

To regenerate the export from current approvals:

```powershell
..\..\.venv\Scripts\python.exe export_approved.py --input data/prepared/northern-central-reviewed-sites.json --ledger data/review/northern-central-decisions.json --output data/exports/northern-central-heritage-sites.approved.json
```

The existing Git ignore rules exclude collection data and reviews. Files are already saved locally; the backup ZIP provides a portable copy of this release's active evidence, review originals, drafts, catalog, ledger, reports, exports and structured logs. You do not need to copy the backup back into the current project. Evidence manifests retain their original local path conventions; another machine may require the normal path migration before re-review.
