# P7-01 / P7-02 historical exploration plan

Goal: deliver an interactive timeline and dedicated civilization/era views using approved records and their existing period/civilization fields.

Design: retain React, the current router, card grid, theme, translations and lazy loading. `/timeline` offers an ordered era selector, exact recorded-period filter and searchable cards; `/civilizations` links to dedicated `/civilizations/:eraId` views. State lives in the URL and supports sharing and Back. An era-based timeline suits the existing labels; exact-year positioning would require dates absent from the approved records. Era grouping is navigational: it does not change the records or establish site founding dates. Periods overlap and multi-period records may appear in multiple groups. Unmapped/missing periods remain discoverable. Known empty eras show honest empty states; invalid IDs use 404 recovery.

Only approved records may reach results or counts. Grouping uses explicit period/civilization labels and a documented, conservative vocabulary; it never reads narrative descriptions or infers history from card ages. The existing release candidate remains frozen; P7 work is a later application state.

- [x] Shared model with tests for approval, explicit matching, overlaps, unknowns and no mutation.
- [x] Accessible/responsive timeline and civilization pages with search, period filter, URL state and recovery.
- [x] Navigation, metadata/initial HTML and German translations.
- [x] UI regressions, full tests/lint/build and browser checks at phone/tablet/desktop widths.
- [x] Independent review and delivery notes with data and testing limits.

Evidence and limits: `docs/P7-01-02-TIMELINE.md`. 146 frontend tests passed (two optional skips); 216 browser checks passed across six profiles.
