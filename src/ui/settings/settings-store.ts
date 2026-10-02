// Which Settings tab is open, if any (UX-DR134). One dialog for the whole app, opened from the top
// bar menu on Home and in the Editor, and directly on a tab by later stories (Story 1.15 opens
// `storage` from the storage banner).

import { useSyncExternalStore } from 'react'

export type SettingsTab = 'appearance' | 'language' | 'storage'
export const SETTINGS_TABS: readonly SettingsTab[] = ['appearance', 'language', 'storage']

export type SettingsState =
  | { readonly open: false }
  | {
      readonly open: true
      readonly tab: SettingsTab
      /** The element focused when Settings opened, refocused on close. */
      readonly returnFocus: HTMLElement | null
      /** The control that opened Settings, refocused when `returnFocus` is gone. */
      readonly trigger: HTMLElement | null
    }

let state: SettingsState = { open: false }
const listeners = new Set<() => void>()

function set(next: SettingsState): void {
  state = next
  for (const listener of listeners) listener()
}

/**
 * Opens Settings on `tab` (Appearance by default). The focus goes back to the element focused now
 * when the dialog closes, or to `trigger` when that element has left the page. Called while open,
 * it only switches tab.
 */
export function openSettings(tab: SettingsTab = 'appearance', trigger: HTMLElement | null = null): void {
  if (state.open) return set({ ...state, tab })
  const focused = typeof document === 'undefined' ? null : document.activeElement
  set({ open: true, tab, returnFocus: typeof HTMLElement !== 'undefined' && focused instanceof HTMLElement ? focused : null, trigger })
}

export function selectSettingsTab(tab: SettingsTab): void {
  if (state.open) set({ ...state, tab })
}

export function closeSettings(): void {
  if (state.open) set({ open: false })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSettingsState(): SettingsState {
  return state
}

export function useSettingsState(): SettingsState {
  return useSyncExternalStore(subscribe, getSettingsState)
}
