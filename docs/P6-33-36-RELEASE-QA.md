# Final content QA and Version 1.0 candidate

Validated locally on **2026-11-04**. This report supersedes the November 3 browser results for the current application/data state.

| Task | Result |
| --- | --- |
| P6-33 Content QA | Completed for the candidate: English wording, governorate names, source presentation and attribution checked; seven approved descriptions clarified. |
| P6-34 Visitor journey | Completed locally across six browser profiles, including search/filter, map/governorate/card, details/gallery/sources, unavailable 3D, decks and project pages. |
| P6-35 Deployment | Pending: hosting/account and domain have not been chosen. Live HTTPS, hosting headers, routing and public smoke tests remain unverified. |
| P6-36 Version 1.0 | Local **v1.0.0-rc.1** candidate frozen with rollback artifacts. Stable Version 1.0 publication/tag remains pending live validation and final approval. |

## Content and dataset

The source contains 683 records: 34 approved and 649 needing review. The ordinary application keeps 682 visible cards under the existing readiness policy; one incomplete research record lacks a qualifying source and stays hidden. Release preparation explicitly includes **34 approved records only**, preserving their archive numbers and existing routes. Seven governorates are represented in this candidate; discovery records for the wider nine-governorate scope remain research material.

The candidate has 54 citations, including nine recorded search excerpts. Pages now identify those excerpts and show validated access dates without exposing internal evidence paths. Methodology explains all four source tiers and distinguishes location/image sources. Credit punctuation is corrected, and the new labels have German translations. No licensing state was promoted or new historical fact invented during the language pass.

## Verification

- Frontend: **139 passed, two optional tests skipped, zero failed**. Skips are the absent prepared research catalog and the opt-in Python export integration.
- Lint, 548 translation keys, card-readiness checks and dependency audit passed. npm reported zero known vulnerabilities.
- Ordinary production build and approved-only candidate build passed without warnings. The largest JavaScript chunk is 390,068 bytes; data is partitioned into governorate chunks.
- HTTP checks passed for 54 generated route heads and 58 manifest/initial assets. The static inventory contains 117 files in total.
- Six browser profiles passed **678 assertions** with zero unexpected local asset, application runtime or CSP errors.

| Profile | Version | Assertions |
| --- | --- | ---: |
| Chrome for Testing | 156.0.8078.80 | 197 |
| Edge | 156.0.4314.58 | 95 |
| Firefox automation build | 159.0 | 95 |
| WebKit automation build | 27.2 | 95 |
| Android Chrome emulation | 156.0.8078.80 | 98 |
| iPhone WebKit emulation | 27.2 | 98 |

All six profiles exercised the connected visitor journey and an isolated synthetic GLB failure/cache-eviction/retry through the actual built renderer. The synthetic asset is never part of the public archive. Computed theme colors were checked after toggles and language changes; representative desktop and iPhone screenshots were inspected.

Firefox logged ten external image warnings during rapid navigation. A separate sequential Firefox check decoded all 21 recorded approved-site photographs successfully, with no console errors. This includes one photograph whose recorded rights do not pass the stronger publication gate; decoding does not authorize publication. External image availability remains dependent on the source hosts.

Mobile results are emulation, not physical Android/iPhone tests. Windows WebKit is not retail Safari. No public deployment or live HTTPS check is claimed.

## Frozen artifacts and recovery

Artifacts are in `.release/v1.0.0-rc.1/`:

- `history-in-cards-v1.0.0-rc.1-static.zip`: deployable site only, 117 entries.
- `history-in-cards-v1.0.0-rc.1-PRIVATE-source.zip`: exact application source snapshot, 210 entries; contains unpublished research and must remain private.
- `approved-sites.json`: frozen 34-record source snapshot.
- `manifest.json`: Git base, source/build inventories and SHA-256 checksums.
- `RELEASE.md`: deployment prerequisites, routing/headers/HTTPS smoke checks and rollback instructions.
- `validation/`: browser evidence and archive checks, attached after freezing the build.

Both ZIPs passed CRC, entry/path inventory and SHA-256 checks. Independent review identified two packaging gaps; production environment loading and the standalone source test fixture were corrected before freezing. Review then found no important remaining issue.

Validated static build digest: `3eaaf4f89adb1636bff140da7aa84ffc04e41791f201b4ea3c9fddcde139f442`.

Work is on `codex/production-browser-validation` in `C:/Users/MSR/Documents/ChatGPT/enzo/history-in-cards-validation`, based on `b35f153`. The private source ZIP captures the uncommitted application state independently of that base. The original checkout and retained backup stashes remain available. Hosting/domain selection is the next required input before deployment can proceed.
