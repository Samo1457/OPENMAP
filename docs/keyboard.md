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
| + (or =), − | Zoom the Map in, out by half a level around the output frame; − stops at the default view | Editor, Map focused |
| ←, ↑, ↓, → or Z, Q, S, D (physical W, A, S, D) | Pan the Map continuously while held; Shift is faster | Editor, Map focused |
| Shift+1 | Recentre the Map on the output frame (back to the Scene camera) | Editor, Map focused |
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

## Map camera collisions (arrows, Z/Q/S/D, `+`, `-`, Shift+1)

| Platform | Collision |
|---|---|
| Chrome, Edge on Windows (the supported target) | None: the arrows, Z/Q/S/D, `+`, `-` and Shift+1 have no browser binding while the Map has the focus (the page does not scroll: the pan keys prevent it), and Ctrl+`+`/`-` (page zoom) is left to the browser. |
| Chrome on Linux | None. |
| macOS | No collision for the plain keys. Ctrl+arrows (Mission Control, Spaces) and Cmd+←/→ (Back/Forward) are not used by the Map any more. macOS is not a supported target. |

Two rules decide which key a shortcut answers to. Mnemonic shortcuts (letters such as V, `+`, `-`, `?`) follow the typed character, so AZERTY and QWERTY behave alike, and the label shown is always « Ctrl » for the Ctrl/Cmd modifier. Movement keys (the Map's arrows and Z/Q/S/D, Shift+1) follow the physical key (`event.code`), so they sit in the same place on every layout; they take no Ctrl.

## Edit camera (Story 1.10)

The edit camera is how the creator looks at the Map; it is UI state and never enters the Project or changes the Scene camera. With the Map focused (Alt+4, or a click on it):

- **Pan:** the four arrows and Z/Q/S/D move the view continuously while held (constant screen speed, diagonals combine, Shift is 2.5 times faster). Z/Q/S/D are the **physical** positions of W/A/S/D (`event.code` `KeyW`/`KeyA`/`KeyS`/`KeyD`), so they work on AZERTY and QWERTY alike; movement keys follow the physical key, unlike the mnemonic letter shortcuts, which follow the typed character. They are read by `src/ui/keyboard/map-pan.ts` (they need keyup and blur) and listed in the `?` help as one row. A held key stops on keyup, on blur and when the Map loses the focus. With Ctrl, Alt or Cmd held, in a text field, or while a dialog is open, the keys do nothing here (Ctrl+S, Ctrl+Z keep their meaning).
- **Zoom and recentre:** `+` / `-` match the typed character, so AZERTY and QWERTY behave alike; `=` also zooms in. Shift+1 matches the physical `1` key with Shift (Shift+& on AZERTY) and never plain `1`.
- **Limits:** the edit camera cannot zoom out below the default view (the world covers the output frame), so the Earth never shows twice, and the frame cannot leave the world vertically. Horizontally the map wraps across the antimeridian. `-` and the zoom-out button stop at the lowest zoom.
- **Pointer:** the wheel zooms around the cursor, Shift + wheel rotates, Space + left drag or the middle button pans, a pinch zooms and rotates. A plain left drag does nothing yet (reserved for the tools).
- Three buttons at the bottom left of the Map area (zoom in, zoom out, recentre) do the same with the pointer.
- The keys fire only while the focus is on the Map region or a control inside it, so they never steal anything from a text field, a slider or a menu.

**Keys now taken on the focused Map: ←, ↑, ↓, →, Z, Q, S, D, `+`, `=`, `-` and Shift+1.** Future tool keys must avoid Z, Q, S and D (and a tool that needs the arrows must say so here). Epic 3 must share ←/→ with Step navigation: that conflict is recorded in `deferred-work.md`. Ctrl+arrows are not bound any more.
