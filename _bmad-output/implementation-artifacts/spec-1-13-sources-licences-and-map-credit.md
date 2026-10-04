---
title: 'Story 1.13: Sources, licences and map credit'
type: 'feature'
created: '2026-10-04'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Map shows Cliopatria borders (CC BY 4.0, credit required) with no credit anywhere, the licence metadata the pipelines already produce is dropped by the client, and the Project has no place for the credit position.

**Approach:** Project schema v3 adds `credit = {corner, prominence}` with a Command; the client keeps the dataset metadata of every loaded source; the evaluator builds one locked credit line from the sources actually drawn and emits it in the credit z band; the render adapter draws it with deck.gl text in the chosen corner; a « Sources et licences » list and the credit controls live in Project settings. Epics.md Story 1.13 ACs (FR-10; AD-17, AD-20, AD-23, AD-24; UX-DR21, UX-DR108) are binding.

## Boundaries & Constraints

**Always:**
- Model: schema version 3 with `credit: {corner: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right', prominence: 'discreet' | 'legible'}`, default `{bottom-left, discreet}`; migration `2 → 3` adds the default; `schemas/project-v3.schema.json` snapshot; blank Project and test fixtures updated; a newer-than-app document still opens without a Map (Story 1.4 behaviour). The Command `SET_CREDIT` (in `src/core/commands`, inverse, undoable, one history entry per change, rejected in a read-only Project like every Command) changes only `corner` and `prominence`. No command, field or UI can hide a required credit.
- Metadata: every source carries `{source, licence, attribution, creditRequired}` (AD-17). The geo index schema keeps the whole `dataset` block (today it keeps `id` and `version` only). `/library/v1/datasets.json` (Story 1.8) is loaded lazily by a new `src/library` function with the same validation and `libraryCache` rules as the geo index, no new origin. The loaded metadata reaches the evaluator through its `ctx`, never through the Project.
- Sources actually drawn: the Basemap style and its tiles (datasets `natural-earth-v1` and `basemap-styles-v1`, plus `glyphs-v1` when the style draws labels) whenever the Map is drawn; Cliopatria only when Territory items are emitted (Territories Layer present and visible, pinned index loaded, at least one state drawn). A source whose metadata is not loaded is not listed or credited (never a guessed string).
- Credit line: pure function in `src/core` (new `src/core/credit/`), built from the `attribution` of every drawn source with `creditRequired: true`, in a fixed order (Basemap sources, then geo), joined with « · », the exact wording of the source, never translated, independent of the UI language and of `mapLocale` (AD-20). No required source drawn → no credit item. The evaluator emits one `SceneCredit` item `{kind: 'credit', text, corner, prominence, z: Z_BANDS.credit}` (never below it, never culled), deterministic, no Date/random.
- Rendering (`src/render`): deck.gl text (the first text layer of the app) at the frame corner with a 24 reference px margin (`map-credit-margin`), `map-credit-discreet` (18/400) or `map-credit-legible` (24/500) sans from the tokens, `map-label` colour with `map-label-halo` halo, a legible halo band behind the text for « Legible », all sizes multiplied by the scale `s` (AD-23), anchored in the output frame (not the viewport), wrapped to the frame width on at most 2 lines (shortened by wrapping, never clipped). Font loading must not block or flash: the text appears once the font is ready. No CSS transition, no deck.gl `transitions`.
- Project settings: a « Sources et licences » section in the advanced group (Story 1.6 pattern; `MoreOptions`) listing each source drawn or loaded for this Project with name, licence, attribution and a « Crédit obligatoire » marker when `creditRequired`; and a credit group with a « Position » Select (4 corners) and a « Discrète / Lisible » segmented control. The required-credit explanation (EXPERIENCE.md, FR/EN, never « Crédit non modifiable ») is shown with a padlock and no checkbox. Controls dispatch `SET_CREDIT`; disabled in a read-only Project. All strings are i18n keys in `fr` and `en`; Definition of Done of Story 1.7 applies (registry, keyboard, announcements « Crédit en bas à droite, lisible », axe, `docs/keyboard.md` only if a shortcut is added).
- Pipeline outputs are unchanged; if a field the client now needs is missing from an index it is added in the pipeline and its README, never inferred.

**Never:** No Export dialog, no export of the credit (Epic 4), no per-source toggle for required credits, no user-edited attribution text, no credit editing on the Map itself, no change to Natural Earth or Cliopatria data, no new network origin, no dependency that is not MIT/BSD/ISC/Apache.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default | new Project, Territories drawn | credit « Historical borders: Cliopatria, … CC BY 4.0. » bottom-left, discreet | N/A |
| Change position | Select « Haut à droite » | credit moves, one undo step, announced | read-only: control disabled |
| Legible | segmented « Lisible » | 24/500 on halo band, scaled by `s` | N/A |
| Territories hidden or no data | layer hidden, or geo index absent | no credit item; Sources still lists loaded sources | no error |
| Basemap only | no Territories Layer | no required source: no credit item | N/A |
| French UI, English mapLocale | any | credit wording unchanged (source wording) | N/A |
| Output formats | 16:9, 9:16, 1:1 | credit inside the frame at 24 ref px margin in every corner | long text wraps, never clipped |
| Required credit | any path | no control, Command or migration can hide it | invalid document rejected by schema |
| Older document | schema v2 | migrated, credit default, undo stack unaffected | N/A |
| Newer document | schema v4 | opens without a Map (existing behaviour) | N/A |
| Metadata unavailable | `datasets.json` 404/HTML | Basemap not listed or credited; Cliopatria still credited from its index | no toast, no console error |
| Font not ready | first frame | credit appears when ready, no layout jump | N/A |

</frozen-after-approval>

## Code Map

- `src/core/model/project.ts:136-145` (`schemaVersion: 2`, `pins.geo`; new fields only with a new version), `src/core/schema/index.ts:22-25` (migrations), `schemas/project-v*.schema.json`, `tests/guardrails/schema-check.ts`, `schema-snapshot.test.ts`, `blank-project.ts`, `src/core/testing/fixtures.ts`.
- `src/core/commands/command.ts`, `handlers.ts` (`SET_MAP_LOCALE` at l.46 is the template; dispatch switch l.116-128), `apply.ts`, a `set-*.test.ts` per command.
- `src/core/evaluate/scene.ts`, `evaluate.ts`, `z-bands.ts` (`Z_BANDS.credit = 5000`, unused), `ctx` type; `src/core/geo/geo.ts:26-30` (`geoIndexSchema` keeps only `{id, version}`); `src/core/format/` (pattern for pure text builders).
- `src/library/geo.ts`, `search.ts`, `index.ts` (client load, validation, `libraryCache`); `src/ui/editor/use-geodata.ts`, `EditorShell.tsx`, `editor-model.ts` (build the model and ctx).
- `src/render/map-view.ts` (`MapView`, deck.gl overlay, `s` at l.59, `setSelection` as the pattern for a new layer set), `src/ui/theme/tokens.ts:156-157,213` (`map-credit-*` tokens).
- `src/ui/editor/ProjectSettingsPanel.tsx` (SegmentedControl + `actions.dispatch`, `editable` rule; l.76 comment announces the advanced row), `MoreOptions.tsx`, `BasemapSettings.tsx`.
- Facts: `datasets.json` has 3 entries (`natural-earth-v1`, `basemap-styles-v1`, `glyphs-v1`, all `creditRequired: false`); Cliopatria is the only required credit: « Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0. »; nothing in `src` fetches `datasets.json` today; the app has no deck.gl text, fonts for the map come from MapLibre glyphs (Libre Baskerville, Source Sans 3, OFL); no satellite Basemap exists (EXPERIENCE.md copy « Fond satellite » is generalised).
- Tests: unit for migration, schema snapshot, Command and inverse, credit builder, evaluator item, library loaders (fake fetch), render layer (stub deck, as `map-view.test.ts`); e2e on the matrix with `tests/e2e/fixtures.ts` serving `datasets.json` and the geo index with metadata; axe for the section; no request leaves the app origin.

## Tasks & Acceptance

**Execution:**
- [ ] schema v3, migration, snapshot, fixtures, `SET_CREDIT` (+ tests)
- [ ] `geoIndexSchema` keeps the dataset block; `src/library` datasets loader; `ctx` carries drawn-source metadata (+ tests)
- [ ] `src/core/credit/` builder and `SceneCredit` emission in `evaluate` (+ tests)
- [ ] `src/render` credit text layer, corners, prominence, scale `s`, font readiness (+ test)
- [ ] Settings: Sources section, Position and prominence controls, i18n fr/en, announcements (+ e2e, axe)
- [ ] `docs` and pipeline README touched only where a field changed

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then everything passes with fixtures only and without network.
- Given Territories drawn, when the user opens the Editor, then the Cliopatria credit shows bottom-left, discreet, cannot be hidden, and « Sources et licences » lists every loaded source with licence and attribution.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Decisions taken in planning (owner may override): metadata is read from the loaded dataset documents (pinned by AD-12), not copied into the Project and not a hard-coded table, so a credit string can never drift from the pipeline; the credit needs schema v3 because AD-9 forbids optional new fields; offset is the fixed 24 reference px margin, so only `{corner, prominence}` is stored (AD-17); Natural Earth and OFL fonts are `creditRequired: false` and are listed in Sources only; the Export dialog locked-credit row (UX-DR131) arrives with Epic 4.

## Open Questions

1. **Optional credits (`creditRequired: false`, today Natural Earth and the fonts).** The AC says « an optional credit can [be hidden] » but AD-17 stores only `{corner, prominence}`.
   - **A (recommended):** optional credits are never drawn on the Map, they only appear in « Sources et licences ». Nothing to hide, no extra field, spine kept as written. A future source with an optional credit can be drawn later by a story that adds the choice.
   - **B:** add `credit.showOptional` (default `false`) to schema v3 and a « Afficher les crédits facultatifs » checkbox; when on, optional attributions join the credit line. Slightly beyond AD-17 (needs the spine to allow a third field).

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over two runs
