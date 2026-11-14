# P7-03 — civilization visual identity

Completed locally on 2026-11-04 in `codex/production-browser-validation`.

The user selected original geometric emblems matching the existing project palette. One shared SVG component now supplies twelve distinct era drawings and two neutral navigation marks. Frame, stroke weight, scaling and inherited text color stay consistent across light/dark themes. These are original interface graphics, not authenticated archaeological symbols; historical exploration includes that distinction.

## Integration

- Timeline era controls and result headings.
- Civilization index tiles and dedicated era headings.
- Heritage cards, beside the existing period text.
- Period filter checkboxes in Explore/Map and the selected historical-period filter label.
- Home discovery links for recorded periods.

The existing period/civilization matcher supplies associations. Multi-period sites keep both emblems; unmatched labels retain their text without an invented civilization. Visual association does not imply record approval. Timeline/civilization results remain approved-only, and other archive views retain their existing visibility policy. The dataset checksum is unchanged.

Adjacent labels communicate meaning without relying on color or symbols. Decorative SVGs are hidden from screen readers and cannot receive keyboard focus; a standalone form can expose a translated accessible name. Native filter controls and keyboard selection continue to work. SVGs have no per-instance IDs, external resources, scripts or additional network requests. No dependency was added.

## Verification

- **148 tests passed**, two optional skips, zero failures. Coverage includes shared matching, multi-period associations, approval separation, and consistent use across cards, timeline, headings and filters.
- Lint and syntax checks passed; all **592** detected translation keys have German entries.
- Production build passed and emitted 68 route heads. Rolldown printed callback-timing diagnostics; the two builds emitted identical asset names and sizes.
- **260 browser checks passed** across Chrome (73), Edge (37), Firefox (37), WebKit (38), Android Chrome emulation (37) and iPhone WebKit emulation (38).
- Coverage includes 320/768/1280/1440px layouts, keyboard selection, Back/refresh, search/recovery, identical SVG geometry, multi-period cards, decorative accessibility attributes, compact card bounds and theme colors. Desktop, iPhone and a multi-period card screenshot were inspected.
- An initial Firefox route was interrupted by a concurrent local rebuild. Its successful rerun used fixed files. WebKit profiles were also rerun with computed-style waits for all emblem strokes after theme changes. Combined evidence and original run references are in `.validation/p703/report.json`.
- Direct code inspection checked matching/approval boundaries, CSS specificity against the existing card styles, SVG accessibility and label retention. The requested independent reviewer could not run because its service reported a usage limit; no independent-review success is claimed.

Mobile coverage uses emulation; Windows WebKit is not retail Safari. No public deployment or physical-device test is claimed.

Use `npm run validate:history` to rebuild and run the audit. `HB_HISTORY_BROWSERS` can select profiles, and `HB_HISTORY_OUT` can retain a separate evidence directory. The existing `HB_CHROME_EXECUTABLE` / `HB_FIREFOX_EXECUTABLE` overrides remain supported. The earlier frozen release ZIPs are separate from this subsequent working state.
