---
title: 'Story 1.13: Sources, licences and map credit'
type: 'feature'
created: '2026-10-04'
status: 'done'
baseline_commit: '37be565a1eb579be9979737cfdd65b1c8b60d6c2'
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

**Decisions (owner, 2026-10-06):**
- Optional credits (`creditRequired: false`: Natural Earth, glyph fonts) are never drawn on the Map; they appear only in « Sources et licences ». No `credit.showOptional` field; `project.credit` stays `{corner, prominence}` (AD-17). A later story that adds an optional-credit source decides how to show it.
- Full spec kept; Sonnet subagents for implementation and review.

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

Decisions where the spec left latitude (all reversible, none touches the frozen block):

- **Schema v3** `credit: {corner, prominence}` (`DEFAULT_CREDIT` bottom-left, discreet); migration `2 → 3` writes the literal default; `schemas/project-v3.schema.json` written by `npm run schema:snapshot`; a v2 snapshot test joins the v1 one. `SET_CREDIT` takes `{corner?, prominence?}` (at least one; an empty payload is `invalid_payload`), no-op when equal, inverse restores both values.
- **Metadata path**: `SourceMeta = {id, source, licence, attribution, creditRequired}` in `src/core/credit/sources.ts`. `parseDatasets` validates `datasets.json` (`datasets_unavailable` error code); `geoIndexSchema` keeps `source`, `licence`, `attribution` (trimmed, non-empty) and `creditRequired` of the `dataset` block and **requires** all four: drawing the borders and crediting them are atomic (AD-17), so an index without or with an incomplete block is `geo_unavailable` and nothing is drawn from it. A test reads the real `pipeline/out-geo` index when present. `ctx.datasets` carries the Basemap metadata, the geo metadata comes from `ctx.geodata.index`.
- **Cache**: `datasets.json` is cached in `libraryCache` under `library/v1/datasets` (raw document), like the search index. A geo index cached before this story holds no metadata (the parsed output was cached), so it fails the schema, is a cache miss, is fetched again and the row replaced: once, not on every open; with the network down it is unavailable.
- **Drawn sources** (`src/core/credit/credit.ts`): Basemap = `natural-earth-v1`, `basemap-styles-v1` (fixed order), plus `glyphs-v1` only if `basemapDrawsLabels(basemap)`, which is `false` for every Basemap today (the pipeline styles have no text layer, labels are deck.gl, AD-6). Cliopatria only when Territory items are emitted. The credit line writes an attribution shared by two required sources once.
- **Sources list**: every loaded source, drawn or not, one row per (name, licence, attribution): the tiles and the styles are both « Natural Earth » and make one row. Order: `datasets.json` order, then the geo dataset.
- **Colours**: the spec's `SceneCredit` shape has no colour; the renderer takes `map-label` and `map-label-halo` of the active Basemap from the core palette (`mapColors[scene.basemap.id]`), not from the CSS. Brightness/saturation/tint adjustments do not touch credit colours.
- **Rendering**: `src/render/credit-layout.ts` (pure: anchor, offset, wrap, `MAX_CREDIT_LINES = 2`) and one deck.gl `TextLayer` in `map-view.ts`. The type tokens come from `src/ui/theme/tokens.ts` through `MapView.setCreditStyle` (render never imports ui, no value retyped). The anchor is the frame corner (screen px), unprojected with `map.unproject` and re-pushed on every map move, layout or Scene change, so the credit stays in the frame while the Map moves under it. Margin, size, halo and band padding are reference px times `s`. « Discrète »: SDF text with a 3 ref px `map-label-halo` outline. « Lisible »: halo band behind the text, 90 % opaque, padding 12 × 6 ref px, its outer edge at the 24 px margin (`[ASSUMPTION]` in the code: DESIGN.md gives neither padding nor opacity). The credit has its own non-interleaved `MapLibreOverlay` with a `MapView({repeat: false})`: deck.gl repeats every layer of an overlay in each world copy, and a frame wider than the world (16:9 at the default view) would otherwise show the credit twice inside it (a scissor alone does not prevent that). Its position is given in the world copy of the view-state centre; a scissor on the frame, clamped to the buffer, keeps it in the frame; its canvas is kept out of the tab order. The text layer's `updateTriggers` cover everything that shapes the layout (anchor, baseline, size, font), or a new corner would keep the old glyph layout.
- **Wrapping**: greedy word wrap measured with a canvas 2D context in the credit font, to the frame width minus both margins; at most 2 lines; a text that still needs a third line is set a little smaller (down to half size) rather than clipped, then wraps further as a last resort. Never reached by the real credit (one line in the narrowest frame at both prominences).
- **Font readiness**: `document.fonts.load('<weight> 100px <stack>', text)` per weight; the layer is added only when it resolves (or rejects: the fallback face is then drawn) and the overlay is pushed again, so the text appears with no layout jump and nothing waits for it. `data-credit-state` is `none | pending | drawn` on the Map container for tests.
- **Settings**: the advanced row « Plus d'options » now exists on the Project panel (summary « Sources et licences »); it holds the credit group (locked row with padlock and no checkbox only while a required credit is drawn, otherwise a plain sentence; native `<select>` « Position »; segmented « Discrétion » Discrète / Lisible) and the Sources section. The row is absent for a newer-than-app document. The credit group is always shown, even without a required source, because the placement is stored (no optional-credit toggle, per the owner decision). Copy: « Obligatoire : la licence d'une source de la Carte demande ce crédit. Vous choisissez sa position et sa discrétion. » (the EXPERIENCE.md sentence with « Fond satellite » generalised, as the spec's facts note). Announcement « Crédit en bas à droite, lisible ». No shortcut is added, so `docs/keyboard.md` is unchanged.
- **Tests**: `tests/e2e/fixtures.ts` serves `datasets.json` and a geo index with the full dataset block (no entity) by default; `tests/e2e/credit.spec.ts` covers the matrix; `accessibility.spec.ts` adds the section in light and dark, EN and FR. `reference-date.spec.ts` now serves `GEO_INDEX_WITH_META` (the index the pipeline writes) and expects the extra `library/v1/datasets` cache key.
- Pipeline outputs and README unchanged: the real `pipeline/out-geo` index already carries the four fields and `pipeline/out/library/v1/datasets.json` the three entries. The real flow was run once against them (dev server, cached Cliopatria and Natural Earth): the credit and the Sources list appeared as expected.

Not verifiable today: « Read-only Project, opened elsewhere » depends on the edit lock of Story 1.14; the disabled controls are checked on the rendered markup and the dispatcher's `read_only` rejection of `SET_CREDIT` in a unit test, and a newer-than-app document is the only read-only state reachable in e2e.

## Spec Change Log

## Review Triage Log

Three independent reviewers (adversarial, edge cases, verification gaps) found 0 high-severity code defects, 1 AD-17 medium, and 2 high test gaps. Patched: Cliopatria is never drawn without complete metadata (atomic with crediting; a metadata-less cached index is a miss, refetched at most once), scissor derived from the frame and clamped, empty/zero frames draw nothing, halo-aware wrapping, memoised layout with a stable data row, font readiness keyed by charset, trimmed attributions, break-words in settings, datasets load retry, Sources listed only for the pinned dataset, neutral announcement when no credit is drawn; tests for corner/margin placement (±3 px, opposite corner empty, no ink outside the frame), DPR 2, camera-following, painted Legible band, every basemap/adjustment/format/date, Territories hidden, single datasets request and offline credit, slow font, token parity, glyphs branch, read-only dispatcher, axe states. Also fixed the real race in the Story 1.12 place-search test (wait for the list before Enter). Not done: grapheme-cluster word breaking, jsdom getContext noise. Known: a 10x repeat of place-search under 4 workers failed 3 of 530 at `readyEditor` (map style still loading after 5 s under heavy load); the same tests pass 50/50 at lower load, recorded in deferred-work.md.

## Design Notes

Decisions taken in planning (owner may override): metadata is read from the loaded dataset documents (pinned by AD-12), not copied into the Project and not a hard-coded table, so a credit string can never drift from the pipeline; the credit needs schema v3 because AD-9 forbids optional new fields; offset is the fixed 24 reference px margin, so only `{corner, prominence}` is stored (AD-17); Natural Earth and OFL fonts are `creditRequired: false` and are listed in Sources only; the Export dialog locked-credit row (UX-DR131) arrives with Epic 4.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over two runs
