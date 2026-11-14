# P6-31 / P6-32 Production and Browser Validation Plan

**Goal:** Validate the final static production output and exercise browser compatibility without redesigning working components.

**Scope:** Existing React/Vite application, approved archive data, generated route heads and security policy. Preserve source research, local user changes and the undecided public domain. No deployment or commit.

- [x] Record build baseline and diagnose warnings; resolve oversized chunks through measured code splitting, without hiding warnings or introducing import cycles.
- [x] Add a reproducible production/browser audit using isolated automated browser profiles. Validate generated routes, imports/assets, metadata, security headers and invalid-route recovery.
- [x] Exercise Home, Search/Explore, Map, Decks, Site Details, gallery, navigation, language/theme and keyboard interactions in Chrome, Edge, Firefox and mobile browser emulation. Record exact browser versions, console/network failures and coverage limits.
- [x] Fix reproducible compatibility defects with focused regression coverage. Recheck affected flows and inspect representative screenshots.
- [x] Run full tests, lint, translation check, audit and final production build; request independent review and publish an evidence-based audit report.

**Results:** 118 frontend tests passed, one optional export skipped; clean build with no warnings; lint, translations and npm audit passed. Six browser profiles passed 582 assertions against identical build artifacts; 54 route HTML files and 41 local assets passed HTTP checks. The actual renderer/cache synthetic GLB failure/retry flow passed in all six profiles. Firefox 159 separately decoded all five published photographs successfully.

**Review:** Independent review found no important product regression. Audit suggestions (strictly scoped expected 404 handling and accumulating CSP failures across navigation) were implemented and verified. Documentation records automation-build versions, mobile/device and deployment limits.

**Constraints:** Real-device iOS/Android and actual hosting headers cannot be verified from a Windows-only local environment. Use current stable Chrome for Testing where installed Chrome is old, the installed Edge channel, and Playwright's supported Firefox/WebKit builds. Label emulation and browser builds accurately. Do not call emulation a physical-device test.
