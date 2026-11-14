# P7-16–P7-19: media archive and search

Goal: support reviewed archival images and typed site media, improve relevance ranking, and provide free local suggestions using the existing React application.

Decisions: keep cards unchanged. Optional `heritage_media` resources carry explicit type/site identity/review, historical date and source metadata plus independent rights evidence. Archival photographs, reconstruction renders and panoramas must pass image publication/licensing gates; historical media descriptions/types/dates need specific reviewed evidence, never inferred gallery order. Existing gallery photos remain compatible and honestly attributed. Verified model resources and videos use their existing viewer safety rules. Heavy viewers are opened on demand.

Search continues to require all query words and Unicode folding. Rank exact primary names first, exact aliases next, then names/prefixes and weighted governorate/category/civilization/period/description relevance, with stable ties and explicit sort choices preserved. Suggestions derive only from visible local records and recorded fields, are bounded/deduplicated, and provide keyboard/assistive-technology interaction without external requests. Existing model-library search can opt out of heritage suggestions.

- [x] Ranking/suggestion utilities with failing-first regressions.
- [x] Typed media/archival normalization, schema/export preservation and approval regressions.
- [x] Site media gallery and searchable archival image route, metadata/credits/date/empty states.
- [x] Shared accessible autocomplete in global and browsing search; maintain filters/focus.
- [x] Integration, translations, lint, production build and focused multi-browser verification. Documented current data limits.

No invented archive images, dates, rights or site associations. Do not change current research JSON or frozen release artifacts. Public domain and hosting remain postponed.
