# P7-12–P7-15: preservation, loss and site stories

Implemented in the local validation worktree on 6 November 2026. The source research dataset and earlier frozen release remain unchanged.

## Visitor experience

`/disappeared-heritage` (also `/decks/lost`) presents reviewed loss history with search, current-condition and governorate filters, reset/no-results handling, sources and direct site-evidence links. Current condition is distinct from past destruction: a restored site can remain in the collection through a reviewed destruction event. Map layers, special decks and the experience use the same eligibility rule. A deck tag or keyword alone no longer establishes loss.

Site Details always explains the recorded preservation condition, including unknown/unverified information. Optional reviewed narratives cover history, architecture, significance, restoration, destruction and digital documentation. Only populated reviewed sections appear in the page navigation. Optional site events show chronological construction, renovation, destruction, excavation, restoration, reconstruction, UNESCO inscription or damage. Signed BCE years, date ranges and approximate precision are retained; gaps are not filled with invented events.

Correction following the user's clarification: cards retain their original 5:7.4 proportions and photographs fill their existing dedicated window. The photographer/license strip has been removed from the card; source/licensing information remains on Site Details. The earlier square-window/natural-height change was superseded. Preservation, narrative and event details stay on the site page; cards receive no new fields or badges.

## Authoring and review

Optional canonical fields are `preservation`, `story_sections` and `historical_events`. Each claim requires `siteId`, `verification_status`, `reviewedBy`, `reviewedAt` and nonempty `sourceRefs` pointing to evidence IDs in the same record's `sources`. The site must be approved, all supplied review-status aliases must agree on approved/verified, and an explicit false flag blocks publication. Referenced sources require a safe HTTP(S) URL, credible publisher, recorded access date and explicit `accessLevel: "full-text"`. A snippet or general site approval does not verify a specific claim. Sources must be unique by evidence ID. No claim infers verification of media licensing.

Preservation states: `preserved`, `restored`, `damaged`, `heavily-damaged`, `reconstructed`, `endangered`, `destroyed`, `lost`, `disappeared`, `unknown`. Optional `asOf` records the condition assessment date; it is not a live inspection. `summary` describes only the reviewed assessment. Legacy `preservation_status` is explicitly unverified. Malformed explicit structured assessments block legacy fallback. Unknown states do not imply a positive or negative condition.

Narratives use `id`, supported `type` and plain `text`; one reviewed section of each type is shown. Events use `id`, supported `type`, `title`, signed nonzero `year`, optional `endYear`, `precision` (`exact` or `approximate`), optional `date`, and optional `description`. Dates cannot contradict the year, roll over an invalid calendar day or assert future historical events. Optional null dates remain unknown. Unreviewed legacy `timeline` content is not promoted into verified history.

The JSON authoring schema describes these fields and accepts an exact blocked public assessment sentinel `{ "state": "unknown", "verified": false }`. The Python exporter uses explicit nested public allowlists and preserves source access level/classification, draft/negative/conflicting review gates and source references. Private nested research notes are excluded. Existing evidence-ledger approval and changed-record fingerprint checks still apply.

## Dataset and validation limits

No current real records contain reviewed structured assessments, narratives or site events, so the public disappeared-heritage collection initially has an honest empty state. This implementation does not automatically reclassify records from historical descriptions or fabricate current condition. Content review and authoring are required to populate it.

Populated UI/browser cases use explicitly synthetic records and original test drawings in ignored `.validation/` files. No synthetic records enter deployment assets. The public domain and hosting remain undecided; this work is not deployed and does not update the earlier frozen release candidate.

Reproduce with `npm test`, `npm run lint`, `npm run check:i18n`, `npm run build`, and `npm run validate:digital`. Python pipeline tests use `python -m unittest discover -s tests` from `tools/content-pipeline`. Browser checks include Chrome, Edge, Firefox, Windows WebKit, Android and iPhone emulation; emulation is not physical-device testing or retail Safari.

Final results: **208 frontend tests passed**, two optional skipped, zero failed; **251 Python tests passed**; ESLint passed; **722 translation keys** covered. Production build completed without warnings and produced 70 initial metadata heads; public canonical URLs/indexing remain inactive until a domain is configured. The largest JavaScript chunk remains 390,068 bytes.

**232 browser assertions passed**: Chrome 156.0.8078.80 (42), Edge 156.0.4314.58 (38), Firefox automation build 159.0 (38), WebKit 27.2 (38), Android Chrome emulation (38), iPhone WebKit emulation (38). There were no local HTTP, runtime or CSP errors. Coverage includes the prior model/project/comparison flows, reviewed-loss empty states/alias, narrative evidence, BCE chronology, draft exclusion, restored-condition/loss separation, filter/reset/navigation, square photo geometry, full-image containment, credits below photos and responsive layouts. Actual Mar Gorgis and Home screenshots were also inspected.

Evidence for that feature-validation snapshot is retained in `.validation/preservation-stories/report.json` and its screenshots. The later card-dimension correction supersedes that snapshot's square-photo assertions; the maintained browser script now checks original proportions and omission of the credit strip. The corrected card was verified with two layout tests, 84 integration tests (one optional skip), ESLint, a clean production build and a screenshot of the actual Mar Gorgis card. Its measured size was 202×300 pixels, with cover-fit photography and no caption strip. The older browser-report digest is historical and does not identify this corrected build. Synthetic QA content is absent from `dist`. Research data and both frozen release archive hashes remain unchanged. Independent review identified a date-format mismatch; ISO timestamp support and regression tests resolved it, and re-review found no remaining actionable issues.
