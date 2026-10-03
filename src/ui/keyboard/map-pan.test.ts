import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAN_FAST_FACTOR, PAN_SPEED } from '@/core'
import { installMapPan } from './map-pan'

type Modifiers = { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; key?: string; target?: unknown }

function key(target: EventTarget, type: 'keydown' | 'keyup', code: string, modifiers: Modifiers = {}) {
  const { target: eventTarget, ...rest } = modifiers
  const event = Object.assign(new Event(type, { cancelable: true }), { code, key: modifiers.key ?? code, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, ...rest })
  if (eventTarget) Object.defineProperty(event, 'target', { value: eventTarget })
  target.dispatchEvent(event)
  return event
}

let focus: { map: boolean; modal: boolean }

beforeEach(() => {
  focus = { map: true, modal: false }
  const region = { contains: (node: unknown) => node === 'focused' }
  vi.stubGlobal('document', {
    querySelector: (selector: string) => (selector.includes('aria-modal') ? (focus.modal ? {} : null) : region),
    get activeElement() {
      return focus.map ? 'focused' : 'elsewhere'
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

function setup() {
  const target = new EventTarget()
  const calls: [number, number][] = []
  const uninstall = installMapPan(target, (x, y) => calls.push([x, y]))
  return { target, calls, last: () => calls[calls.length - 1], uninstall }
}

describe('continuous keyboard pan', () => {
  it.each([
    ['ArrowLeft', [-PAN_SPEED, 0]],
    ['ArrowRight', [PAN_SPEED, 0]],
    ['ArrowUp', [0, -PAN_SPEED]],
    ['ArrowDown', [0, PAN_SPEED]],
    ['KeyA', [-PAN_SPEED, 0]],
    ['KeyD', [PAN_SPEED, 0]],
    ['KeyW', [0, -PAN_SPEED]],
    ['KeyS', [0, PAN_SPEED]],
  ] as const)('%s pans while held and stops on keyup', (code, expected) => {
    const { target, last } = setup()
    expect(key(target, 'keydown', code).defaultPrevented).toBe(true)
    expect(last()).toEqual(expected)
    key(target, 'keyup', code)
    expect(last()).toEqual([0, 0])
  })

  it('follows the physical key: Z/Q/S/D on AZERTY and the same keys under another layout', () => {
    const { target, last } = setup()
    key(target, 'keydown', 'KeyW', { key: 'z' }) // AZERTY
    expect(last()).toEqual([0, -PAN_SPEED])
    key(target, 'keyup', 'KeyW', { key: 'z' })
    key(target, 'keydown', 'KeyD', { key: 'e' }) // Dvorak
    expect(last()).toEqual([PAN_SPEED, 0])
  })

  it('combines diagonals at the same speed and speeds up with Shift', () => {
    const { target, last } = setup()
    key(target, 'keydown', 'ArrowRight')
    key(target, 'keydown', 'KeyW')
    const [x, y] = last()
    expect(x).toBeGreaterThan(0)
    expect(y).toBeLessThan(0)
    expect(Math.hypot(x, y)).toBeCloseTo(PAN_SPEED, 9)
    key(target, 'keydown', 'ArrowRight', { shiftKey: true })
    expect(Math.hypot(...last())).toBeCloseTo(PAN_SPEED * PAN_FAST_FACTOR, 9)
    key(target, 'keyup', 'ArrowRight')
    expect(last()).toEqual([0, -PAN_SPEED]) // W is still held
  })

  it('does nothing from a text field, with Ctrl/Alt/Cmd, in a dialog, or when the Map is not focused', () => {
    const { target, calls } = setup()
    const field = { tagName: 'INPUT', type: 'text' }
    expect(key(target, 'keydown', 'KeyD', { key: 'd', target: field }).defaultPrevented).toBe(false)
    calls.length = 0
    for (const modifiers of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      expect(key(target, 'keydown', 'KeyS', modifiers).defaultPrevented).toBe(false)
    }
    focus.modal = true
    expect(key(target, 'keydown', 'ArrowLeft').defaultPrevented).toBe(false)
    focus.modal = false
    focus.map = false
    expect(key(target, 'keydown', 'ArrowLeft').defaultPrevented).toBe(false)
    expect(calls.every(([x, y]) => x === 0 && y === 0)).toBe(true)
  })

  it('stops on blur and when the focus leaves the Map; uninstalling stops it too', () => {
    const { target, last, uninstall } = setup()
    key(target, 'keydown', 'ArrowDown')
    expect(last()).toEqual([0, PAN_SPEED])
    target.dispatchEvent(new Event('blur'))
    expect(last()).toEqual([0, 0])
    key(target, 'keydown', 'ArrowDown')
    focus.map = false
    target.dispatchEvent(new Event('focusout'))
    expect(last()).toEqual([0, 0])
    focus.map = true
    key(target, 'keydown', 'ArrowDown')
    uninstall()
    expect(last()).toEqual([0, 0])
  })

  it('re-checks the guards on every keydown: a dialog or Ctrl while a key is held stops the pan', () => {
    const { target, last } = setup()
    key(target, 'keydown', 'ArrowRight')
    expect(last()).toEqual([PAN_SPEED, 0])
    focus.modal = true
    key(target, 'keydown', 'ArrowRight') // auto-repeat, now behind a dialog
    expect(last()).toEqual([0, 0])
    focus.modal = false
    key(target, 'keydown', 'ArrowRight')
    expect(last()).toEqual([PAN_SPEED, 0])
    key(target, 'keydown', 'ControlLeft', { ctrlKey: true }) // Ctrl pressed while held
    expect(last()).toEqual([0, 0])
  })

  it('keeps the pan when the focus moves inside the Map region, stops when it leaves', () => {
    const { target, last } = setup()
    key(target, 'keydown', 'ArrowDown')
    focus.map = false // during focusout the document has no focused element yet
    const toButton = Object.assign(new Event('focusout'), { relatedTarget: 'focused' })
    target.dispatchEvent(toButton)
    expect(last()).toEqual([0, PAN_SPEED])
    target.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget: 'elsewhere' }))
    expect(last()).toEqual([0, 0])
  })
})
