// Banners dismissed for this session (UX-DR66): kept in sessionStorage, so a dismissed banner stays
// hidden across Home, the Editor and reloads of this tab, and comes back in a new tab or session.
// Never localStorage (AD-8). When sessionStorage is unavailable, dismissals last until reload.

export interface Dismissals {
  isDismissed(key: string): boolean
  dismiss(key: string): void
  subscribe(listener: () => void): () => void
}

export const DISMISSALS_STORAGE_KEY = 'openmap:dismissedBanners'

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>

function load(storage: () => SessionStore | undefined): Set<string> {
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(DISMISSALS_STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [])
  } catch {
    return new Set()
  }
}

/** `storage` returns the tab's sessionStorage; it may throw or return undefined (blocked storage). */
export function createDismissals(storage: () => SessionStore | undefined = () => undefined): Dismissals {
  const dismissed = load(storage)
  const listeners = new Set<() => void>()
  return {
    isDismissed: (key) => dismissed.has(key),
    dismiss(key) {
      if (dismissed.has(key)) return
      dismissed.add(key)
      try {
        storage()?.setItem(DISMISSALS_STORAGE_KEY, JSON.stringify([...dismissed]))
      } catch {
        // Storage blocked or full: the dismissal still holds until reload.
      }
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** The tab's dismissals, shared by every banner of the page. */
export const sessionDismissals = createDismissals(() => (typeof window === 'undefined' ? undefined : window.sessionStorage))
