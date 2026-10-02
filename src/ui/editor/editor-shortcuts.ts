// The Editor's undo, redo and save shortcuts (FR-55, UX-DR114, AD-8). A small local handler that
// Story 1.7's shortcut registry absorbs. Keys follow the typed character (`event.key`), so they
// work the same with AZERTY and QWERTY; on a non-Latin layout (Cyrillic, Greek…), where the typed
// character is not a Latin letter, the physical key (`event.code`) stands in.

export type EditorShortcut = 'undo' | 'redo' | 'save'

export interface ShortcutEvent {
  readonly key: string
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly target: EventTarget | null
  /** The physical key, e.g. `KeyZ`. */
  readonly code?: string
  /** True while an input method is composing text: the keys belong to it. */
  readonly isComposing?: boolean
}

/** The Latin letter of the shortcut: the typed one, or the physical key's on a non-Latin layout. */
function letterOf(event: ShortcutEvent): string | undefined {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase()
  const physical = /^Key([A-Z])$/.exec(event.code ?? '')
  return physical ? physical[1].toLowerCase() : undefined
}

/** Input types where the browser edits text, and so has its own Ctrl+Z. */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number'])

interface ElementLike {
  readonly tagName?: unknown
  readonly type?: unknown
  readonly readOnly?: unknown
  readonly disabled?: unknown
  readonly isContentEditable?: unknown
}

/** Whether the focus is in a field that edits text: there, Ctrl+Z undoes the typing, not the Project. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (typeof target !== 'object' || target === null) return false
  const element = target as ElementLike
  if (element.isContentEditable === true) return true
  const tag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : ''
  const editable = element.readOnly !== true && element.disabled !== true
  if (tag === 'TEXTAREA') return editable
  if (tag === 'INPUT') return editable && TEXT_INPUT_TYPES.has(typeof element.type === 'string' ? element.type.toLowerCase() : 'text')
  return false
}

/**
 * The shortcut an event stands for: Ctrl+Z undo, Ctrl+Shift+Z and Ctrl+Y redo (outside text
 * fields), Ctrl+S save (everywhere). Cmd works like Ctrl. Alt is excluded, as AltGr reports
 * Ctrl+Alt on Windows.
 */
export function editorShortcut(event: ShortcutEvent): EditorShortcut | undefined {
  if (event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return undefined
  const key = letterOf(event)
  if (key === 's') return event.shiftKey ? undefined : 'save'
  if (isTextEntry(event.target)) return undefined
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (key === 'y') return event.shiftKey ? undefined : 'redo'
  return undefined
}

/**
 * Listens for the shortcuts on `target` (the window). The browser action is prevented for each
 * one, including Save page on Ctrl+S. A held Ctrl+S saves once. An event a control already handled
 * (`defaultPrevented`) is left alone. Returns the uninstaller.
 */
export function installEditorShortcuts(target: EventTarget, handlers: Record<EditorShortcut, () => void>): () => void {
  const onKeyDown = (event: Event) => {
    const keyboard = event as KeyboardEvent
    if (keyboard.defaultPrevented) return
    const shortcut = editorShortcut(keyboard)
    if (!shortcut) return
    keyboard.preventDefault()
    if (shortcut === 'save' && keyboard.repeat) return
    handlers[shortcut]()
  }
  target.addEventListener('keydown', onKeyDown)
  return () => target.removeEventListener('keydown', onKeyDown)
}
