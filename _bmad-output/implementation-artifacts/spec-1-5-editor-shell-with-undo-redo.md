---
title: 'Story 1.5: Editor shell with undo/redo'
type: 'feature'
created: '2026-10-01'
status: 'draft'
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

</frozen-after-approval>

## Open Questions

Each has a recommended default; answer "OK" to accept all or override by number.

1. Step reminder in the options bar: left empty until the Timeline (Epic 3); the right side shows « 16:9 · 1920 × 1080 ».
2. Map language is an essential setting (visible with name and format). The « Plus d'options » row is built and tested but hidden while a panel has no advanced setting.
3. New strings: « Langue de la carte » / "Map language"; « Rechercher un lieu » / "Search for a place"; tooltips « Annuler · Ctrl+Z », « Rétablir · Ctrl+Maj+Z » / "Undo · Ctrl+Z", "Redo · Ctrl+Shift+Z"; disabled Présentation/Exporter tooltip « Bientôt disponible » / "Coming soon".
4. The temporary « Réglages » moves into the « ⋯ » menu of the top bar (Home keeps its button); Story 1.6 replaces it with the dialog.
5. Save failure: « Non enregistré » in the top bar plus the persistent error toast from Story 1.4; the storage banner waits for Story 1.15.
6. Ctrl+Z inside a text field undoes the typing, not the Project.
7. The name is edited in the panel only; the breadcrumb shows it.
8. No toast on undo/redo; screen readers hear « Annulé » / « Rétabli ».

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
- [ ] `src/ui/editor/EditorShell.tsx` + parts (`EditorTopBar`, `ToolRail`, `OptionsBar`, `MapArea`, `PropertiesPanel`, `TimelineArea`) -- CSS grid with tokens, named landmarks, opening skeletons
- [ ] `src/ui/editor/ProjectSettingsPanel.tsx` -- name, Output Format, Map language; `MoreOptions` component (hidden when empty)
- [ ] `src/ui/editor/SaveStatus.tsx` -- subscribed to the Editor's autosave
- [ ] `src/ui/editor/editor-shortcuts.ts` -- Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Ctrl+S, ignoring editable targets for undo/redo
- [ ] `src/ui/components/Menu.tsx` -- checked items; Output Format menu; « ⋯ » menu with Réglages
- [ ] read-only rendering (banner, disabled inputs and undo/redo); first disabled control completes the UX-DR8 pattern (text-disabled, test)
- [ ] `src/i18n/locales/{fr,en}.json` -- all new strings
- [ ] tests -- unit (shortcut handler, save status mapping) and e2e (layout at 1366×648 and 1279 px, rename/format/locale undo and redo by buttons and keys, text-field Ctrl+Z, save status transitions, Ctrl+S toast and failure path, reload loses history, read-only)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass with no request leaving the app origin.
- Given the Editor in both themes, when used with the keyboard only, then every control is reachable and shows the focus ring.

## Verification

**Commands:**
- `npm run check` -- expected: all green; e2e stable over several runs

## Implementation Notes

## Spec Change Log

## Review Triage Log
