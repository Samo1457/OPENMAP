import { beforeEach, describe, expect, it, vi } from 'vitest'
import { editorShortcuts } from './editor-shortcuts'
import { regionShortcuts, REGIONS } from './regions'
import {
  comboParts,
  formatCombo,
  getShortcuts,
  installKeyboard,
  isCompositeWidget,
  isTextEntry,
  matchesCombo,
  registerEscapeStep,
  registerShortcut,
  registerShortcuts,
  resetRegistry,
  resolveShortcut,
  runEscapeChain,
  type ShortcutDef,
  type ShortcutEvent,
} from './registry'
import { returnToSelect, selectToolShortcut, setTool } from './tool-store'

const press = (key: string, modifiers: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  target: null,
  ...modifiers,
})
const ctrl = (key: string, modifiers: Partial<ShortcutEvent> = {}) => press(key, { ctrlKey: true, ...modifiers })

const input = (type = 'text', extra: Record<string, unknown> = {}) => ({ tagName: 'INPUT', type, ...extra }) as unknown as EventTarget
const textarea = { tagName: 'TEXTAREA' } as unknown as EventTarget
const button = { tagName: 'BUTTON', type: 'button' } as unknown as EventTarget
/** An element inside a composite widget: `closest` finds the widget's role. */
const inWidget = (role: string) => ({ tagName: 'BUTTON', closest: (selector: string) => (selector.includes(`[role="${role}"]`) ? {} : null) }) as unknown as EventTarget

const noop = () => undefined
const fakeShortcuts = () => {
  const handlers = { undo: vi.fn<() => void>(), redo: vi.fn<() => void>(), save: vi.fn<() => void>() }
  return { handlers, shortcuts: [...editorShortcuts(handlers), selectToolShortcut(noop), ...regionShortcuts()] }
}
const idOf = (event: ShortcutEvent, shortcuts: readonly ShortcutDef[]) => resolveShortcut(event, shortcuts)?.id

beforeEach(() => {
  resetRegistry()
  setTool('select')
})

describe('matchesCombo (UX-DR110)', () => {
  it('maps Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y and Ctrl+S, and accepts Cmd', () => {
    const { shortcuts } = fakeShortcuts()
    expect(idOf(ctrl('z'), shortcuts)).toBe('editor.undo')
    expect(idOf(ctrl('Z', { shiftKey: true }), shortcuts)).toBe('editor.redo')
    expect(idOf(ctrl('y'), shortcuts)).toBe('editor.redo')
    expect(idOf(ctrl('s'), shortcuts)).toBe('editor.save')
    expect(idOf(press('z', { metaKey: true }), shortcuts)).toBe('editor.undo')
    expect(idOf(ctrl('w'), shortcuts)).toBeUndefined()
  })

  it('follows the typed character on QWERTY and AZERTY (V wherever the key sits), with or without Caps Lock', () => {
    const { shortcuts } = fakeShortcuts()
    expect(idOf(press('v', { code: 'KeyV' }), shortcuts)).toBe('tool.select') // QWERTY
    expect(idOf(press('V', { code: 'KeyV' }), shortcuts)).toBe('tool.select') // Caps Lock
    expect(idOf(press('v', { code: 'KeyB' }), shortcuts)).toBe('tool.select') // another layout: typed v wins
    expect(idOf(press('z', { code: 'KeyW', ctrlKey: true }), shortcuts)).toBe('editor.undo') // AZERTY Z
    expect(idOf(press('w', { code: 'KeyZ', ctrlKey: true }), shortcuts)).toBeUndefined()
  })

  it('falls back to the physical key on a non-Latin layout (Cyrillic, Greek)', () => {
    const { shortcuts } = fakeShortcuts()
    expect(idOf(press('м', { code: 'KeyV' }), shortcuts)).toBe('tool.select')
    expect(idOf(ctrl('я', { code: 'KeyZ' }), shortcuts)).toBe('editor.undo')
    expect(idOf(ctrl('Я', { code: 'KeyZ', shiftKey: true }), shortcuts)).toBe('editor.redo')
    expect(idOf(ctrl('υ', { code: 'KeyY' }), shortcuts)).toBe('editor.redo')
    expect(idOf(ctrl('ы', { code: 'KeyS' }), shortcuts)).toBe('editor.save')
  })

  it('does not read a symbol typed on a Latin layout as the letter printed on its physical key', () => {
    const { shortcuts } = fakeShortcuts()
    expect(idOf(press('.', { code: 'KeyV' }), shortcuts)).toBeUndefined() // Dvorak
    expect(idOf(ctrl('.', { code: 'KeyZ' }), shortcuts)).toBeUndefined()
    expect(matchesCombo({ key: 'm' }, press(',', { code: 'KeyM' }))).toBe(false) // AZERTY
    expect(matchesCombo({ key: 'm' }, press('м', { code: 'KeyM' }))).toBe(true) // Cyrillic still matches
  })

  it('requires Ctrl for a symbol combo that asks for it, and none for one that does not', () => {
    expect(matchesCombo({ key: '+', ctrl: true }, press('+'))).toBe(false)
    expect(matchesCombo({ key: '+', ctrl: true }, ctrl('+'))).toBe(true)
    expect(matchesCombo({ key: '+', ctrl: true }, ctrl('+', { altKey: true }))).toBe(false)
    expect(matchesCombo({ key: '+' }, ctrl('+'))).toBe(false)
    expect(matchesCombo({ key: '+' }, press('+'))).toBe(true)
  })

  it('repeats undo and redo while held, but not save', () => {
    const repeats = Object.fromEntries(editorShortcuts({ undo: noop, redo: noop, save: noop }).map((shortcut) => [shortcut.id, shortcut.repeat ?? false]))
    expect(repeats).toEqual({ 'editor.undo': true, 'editor.redo': true, 'editor.save': false })
  })

  it('lets Alt+1..6 through from a text field, and the V key be disabled while the Editor loads', () => {
    const { shortcuts } = fakeShortcuts()
    expect(idOf(press('1', { altKey: true, code: 'Digit1', target: input() }), shortcuts)).toBe('region.top')
    const loading = selectToolShortcut(noop, () => false)
    expect(idOf(press('v'), [loading])).toBeUndefined()
  })

  it('matches ? by the typed character, Shift or not', () => {
    expect(matchesCombo({ key: '?' }, press('?', { shiftKey: true }))).toBe(true)
    expect(matchesCombo({ key: '?' }, press('?'))).toBe(true)
    expect(matchesCombo({ key: '?' }, press('/'))).toBe(false)
    expect(matchesCombo({ key: '?' }, press('?', { altKey: true }))).toBe(false)
    expect(matchesCombo({ key: '?' }, press('?', { ctrlKey: true }))).toBe(false)
    expect(matchesCombo({ key: '?' }, press('?', { ctrlKey: true, altKey: true }))).toBe(true) // AltGr layout
  })

  it('matches Alt+1..6 on the physical digit row, in AZERTY and QWERTY alike', () => {
    const { shortcuts } = fakeShortcuts()
    REGIONS.forEach((region, index) => {
      // AZERTY types « & é " ' ( § » on the digit row; QWERTY types the digits.
      for (const key of [String(index + 1), '&', 'é']) expect(idOf(press(key, { altKey: true, code: `Digit${index + 1}` }), shortcuts)).toBe(`region.${region}`)
    })
    expect(idOf(press('7', { altKey: true, code: 'Digit7' }), shortcuts)).toBeUndefined()
    expect(idOf(press('1', { altKey: true, code: 'Numpad1' }), shortcuts)).toBeUndefined()
  })

  it('ignores Alt+Shift+digit, AltGr (Ctrl+Alt), Ctrl or Cmd with Alt, and digits without Alt', () => {
    const { shortcuts } = fakeShortcuts()
    const base = { altKey: true, code: 'Digit2' }
    expect(idOf(press('@', { ...base, shiftKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(press('é', { ...base, ctrlKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(press('é', { ...base, metaKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(press('2', { code: 'Digit2' }), shortcuts)).toBeUndefined()
  })

  it('ignores Ctrl+letter with Alt (AltGr), unlisted modifiers and keys while an input method composes', () => {
    const { shortcuts } = fakeShortcuts()
    expect(idOf(ctrl('z', { altKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(ctrl('s', { shiftKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(ctrl('y', { shiftKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(press('v', { ctrlKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(press('v', { shiftKey: true }), shortcuts)).toBeUndefined()
    expect(idOf(ctrl('z', { isComposing: true }), shortcuts)).toBeUndefined()
    expect(idOf(press('v', { isComposing: true }), shortcuts)).toBeUndefined()
  })
})

describe('context rules (UX-DR111)', () => {
  const { shortcuts } = fakeShortcuts()
  const help: ShortcutDef = { id: 'help.open', group: 'help', nameKey: 'keyboard.shortcuts.help', keys: [{ key: '?' }], run: noop }
  const all = [...shortcuts, help]

  it('leaves single letters and ? to a text field, saves from anywhere, and leaves undo and redo to the field', () => {
    for (const target of [input(), input('search'), textarea, { isContentEditable: true } as unknown as EventTarget]) {
      expect(idOf(press('v', { target }), all)).toBeUndefined()
      expect(idOf(press('?', { target, shiftKey: true }), all)).toBeUndefined()
      expect(idOf(ctrl('z', { target }), all)).toBeUndefined()
      expect(idOf(ctrl('y', { target }), all)).toBeUndefined()
      expect(idOf(ctrl('s', { target }), all)).toBe('editor.save')
    }
    expect(idOf(press('v', { target: button }), all)).toBe('tool.select')
    expect(idOf(ctrl('z', { target: button }), all)).toBe('editor.undo')
  })

  it('counts editable text inputs and textareas only', () => {
    expect(isTextEntry(input())).toBe(true)
    expect(isTextEntry(input('checkbox'))).toBe(false)
    expect(isTextEntry(input('text', { readOnly: true }))).toBe(false)
    expect(isTextEntry(input('text', { disabled: true }))).toBe(false)
    expect(isTextEntry(button)).toBe(false)
    expect(isTextEntry(null)).toBe(false)
  })

  it('leaves arrows, Space, Enter, Home and End to a composite widget', () => {
    const arrows: ShortcutDef = { id: 'step.next', group: 'navigation', nameKey: 'x', keys: [{ key: 'ArrowRight' }], run: noop }
    for (const role of ['menu', 'radiogroup', 'tablist', 'slider', 'listbox']) {
      expect(isCompositeWidget(inWidget(role))).toBe(true)
    }
    expect(isCompositeWidget(button)).toBe(false)
    // A key a widget uses is skipped inside it, whatever shortcut claims it...
    expect(resolveShortcut(press('ArrowRight', { target: inWidget('radiogroup') }), [{ ...arrows, keys: [{ key: 'ArrowRight' }] }])).toBeUndefined()
    // ...while letters and Alt+digit still reach the registry (no ARIA pattern uses them).
    expect(idOf(press('v', { target: inWidget('menu') }), all)).toBe('tool.select')
    expect(idOf(press('1', { altKey: true, code: 'Digit1', target: inWidget('tablist') }), all)).toBe('region.top')
  })

  it('lets the more specific context win and skips a disabled shortcut', () => {
    const low: ShortcutDef = { id: 'low', group: 'tools', nameKey: 'x', keys: [{ key: 'q' }], run: noop }
    const high: ShortcutDef = { ...low, id: 'high', priority: 5 }
    expect(idOf(press('q'), [low, high])).toBe('high')
    expect(idOf(press('q'), [high, low])).toBe('high')
    expect(idOf(press('q'), [low, { ...high, enabled: () => false }])).toBe('low')
  })

  it('never resolves a list-only shortcut', () => {
    expect(idOf(press('Escape'), [{ id: 'esc', group: 'help', nameKey: 'x', keys: [{ key: 'Escape' }], listOnly: true, run: noop }])).toBeUndefined()
  })
})

describe('Escape chain (UX-DR112)', () => {
  it('runs one step per press, highest priority first, and stops at the first that acted', () => {
    const calls: string[] = []
    const step = (id: string, priority: number, acts: () => boolean) => ({ id, priority, run: () => (calls.push(id), acts()) })
    let menuOpen = true
    registerEscapeStep(step('tool', 0, () => true))
    registerEscapeStep(step('menu', 90, () => (menuOpen ? ((menuOpen = false), true) : false)))
    registerEscapeStep(step('selection', 40, () => false))

    expect(runEscapeChain()).toBe(true)
    expect(calls).toEqual(['menu'])
    calls.length = 0
    expect(runEscapeChain()).toBe(true) // the menu is closed: the next press falls to the next steps
    expect(calls).toEqual(['menu', 'selection', 'tool'])
  })

  it('returns false with no step acting, and a step unregisters', () => {
    const unregister = registerEscapeStep({ id: 'a', priority: 1, run: () => true })
    unregister()
    expect(runEscapeChain()).toBe(false)
  })

  it('lets a dialog run only the steps at the tooltip priority and above', async () => {
    const { runEscapeStepsAtLeast } = await import('./registry')
    const calls: string[] = []
    registerEscapeStep({ id: 'tooltip', priority: 100, run: () => (calls.push('tooltip'), false) })
    registerEscapeStep({ id: 'menu', priority: 90, run: () => (calls.push('menu'), true) })
    expect(runEscapeStepsAtLeast(100)).toBe(false)
    expect(calls).toEqual(['tooltip'])
  })

  it('ends with return to Select, which only acts when another tool is active', () => {
    registerEscapeStep({ id: 'tool.return', priority: 0, run: returnToSelect })
    expect(runEscapeChain()).toBe(false)
    setTool('select')
    expect(returnToSelect()).toBe(false)
  })
})

describe('registry', () => {
  it('registers, replaces by id and unregisters; the list is a new array each change', () => {
    const first = getShortcuts()
    const unregister = registerShortcut({ id: 'a', group: 'tools', nameKey: 'x', keys: [{ key: 'q' }], run: noop })
    expect(getShortcuts()).not.toBe(first)
    registerShortcut({ id: 'a', group: 'tools', nameKey: 'y', keys: [{ key: 'q' }], run: noop })
    expect(getShortcuts().map((shortcut) => shortcut.nameKey)).toEqual(['y'])
    unregister()
    expect(getShortcuts()).toHaveLength(1) // the replaced entry is not the one `unregister` holds
    resetRegistry()
    expect(getShortcuts()).toEqual([])
  })

  it('lists exactly the registered shortcuts, for the help', () => {
    const { shortcuts } = fakeShortcuts()
    const unregister = registerShortcuts(shortcuts)
    expect(getShortcuts().map((shortcut) => shortcut.id)).toEqual(shortcuts.map((shortcut) => shortcut.id))
    unregister()
    expect(getShortcuts()).toEqual([])
  })
})

describe('display', () => {
  const t = (key: string) => ({ 'keyboard.keys.ctrl': 'Ctrl', 'keyboard.keys.shift': 'Maj', 'keyboard.keys.alt': 'Alt', 'keyboard.keys.escape': 'Échap' })[key] ?? key
  it('formats combos with translated modifiers', () => {
    expect(formatCombo({ key: 'z', ctrl: true, shift: true }, t)).toBe('Ctrl+Maj+Z')
    expect(formatCombo({ key: 'Escape' }, t)).toBe('Échap')
    expect(formatCombo({ code: 'Digit3', alt: true }, t)).toBe('Alt+3')
    expect(formatCombo({ key: '?' }, t)).toBe('?')
    expect(comboParts({ key: 's', ctrl: true }, t)).toEqual(['Ctrl', 'S'])
  })
})

describe('installKeyboard', () => {
  function keydown(target: EventTarget, init: Record<string, unknown>) {
    const event = new Event('keydown', { cancelable: true }) as Event & Record<string, unknown>
    const { target: focused, ...keys } = init
    Object.assign(event, { key: '', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, ...keys })
    // The focused element: `target` is read-only on a real event, so shadow it.
    if (focused !== undefined) Object.defineProperty(event, 'target', { value: focused })
    target.dispatchEvent(event)
    return event
  }

  it('prevents the browser action, runs the handler, saves once while Ctrl+S is held, and uninstalls', () => {
    const target = new EventTarget()
    const { handlers, shortcuts } = fakeShortcuts()
    registerShortcuts(shortcuts)
    const uninstall = installKeyboard(target, () => false)

    expect(keydown(target, { key: 's', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(keydown(target, { key: 's', ctrlKey: true, repeat: true }).defaultPrevented).toBe(true)
    expect(handlers.save).toHaveBeenCalledTimes(1)
    keydown(target, { key: 'z', ctrlKey: true })
    keydown(target, { key: 'y', ctrlKey: true })
    expect(handlers.undo).toHaveBeenCalledTimes(1)
    expect(handlers.redo).toHaveBeenCalledTimes(1)
    expect(keydown(target, { key: 'a', ctrlKey: true }).defaultPrevented).toBe(false)

    uninstall()
    keydown(target, { key: 'z', ctrlKey: true })
    expect(handlers.undo).toHaveBeenCalledTimes(1)
  })

  it('leaves an event a control already handled, and anything behind a modal dialog, alone', () => {
    const target = new EventTarget()
    const { handlers, shortcuts } = fakeShortcuts()
    registerShortcuts(shortcuts)
    let modal = false
    target.addEventListener('keydown', (event) => event.preventDefault()) // a control, ahead of the registry
    installKeyboard(target, () => modal)
    keydown(target, { key: 's', ctrlKey: true })
    expect(handlers.save).not.toHaveBeenCalled()

    const other = new EventTarget()
    installKeyboard(other, () => modal)
    modal = true
    keydown(other, { key: 'z', ctrlKey: true })
    keydown(other, { key: 'Escape' })
    expect(handlers.undo).not.toHaveBeenCalled()
  })

  it('Escape in a text field blurs it and runs nothing else; elsewhere it runs the chain', () => {
    const target = new EventTarget()
    const step = vi.fn<() => boolean>(() => true)
    registerEscapeStep({ id: 'a', priority: 1, run: step })
    installKeyboard(target, () => false)

    const field = { tagName: 'INPUT', type: 'text', blur: vi.fn<() => void>() }
    const inField = keydown(target, { key: 'Escape', target: field })
    expect(field.blur).toHaveBeenCalledTimes(1)
    expect(inField.defaultPrevented).toBe(true)
    expect(step).not.toHaveBeenCalled()

    keydown(target, { key: 'Escape', target: { tagName: 'BUTTON' } })
    expect(step).toHaveBeenCalledTimes(1)
  })
})
