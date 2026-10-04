---
title: 'Story 1.12: Search for a place'
type: 'feature'
created: '2026-10-03'
status: 'done'
baseline_commit: 'f9d2d998c71ba60be6c782e700594a0ee08b9ee3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The top-bar search field is a disabled placeholder: a creator cannot jump to a country, a city or a historical entity, and nothing builds the name index that search needs.

**Approach:** A pipeline step that builds a search index from Natural Earth countries and populated places (English and French names), a client that loads it lazily and caches it, a pure matcher in `src/core` (accent- and case-insensitive, also over the GeoEntities valid at the Reference Date), an accessible combobox in the top bar with the `/` shortcut, centring of the edit camera, and a UI-only selection of GeoEntity results drawn as an ink-and-halo outline. Epics.md Story 1.12 ACs (FR-8, AD-16, AD-17, AD-27; UX-DR62, 146) are binding.

## Boundaries & Constraints

**Always:** Index built by the pipeline from Natural Earth v5.1.2 only (public domain, same manifest rules and licence gate as Stories 1.8 and 1.9): countries from `ne_10m_admin_0_countries` (`NAME_EN`, `NAME_FR`, label point, main-landmass extent) and places from the full `ne_10m_populated_places` (`NAME_EN`, `NAME_FR`, coordinates, `POP_MAX`); one new command `npm run pipeline:search` writing `pipeline/out-search/library/v1/search/index.json` (own output root, safe replace like Stories 1.8 and 1.9, `{source, licence, attribution, creditRequired}` metadata, deterministic, measured size in the French README); the dev middleware serves it at `/library/v1/search/index.json`; the client reads it from the app origin only, validates it, stores it in the Dexie `libraryCache` and reads it from there ever after; no geocoding API or third-party call (AD-16); loaded lazily on the first focus of the field, never at Editor open. Matching: query folded (lower case, accents and ligatures removed, apostrophes and hyphens as spaces, trimmed, at least 2 characters before anything shows), compared with the folded English and French names of every entry; a result is an entry whose name starts with the query or has a word starting with it; ranking: exact name, name starts with, word starts with, then countries before historical entities before cities, then larger `POP_MAX`/shorter name; at most 10 results, grouped under « Pays », « Entités historiques », « Villes » headers in that order; every result row shows its name in the UI language (French name for a French UI when it exists, else the other), the other-language name as secondary text when it differs, and its kind and country; « Londres » and « London », « Allemagne » and « Germany » both find the same entry; GeoEntity results are the entities valid in the current data date (the same selection as the Map: groups and polities, no hidden members, no relations) matched on their English Cliopatria name; historical city names (« Constantinople », « Stalingrad ») are not expected to match. Combobox: the ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, listbox with options), ↑/↓ move, Home/End first/last, Enter picks, Escape closes the list first (menu/popover priority) and then leaves the field (the registry rule), results announced politely (« 3 résultats » / « Aucun lieu trouvé »), mouse hover and click pick too, IME composition ignored; `/` focuses the field from anywhere except a text field or dialog and is listed in the `?` help and `docs/keyboard.md`. Picking: the edit camera centres on the place through the edit-camera store and `jumpTo` (never `flyTo`/`easeTo`), in reference zoom, inside the clamps of Story 1.10 (a city: reference zoom 6; a country or GeoEntity: its main-landmass extent fitted in the frame with a margin, never below the lowest zoom); a GeoEntity result is also selected: UI-only selection store (never in the Project), outlined by the render adapter with the ink-and-halo `canvas-selection` look (never the UI accent), announced (« Ottoman Empire sélectionné »), cleared by Escape in its place in the Escape order (after menu, dialog, drawing and drawer steps, before « return to Select »), and cleared when the Reference Date change removes the entity; the Project and the Presets are untouched. Empty state (UX-DR146): « Aucun lieu trouvé pour « Marioupl ». Vérifiez l'orthographe ou essayez un nom actuel. » and the English equivalent, in the UI language. When the index cannot be loaded (404, HTML, invalid JSON) the field keeps working for the loaded GeoEntities and shows « La recherche de lieux est indisponible. » when nothing else matches; no toast, no app console error. Search also works in a read-only Project. All strings are i18n keys in `fr` and `en`; the Story 1.7 Definition of Done applies (registry, keyboard, announcements, axe, `docs/keyboard.md`).

**Never:** No Region concept or wizard (Epic 6), no historical aliases (Epic 10), no Territory assignment or properties panel (Epic 2), no Step camera or Presets, no credit display (Story 1.13), no new network origin, no dependency that is not MIT/BSD/ISC/Apache.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Short query | 0 or 1 character | no list | N/A |
| Accents, case | « londres », « ALLEMAGNE », « cote d'ivoire » | London, Germany, Côte d'Ivoire found | N/A |
| Both languages | « Allemagne » and « Germany » | same country, name shown in the UI language | N/A |
| Historical entity | « ottoman » at 1900 | « Ottoman Empire » under « Entités historiques » | absent at a date when it does not exist |
| Pick a city | ↓ Enter on « London » | edit camera centred at zoom 6, Project unchanged | N/A |
| Pick an entity | Enter on « Ottoman Empire » | camera fitted on it, entity selected and outlined, announced | Escape clears it |
| Pick a country | Enter on « France » | camera fitted on the main landmass | N/A |
| No match | « Marioupl » | empty message in the UI language, announced | N/A |
| Historical city | « Constantinople » | no match, empty message | not an error |
| `/` shortcut | Map focused | field focused; `/` typed in a text field stays text | N/A |
| Escape | list open, then field | 1st press closes the list, 2nd leaves the field | N/A |
| Index unavailable | 404 or HTML | entities still searchable; message when empty | no toast, no console error |
| Cache | second Editor session, network cut | same results from Dexie | N/A |
| Date change | reference date moves | entity results follow the new data date; selection removed if the entity is gone | N/A |
| Read-only Project | opened elsewhere | search and camera work | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/editor/EditorTopBar.tsx:102-122` -- `SearchSlot`, a disabled `input type="search"` with tooltip « Bientôt disponible »: replace by the real combobox.
- `src/core/geo/` (`select.ts`, `geo.ts`) -- entity selection and index types; `src/core/evaluate/evaluate.ts` data date. `src/ui/editor/use-geodata.ts`, `EditorShell.tsx` -- loaded geodata and the Scene.
- `src/library/geo.ts` -- client pattern (validation, `libraryCache`, bounded fetch, `geo_unavailable`): follow it for `src/library/search.ts`; `src/persistence/index.ts` `readLibraryCache`/`writeLibraryCache`.
- `src/ui/editor/edit-camera-store.ts` (`setEditCamera`), `src/render/map-view.ts` (`setCamera`, `drawTerritories`, `GeoJsonLayer`, `MapView` interface), `src/ui/editor/MapArea.tsx`: camera application and the selection outline.
- `src/ui/keyboard/registry.ts` (`registerShortcuts`, `registerEscapeStep`, `TOOLTIP_ESCAPE_PRIORITY`), `map-shortcuts.ts`, `docs/keyboard.md`: `/`, Escape order.
- `src/core/evaluate/camera.ts` (`fitBounds`, `minEditZoom`), `frame.ts`: fit helpers.
- Pipeline: `pipeline/sources.ts` (`assertLicences`, manifests), `download.ts` (`fetchCached`), `vector.ts` (`readShapefile`), `build-geo.ts`/`build-basemap.ts` (`swapIn`, `assertReplaceable`, `parseArgs`), `dev-server.ts`, `pipeline/README.md`, `package.json` scripts, `.gitignore`.
- Natural Earth facts (sandbox reaches raw GitHub): `ne_10m_populated_places.dbf` is 48 MB (137 fields, 7,342 places), `.shp` 205 KB; `ne_10m_admin_0_countries.shp` 8.8 MB, `.dbf` 0.9 MB (258 countries, `NAME_EN`, `NAME_FR`, `LABEL_X`, `LABEL_Y`); about 1,336 places have a French name different from the English one.
- Tests never depend on `pipeline/out-search`: mock `/library/v1/search/index.json` with a fixture; `tests/e2e/fixtures.ts` already serves an empty geo dataset.

## Tasks & Acceptance

**Execution:**
- [ ] `pipeline/sources-search.json`, `pipeline/search.ts`, `pipeline/build-search.ts`, dev middleware route, `package.json` script (+ tests, guardrail fixtures for a bad licence)
- [ ] `src/core/search/` -- fold, match, rank, group (+ tests: accents, both languages, ranking, limits, the empty cases)
- [ ] `src/library/search.ts` -- load, validate, cache (+ tests with a fake fetch)
- [ ] `src/ui/editor/PlaceSearch.tsx` -- combobox in the top bar, announcements, `/` shortcut, Escape handling
- [ ] selection store, camera targeting, `src/render/map-view.ts` selection outline, Escape step
- [ ] `src/i18n/locales/{fr,en}.json`, `docs/keyboard.md`, `pipeline/README.md` (French, measured size)
- [ ] tests -- unit as above; e2e for every matrix row with the data mocked, axe on the combobox, no request leaving the app origin

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then everything passes without `pipeline/out-search` and without network.
- Given `npm run pipeline:search` and `npm run dev`, when the user types « Londres », « Germany » and « ottoman » (date 1900), then each lists its result, Enter centres the camera, and the Ottoman Empire is outlined and cleared by Escape.

## Implementation Notes

Decisions where the spec left latitude (all reversible, none touches a frozen section):

- **Index format** (`/library/v1/search/index.json`, `src/core/search/search-index.ts`, written by `pipeline/search.ts`): `{schemaVersion: 1, dataset: {id: "places-search", version: "1", source, licence, attribution, creditRequired}, countries: [{en, fr, lon, lat, bounds, pop}], places: [[en, fr, lon, lat, popMax, country]]}`. `fr` is `""` when it equals `en`; `country` is an index into `countries` (matched by `ADM0_A3`, then by English name) or the country's English name as text when it is not in the list (2 places). Measured: 258 countries, 7,342 places (1,336 with a different French name), 327.9 KiB (141.1 KiB gzipped), byte-identical on a second run.
- **Main landmass** = the polygon of largest area (longitude scaled by cos of the mean latitude, holes subtracted), `src/core/search/landmass.ts`, import-free so the pipeline reads the same file. Countries use it in the pipeline, entities in the client (`entityCandidates`).
- **Folding** also turns every other non-letter, non-digit character (parentheses, full stops) into a space, a superset of « apostrophes and hyphens ». Needed so that Cliopatria's aggregate names « (Roman Empire) » and « St. Louis » match; aggregates are shown without their parentheses.
- **Ranking then grouping**: the ten best by (quality, kind, population, name length) are taken, then listed by group, so an exact city can sit under a country that only starts with the query when ten results compete.
- **Enter with no active option picks the first result**; Home/End move in the list only while it is open. After a pick the focus goes to the Map region, so that Escape clears the selection in one press and the arrows pan; `/` returns to the field.
- **Camera**: north up (bearing 0), city zoom 6, country/entity fitted in 80 % of the frame (10 % margin each side), at most zoom 8 for a very small extent, never below `minEditZoom`; the jump goes through `setEditCamera` and the existing MapArea effect (`jumpTo`).
- **Selection outline**: 4.5 px solid halo (`canvas-halo`) under a 1.6 px dashed ink line (`canvas-ink`), screen px, from `MapView.setSelection`; the colours are the mono tokens, passed by the UI. This adds `@deck.gl/extensions` 9.4.0 (MIT, `PathStyleExtension`, same version line as the other deck.gl packages) for the dash.
- **Escape step** priority 10 (`SELECTION_ESCAPE_PRIORITY`), between the future drawing/drawer steps and « return to Select » (0). The selection is also cleared on Editor unmount and when the Map no longer draws the entity (Reference Date change, hidden Territories Layer).
- **No tooltip on the field** (a focus tooltip would cover the results): a `/` hint in the field and `aria-keyshortcuts="/"` instead.
- New `DomainErrorCode` `search_unavailable`; the client does not remember a failure, so a later focus tries again.
- Tests: the e2e `fixtures.ts` serves a small search index by default (`src/core/testing/search-fixtures.ts`), so a focus on the field in any spec never reaches `pipeline/out-search`.

Not verifiable today: « Read-only Project, opened elsewhere » depends on the edit lock of Story 1.14. The search never uses the dispatcher, a Command or the autosave (an e2e test checks the stored Project row is byte-identical after a pick), so it works the same in a read-only Project; a newer-than-app document opens without a Map, and its field is inert (no frame to centre on).

## Spec Change Log

## Review Triage Log

Three independent reviewers (adversarial, edge cases, verification gaps) found 0 high, 8 medium and about 20 low items. Patched: announce "selected" only for entities the Scene draws, index load when the field is focused before the Scene arrives, 15 s fetch timeout, IME keyCode 229 and blur reset, popover mousedown guard, pipeline output validation with a sanity floor, Antarctica latitude clamp, input maxLength, plus tests (real-index check, map-view selection layers, dashed outline and no accent pixel, Settings dialog over a selection, unmount, French announcements and axe, Home/End). Measured entityCandidates 0.6 to 6.1 ms, left eager. Deferred (see deferred-work.md): index cache revalidation, selection layers in export frames, antimeridian entity extents. Rejected: north-up reset on pick, extra letter folding, duplicate-name disambiguation, `/` during a menu. Not testable yet: Pan/Draw tool Escape order (tools do not exist), Territories layer toggle (no UI).

## Design Notes

Decisions taken in planning (owner may override): the pipeline step is separate (`pipeline:search`, own output root) so the basemap build never deletes it; the full populated-places file (48 MB, cached once) is needed because only it carries French names; the index stays under about 1 MB; Enter on any result centres the camera and, for an entity, also selects it (the AC), the separate « Sélectionner » button of EXPERIENCE.md is not built; the selection is highlighted only (the properties panel arrives with Epic 2); GeoEntity names are English because Cliopatria has no French names; a city centres at reference zoom 6, about 21° of longitude across a 1920 px frame.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over several runs
- `npm run pipeline:search` (sandbox) -- expected: index built, counts and size printed, second run identical
