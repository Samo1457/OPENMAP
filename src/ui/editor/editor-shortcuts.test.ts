import { describe, expect, it, vi } from 'vitest'
import { editorShortcut, installEditorShortcuts, isTextEntry, type ShortcutEvent } from './editor-shortcuts'

const press = (key: string, modifiers: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  target: null,
  ...modifiers,
})

const input = (type = 'text', extra: Record<string, unknown> = {}) => ({ tagName: 'INPUT', type, ...extra }) as unknown as EventTarget
const button = { tagName: 'BUTTON', type: 'button' } as unknown as EventTarget

describe('editorShortcut (FR-55, UX-DR114)', () => {
  it('maps Ctrl+Z to undo, Ctrl+Shift+Z and Ctrl+Y to redo, Ctrl+S to save', () => {
    expect(editorShortcut(press('z'))).toBe('undo')
    expect(editorShortcut(press('Z', { shiftKey: true }))).toBe('redo')
    expect(editorShortcut(press('y'))).toBe('redo')
    expect(editorShortcut(press('s'))).toBe('save')
  })

  it('follows the typed character (AZERTY: the Z key types z wherever it sits) and accepts Cmd', () => {
    expect(editorShortcut(press('Z'))).toBe('undo') // Caps Lock
    expect(editorShortcut(press('z', { ctrlKey: false, metaKey: true }))).toBe('undo')
    expect(editorShortcut(press('w'))).toBeUndefined()
  })

  it('falls back to the physical key when the typed character is not a Latin letter (Cyrillic, Greek)', () => {
    expect(editorShortcut(press('я', { code: 'KeyZ' }))).toBe('undo')
    expect(editorShortcut(press('Я', { code: 'KeyZ', shiftKey: true }))).toBe('redo')
    expect(editorShortcut(press('υ', { code: 'KeyY' }))).toBe('redo')
    expect(editorShortcut(press('ы', { code: 'KeyS' }))).toBe('save')
    // A Latin typed character wins over the physical key (AZERTY: z sits on KeyW).
    expect(editorShortcut(press('z', { code: 'KeyW' }))).toBe('undo')
    expect(editorShortcut(press('w', { code: 'KeyZ' }))).toBeUndefined()
  })

  it('ignores keys while an input method composes', () => {
    expect(editorShortcut(press('z', { isComposing: true }))).toBeUndefined()
    expect(editorShortcut(press('s', { isComposing: true }))).toBeUndefined()
  })

  it('ignores keys without Ctrl, with Alt (AltGr) and other combinations', () => {
    expect(editorShortcut(press('z', { ctrlKey: false }))).toBeUndefined()
    expect(editorShortcut(press('z', { altKey: true }))).toBeUndefined()
    expect(editorShortcut(press('s', { shiftKey: true }))).toBeUndefined()
    expect(editorShortcut(press('y', { shiftKey: true }))).toBeUndefined()
  })

  it('leaves undo and redo to a text field, but saves from anywhere', () => {
    for (const target of [input(), input('search'), { tagName: 'TEXTAREA' } as unknown as EventTarget, { isContentEditable: true } as unknown as EventTarget]) {
      expect(editorShortcut(press('z', { target }))).toBeUndefined()
      expect(editorShortcut(press('y', { target }))).toBeUndefined()
      expect(editorShortcut(press('s', { target }))).toBe('save')
    }
    expect(editorShortcut(press('z', { target: button }))).toBe('undo')
  })
})

describe('isTextEntry', () => {
  it('counts editable text inputs and textareas only', () => {
    expect(isTextEntry(input())).toBe(true)
    expect(isTextEntry(input('checkbox'))).toBe(false)
    expect(isTextEntry(input('text', { readOnly: true }))).toBe(false)
    expect(isTextEntry(input('text', { disabled: true }))).toBe(false)
    expect(isTextEntry(button)).toBe(false)
    expect(isTextEntry(null)).toBe(false)
  })
})

describe('installEditorShortcuts', () => {
  function keydown(target: EventTarget, init: KeyboardEventInit) {
    const event = new Event('keydown', { cancelable: true }) as Event & Record<string, unknown>
    Object.assign(event, { key: '', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, ...init })
    target.dispatchEvent(event)
    return event
  }

  it('prevents the browser action, runs the handler, saves once while Ctrl+S is held, and uninstalls', () => {
    const target = new EventTarget()
    const handlers = { undo: vi.fn<() => void>(), redo: vi.fn<() => void>(), save: vi.fn<() => void>() }
    const uninstall = installEditorShortcuts(target, handlers)

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

  it('leaves an event a control already handled (defaultPrevented) alone', () => {
    const target = new EventTarget()
    target.addEventListener('keydown', (event) => event.preventDefault())
    const handlers = { undo: vi.fn<() => void>(), redo: vi.fn<() => void>(), save: vi.fn<() => void>() }
    installEditorShortcuts(target, handlers)
    keydown(target, { key: 's', ctrlKey: true })
    keydown(target, { key: 'z', ctrlKey: true })
    expect(handlers.save).not.toHaveBeenCalled()
    expect(handlers.undo).not.toHaveBeenCalled()
  })
})
