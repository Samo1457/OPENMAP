// The save status of the top bar (UX-DR137, AD-8), derived from the Editor's autosave status.

import type { SaveStatus } from '@/persistence'

/** What the top bar shows: « Enregistrement… », « Enregistré » or « Non enregistré ». */
export type SaveIndicator = SaveStatus

/**
 * The next indicator for a new autosave status. After a failure, a retry in progress still reads
 * « Non enregistré »: the error state stays until a save succeeds.
 */
export function nextSaveIndicator(previous: SaveIndicator, status: SaveStatus): SaveIndicator {
  return previous === 'error' && status === 'saving' ? 'error' : status
}

export const saveIndicatorLabel = {
  saving: 'editor.save.saving',
  saved: 'editor.save.saved',
  error: 'editor.save.error',
} as const satisfies Record<SaveIndicator, string>

export interface SaveStatusSource {
  getStatus(): SaveStatus
  subscribe(listener: (status: SaveStatus) => void): () => void
}

export interface SaveIndicatorStore {
  get(): SaveIndicator
  /** For `useSyncExternalStore`; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  dispose(): void
}

/**
 * Follows an autosave and keeps the indicator. `onFailure` runs each time the indicator enters the
 * error state (not on every failed retry), so the error toast is shown once per failure.
 */
export function createSaveIndicator(source: SaveStatusSource, onFailure?: () => void): SaveIndicatorStore {
  let indicator: SaveIndicator = source.getStatus()
  const listeners = new Set<() => void>()
  const unsubscribe = source.subscribe((status) => {
    const next = nextSaveIndicator(indicator, status)
    if (next === indicator) return
    indicator = next
    if (next === 'error') onFailure?.()
    for (const listener of Array.from(listeners)) listener()
  })
  return {
    get: () => indicator,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      unsubscribe()
      listeners.clear()
    },
  }
}
