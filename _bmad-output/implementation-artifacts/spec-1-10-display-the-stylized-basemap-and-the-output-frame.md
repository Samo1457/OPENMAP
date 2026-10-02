---
title: 'Story 1.10: Display the stylized Basemap and the output frame'
type: 'feature'
created: '2026-10-02'
status: 'done'
baseline_commit: 'c5959f6cd628eb6876171fa348ca757a736e3ab8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Map area is a flat colour: there is no evaluator, no renderer, no Basemap picker, no visible output frame and no edit camera, so nothing can be composed on a map yet.

**Approach:** A pure `evaluate(project, t, ctx) → Scene` in `src/core` (Basemap state with adjustments applied to the resolved palette, default camera, fixed `z` bands), a `src/render` adapter drawing the Scene with MapLibre GL JS plus a `@deck.gl/maplibre` overlay (mode chosen by a short documented spike), an edit camera kept as UI state, a dimmed output frame, and the Basemap picker with sliders in Project settings. Epics.md Story 1.10 ACs (AD-1, AD-6, AD-23, AD-24; UX-DR21, 58, 101, 103, 105, 106, 109) are binding.

## Boundaries & Constraints

**Always:** `evaluate` is pure and deterministic (no clock, no random, no DOM); `ctx = {geodata, frame}` with an empty `geodata` for now; the Scene is plain serializable data. The Basemap palettes (`mapColors`, `mapExtraColors`) move to `src/core` as the single source and `src/ui/theme/tokens.ts` re-exports them (tokens tests stay green, no value retyped). Adjustments (brightness, saturation, tint colour + intensity, ranges from `BASEMAP_ADJUSTMENT_RANGES`) are applied by the evaluator on the resolved palette, never by CSS filters or MapLibre-only properties, so preview equals export; they touch the Basemap only. Map colours never come from CSS variables or the UI theme. MapLibre is created with `fadeDuration: 0`; no `flyTo`/`easeTo`/`panTo` in app code and no deck.gl `transitions`; the Scene camera is applied with `jumpTo`, and only the user's own wheel/drag/pinch motion animates (edit camera, AD-1). The edit camera is UI state, never in the Project, and never changes the Scene camera. The default camera makes the world cover the output frame (framing stored as bounds, resolved by the evaluator, AD-23): the zoom is the larger of fitting the world's width and its height to the frame, so no repeated world copy and no flat polar band shows inside the frame (owner decision after review). `z` bands, bottom to top: Basemap, personal map background, Project Layers (document order), place labels, screen overlays, credit; every Scene item carries a `z`. Sizes: reference px for a 1080 px short side; on screen scale `s = frameShortSide / 1080` (MapLibre `zoom + log2(s)`, deck.gl sizes × `s`); a 562×316 frame shows 56 → about 16 px; chrome never scales. The frame is centred at the Output Format ratio (1920×1080, 1080×1920, 1080×1080), fitted with a margin of at least 24 px (plus 40 px at the bottom for the zoom controls); outside it the Map is dimmed by `canvas-mask` at 55 %, no border, rule or ornament; the mask is drawn on the Map and never uses the UI accent; no chrome covers the frame. Basemap and style come from `/library/v1/styles/<basemap>.json` (Story 1.8, root-relative, resolve against the app origin if MapLibre needs it); the Scene's resolved colours repaint the style's layers by id. Without data (404, SPA fallback HTML, parse error, slow tiles) the Map shows the active Basemap's plain `map-land-neutral`, editing is never blocked, there is no toast and no app-originated console error. The Map code loads lazily from the Editor; Home does not pay for it. New dependencies (MapLibre GL JS ≥ 6.9.1, deck.gl 9.4 and its luma.gl peers) only as MIT/BSD/ISC/Apache packages passing `npm run licences`; any transitive needing an entry gets a reviewed `licence-overrides.json` line. Every string is an i18n key in `fr` and `en` (« Fond de carte », Parchemin · Sombre · Clair · Relief, « Luminosité », « Saturation », « Teinte », « Rétablir les réglages du Fond »). New keys, tools and controls follow the Story 1.7 Definition of Done (registry, keyboard, announcements, axe, `docs/keyboard.md`).

**Never:** No Satellite tile (Epic 8), no GeoEntity or Territory drawing (Story 1.11), no place labels (Story 1.12), no credit display (Story 1.13), no nearest-data chip, no Timeline or Step camera, no Library fetching, no pipeline change, no VPS data origin.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Editor opens, data present | `pipeline/out` built, dev | styled Basemap fills the Map, frame dimmed outside, the world covers the frame (no repeated Earth inside it) | N/A |
| Editor opens, no data | CI preview, Pages, 404 or HTML fallback | plain land colour of the Basemap, Editor fully usable | no toast, no app console error |
| Tiles slow | tiles pending | land colour until tiles arrive | editing never blocked |
| Pick a Basemap | click a tile | `SET_BASEMAP` Command, Map changes at once, one Ctrl+Z reverts | elements untouched |
| Slider drag | brightness/saturation/tint | live preview, one undo entry on release; keys ←/→ one step, Shift ten, Home/End bounds, double-click default | invalid number keeps previous value |
| Reset | « Rétablir les réglages du Fond » | `SET_BASEMAP_ADJUSTMENTS {}`, one undo entry | no-op when already default |
| Change Basemap | adjustments modified | adjustments kept (DESIGN.md) | N/A |
| UI theme | light ↔ dark | Map canvas pixel-identical | N/A |
| Output Format | 16:9, 9:16, 1:1 | frame recomputed at exact ratio, margin ≥ 24 px, 55 % mask, no border | N/A |
| Edit camera | wheel, pinch, Space + drag, middle button, Shift + wheel rotate, Shift+1 | camera moves, Project and Scene camera unchanged | N/A |
| Keyboard camera | Map focused | `+` / `-` zoom, Ctrl+arrows pan, Shift+1 recentre; bottom-left buttons +, −, recentre do the same with the pointer | arrows alone left to later stories |
| Scale | 562×316 frame, 56 px label | about 16.4 px | N/A |

**Decisions (owner, 2026-10-02):**
- Keyboard camera (option B): with the Map focused, `+` / `-` zoom, Ctrl+←/↑/↓/→ pan, Shift+1 recentres on the output frame; three on-screen buttons (+, −, recentre) sit bottom-left of the Map area. Plain arrows and Shift+arrows stay free for Steps, frames and nudging (Epics 2 and 3); the keys are listed in the `?` help and `docs/keyboard.md`.
- Default framing (option C, after review): the world covers the output frame, zoom = larger of width-fit and height-fit; in 16:9 and 1:1 the world's width fills the frame (16:9 shows about ±70° of latitude), in 9:16 the world's height fills it and about 55 % of the longitudes show; the user can pan and zoom out freely.
- Full spec kept (~2,800 tokens); Sonnet subagents for implementation and review.

</frozen-after-approval>

## Code Map

- `src/core/model/project.ts:27-60` -- `BASEMAP_IDS`, `BASEMAP_ADJUSTMENT_RANGES`, basemap schema; `OUTPUT_FRAME_SIZES` at `:21`. `src/core/commands/handlers.ts` -- `SET_BASEMAP`, `SET_BASEMAP_ADJUSTMENTS` with inverses already exist: reuse, do not change.
- `src/ui/theme/tokens.ts:105-157` -- `mapColors`, `mapExtraColors`; also imported by `ProjectCard.tsx`, `EditorRegions.tsx`, `pipeline/styles.ts`, `pipeline/relief.ts`: keep these imports working through the re-export.
- No `evaluate` or Scene exists; `src/render/index.ts` is an empty stub. Layer rules (`.dependency-cruiser.cjs`): core imports no map library, no ui; render imports no ui; ui reaches render only through `src/render/index.ts`.
- `src/ui/editor/EditorRegions.tsx:71-75` -- `MapArea` placeholder (`data-map-content`, `regionProps('map')`, `aria-label` Map): replace with the real view, the frame mask and the zoom controls; keep the region contract and axe results.
- `src/ui/editor/ProjectSettingsPanel.tsx`, `src/ui/components/SegmentedControl.tsx` -- add the « Fond de carte » section; new `Slider` component (UX Slider: coupled numeric field with unit, one drag = one undo step) and a minimal tint colour control (hex field + native colour input; the full `color-field` popover stays for a later story).
- `src/ui/keyboard/registry.ts`, `regions.ts`, `docs/keyboard.md` -- register Shift+1 and the camera keys; update the doc and the `?` help.
- `pipeline/styles.ts` -- layer ids to repaint: `background`, `land`, `ocean` (relief only), `lakes`, `rivers`, `coastline`, `relief-shade`; style sources are root-relative (`/natural-earth-v1.json`).
- Playwright runs 1366×768 headless Chromium with software WebGL; CI serves `dist/` via `vite preview` where no data exists; `tests/e2e/smoke.spec.ts` fails on console errors and foreign requests. E2E must not depend on `pipeline/out`: route the data paths to a tiny fixture or let them fail on purpose.
- Sandbox has `pipeline/out` (vector only, no relief tiles): use it for the visual check of the four Basemaps.

## Tasks & Acceptance

**Execution:**
- [ ] `src/core/basemap/` palettes + `adjust-colour` (+ tests), `src/ui/theme/tokens.ts` re-export
- [ ] `src/core/evaluate/` -- `Scene`, `evaluate`, `z-bands`, frame/scale helpers, default camera (+ tests: determinism, per-Basemap palettes, adjustments golden values, z order, 562×316 → ~16 px)
- [ ] `src/render/` -- MapLibre + `MapLibreOverlay`, Scene to map (repaint by layer id, `jumpTo`), edit camera, lazy loading, data-failure fallback, `index.ts` API
- [ ] Spike -- test deck.gl layer in interleaved vs overlaid mode, record observations and the chosen mode in Implementation Notes, set the mode constant
- [ ] `src/ui/editor/EditorRegions.tsx` -- Map view, frame mask, zoom controls; edit-camera store
- [ ] `src/ui/editor/ProjectSettingsPanel.tsx`, `Slider`, tint control -- picker, sliders, reset
- [ ] `src/ui/keyboard`, `docs/keyboard.md`, `src/i18n/locales/{fr,en}.json`
- [ ] `package.json`, `licence-overrides.json` if needed
- [ ] tests -- unit as above; e2e for every matrix row (data mocked), axe on the new controls, Map pixels equal across themes

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then everything passes without `pipeline/out` and with no request leaving the app origin.
- Given the dev server with `pipeline/out` built, when the four Basemaps are picked, then each renders its palette (checked by screenshots read during review) and one undo returns to the previous one.

## Implementation Notes

**Overlay spike (AD-6), result: interleaved.** A throwaway `ScatterplotLayer` (3 cities, `radiusUnits: 'pixels'`) was drawn through `MapLibreOverlay` in both modes in headless Chromium (SwiftShader WebGL), at 1366×768 with the frame `padding`, after `jumpTo` with bearing and zoom, after a Basemap switch and after a viewport resize.
- Both modes put every point on the pixel `map.project()` predicts (within 1 px), at rest and rotated/zoomed, with the frame padding: neither misplaces the overlay.
- Interleaved: one WebGL canvas and context, shared with MapLibre; deck.gl layers can be placed between Basemap layers with `beforeId` (the `z` bands of AD-6 map to it); nothing outside the canvas to stack. Only cost seen: Chromium's non-error `GPU stall due to ReadPixels` warning under SwiftShader (also printed by MapLibre alone; not a console error).
- Overlaid: two canvases and two contexts; the deck.gl canvas sits above MapLibre's and is not placed relative to the Basemap layers (it can only be on top). It also escaped the output-frame mask: points outside the frame stayed fully bright, because its canvas carries its own z-index above the DOM mask.
- Chosen: interleaved (the architecture target). It keeps a single canvas for the future export capture (Epic 4) and keeps the mask a plain DOM layer above the Map. The constant is `OVERLAY_MODE` in `src/render/overlay-mode.ts`. No deck.gl layer is drawn yet: the overlay is mounted with `layers: []` until Story 1.11.

**Decisions taken while implementing (spec silent):**
- Adjustments apply to the Basemap surface colours only (`sea`, `land`, `coast`) in the Scene; labels, fronts and arrows keep their palette (they are elements and labels, not Basemap). Order: saturation (HSL), brightness (mix with white/black), tint (mix with the tint colour). Golden values in `adjust-colour.test.ts`.
- Scene camera zoom is in reference px (frame 1920×1080 etc.); the render adapter adds `log2(s)`. The edit camera is stored in reference zoom too, so it survives a resize or an Output Format change. MapLibre's default constrain keeps the world covering the viewport, which would forbid the default whole-world fit inside a frame smaller than the Map area: the render adapter replaces it (`transformConstrain`) with a clamp of latitude and zoom only.
- The picker tiles are static SVG swatches from the palette; four tiles (Satellite arrives with Epic 8).
- Tint is a hex field plus the native colour input (preview on input, one Command on `change`/blur). The numeric fields commit on Enter or blur; an invalid entry keeps the previous value.
- Adjustment values equal to the default are not stored (`withoutDefaults`), so « Rétablir » is a no-op (`aria-disabled`) on an untouched Basemap.
- Until the tiles of a loaded style arrive the background is `map-land-neutral` of the active Basemap; once all sources are loaded it switches to the sea colour. A source error (404, parse error) keeps the land colour for good. A style that cannot be fetched or parsed gives a style with a land-coloured background only.
- MapLibre 6 runs its worker from a separate file: `setWorkerUrl` with the Vite `?url` import, so the worker is served by the app origin.
- The Map region's inset focus ring would sit under the canvas, so an overlay element draws it (`.om-map-focus-ring`). The MapLibre canvas is taken out of the tab order and the accessibility tree.
- `matchesCombo` now honours `shift` on `code` combos (Shift+1 on the physical key); Alt+digit behaviour is unchanged.
- Observation outside this story: the relief style's `ocean` layer draws a thin sea-coloured wedge over Greenland in the sandbox tiles (a tessellation artefact of the ocean polygon in the pipeline output). Not touched here.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | orchestrator | Default camera fits the whole world inside a 16:9 frame: the Earth shows twice side by side, poles are flat bands | medium | Seen on screenshots with the mask hidden: world square 530 px tall, world copies fill the 942 px frame width. intent_gap, owner chose C (world covers the frame), applied |
| 2 | orchestrator | Relief Basemap: sea-coloured wedge over Greenland | medium | Screenshot; only the `ocean` layer drawn by Relief exposes the tile geometry from Story 1.8. patch (pipeline) |
| 3 | blind, edge | `LOADING_LAND` retypes a palette value | low | `MapArea.tsx:26` against "no value retyped". patch |
| 4 | blind | `commitValue` announces when the Command is refused | low | `BasemapSettings.tsx:41-45`. patch |
| 5 | edge | Hex field rejects 3-digit shorthand | low | EXPERIENCE.md colour field accepts 3 or 6 digits. patch |
| 6 | edge | Cancelled drag commits the pending value | low | Slider pointercancel. patch |
| 7 | verification-gap | Native tint colour input untested | medium | Pre-verified. patch |
| 8 | blind, edge | macOS/Cmd arrow collisions undocumented | low | Doc only. patch |
| 9 | blind | Lockfile absent from the diff | false | `package-lock.json` is modified; the review diff excluded it. reject |
| 10 | blind | `tokens.ts` re-exports through a relative `.ts` path | false | Deliberate so `pipeline/styles.ts` loads under Node; depcruise and tests pass. reject |
| 11 | blind, edge | Chunk failure swallowed silently | false | `installChunkReload` (`main.tsx:24`) handles `vite:preloadError`; the land colour fallback is the specified behaviour. reject |
| 12 | blind | Zoom/pan announcements noisy, uninformative | low | Short fixed messages; debouncing adds state. reject |
| 13 | blind | Malformed stored tint colour gives NaN | low | Zod validates `#RRGGBB` on every load path. reject |
| 14 | blind, edge | Bounds crossing the antimeridian, zero span, 1000 layers | low | Bounds are a code constant and layers are five; no input path until Epic 3. reject |
| 15 | blind | Test hooks (`data-*`) ship in production | low | Cheap attributes; one documented seam is a refactor. reject |
| 16 | blind | No unit tests for `map-view`, `Slider`, stores | low | Covered by 22 e2e tests asserting pixels and state (verification-gap found only the colour input). reject |
| 17 | blind | Hard-coded zoom limits, `frameRect` doc wording | low | Cosmetic. reject |
| 18 | blind | Greenland wedge not in deferred work; spike has no artefact | false | Fixed this round (row 2); the spec's notes record the spike result. reject |
| 19 | edge | Style race, invalid-style rejection, empty-source style, single tile error pins land colour | low | Token guard exists; real styles are validated by the pipeline; arrival rule only matters before first tiles. reject |
| 20 | edge | View creation failure, shortcuts while view absent, recreated view vs store | low | Fallback colour is the specified behaviour; WebGL is gated earlier (AD-19). reject |
| 21 | edge | Numeric field accepts `1e1`; `inputMode` without minus | low | Desktop-only product. reject |
| 22 | edge | Array-form sprite URLs | low | Styles have no sprite. reject |

## Design Notes

Decisions taken in planning (owner may override): the default framing makes the world cover the frame (owner decision C after review: 16:9 and 1:1 fit the world's width, 9:16 fits its height and shows about 55 % of the longitudes); the picker's 56 px preview tiles are static swatches built from the palette (sea, land, coast), not live maps; four tiles only (Satellite arrives with Epic 8); the evaluator, not the renderer, owns colour adjustments, so export reuses them; `render` consumes the style structure from the pipeline but never its colours; Map code is a separate lazy chunk.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over several runs
- visual check in dev with `pipeline/out` built -- expected: four distinct Basemaps, frame dimmed outside, no console error
