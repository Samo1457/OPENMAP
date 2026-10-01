/**
 * AD-19: a lazily loaded chunk that fails after a redeploy (old hashed file
 * gone) triggers a reload after flushing pending saves. Another failure within
 * RELOAD_COOLDOWN_MS of the last reload does not reload again, so a broken
 * deploy cannot loop; a later redeploy in the same long-lived tab still recovers.
 */

/** sessionStorage key holding the time (ms) of this tab's last automatic reload. */
export const CHUNK_RELOAD_FLAG = 'openmap:chunk-reload-attempted'

/** Minimum time between two automatic reloads of the same tab. */
export const RELOAD_COOLDOWN_MS = 5 * 60 * 1000

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface ChunkReloadDeps {
  /** Receives Vite's `vite:preloadError` events (the window in the app). */
  target: EventTarget
  /** Per-tab storage holding the last reload time (sessionStorage in the app). */
  storage: () => FlagStorage
  /** Current time in milliseconds (Date.now in the app). */
  now: () => number
  flush: () => Promise<void>
  reload: () => void
}

export function installChunkReload(deps: ChunkReloadDeps): () => void {
  const onPreloadError = (event: Event) => {
    let storage: FlagStorage
    try {
      storage = deps.storage()
      const now = deps.now()
      const last = Number(storage.getItem(CHUNK_RELOAD_FLAG))
      // A missing, unreadable or future value (clock set back) counts as "never reloaded".
      if (Number.isFinite(last) && last > 0 && now >= last && now - last < RELOAD_COOLDOWN_MS) return
      storage.setItem(CHUNK_RELOAD_FLAG, String(now))
    } catch {
      // Without the timestamp we cannot rule out a reload loop: let the error surface.
      return
    }
    // Stop Vite from rethrowing: we recover by reloading.
    event.preventDefault()
    deps.flush().then(deps.reload, () => {
      // Keep the tab (and its unsaved state) rather than reload over a failed flush,
      // and clear the timestamp so a later failure can still recover with a reload.
      try {
        storage.removeItem(CHUNK_RELOAD_FLAG)
      } catch {
        // Storage became unavailable: nothing more to do.
      }
    })
  }
  deps.target.addEventListener('vite:preloadError', onPreloadError)
  return () => deps.target.removeEventListener('vite:preloadError', onPreloadError)
}
