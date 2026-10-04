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
- Escape does one thing per press, by priority: a shown tooltip (100), menu and popover (own handler), dialog (own handler), then steps that later stories register through `registerEscapeStep` (drawing, drawer), the selected GeoEntity (10, Story 1.12), and last "back to Select" (0). In the place search field Escape first closes the results (or the « Aucun lieu trouvé » message), then leaves the field.

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
| / | Focus the place search field (its text is selected) | Editor, not in a text field or a dialog |
| Alt+1 | Top bar | Editor |
| Alt+2 | Tool rail | Editor |
| Alt+3 | Tool options bar | Editor |
| Alt+4 | Map | Editor |
| Alt+5 | Properties panel | Editor |
| Alt+6 | Timeline | Editor |
| ? | Shortcuts help | Home and Editor |
| Escape | Close, cancel or go back one step | everywhere |

Alt+N focuses the region container itself (tabIndex -1, the Map 0), which a screen reader announces by name; Tab then enters it. Tab order follows the visual order: top bar, rail, options bar, Map, panel, Timeline. F6 is not used (Chrome and Edge take it for the address bar).

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

## Reference Date field (Story 1.11)

The « Date de référence » text field in Project settings (Alt+5, then Tab) registers no shortcut of its own: it is a text field, so every unmodified key reaches it. Enter or leaving the field (Tab, a click elsewhere) commits the year as one undoable `SET_REFERENCE_DATE`; Escape restores the previous date and leaves the field; Ctrl+S still saves (an unusable entry is refused first and keeps the previous date). An invalid entry shows its message under the field (`role="alert"`) and `aria-invalid`; a committed date is announced « Date de référence : 1453 » and the nearest-data chip in the options bar is a polite status. No key collision: nothing new is bound outside the field.

## Place search (Story 1.12)

The search field in the top bar is an ARIA combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a listbox of options grouped under « Pays », « Entités historiques », « Villes »). Registered shortcut: `/` (`search.focus`, group Navigation, listed in the `?` help).

- **`/`** matches the typed character, so AZERTY (Shift+:) and QWERTY behave alike. It focuses the field and selects its text. It is ignored in a text field (the `/` is typed there: the Project name, the Reference Date, the search field itself), while a dialog is open, and while the Project is opening (the field is inert). Firefox's quick find is prevented, as the registry always prevents a handled key.
- **In the field** (an IME composition owns every key while it composes): ↓ and ↑ move through the results and wrap; Home and End jump to the first and the last result (while the list is open; with no list they move the caret); Enter picks the active result, or the first one when none is active; Escape closes the list, then leaves the field (the registry's text-field rule); Tab leaves and closes the list. ↓ reopens a list closed by Escape. Typing needs two characters before anything shows. The mouse hovers (active) and clicks (picks).
- **Picking** centres the edit camera (never a Preset or the Project) and moves the focus to the Map, so that the arrows pan and Escape clears the selection. A GeoEntity result is also selected (UI-only selection, outlined on the Map in ink on a halo): the first Escape on the Map clears it (« Sélection retirée »), in its place in the Escape order above. A menu or a dialog open over it takes that Escape first.
- **Announcements** (polite): « 3 résultats » / « Aucun lieu trouvé » / « La recherche de lieux est indisponible. » once typing pauses, « Carte centrée sur Londres » or « Ottoman Empire sélectionné » on a pick.

No key collision: `/` is bound nowhere else, and in a text field it stays text. No other browser binding on Chrome or Edge (Firefox's quick find is prevented by the page).
