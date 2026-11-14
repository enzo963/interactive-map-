# Preservation and site storytelling implementation plan

Goal: implement P7-12–P7-15 using optional source-bound preservation assessments, narratives and chronological events in the existing React application.

Architecture: one normalization module handles claim-level review and evidence binding. The dedicated `/disappeared-heritage` page and legacy `/decks/lost` alias share reviewed membership with map/deck filters. Site Details receives optional narrative sections, a condition assessment and verified events through its existing section/navigation array. No new dependencies or inferred historical facts.

Data contract: `preservation` object, `story_sections` array and `historical_events` array. Each reviewed claim requires explicit siteId, verification_status approved/verified, reviewer/date and sourceRefs resolving to credible full-text, dated evidence in the record's sources. Explicit false/conflicting gates fail closed. Legacy free-text preservation remains explicitly unverified. Current condition and historical loss events are separate; a restored site may have a destruction history. Missing data stays unknown. Draft narratives/events never publish.

Preservation states: preserved, restored, damaged, heavily-damaged, reconstructed, endangered, destroyed, lost, disappeared, unknown. Collection includes verified present destroyed/lost/disappeared/heavily-damaged states or verified destruction events. Events support signed calendar years, optional endYear/precision and dates, sorted chronologically without inventing a founding date. Optional narrative types: history, architecture, significance, restoration, destruction, digital-documentation.

- [x] Write failing normalization tests; implement review gates, condition states, story/event normalization and collection selectors.
- [x] Add disappeared experience, source/assessment/narrative/event components, Site Details integration, route/SEO/navigation and consistent collection membership.
- [x] Extend authoring schema and Python public exporter; regress real evidence-ledger export behavior.
- [x] Add integration and responsive/browser checks, translations and authoring documentation.
- [x] Run frontend/pipeline tests, lint, build and browser validation; preserve research dataset/frozen archives.

Review focus: unreviewed and contradicted claims; wrong-site/missing/snippet-only sources; BCE chronology and date precision; rebuilt sites with historical destruction; narrow/mobile/keyboard layouts and empty results.
