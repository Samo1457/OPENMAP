// Screen-reader announcements (UX-DR156): one polite live region in the Editor reads the latest
// message; `n` makes a repeated message be read again.

import { useSyncExternalStore } from 'react'

export interface Announcement {
  readonly text: string
  readonly n: number
}

let current: Announcement = { text: '', n: 0 }
const listeners = new Set<() => void>()

/** Announces `text` politely. */
export function announce(text: string): void {
  current = { text, n: current.n + 1 }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAnnouncement(): Announcement {
  return current
}

export function useAnnouncement(): Announcement {
  return useSyncExternalStore(subscribe, getAnnouncement)
}
