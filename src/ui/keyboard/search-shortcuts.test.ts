import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCombo, resetRegistry, resolveShortcut, runEscapeChain, registerEscapeStep, registerShortcuts, type ShortcutEvent } from './registry'
import { SEARCH_COMBO, searchShortcuts } from './search-shortcuts'
import { returnToSelect, setTool } from './tool-store'

const press = (key: string, modifiers: Partial<ShortcutEvent> = {}): ShortcutEvent => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, target: null, ...modifiers })
const input = (type = 'text') => ({ tagName: 'INPUT', type }) as unknown as EventTarget
const button = { tagName: 'BUTTON', type: 'button' } as unknown as EventTarget

beforeEach(() => {
  resetRegistry()
  setTool('select')
})

describe('the / shortcut (UX-DR154)', () => {
  const focus = vi.fn<() => void>()
  const shortcuts = () => searchShortcuts({ focus, enabled: () => true })
  const id = (event: ShortcutEvent, list = shortcuts()) => resolveShortcut(event, list)?.id

  it('is registered in Navigation, named by an i18n key, and shown as « / »', () => {
    const [shortcut] = shortcuts()
    expect(shortcut).toMatchObject({ id: 'search.focus', group: 'navigation', nameKey: 'keyboard.shortcuts.search.focus', keys: [SEARCH_COMBO] })
    expect(formatCombo(SEARCH_COMBO, (key) => key)).toBe('/')
  })

  it('answers to the typed `/`, with or without Shift (AZERTY types it with Shift)', () => {
    expect(id(press('/', { target: button }))).toBe('search.focus')
    expect(id(press('/', { shiftKey: true, target: button }))).toBe('search.focus')
    expect(id(press('/'))).toBe('search.focus')
  })

  it('stays text in every text field', () => {
    for (const type of ['text', 'search', 'email', 'number']) expect(id(press('/', { target: input(type) }))).toBeUndefined()
    expect(id(press('/', { target: { tagName: 'TEXTAREA' } as unknown as EventTarget }))).toBeUndefined()
    expect(id(press('/', { target: { isContentEditable: true } as unknown as EventTarget }))).toBeUndefined()
  })

  it('is not an editing combo: Ctrl+/ and Alt+/ are left alone', () => {
    expect(id(press('/', { ctrlKey: true, target: button }))).toBeUndefined()
    expect(id(press('/', { altKey: true, target: button }))).toBeUndefined()
  })

  it('does nothing and leaves the key to the browser while it is disabled', () => {
    expect(id(press('/', { target: button }), searchShortcuts({ focus, enabled: () => false }))).toBeUndefined()
  })

  it('is ignored during an IME composition', () => {
    expect(id(press('/', { isComposing: true, target: button }))).toBeUndefined()
  })

  it('runs its handler through the registry', () => {
    const run = vi.fn<() => void>()
    registerShortcuts(searchShortcuts({ focus: run }))
    resolveShortcut(press('/', { target: button }), [searchShortcuts({ focus: run })[0]])?.run()
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('the Escape order with a selection (SELECTION_ESCAPE_PRIORITY)', () => {
  it('runs after higher steps and before « return to Select »', async () => {
    const { selectEntity, selectionEscapeStep, getSelection, clearSelection } = await import('@/ui/editor/selection-store')
    const order: string[] = []
    registerEscapeStep({ id: 'tool.return', priority: 0, run: () => (order.push('tool'), returnToSelect()) })
    registerEscapeStep(selectionEscapeStep((name) => order.push(`cleared ${name}`)))
    registerEscapeStep({ id: 'drawer', priority: 20, run: () => (order.push('drawer'), false) })
    selectEntity('cliopatria@0.2.0:x', 'X')
    expect(runEscapeChain()).toBe(true)
    expect(order).toEqual(['drawer', 'cleared X'])
    expect(getSelection()).toBeUndefined()
    // Nothing selected, Select already active: nothing acts.
    order.length = 0
    expect(runEscapeChain()).toBe(false)
    expect(order).toEqual(['drawer', 'tool'])
    clearSelection()
  })
})
