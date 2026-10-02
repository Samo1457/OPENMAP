// The edit-camera keys (Story 1.10 decision B): with the Map focused, `+` and `-` zoom, Ctrl+arrows
// pan and Shift+1 recentres on the output frame. Plain arrows and Shift+arrows stay free for Steps,
// frames and nudging (Epics 2 and 3). `=` also zooms in, as the unshifted `+` of QWERTY.

import type { KeyCombo, ShortcutDef } from './registry'

export const ZOOM_IN_COMBOS: readonly KeyCombo[] = [{ key: '+' }, { key: '=' }]
export const ZOOM_OUT_COMBOS: readonly KeyCombo[] = [{ key: '-' }]
/** The physical `1` key: Shift+& on AZERTY, Shift+1 on QWERTY. */
export const RECENTRE_COMBO: KeyCombo = { code: 'Digit1', shift: true }

/** Pixels moved by one Ctrl+arrow press. */
export const KEYBOARD_PAN_STEP = 100
/** Zoom levels added by one `+` or `-` press, and by the on-screen buttons. */
export const KEYBOARD_ZOOM_STEP = 0.5

/** Whether the focus is on the Map region or inside it (its zoom buttons). */
export function mapHasFocus(): boolean {
  const region = document.querySelector('[data-region="map"]')
  return region !== null && region.contains(document.activeElement)
}

export interface MapKeyHandlers {
  zoom(delta: number): void
  pan(dx: number, dy: number): void
  recentre(): void
}

export function mapShortcuts(handlers: MapKeyHandlers): ShortcutDef[] {
  const common = { group: 'navigation', enabled: mapHasFocus } as const
  const pan = (id: string, key: string, dx: number, dy: number): ShortcutDef => ({
    ...common,
    id: `map.pan.${id}`,
    nameKey: `keyboard.shortcuts.map.pan.${id}`,
    keys: [{ key, ctrl: true }],
    repeat: true,
    run: () => handlers.pan(dx * KEYBOARD_PAN_STEP, dy * KEYBOARD_PAN_STEP),
  })
  return [
    { ...common, id: 'map.zoomIn', nameKey: 'keyboard.shortcuts.map.zoomIn', keys: ZOOM_IN_COMBOS, repeat: true, run: () => handlers.zoom(KEYBOARD_ZOOM_STEP) },
    { ...common, id: 'map.zoomOut', nameKey: 'keyboard.shortcuts.map.zoomOut', keys: ZOOM_OUT_COMBOS, repeat: true, run: () => handlers.zoom(-KEYBOARD_ZOOM_STEP) },
    pan('left', 'ArrowLeft', -1, 0),
    pan('up', 'ArrowUp', 0, -1),
    pan('right', 'ArrowRight', 1, 0),
    pan('down', 'ArrowDown', 0, 1),
    { ...common, id: 'map.recentre', nameKey: 'keyboard.shortcuts.map.recentre', keys: [RECENTRE_COMBO], run: handlers.recentre },
  ]
}
