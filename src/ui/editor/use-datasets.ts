import { useEffect, useState } from 'react'
import type { SourceMeta } from '@/core'
import { datasets } from '@/library'

/**
 * The metadata of the Basemap datasets (`/library/v1/datasets.json`, AD-17) once loaded, through
 * `src/library` (cached in Dexie after the first fetch); `undefined` while loading and when it cannot be
 * loaded: the Basemap is then neither credited nor listed. It never throws, never toasts and never
 * logs. A failed load is tried again when the browser comes back online, and the next time a Project
 * opens (the client does not remember a failure). `enabled` is false until a Project is open.
 */
export function useDatasets(enabled: boolean): readonly SourceMeta[] | undefined {
  const [loaded, setLoaded] = useState<readonly SourceMeta[] | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let done = false
    const load = () => {
      if (done) return
      void datasets.load().then((result) => {
        if (cancelled || done || !result.ok) return
        done = true
        setLoaded(result.value)
        window.removeEventListener('online', load)
      })
    }
    window.addEventListener('online', load)
    load()
    return () => {
      cancelled = true
      window.removeEventListener('online', load)
    }
  }, [enabled])
  return loaded
}
