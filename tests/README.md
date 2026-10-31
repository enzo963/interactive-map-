# P5-00 integration tests

Run from the project root:

```powershell
npm test
npm run lint
npm run build
```

The suite mounts the real App, router, services, pages, and components using React
and jsdom. It covers Home, Explore/Cards, Map, Decks, Site Details, and the existing
3D Archive route together, including:

- Navigation from Home through a card to its site and governorate deck.
- Random draws, deck filtering/sorting, shared search, and URL-driven selections.
- Map focus previews, counts, zoom, keyboard pan, and suppression of clicks after a drag.
- Canonical images and sources, gallery open/next/close, model links and related cards.
- Broken images, missing records, empty datasets, and shared stylesheet deduplication.
- History URL restoration through simulated popstate events.

The real dataset contains one record. Additional records and empty datasets are
in-memory fixtures; tests never write to sites.json or pipeline storage. Real network
requests and external media are not loaded. Gallery native-dialog methods, matchMedia,
scrolling, and pointer capture are simulated where needed.

These tests verify DOM behavior and React state, not visual layout. Responsive CSS,
actual touch gestures, native dialog focus trapping, real browser history controls,
and rendering external images/3D embeds still require browser/device verification.

Result for the merged Phase 4 work: 16 tests passed; full lint and the production
build passed. No application integration bug was reproduced, so no application
logic or UI was changed for P5-00.


P5-06 adds nine schema/adapter tests to npm test: 25 JavaScript tests passed with
the local prepared catalog. The optional catalog check is skipped on fresh
checkouts without ignored collection data. The Python suite now has 30 passing
tests, including standardization identity, idempotence and unknown flags.
