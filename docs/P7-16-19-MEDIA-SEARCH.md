# P7-16–P7-19: archival media and search

Implemented locally on 7 November 2026 in `codex/production-browser-validation`, within `C:/Users/MSR/Documents/ChatGPT/enzo/history-in-cards-validation`.

## Delivered behavior

- **P7-16:** `/image-archive` is a searchable historical image collection with site links, recorded date precision, descriptions, credits, sources and licensing. Unknown dates remain unknown; no dates are inferred from filenames or gallery order.
- **P7-17:** Site Details galleries identify photographs, archival photographs, reconstruction renders, panoramas, videos and 3D resources. Type buttons filter the collection. Images retain the existing keyboard-accessible lightbox and unavailable-image behavior. Reconstructions are explicitly interpretations; panoramas use a larger static image view. Video and model viewers remain opt-in; ordinary gallery browsing never downloads models or embeds video providers.
- **P7-18:** all-word Unicode-aware search ranks exact primary names before exact alternative names, followed by name prefixes/words, weighted place/category/civilization/period matches and description relevance. Phrase matches and within-field relevance refine metadata results. Equal scores preserve source order; explicitly selected sorting overrides relevance.
- **P7-19:** global search and browsing search share local autocomplete for site names, alternative names, governorates, civilizations and categories. Suggestions require two characters, are deduplicated and bounded to eight. Arrow keys, Enter, Escape, pointer/touch selection and accessible combobox/listbox states are supported. Keyboard selection scrolls only the suggestion list. Specialized model/image archive searches opt out of unrelated site suggestions.

Cards retain their approved dimensions and current image layout. No media metadata was added to cards.

## Optional authoring contract

`heritage_media` contains resources with `id`, `type`, `title`, `siteId`, `verification_status`, `reviewedBy`, `reviewedAt` and nonempty `sourceRefs` referencing evidence IDs in that same site's sources. Types: `photograph`, `archival-image`, `reconstruction`, `panorama`, `video`, `3d`. Provide `src` or `url` (matching if both supplied), plus optional `description`, `creator`, `date`, `year`, `alt` and `caption`.

`date` retains safe authored historical text, including ranges and approximate/BCE labels; null means unknown. Numeric `YYYY`, `YYYY-MM` and `YYYY-MM-DD` strings must be real calendars, cannot begin in the future, and must agree with an explicit numeric `year`. A nonzero signed year can supply a date label when `date` is missing. Media dates are not automatically converted to construction dates or historical events.

Each typed claim requires an approved site and its own positive review, same-site identity, reviewer/date and credible full-text evidence references. Negative or contradictory review flags block publication. General site approval alone does not approve a media type, historical description or date.

New image kinds additionally require nonempty credit, source URL, license, current bound licensing evidence and image/site-specific publication approval through the existing image gates. Model/video review remains distinct from copyright permission; uncertain terms stay explicitly unverified. Only safe existing video/model provider/file handling is reused. Known restricted same-site image observations, including drafts and nested source observations, block matching typed resources and legacy cover/gallery images regardless of order. Wrong-site restrictions do not alter another site's images.

The Python exporter preserves public typed metadata, review gates and references using nested allowlists. New image kinds pass through the actual repository-backed image evidence audit; self-declared tracking cannot approve an image. Private research fields/locators are excluded. Existing review fingerprints still invalidate changed records.

## Content and device limits

The current dataset contains no reviewed `heritage_media` archival photographs. The archive therefore initially shows an honest empty state; the implementation does not fabricate historical media, dates or permissions. Existing photographs remain available through their current gallery behavior and attribution. Original test drawings, synthetic sites and video/model links are isolated in ignored `.validation/` fixtures and never enter the deployment data.

Panoramas currently use the image viewer rather than an immersive 360-degree renderer. Videos use existing provider/native-player controls, and models use the existing opt-in viewer. No paid search service, new dependency or public deployment was added. Hosting and domain configuration remain postponed.

Reproduce frontend checks with `npm test`, `npm run lint`, `npm run check:i18n`, and `npm run build`; browser checks with `npm run validate:digital`. Optional `HB_CHROME_EXECUTABLE`, `HB_FIREFOX_EXECUTABLE`, `HB_DIGITAL_BROWSERS` and `HB_DIGITAL_OUT` select local browser binaries/profiles/output. Python checks run with `python -m unittest discover -s tests` from `tools/content-pipeline`.

Browser coverage uses Chrome, Edge, Firefox, Windows WebKit, Android Chrome emulation and iPhone WebKit emulation. Mobile emulation is not physical-device testing; Windows WebKit is not retail Safari. Populated browser cases validate interface behavior using synthetic media and do not establish historical evidence for real sites or real video playback.

Final validation on 9 November 2026 passed 227 frontend tests, 259 pipeline tests and 334 browser checks across six profiles. Two optional frontend tests were skipped. The production build and all 747 translation keys passed. The iPhone rerun confirmed touch selection after the pointer release fix. The combined report at `.validation/media-search-final/combined-report.json` references both runs against the same build digest.
