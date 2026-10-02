---
title: 'Story 1.5: Editor shell with undo/redo'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_commit: '72f5d7fa644e8cd2f7a4e3b36b3e401045f38b62'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Opening a Project shows only a placeholder: no real editor layout, no Project settings panel, no visible save status and no undo/redo.

**Approach:** Replace the Story 1.4 Editor placeholder with the Editor shell from DESIGN.md and `mockups/editeur.html`: 48 px top bar, 76 px tool rail (Select only), 36 px options bar above the Map area, 300 px properties panel (260 px below 1280 px), collapsed 44 px Timeline. The panel edits name, Output Format and Map language through Commands; undo/redo work by buttons and shortcuts; the top bar shows the autosave status; Ctrl+S flushes and confirms. Epics.md Story 1.5 ACs (UX-DR30–35, 53, 105, 114, 115, 127, 128, 137, 159; NFR-8, NFR-9; AD-3, AD-8) are binding.

## Boundaries & Constraints

**Always:** Every Project change is a Command through the Story 1.3 dispatcher and is autosaved (Story 1.4); undo/redo use the dispatcher history (not persisted); strings are i18n keys in `fr` and `en`; tokens from Story 1.2; regions are named landmarks so Story 1.7 can add Alt+1–6; shortcuts match the typed character (`event.key`, AZERTY-safe) in a small local handler that Story 1.7's registry will absorb; read-only documents disable every editing control and undo/redo.

**Never:** No Basemap rendering or output frame (Story 1.10), no search behaviour (1.12), no Settings dialog (1.6), no Timeline content (Epic 3), no other tools than Select, no Presentation or Export behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Layout | viewport 1366×648 | all regions visible, no horizontal scroll; panel 300 px (260 px below 1280) | N/A |
| Opening | Project loading | skeletons and "Ouverture…" | load failure → existing error path |
| Rename | type name, Enter or blur | one Command, one undo entry, autosaved | invalid name → previous name kept, error shown |
| Format | top-bar menu or panel control | `SET_OUTPUT_FORMAT`; both controls and options-bar label agree | N/A |
| Undo/redo | Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, buttons | multi-level; buttons disabled when unavailable | read-only → disabled |
| Focus in text field | Ctrl+Z while typing | native text undo, not Project undo | N/A |
| Save status | change → write → done/fail | "Enregistrement…" → "Enregistré" / "Non enregistré"; no toast on routine save | failure keeps the error state until a save succeeds |
| Ctrl+S | any state | browser dialog prevented, flush, toast "Projet sauvegardé" only if the save succeeded | failure → error state, no success toast |
| Newer document | `schemaVersion` 2 | shell renders read-only with the info banner | N/A |

**Decisions (owner accepted all recommended defaults):**
- Step reminder in the options bar: left empty until the Timeline (Epic 3); the right side shows « 16:9 · 1920 × 1080 ».
- Map language is an essential setting (visible with name and format). The « Plus d'options » row is built and tested but hidden while a panel has no advanced setting.
- New strings: « Langue de la carte » / "Map language"; « Rechercher un lieu » / "Search for a place"; tooltips « Annuler · Ctrl+Z », « Rétablir · Ctrl+Maj+Z » / "Undo · Ctrl+Z", "Redo · Ctrl+Shift+Z"; disabled Présentation/Exporter tooltip « Bientôt disponible » / "Coming soon".
- The temporary « Réglages » moves into the « ⋯ » menu of the top bar (Home keeps its button); Story 1.6 replaces it with the dialog.
- Save failure: « Non enregistré » in the top bar plus the persistent error toast from Story 1.4; the storage banner waits for Story 1.15.
- Ctrl+Z inside a text field undoes the typing, not the Project.
- The name is edited in the panel only; the breadcrumb shows it.
- No toast on undo/redo; screen readers hear « Annulé » / « Rétabli ».
- Full spec kept (~1,800 tokens).

</frozen-after-approval>

## Code Map

- `src/ui/editor/EditorPlaceholder.tsx` -- to replace; reuse its loading, dispatcher, autosave and read-only wiring.
- `src/ui/components/` -- `TopBar`, `Menu` (add checked/radio items), `SegmentedControl`, `RenameField` (commits on Enter/blur), `toast`, `button`; `src/ui/settings/SettingsPopover.tsx`.
- `src/persistence/autosave.ts` -- `SaveStatus` `saving|saved|error`, `getStatus`, `subscribe`, `flush()` (resolves even on failure: check status after).
- `src/core` -- `SET_PROJECT_NAME`, `SET_OUTPUT_FORMAT`, `SET_MAP_LOCALE`; dispatcher state `canUndo`, `canRedo`, `readOnly`.
- `mapColors.parchment['map-land-neutral']` -- fills the Map area until Story 1.10.
- `tests/e2e/home.spec.ts:84,367-385` -- helpers that read the breadcrumb name and the newer-version banner; update them.
- Lucide icons: `Map`, `CircleCheck`, `CircleAlert`, `ChevronDown`, `Undo2`, `Redo2`, `Search`, `Play`, `Upload`, `Ellipsis`, `MousePointer2`.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/editor/EditorShell.tsx` + parts (`EditorTopBar`, `ToolRail`, `OptionsBar`, `MapArea`, `PropertiesPanel`, `TimelineArea`) -- CSS grid with tokens, named landmarks, opening skeletons
- [x] `src/ui/editor/ProjectSettingsPanel.tsx` -- name, Output Format, Map language; `MoreOptions` component (hidden when empty)
- [x] `src/ui/editor/SaveStatus.tsx` -- subscribed to the Editor's autosave
- [x] `src/ui/editor/editor-shortcuts.ts` -- Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Ctrl+S, ignoring editable targets for undo/redo
- [x] `src/ui/components/Menu.tsx` -- checked items; Output Format menu; « ⋯ » menu with Réglages
- [x] read-only rendering (banner, disabled inputs and undo/redo); first disabled control completes the UX-DR8 pattern (text-disabled, test)
- [x] `src/i18n/locales/{fr,en}.json` -- all new strings
- [x] tests -- unit (shortcut handler, save status mapping) and e2e (layout at 1366×648 and 1279 px, rename/format/locale undo and redo by buttons and keys, text-field Ctrl+Z, save status transitions, Ctrl+S toast and failure path, reload loses history, read-only)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass with no request leaving the app origin.
- Given the Editor in both themes, when used with the keyboard only, then every control is reachable and shows the focus ring.

## Verification

**Commands:**
- `npm run check` -- expected: all green; e2e stable over several runs

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind, edge | Not-found/unreadable/error states show a fake « Untitled Project » breadcrumb and editing controls | medium | Error branch renders full top bar with undefined name. patch |
| 2 | gap, blind | Error states of the new shell untested | medium | Pre-verified. patch |
| 3 | gap | Toast placement clear of panel/Timeline untested | medium | Pre-verified. patch |
| 4 | gap, blind | Ctrl+S from the name field: test cannot tell flush from debounce; invalid draft gives error plus « Projet sauvegardé » | medium | Pre-verified; contradictory feedback. patch |
| 5 | edge | Name draft discarded on navigation/pagehide without blur | medium | Only blur/Enter/Ctrl+S commit. patch |
| 6 | edge | Settings panel stays open when focus leaves via its owner (Home regression) | medium | Removed wrapper onBlur. patch |
| 7 | edge | Shortcuts dead on non-Latin layouts; browser Save dialog opens | medium | `event.key` only. patch (fallback to `event.code`) |
| 8 | blind | Disabled search/Presentation/Export explanations not exposed to AT | medium | `title` on wrapper only. patch |
| 9 | edge | « Projet sauvegardé » toast after leaving the Editor | low | Direct fix. patch |
| 10 | edge | MoreOptions renders an empty row for `false` children | low | Direct fix. patch |
| 11 | blind | Shortcut handler ignores `isComposing`/`defaultPrevented` | low | Direct fix. patch |
| 12 | blind | « ⋯ » button lacks `aria-controls`/expanded for the Settings panel | low | Direct fix. patch |
| 13 | blind | Hard-coded "—" and `'' as` casts | low | Direct fix. patch |
| 14 | blind | Contrast test comment overclaims (surface-raised, button looks) | low | Direct fix. patch |
| 15 | blind | `waitForTimeout(500)` in failed-save e2e | low | Direct fix. patch |
| 16 | blind | Shell never turns read-only when another tab takes the Project | medium | Lock and takeover are Story 1.14. defer |
| 17 | blind | « Projet sauvegardé » on first save of a new Project not implemented | low | Not in this story's ACs. defer |
| 18 | blind | Ctrl+S silent while loading or read-only | low | Read-only banner explains; rejected |
| 19 | blind | `tooNew` reads mapLocale from a newer document | low | Value is validated against known locales; rejected |
| 20 | blind | Undo click while editing commits the draft first | low | Expected blur-commit behaviour; rejected |
| 21 | blind | Menu `findIndex` evaluated each render | low | Negligible; rejected |
| 22 | blind | Status mismatch / 1.4 flipped to done | false | Sprint sync at present step; owner accepted 1.4 |
