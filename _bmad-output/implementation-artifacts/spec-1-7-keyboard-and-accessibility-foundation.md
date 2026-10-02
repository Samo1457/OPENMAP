---
title: 'Story 1.7: Keyboard and accessibility foundation'
type: 'feature'
created: '2026-10-02'
status: 'in-progress'
baseline_commit: '083a5aeeb239ccd4442a4f3972016bf602bf88d7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Shortcuts are a local Editor handler (undo, redo, save), tooltips are native `title` attributes that keyboard users never see, the Editor regions cannot be reached by key, and nothing checks accessibility automatically, so every later tool, panel and dialog would invent its own keyboard rules.

**Approach:** A central shortcut registry in `src/ui/keyboard/` with context priority and an Escape chain, the `?` shortcuts help dialog, Alt+1..6 region jumps, a styled `Tooltip` (name · shortcut) on hover and keyboard focus, a reduced-motion rule for chrome, and an automated axe check in Playwright. Epics.md Story 1.7 ACs (UX-DR64, 110–113, 116, 154–158) are binding.

## Boundaries & Constraints

**Always:** Letter keys match the typed character (`event.key`), falling back to `event.code` on non-Latin layouts (reuse `editor-shortcuts.ts` logic); Alt+digit matches `event.code` `Digit1..6` with no Shift/Ctrl/Meta (AltGr = Ctrl+Alt is excluded); in a text field, single letters, Space and arrows reach the field and Escape leaves it (blur); in a composite widget (menu, radiogroup, tablist, slider, listbox) arrows, Space and Enter follow its ARIA pattern; open menus and dialogs keep handling their own Escape first; every shortcut's label and key text are i18n keys in `fr` and `en` (« Ctrl+Maj+Z », « Échap »); Cmd works as Ctrl; `prefers-reduced-motion` never touches the Map or export.

**Never:** No new tools, drawer, selection, Timeline or Presentation mode (later stories register their Escape steps and keys); no `/` search behaviour (Story 1.12); no F6; no Map content change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tool key | `v` / `V` (AZERTY or QWERTY), focus on the Map | Select tool active, announced | N/A |
| Text field | `v`, Space, arrows, `?` in the name field | typed into the field, no shortcut | N/A |
| Escape in field | Escape in the name field | field loses focus; nothing else | N/A |
| Escape chain | Escape with a menu open, then again | 1st closes the menu only; next press runs the next registered step | N/A |
| Help | `?` on Home or in the Editor | dialog listing every active shortcut, in the UI language | Escape closes, focus returns |
| Region jump | Alt+1..6 in the Editor | focus on top bar, rail, options bar, Map, panel, Timeline | Alt+Shift+digit, AltGr: ignored |
| Tooltip | hover or keyboard focus on « Annuler » | « Annuler · Ctrl+Z » | Escape hides it |
| Reduced motion | `prefers-reduced-motion: reduce` | no chrome animation or transition | N/A |
| Dialog open | `v`, Alt+2, `?` with Settings open | nothing behind the dialog | N/A |

**Decisions (owner, 2026-10-02):**
- axe: add `axe-core` and `@axe-core/playwright` (MPL-2.0) as unmodified devDependencies, never shipped, each with a `licence-overrides.json` entry; extend the AGENTS.md MPL-2.0 line to name them (option A).
- Full spec kept (~2,000 tokens).
- Planning defaults accepted: Alt+N focuses the region container; `?` help on Home too; « Ctrl » shown on every platform; help lists only registered shortcuts; collisions documented in `docs/keyboard.md`.

</frozen-after-approval>

## Code Map

- `src/ui/editor/editor-shortcuts.ts` -- `letterOf`, `isTextEntry`, `editorShortcut`, `installEditorShortcuts`: move into the registry (keep `isTextEntry`; `Dialog.tsx:4,95` imports `editorShortcut` for Ctrl+S).
- `src/ui/editor/EditorShell.tsx:120-148` -- undo/redo/save install, to register through the registry; live region at `:205-207`, reuse for announcements.
- `src/ui/editor/EditorRegions.tsx` -- `ToolRail` (Select button, `title`, `aria-pressed`), `OptionsBar`, `MapArea`, `PropertiesPanel`, `TimelineArea`: named regions to make jump targets; Map needs `tabIndex=0`.
- `src/ui/components/TopBar.tsx` -- `header` with `aria-label`; region 1.
- `src/ui/components/Menu.tsx:85-97`, `Dialog.tsx:90-109` -- own Escape with `stopPropagation`; keep.
- Native `title` tooltips to replace: `EditorTopBar.tsx:49,60,74,78,98`, `EditorRegions.tsx:23`, `Dialog.tsx:131`, `toast.tsx:141`, `Banner.tsx:41`, `AppMenu.tsx:28`, `StorageTab.tsx:48`; keep the truncated-name `title` (`EditorTopBar.tsx:37`).
- i18n: `editor.undoTooltip`/`redoTooltip` become name + shortcut composition.
- `src/index.css:9-27` -- skeleton already stops under reduced motion; add a global chrome rule.
- `src/ui/App.tsx` -- mounts the help dialog next to `SettingsDialog`; `settings-store.ts` is the pattern for a module store (no Zustand installed).
- Tooltip tokens: `--om-text-primary` bg, `--om-background` fg, `rounded-sm`, `type-caption`, no shadow (DESIGN.md `tooltip`).

## Tasks & Acceptance

**Execution:**
- [ ] `src/ui/keyboard/registry.ts` (+ test) -- pure matcher (key combo, context priority, text-field and composite rules), register/unregister, window listener, Escape chain as ordered priority steps, list of active shortcuts for help
- [ ] `src/ui/keyboard/tool-store.ts` -- active tool (`select` only), V shortcut, last Escape step "return to Select"
- [ ] `src/ui/editor/EditorShell.tsx`, `editor-shortcuts.ts`, `Dialog.tsx` -- undo/redo/save through the registry; delete the local installer
- [ ] `src/ui/keyboard/ShortcutHelp.tsx` -- `?` dialog (shared `Dialog`), grouped list from the registry, Home and Editor
- [ ] `src/ui/keyboard/regions.ts` + `EditorRegions.tsx`/`TopBar.tsx` -- Alt+1..6 focus the region (tabIndex -1, Map 0), visible ring
- [ ] `src/ui/components/Tooltip.tsx` -- hover (delay) and focus-visible, Escape hides, `aria-describedby`; replace the listed `title`s; rail tool gets `aria-keyshortcuts`
- [ ] `src/index.css` -- reduced-motion rule for chrome animations and transitions
- [ ] `docs/keyboard.md` -- shortcut table, Alt+digit collisions checked on Chrome/Edge Windows (none) and noted elsewhere (Linux Chrome/Firefox switch tabs)
- [ ] `src/i18n/locales/{fr,en}.json` -- shortcut names, key labels, help, announcements
- [ ] `package.json`, `licence-overrides.json`, `AGENTS.md` -- axe dependency per the answer above
- [ ] tests -- unit (matcher on AZERTY/QWERTY/Cyrillic events, text field, composite, Alt+Shift, AltGr, Escape order); e2e (every matrix row, tab order follows visual order, axe on Home, Editor, Settings, help, gate pages in light and dark)

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all guardrails and tests pass, including axe with no violations, and no request leaves the app origin.
- Given AGENTS.md, when this story is done, then a Definition of Done line requires every new tool, panel or dialog to register its shortcuts, be keyboard-operable, announce state changes and pass the axe e2e check.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Decisions taken in planning (owner may override): Alt+N focuses the region container itself, which the screen reader announces by name, then Tab enters it; `?` help also works on Home (Home's list: `?`, Escape); tooltips show « Ctrl » on every platform; the help lists only shortcuts registered right now, so later stories extend it by registering.

## Verification

**Commands:**
- `npm run check` -- expected: all green; e2e stable over several runs
