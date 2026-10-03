---
title: 'Story 1.11: Reference date and historical GeoEntities'
type: 'feature'
created: '2026-10-03'
status: 'done'
baseline_commit: '9b3745ac99243bb35dbacb484299d4732a346781'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Map shows no countries: the Project has a Reference Date that nothing displays or lets the user change, dates cannot be compared or written in French or English, the historical data of Story 1.9 is never fetched, and the Project pins no data version.

**Approach:** Date compare, format and parse in `src/core`; a Project schema v2 that pins the geo dataset; a `src/library` client that fetches the Cliopatria index and states and keeps them in a Dexie Library cache; the evaluator turning the data valid at the Reference Date into neutral Territory items; deck.gl drawing them; a Reference Date field in Project settings and a nearest-data chip. Epics.md Story 1.11 ACs (FR-6, AD-12, AD-13, AD-25, AD-27; UX-DR59, 88, 147) are binding.

## Boundaries & Constraints

**Always:** Dates: `compareHistoricalDates`, and `src/core/format` writing a HistoricalDate with `project.mapLocale` (« 52 av. J.-C. » with non-breaking spaces, "52 BC", years from 1 as « 1453 »), never through i18n; a parser for the field accepting « 1453 », « -51 », « 52 av. J.-C. », « 52 BC », « 52 BCE », « 1 BC » (year 0 and out-of-range years are errors). Input is year precision (UX-DR147): invalid input shows the message under the field with the danger icon and keeps the previous value (« L'année 0 n'existe pas. Saisissez 1 av. J.-C. ou 1. » / « Saisissez une année, par exemple 1463 ou 52 av. J.-C. », English equivalents); a date outside the data range is not an error. The field commits on Enter or blur as one `SET_REFERENCE_DATE` Command (no dialog: nothing converts yet; the FR-6 confirmation of Territories that stop existing arrives with Epic 2), undoable, and the label is always « Date de référence », never confused with a Step date (UX-DR88). Schema: `schemaVersion` 2 adds `pins: {geo: {dataset: 'cliopatria', version: '0.2.0'}}` through a migration v1 → v2 (AD-9: Zod schema, committed JSON Schema snapshot `schemas/project-v2.schema.json`, v1 snapshot kept, fixture test, guardrail), blank Projects and every stored v1 Project get the pin. Data: the client reads `/library/v1/geo/index.json` and `/library/v1/geo/<entityId>/<fromYear>.json` for the pinned dataset (Story 1.9 layout, canonical key `cliopatria@0.2.0:<entityId>`), validates every response, stores each fetched file in a new Dexie `libraryCache` table through `src/persistence` and reads it from there ever after (immutable paths, no invalidation, AD-27), fetches in bounded parallel, and makes no request when everything is cached. Evaluator: `evaluate` stays pure; `ctx.geodata` carries the loaded index and states of the pinned version; the data date is the Reference Date year if an entity state exists in it, else the nearest year that has data (dataset-level, e.g. 2030 → 2024); the Scene carries the Territory items valid at the data date and `dataDate: {year, exact}`; one item per displayed entity with its canonical key, whole polygons, `z` in the Project Layers band, style from the active Basemap's resolved `coast` colour (adjustments apply) as a thin outline in reference px scaled by `s` and no fill (neutral Territory, DESIGN.md « frontières d'Entités non attribuées (map-coast) »). deck.gl draws them through the existing `MapLibreOverlay`; outlines never use the UI accent. The nearest-data chip (`nearest-data-chip`: « Données les plus proches : 1454 » / "Nearest available data: 1454", info icon) shows in the options bar and under the date field only when `exact` is false. While data loads, the previous Territories stay; editing is never blocked. When the data cannot be loaded (404, HTML fallback, invalid JSON, pinned version absent), no Territory is drawn, no toast, no app console error, and a caption « Données historiques indisponibles. » shows under the date field. All strings are i18n keys in `fr` and `en`; Definition of Done of Story 1.7 applies (keyboard, announcements « Date de référence : 1453 », axe).

**Never:** No Territory assignment, Factions or painting (Epic 2), no place search (Story 1.12), no credit display (Story 1.13), no Step dates, no Region, no Library drawer, no month or day input, no change to the pipeline or the data layout, no data origin other than the app origin.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open a Project | default 1900, data present | outlines of the entities valid in 1900 | N/A |
| Valid year | « 1453 », « -51 », « 52 av. J.-C. », « 52 BC » | one `SET_REFERENCE_DATE`, Map updates, Ctrl+Z restores | N/A |
| Year 0 | « 0 » | message under the field, previous date kept | no Command |
| Not a year | « abc », empty, 99999 | message under the field, previous date kept | no Command |
| No exact data | 2030, -3500 | nearest data year used (2024, -3400), chip shows it | not an error |
| Exact data | 1900 | no chip | N/A |
| First fetch | cache empty | index and states fetched, stored in Dexie | N/A |
| Later reads | cache filled, offline | no request, same Territories | N/A |
| Data unavailable | 404, HTML, bad JSON | no Territory, caption under the field | no toast, no console error |
| Locale | mapLocale fr / en | « 52 av. J.-C. » / "52 BC" in field and chip | N/A |
| Old Project | stored v1 document | migrated to v2 with the pin, opens normally | N/A |
| Output Format change | 16:9 → 9:16 | outlines recomputed with the new frame scale | N/A |

**Decisions (owner, 2026-10-03):**
- Displayed entities (option A, « countries view »): the evaluator shows `polity` and `group` entities valid at the data date, hides every polity that is a member (`memberOf`) of a group also valid at that date, and hides every `relation`; at 1500 that is 112 outlines. Epic 2 can expand a group into its members later.
- Full spec kept (~3,400 tokens); Sonnet subagents for implementation and review.

</frozen-after-approval>

## Code Map

- `src/core/dates/historical-date.ts` -- `historicalDateSchema`, `sameHistoricalDate`; no compare, no format, `src/core/format` does not exist.
- `src/core/model/project.ts:88-115`, `src/core/schema/index.ts` (`CURRENT_SCHEMA_VERSION`, empty `migrations`, `validate`), `src/core/model/blank-project.ts`, `schemas/project-v1.schema.json`, `tests/guardrails/schema-check.ts` + `schema-snapshot.test.ts`, `scripts/schema-snapshot.mjs`: schema v2 work; the model header says data pins arrive with a new schemaVersion and a migration.
- `src/core/commands/` -- `SET_REFERENCE_DATE` exists with its inverse (`handlers.ts`), reuse unchanged.
- `src/core/evaluate/scene.ts` (`EvaluateContext.geodata` is `{}`, `SceneItem`), `evaluate.ts`, `z-bands.ts`: extend; `EditorShell.tsx:105` builds the context.
- `src/library/index.ts` -- empty stub; `src/persistence/db.ts` (Dexie versions 1-2), `index.ts`, `tests` pattern in `projects.test.ts`: new `libraryCache` table (version 3), accessed only through `src/persistence/index.ts`; `src/library` imports persistence only through its index.
- `src/render/map-view.ts` -- `MapLibreOverlay` mounted with `layers: []`, `setScene`: draw the Territory items with `@deck.gl/layers` (stroke only, `lineWidthUnits: 'pixels'` scaled by `s`).
- `src/ui/editor/ProjectSettingsPanel.tsx`, `BasemapSettings.tsx`, `EditorRegions.tsx` (`OptionsBar`): date field, caption and chip; `src/ui/components/` has `Slider`, `Banner`, `RenameField` for patterns.
- Data in the sandbox: `pipeline/out-geo/` (run `npm run pipeline:geo`); the dev server already serves `/library/v1/geo/`; CI and the Pages preview have none: tests mock `/library/v1/geo/**`.
- Geo index: `{schemaVersion: 1, dataset: {id, version, …}, entities: [{id, name, kind: polity|group|relation, memberOf: [ids], components?, states: [[from, to], …]}]}`; every year from -3400 to 2024 has at least one non-relation entity.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/dates/` compare, `src/core/format/` format and parse (+ tests: BCE, year 0, year-only, fr and en, NBSP)
- [x] `src/core/model/project.ts`, `schema/`, `blank-project.ts`, `schemas/project-v2.schema.json` -- schema v2 with the pin, migration and fixture, guardrail updated
- [x] `src/persistence/` -- `libraryCache` table and API (+ tests)
- [x] `src/library/` -- index and state client with validation, cache, bounded parallel fetch (+ tests with a fake fetch)
- [x] `src/core/evaluate/` -- data date, entity selection per the answer, Territory items, `dataDate` (+ tests: determinism, nearest data, view level, z, scale)
- [x] `src/render/map-view.ts` -- deck.gl outlines from the Scene
- [x] `src/ui/editor/` -- date field, errors, caption, chip, loading wiring in `EditorShell`; announcements
- [x] `src/i18n/locales/{fr,en}.json`, `docs/keyboard.md` if keys are added
- [x] tests -- unit as above; e2e for every matrix row with the data origin mocked (fixture index and states), axe on the new controls, no request leaving the app origin

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then everything passes without `pipeline/out-geo`.
- Given the dev server with `pipeline/out-geo` built, when the Reference Date is set to 1453, 1900 and 52 BC, then each shows its outlines, one Ctrl+Z returns to the previous date, and a second visit with the network cut shows the same outlines.

## Implementation Notes

- Dates: `compareHistoricalDates` (`src/core/dates/compare.ts`); `src/core/format` writes years with `project.mapLocale` (« 52 av. J.-C. » with non-breaking spaces, "52 BC") and parses the field (`year_zero`, `not_a_year`). Schema v2 adds `pins.geo` with a frozen v1 → v2 migration, `schemas/project-v2.schema.json`, v1 snapshot kept.
- `src/core/geo` holds the index and state validators and the entity selection (nearest data at dataset level, earlier year on a tie; a group that is itself a member of a larger valid group is hidden too, which gives the 112 outlines at 1500 of decision A). `evaluate` stays pure: `ctx.geodata = {index?, states?}`, Scene `dataDate {year, exact}`, outline-only Territory items in the Territories Layer band (1.5 reference px, adjusted `coast` colour); a hidden or missing Territories Layer yields no items.
- `src/persistence` `libraryCache` table (Dexie version 3); `src/library/geo.ts` fetches with parallelism 8, validates, reads the cache ever after; all or nothing per date.
- UI: `ReferenceDateField`, `NearestDataChip` (options bar and under the field, announced through the shared announcer), `use-geodata.ts` (previous Territories stay while loading). e2e specs import `test`/`expect` from `tests/e2e/fixtures.ts`, which serves an empty geo dataset by default.
- Test hooks `data-territories`, `data-territory-keys`, `data-outline-width` on the Map container.
- Sandbox check with the real `pipeline/out-geo`: 1453, 1900, 52 BC and 2030 show 104, 76, 43 and 190 outlines; 2030 shows the chip « 2024 »; no console error.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind, edge | Hidden Territories Layer still draws; missing Layer falls back to Layer 0's z | medium | AD-24: hidden Layers are absent from the Scene. patch |
| 2 | blind | Migration v1 to v2 reads the mutable default pin | medium | A future default would mislabel old Projects. patch |
| 3 | blind, edge | Date field wipes a refused entry; blur can clear the error; IME Enter; stuck skip flag | medium | UX-DR147 keeps the previous value, not the user's chance to fix. patch |
| 4 | blind | No `loading` status on a later date change, stale caption | low | `use-geodata.ts`. patch |
| 5 | edge | Nearest-data chip announced only if mounted live | low | Definition of Done (announcements). patch |
| 6 | blind, edge | Entity id alphabet unrestricted; unclosed rings accepted | low | Cache keys and URLs use the id. patch |
| 7 | blind, edge | Cache errors throw; aborted loads keep fetching; invalid JSON reported as fetch | low | `src/library/geo.ts`. patch |
| 8 | verification-gap | Ctrl+S in the date field untested; pixel test cannot tell fill from outline | medium | Pre-verified. patch |
| 9 | verification-gap | Writer (pipeline) and reader (client) never tested together | low | Contract drift risk. patch |
| 10 | verification-gap | Previous Territories kept while loading not pinned by a test | low | Covered with row 4. patch |
| 11 | blind | `-51` ambiguity (astronomical vs 51 BC) | low | Spec Always lists « -51 » as accepted. reject |
| 12 | blind | Committing a year drops month and day | low | Input is year precision by spec. reject |
| 13 | blind | Library cache without eviction, quota handling | low | Immutable, about 100 small files. reject |
| 14 | blind, edge | Outline style read from the first item; colour format assumptions | low | One style today. reject |
| 15 | blind | `@deck.gl/layers` dependency, dev server, sprint status missing from the diff | false | Direct dependency since Story 1.10; the dev server serves geo since Story 1.9; sprint sync at the present step. reject |
| 16 | blind | Same chip twice | low | Specified: options bar and under the field. reject |
| 17 | blind | `compareHistoricalDates` has no caller | low | Required by the AC (compare). reject |
| 18 | edge | Member hidden while the group file is missing | low | The load is all or nothing. reject |
| 19 | edge | `useGeodata` state kept when the Project changes | false | `EditorShell` is keyed by project id. reject |
| 20 | edge | Migration overwrites an existing `pins` | false | v1 is strict: no `pins` key can exist. reject |
| 21 | edge | A group inside a larger valid group is also hidden | low | Matches the 112 outlines at 1500 of decision A. noted |

## Design Notes

Decisions taken in planning (owner may override): territories are outline-only (no fill) because neutral land is the Basemap's land colour; the pin holds the geo dataset only (the tileset pin comes with Epic 7's versions); « nearest » is dataset-level, never per entity, so extinct entities are not resurrected; the confirmation dialog for the FR-6 conversion is deferred to Epic 2 where Territories exist; group members stay in the data for Epic 2.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over several runs
- visual check in dev with `pipeline/out-geo` built -- expected: outlines for 52 BC, 1453, 1900, 2024; chip for 2030
