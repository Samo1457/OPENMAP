// Whether the shortcuts help is open (`?`), on Home and in the Editor (UX-DR110).

import { useSyncExternalStore } from 'react'
import type { ShortcutDef } from './registry'

let open = false
const listeners = new Set<() => void>()

function set(next: boolean): void {
  if (open === next) return
  open = next
  for (const listener of listeners) listener()
}

export const openShortcutHelp = () => set(true)
export const closeShortcutHelp = () => set(false)

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useShortcutHelpOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open)
}

/** `?` opens the help, wherever the app is; Escape closes it (the dialog's own). */
export const HELP_SHORTCUTS: readonly ShortcutDef[] = [
  { id: 'help.open', group: 'help', nameKey: 'keyboard.shortcuts.help', keys: [{ key: '?' }], run: openShortcutHelp },
  { id: 'help.escape', group: 'help', nameKey: 'keyboard.shortcuts.escape', keys: [{ key: 'Escape' }], listOnly: true, run: () => undefined },
]
