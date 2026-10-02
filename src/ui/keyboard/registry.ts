// The central shortcut registry (UX-DR110–113, UX-DR154–158). Every key the app reacts to is
// registered here with its i18n name, so the help dialog and the tooltips stay in step with what
// the keys do, and the context rules (text field, composite widget, dialog, Escape order) live in
// one place. Letter keys follow the typed character (`event.key`), so they work the same with
// AZERTY and QWERTY; on a non-Latin layout (Cyrillic, Greek…) the physical key (`event.code`)
// stands in. Alt+digit matches the physical digit row, with no Shift/Ctrl/Meta (AltGr reports
// Ctrl+Alt on Windows and is therefore ignored).

import { useSyncExternalStore } from 'react'

export interface KeyCombo {
  /** A typed character: a Latin letter (matched case-insensitively), a symbol such as `?`, or `Escape`. */
  readonly key?: string
  /** A physical key such as `Digit1`, matched on `event.code` (region jumps). */
  readonly code?: string
  /** Ctrl, or Cmd on a Mac. */
  readonly ctrl?: boolean
  readonly shift?: boolean
  readonly alt?: boolean
}

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

export type ShortcutGroup = 'editing' | 'tools' | 'navigation' | 'help'

export interface ShortcutDef {
  readonly id: string
  readonly group: ShortcutGroup
  /** i18n key of the shortcut's name, shown in the help and the tooltips. */
  readonly nameKey: string
  /** The first combo is the one the help and the tooltips show. */
  readonly keys: readonly KeyCombo[]
  /** The more specific context wins when two shortcuts match the same key (default 0). */
  readonly priority?: number
  /** Also fires while a text field has the focus (Ctrl+S), where the other keys belong to the field. */
  readonly inTextField?: boolean
  /** Fires again while the key is held (default: once). The browser action is prevented either way. */
  readonly repeat?: boolean
  /** Listed in the help only: the key is handled elsewhere (Escape, by the chain below). */
  readonly listOnly?: boolean
  /** Skipped, and left to the browser, while this returns false. */
  readonly enabled?: () => boolean
  readonly run: () => void
}

/** One step of the Escape chain: returns true when it did something, which ends the chain. */
export interface EscapeStep {
  readonly id: string
  /** Higher runs first: menu and popover, dialog, drawing, drawer, selection, tool (later stories). */
  readonly priority: number
  readonly run: () => boolean
}

// ---------------------------------------------------------------------------------------------
// Matching (pure)

/** The Latin letter of an event: the typed one, or the physical key's on a non-Latin layout. */
export function letterOf(event: ShortcutEvent): string | undefined {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase()
  // Only a typed non-Latin letter (Cyrillic, Greek…) falls back to the physical key: a Dvorak `.` or an
  // AZERTY `,` is a symbol of a Latin layout and must not stand for the letter printed on its key.
  if (!/^\p{L}$/u.test(event.key)) return undefined
  const physical = /^Key([A-Z])$/.exec(event.code ?? '')
  return physical ? physical[1].toLowerCase() : undefined
}

/** Whether `event` is exactly the key `combo` stands for. */
export function matchesCombo(combo: KeyCombo, event: ShortcutEvent): boolean {
  const ctrl = event.ctrlKey || event.metaKey
  if (combo.code !== undefined) {
    // Region jumps: the physical key, with Alt alone (no Shift, Ctrl, Cmd or AltGr).
    return event.code === combo.code && event.altKey === (combo.alt ?? false) && !ctrl && !event.shiftKey
  }
  const key = combo.key
  if (key === undefined) return false
  if (key === 'Escape') return event.key === 'Escape' && !ctrl && !event.altKey && !event.shiftKey
  if (/^[a-z]$/i.test(key)) {
    // Alt is excluded: AltGr reports Ctrl+Alt.
    return letterOf(event) === key.toLowerCase() && !event.altKey && ctrl === (combo.ctrl ?? false) && event.shiftKey === (combo.shift ?? false)
  }
  // A symbol (`?`): the typed character decides, so Shift (needed on AZERTY and QWERTY) is free; AltGr
  // (Ctrl+Alt) may be how a layout types it.
  if (event.key !== key) return false
  if (combo.ctrl) return ctrl && !event.altKey
  // AltGr (Ctrl+Alt) may be how a layout types the symbol.
  return (ctrl && event.altKey) || (!ctrl && !event.altKey)
}

/** Input types where the browser edits text, and so has its own Ctrl+Z. */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number'])

interface ElementLike {
  readonly tagName?: unknown
  readonly type?: unknown
  readonly readOnly?: unknown
  readonly disabled?: unknown
  readonly isContentEditable?: unknown
  readonly closest?: unknown
}

/** Whether the focus is in a field that edits text: there, keys type, and Ctrl+Z undoes the typing. */
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

/** ARIA roles of the composite widgets, which own the arrows, Space and Enter (ARIA authoring practices). */
const COMPOSITE_SELECTOR = '[role="menu"],[role="menubar"],[role="radiogroup"],[role="tablist"],[role="slider"],[role="listbox"],[role="combobox"],[role="grid"],[role="tree"],[role="spinbutton"]'

/** Whether the focus is inside a composite widget (menu, radiogroup, tablist, slider, listbox…). */
export function isCompositeWidget(target: EventTarget | null): boolean {
  if (typeof target !== 'object' || target === null) return false
  const { closest } = target as ElementLike
  return typeof closest === 'function' && (closest as (selector: string) => unknown).call(target, COMPOSITE_SELECTOR) !== null
}

/** Keys a composite widget uses (arrows, Home/End, Page keys, Space, Enter). */
const WIDGET_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' ', 'Spacebar', 'Enter'])

/**
 * The shortcut an event stands for, by context priority: a text field keeps every unmodified key and
 * Ctrl combo (except shortcuts marked `inTextField`); a composite widget keeps its navigation keys;
 * then the most specific shortcut wins.
 */
export function resolveShortcut(event: ShortcutEvent, shortcuts: readonly ShortcutDef[]): ShortcutDef | undefined {
  if (event.isComposing) return undefined
  const inField = isTextEntry(event.target)
  const inWidget = !inField && isCompositeWidget(event.target) && WIDGET_KEYS.has(event.key)
  let best: ShortcutDef | undefined
  for (const shortcut of shortcuts) {
    if (shortcut.listOnly || !shortcut.keys.some((combo) => matchesCombo(combo, event))) continue
    if (inField && !shortcut.inTextField) continue
    if (inWidget) continue
    if (shortcut.enabled && !shortcut.enabled()) continue
    if (!best || (shortcut.priority ?? 0) > (best.priority ?? 0)) best = shortcut
  }
  return best
}

/** Whether `event` is Ctrl/Cmd+S, the Editor's save (the browser's Save page is always prevented). */
export function isSaveKey(event: ShortcutEvent): boolean {
  return matchesCombo(SAVE_COMBO, event)
}

export const SAVE_COMBO: KeyCombo = { key: 's', ctrl: true }

// ---------------------------------------------------------------------------------------------
// Registry (module store, the pattern of settings-store.ts)

let shortcuts: readonly ShortcutDef[] = []
let escapeSteps: readonly EscapeStep[] = []
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Registers `shortcut`; returns the unregister function. A repeated id replaces the earlier entry. */
export function registerShortcut(shortcut: ShortcutDef): () => void {
  shortcuts = [...shortcuts.filter((existing) => existing.id !== shortcut.id), shortcut]
  emit()
  return () => {
    if (!shortcuts.includes(shortcut)) return
    shortcuts = shortcuts.filter((existing) => existing !== shortcut)
    emit()
  }
}

/** Registers several shortcuts at once; returns one unregister function. */
export function registerShortcuts(list: readonly ShortcutDef[]): () => void {
  const undo = list.map(registerShortcut)
  return () => undo.forEach((fn) => fn())
}

/** Registers a step of the Escape chain; returns the unregister function. */
export function registerEscapeStep(step: EscapeStep): () => void {
  escapeSteps = [...escapeSteps.filter((existing) => existing.id !== step.id), step]
  return () => {
    escapeSteps = escapeSteps.filter((existing) => existing !== step)
  }
}

/** The shortcuts registered right now (what the help lists). A new array on every change. */
export function getShortcuts(): readonly ShortcutDef[] {
  return shortcuts
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useShortcuts(): readonly ShortcutDef[] {
  return useSyncExternalStore(subscribe, getShortcuts)
}

/** Runs the Escape chain once, highest priority first; true when a step acted. */
export function runEscapeChain(steps: readonly EscapeStep[] = escapeSteps): boolean {
  for (const step of [...steps].sort((a, b) => b.priority - a.priority)) if (step.run()) return true
  return false
}

/** Priority of the tooltip's Escape step: above every dialog, menu and tool step. */
export const TOOLTIP_ESCAPE_PRIORITY = 100

/**
 * Runs only the steps at `minPriority` or above. A dialog uses it to let Escape dismiss a shown
 * tooltip first, since the registry itself is blocked while a modal is open.
 */
export function runEscapeStepsAtLeast(minPriority: number): boolean {
  return runEscapeChain(escapeSteps.filter((step) => step.priority >= minPriority))
}

/** Clears the registry (tests). */
export function resetRegistry(): void {
  shortcuts = []
  escapeSteps = []
  emit()
}

// ---------------------------------------------------------------------------------------------
// Listener

/** A modal dialog is open: nothing behind it reacts to the keyboard. */
function modalOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]') !== null
}

/**
 * Listens for keys on `target` (the window). Escape leaves a text field (blur) and does nothing
 * else; otherwise it runs the next step of the chain. Menus and dialogs handle their own Escape
 * first and stop it from reaching here. An event a control already handled (`defaultPrevented`) is
 * left alone, and nothing runs behind a modal dialog. Returns the uninstaller.
 */
export function installKeyboard(target: EventTarget, isBlocked: () => boolean = modalOpen): () => void {
  const onKeyDown = (event: Event) => {
    const keyboard = event as KeyboardEvent
    if (keyboard.defaultPrevented || keyboard.isComposing || isBlocked()) return
    if (keyboard.key === 'Escape' && matchesCombo({ key: 'Escape' }, keyboard)) {
      if (isTextEntry(keyboard.target)) {
        ;(keyboard.target as HTMLElement).blur()
        keyboard.preventDefault()
      } else if (runEscapeChain()) {
        keyboard.preventDefault()
      }
      return
    }
    const shortcut = resolveShortcut(keyboard, shortcuts)
    if (!shortcut) return
    keyboard.preventDefault()
    if (keyboard.repeat && !shortcut.repeat) return
    shortcut.run()
  }
  target.addEventListener('keydown', onKeyDown)
  return () => target.removeEventListener('keydown', onKeyDown)
}

// ---------------------------------------------------------------------------------------------
// Display

/** The parts of `combo` as shown: modifier i18n keys first, then the key itself. */
export function comboParts(combo: KeyCombo, translate: (key: string) => string): string[] {
  const parts: string[] = []
  if (combo.ctrl) parts.push(translate('keyboard.keys.ctrl'))
  if (combo.alt) parts.push(translate('keyboard.keys.alt'))
  if (combo.shift) parts.push(translate('keyboard.keys.shift'))
  if (combo.code) parts.push(combo.code.replace(/^Digit/, ''))
  else if (combo.key === 'Escape') parts.push(translate('keyboard.keys.escape'))
  else if (combo.key) parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key)
  return parts
}

/** « Ctrl+Maj+Z »: the combo as shown, in the UI language. */
export function formatCombo(combo: KeyCombo, translate: (key: string) => string): string {
  return comboParts(combo, translate).join('+')
}
