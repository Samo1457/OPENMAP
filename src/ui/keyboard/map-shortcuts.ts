// The edit-camera keys (Story 1.10 decisions): with the Map focused, `+` and `-` zoom and Shift+1
// recentres on the output frame; the arrows and Z/Q/S/D pan continuously while held (`map-pan.ts`),
// listed here for the help. `=` also zooms in, as the unshifted `+` of QWERTY.

import type { KeyCombo, ShortcutDef } from './registry'

export const ZOOM_IN_COMBOS: readonly KeyCombo[] = [{ key: '+' }, { key: '=' }]
export const ZOOM_OUT_COMBOS: readonly KeyCombo[] = [{ key: '-' }]
/** The physical `1` key: Shift+& on AZERTY, Shift+1 on QWERTY. */
export const RECENTRE_COMBO: KeyCombo = { code: 'Digit1', shift: true }

/** Zoom levels added by one `+` or `-` press, and by the on-screen buttons. */
export const KEYBOARD_ZOOM_STEP = 0.5

/** Whether the focus is on the Map region or inside it (its zoom buttons). */
export function mapHasFocus(): boolean {
  const region = document.querySelector('[data-region="map"]')
  return region !== null && region.contains(document.activeElement)
}

export interface MapKeyHandlers {
  zoom(delta: number): void
  recentre(): void
}

/** The pan keys as the help shows them; the keys themselves are read by `map-pan.ts`. */
const PAN_HELP_KEYS: readonly KeyCombo[] = [{ key: 'ArrowLeft' }, { key: 'ArrowUp' }, { key: 'ArrowDown' }, { key: 'ArrowRight' }]

export function mapShortcuts(handlers: MapKeyHandlers): ShortcutDef[] {
  const common = { group: 'navigation', enabled: mapHasFocus } as const
  return [
    { ...common, id: 'map.zoomIn', nameKey: 'keyboard.shortcuts.map.zoomIn', keys: ZOOM_IN_COMBOS, repeat: true, run: () => handlers.zoom(KEYBOARD_ZOOM_STEP) },
    { ...common, id: 'map.zoomOut', nameKey: 'keyboard.shortcuts.map.zoomOut', keys: ZOOM_OUT_COMBOS, repeat: true, run: () => handlers.zoom(-KEYBOARD_ZOOM_STEP) },
    { ...common, id: 'map.pan', nameKey: 'keyboard.shortcuts.map.pan', keys: PAN_HELP_KEYS, listOnly: true, run: () => undefined },
    { ...common, id: 'map.recentre', nameKey: 'keyboard.shortcuts.map.recentre', keys: [RECENTRE_COMBO], run: handlers.recentre },
  ]
}
