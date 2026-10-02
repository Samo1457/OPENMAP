# Keyboard shortcuts

Every shortcut is registered in `src/ui/keyboard/registry.ts` with an i18n name (`keyboard.shortcuts.*`), so the `?` help and the tooltips list exactly what is registered. New tools, panels and dialogs register theirs (Definition of Done in `AGENTS.md`) and add a row here.

## Rules

- Letter keys match the typed character (`event.key`), so AZERTY and QWERTY behave alike. On a non-Latin layout (Cyrillic, Greek) the physical key (`event.code`) stands in.
- Alt+1..6 match the physical digit row (`Digit1`..`Digit6`) with Alt alone: Alt+Shift+digit, AltGr (Ctrl+Alt on Windows), Ctrl/Cmd+Alt+digit and the numpad are ignored.
- Cmd works as Ctrl.
- Context priority, most specific first:
  1. A text field has the focus: every unmodified key and Ctrl combo reaches the field (single letters, Space, arrows, `?`, Ctrl+Z). Ctrl+S still saves. Escape leaves the field and does nothing else.
  2. A composite widget has the focus (menu, radiogroup, tablist, slider, listbox, combobox, grid, tree, spinbutton): arrows, Home/End, Page keys, Space and Enter follow its ARIA pattern.
  3. A modal dialog is open: nothing behind it reacts (the dialog handles its own keys).
  4. Everywhere else: the registered shortcuts.
- Escape does one thing per press, by priority: a shown tooltip (100), menu and popover (own handler), dialog (own handler), then steps that later stories register through `registerEscapeStep` (drawing, drawer, selection), and last "back to Select" (0).

## Shortcuts

| Keys | Action | Where |
|---|---|---|
| Ctrl+Z | Undo | Editor (not in a text field) |
| Ctrl+Shift+Z, Ctrl+Y | Redo | Editor (not in a text field) |
| Ctrl+S | Save (toast); the browser's Save page is always prevented | Editor, also in text fields |
| V | Select tool | Editor |
| Alt+1 | Top bar | Editor |
| Alt+2 | Tool rail | Editor |
| Alt+3 | Tool options bar | Editor |
| Alt+4 | Map | Editor |
| Alt+5 | Properties panel | Editor |
| Alt+6 | Timeline | Editor |
| ? | Shortcuts help | Home and Editor |
| Escape | Close, cancel or go back one step | everywhere |

Alt+N focuses the region container itself (tabIndex -1, the Map 0), which a screen reader announces by name; Tab then enters it. Tab order follows the visual order: top bar, rail, options bar, Map, panel, Timeline. F6 is not used (Chrome and Edge take it for the address bar). `/` (place search) arrives in Story 1.12.

## Alt+digit collisions

| Browser | Alt+1..6 |
|---|---|
| Chrome, Edge on Windows | No browser binding (Ctrl+digit switches tabs, not Alt+digit). Per the UX spec; re-check by hand on a release. |
| Chrome, Firefox on Linux | Alt+digit switches to tab N: the browser may take the key before the page (Firefox) or the page prevents it (Chrome). Not the supported platform. |
| Firefox on Windows | Alt+digit has no default binding. |
| macOS | Option+1..6 work: the shortcut matches the physical digit key, whatever symbol Option+digit would type. |

The shortcuts work on the typed character, so the label shown is always « Ctrl », on every platform.
