---
title: 'Story 1.10: Display the stylized Basemap and the output frame'
type: 'feature'
created: '2026-10-02'
status: 'draft'
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

**Always:** `evaluate` is pure and deterministic (no clock, no random, no DOM); `ctx = {geodata, frame}` with an empty `geodata` for now; the Scene is plain serializable data. The Basemap palettes (`mapColors`, `mapExtraColors`) move to `src/core` as the single source and `src/ui/theme/tokens.ts` re-exports them (tokens tests stay green, no value retyped). Adjustments (brightness, saturation, tint colour + intensity, ranges from `BASEMAP_ADJUSTMENT_RANGES`) are applied by the evaluator on the resolved palette, never by CSS filters or MapLibre-only properties, so preview equals export; they touch the Basemap only. Map colours never come from CSS variables or the UI theme. MapLibre is created with `fadeDuration: 0`; no `flyTo`/`easeTo`/`panTo` in app code and no deck.gl `transitions`; the Scene camera is applied with `jumpTo`, and only the user's own wheel/drag/pinch motion animates (edit camera, AD-1). The edit camera is UI state, never in the Project, and never changes the Scene camera. The default camera is the whole world fitted in the output frame (framing stored as bounds, resolved by the evaluator, AD-23). `z` bands, bottom to top: Basemap, personal map background, Project Layers (document order), place labels, screen overlays, credit; every Scene item carries a `z`. Sizes: reference px for a 1080 px short side; on screen scale `s = frameShortSide / 1080` (MapLibre `zoom + log2(s)`, deck.gl sizes × `s`); a 562×316 frame shows 56 → about 16 px; chrome never scales. The frame is centred at the Output Format ratio (1920×1080, 1080×1920, 1080×1080), fitted with a margin of at least 24 px (plus 40 px at the bottom for the zoom controls); outside it the Map is dimmed by `canvas-mask` at 55 %, no border, rule or ornament; the mask is drawn on the Map and never uses the UI accent; no chrome covers the frame. Basemap and style come from `/library/v1/styles/<basemap>.json` (Story 1.8, root-relative, resolve against the app origin if MapLibre needs it); the Scene's resolved colours repaint the style's layers by id. Without data (404, SPA fallback HTML, parse error, slow tiles) the Map shows the active Basemap's plain `map-land-neutral`, editing is never blocked, there is no toast and no app-originated console error. The Map code loads lazily from the Editor; Home does not pay for it. New dependencies (MapLibre GL JS ≥ 6.9.1, deck.gl 9.4 and its luma.gl peers) only as MIT/BSD/ISC/Apache packages passing `npm run licences`; any transitive needing an entry gets a reviewed `licence-overrides.json` line. Every string is an i18n key in `fr` and `en` (« Fond de carte », Parchemin · Sombre · Clair · Relief, « Luminosité », « Saturation », « Teinte », « Rétablir les réglages du Fond »). New keys, tools and controls follow the Story 1.7 Definition of Done (registry, keyboard, announcements, axe, `docs/keyboard.md`).

**Never:** No Satellite tile (Epic 8), no GeoEntity or Territory drawing (Story 1.11), no place labels (Story 1.12), no credit display (Story 1.13), no nearest-data chip, no Timeline or Step camera, no Library fetching, no pipeline change, no VPS data origin.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Editor opens, data present | `pipeline/out` built, dev | styled Basemap fills the Map, frame dimmed outside, world fitted | N/A |
| Editor opens, no data | CI preview, Pages, 404 or HTML fallback | plain land colour of the Basemap, Editor fully usable | no toast, no app console error |
| Tiles slow | tiles pending | land colour until tiles arrive | editing never blocked |
| Pick a Basemap | click a tile | `SET_BASEMAP` Command, Map changes at once, one Ctrl+Z reverts | elements untouched |
| Slider drag | brightness/saturation/tint | live preview, one undo entry on release; keys ←/→ one step, Shift ten, Home/End bounds, double-click default | invalid number keeps previous value |
| Reset | « Rétablir les réglages du Fond » | `SET_BASEMAP_ADJUSTMENTS {}`, one undo entry | no-op when already default |
| Change Basemap | adjustments modified | adjustments kept (DESIGN.md) | N/A |
| UI theme | light ↔ dark | Map canvas pixel-identical | N/A |
| Output Format | 16:9, 9:16, 1:1 | frame recomputed at exact ratio, margin ≥ 24 px, 55 % mask, no border | N/A |
| Edit camera | wheel, pinch, Space + drag, middle button, Shift + wheel rotate, Shift+1 | camera moves, Project and Scene camera unchanged | N/A |
| Keyboard camera | Map focused | per the answer to Open Question 1 | N/A |
| Scale | 562×316 frame, 56 px label | about 16.4 px | N/A |

</frozen-after-approval>

## Open Questions

1. **Keyboard panning of the edit camera.** The AC says the camera pans and zooms with the keyboard, but EXPERIENCE.md reserves ←/→ on the Map for the previous/next Step and Shift+←/→ for one frame (Epic 3), and arrows for nudging a selection (Epic 2). Panning has no key of its own yet. (A) MapLibre's defaults while the Map is focused: arrows pan, `+`/`-` zoom, Shift+arrows rotate; Epic 3 takes the arrows back and moves panning to another key then (rework later, familiar behaviour now). (B, recommended) `+`/`-` zoom, Shift+1 recentre and ← ↑ ↓ → pan with **Ctrl+arrows** while the Map is focused, plus on-screen zoom buttons (+, −, recentre) bottom-left; no later conflict, but Ctrl+arrows is less discoverable (listed in the `?` help). (C) no keyboard panning until Epic 3 chooses; `+`/`-`, recentre and the buttons only (the AC's "keyboard pans" stays unmet for now).

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

## Spec Change Log

## Review Triage Log

## Design Notes

Decisions taken in planning (owner may override): the default framing is the whole world; the picker's 56 px preview tiles are static swatches built from the palette (sea, land, coast), not live maps; four tiles only (Satellite arrives with Epic 8); the evaluator, not the renderer, owns colour adjustments, so export reuses them; `render` consumes the style structure from the pipeline but never its colours; Map code is a separate lazy chunk.

## Verification

**Commands:**
- `npm run check` -- expected: all green, e2e stable over several runs
- visual check in dev with `pipeline/out` built -- expected: four distinct Basemaps, frame dimmed outside, no console error
