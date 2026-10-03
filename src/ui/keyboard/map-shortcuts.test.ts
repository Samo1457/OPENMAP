import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KEYBOARD_ZOOM_STEP, mapHasFocus, mapShortcuts } from './map-shortcuts'
import { comboParts, resolveShortcut, type ShortcutEvent } from './registry'

const press = (key: string, modifiers: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  target: null,
  ...modifiers,
})

function handlers() {
  return { zoom: vi.fn<(delta: number) => void>(), recentre: vi.fn<() => void>() }
}

/** Stands in for the page: the Map region holds the focus or not. */
function focusOnMap(focused: boolean) {
  const region = { contains: (node: unknown) => node === 'focused' }
  vi.stubGlobal('document', { querySelector: () => region, activeElement: focused ? 'focused' : 'elsewhere' })
}

describe('Map camera keys', () => {
  beforeEach(() => focusOnMap(true))
  afterEach(() => vi.unstubAllGlobals())

  const id = (event: ShortcutEvent) => resolveShortcut(event, mapShortcuts(handlers()))?.id

  it('zooms with + and - (typed characters, so AZERTY and QWERTY alike)', () => {
    expect(id(press('+', { shiftKey: true }))).toBe('map.zoomIn')
    expect(id(press('+'))).toBe('map.zoomIn') // numpad
    expect(id(press('='))).toBe('map.zoomIn')
    expect(id(press('-'))).toBe('map.zoomOut')
  })

  it('leaves the arrows and Ctrl+arrows to the continuous pan (map-pan.ts), not to a shortcut', () => {
    for (const modifiers of [{}, { ctrlKey: true }, { shiftKey: true }]) expect(id(press('ArrowLeft', modifiers))).toBeUndefined()
    const pan = mapShortcuts(handlers()).find((shortcut) => shortcut.id === 'map.pan')
    expect(pan?.listOnly).toBe(true) // listed in the help only
  })

  it('recentres with Shift on the physical 1 key, never with 1 alone', () => {
    expect(id(press('!', { shiftKey: true, code: 'Digit1' }))).toBe('map.recentre') // QWERTY
    expect(id(press('1', { shiftKey: true, code: 'Digit1' }))).toBe('map.recentre') // AZERTY
    expect(id(press('1', { code: 'Digit1' }))).toBeUndefined()
    expect(id(press('1', { shiftKey: true, code: 'Digit1', altKey: true }))).toBeUndefined()
  })

  it('runs the camera handlers with the documented steps', () => {
    const run = handlers()
    const byId = Object.fromEntries(mapShortcuts(run).map((shortcut) => [shortcut.id, shortcut]))
    byId['map.zoomIn'].run()
    byId['map.zoomOut'].run()
    byId['map.recentre'].run()
    expect(run.zoom.mock.calls).toEqual([[KEYBOARD_ZOOM_STEP], [-KEYBOARD_ZOOM_STEP]])
    expect(run.recentre).toHaveBeenCalledTimes(1)
  })

  it('does nothing while the Map does not have the focus', () => {
    focusOnMap(false)
    expect(mapHasFocus()).toBe(false)
    expect(id(press('+'))).toBeUndefined()
  })

  it('shows arrows as glyphs and Shift+1 in the help', () => {
    const translate = (key: string) => ({ 'keyboard.keys.ctrl': 'Ctrl', 'keyboard.keys.shift': 'Shift' })[key] ?? key
    const keys = Object.fromEntries(mapShortcuts(handlers()).map((shortcut) => [shortcut.id, shortcut.keys[0]]))
    expect(comboParts(keys['map.pan'], translate)).toEqual(['←'])
    expect(comboParts(keys['map.recentre'], translate)).toEqual(['Shift', '1'])
    expect(comboParts(keys['map.zoomIn'], translate)).toEqual(['+'])
  })
})
