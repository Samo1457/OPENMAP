/**
 * AD-19: a lazily loaded chunk that fails after a redeploy (old hashed file
 * gone) triggers one reload after flushing pending saves. A second failure in
 * the same tab session does not reload again, so a broken deploy cannot loop.
 */

export const CHUNK_RELOAD_FLAG = 'openmap:chunk-reload-attempted'

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface ChunkReloadDeps {
  /** Receives Vite's `vite:preloadError` events (the window in the app). */
  target: EventTarget
  /** Per-tab storage holding the once-only flag (sessionStorage in the app). */
  storage: () => FlagStorage
  flush: () => Promise<void>
  reload: () => void
}

export function installChunkReload(deps: ChunkReloadDeps): () => void {
  const onPreloadError = (event: Event) => {
    let storage: FlagStorage
    try {
      storage = deps.storage()
      if (storage.getItem(CHUNK_RELOAD_FLAG) !== null) return
      storage.setItem(CHUNK_RELOAD_FLAG, '1')
    } catch {
      // Without a flag we cannot guarantee a single reload: let the error surface.
      return
    }
    // Stop Vite from rethrowing: we recover by reloading.
    event.preventDefault()
    deps.flush().then(deps.reload, () => {
      // Keep the tab (and its unsaved state) rather than reload over a failed flush,
      // and clear the flag so a later failure can still recover with a reload.
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
