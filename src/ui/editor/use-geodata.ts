import { useEffect, useMemo, useRef, useState } from 'react'
import { type GeoGeometry, type Geodata, type GeoPin, selectGeoEntities, stateKey } from '@/core'
import { geo } from '@/library'

/** `loading` until the first data arrives, `unavailable` when it cannot be loaded (no Territory then). */
export type GeoStatus = 'loading' | 'ready' | 'unavailable'

export interface GeodataLoad {
  readonly status: GeoStatus
  /** What the evaluator draws from: the index and the states of `year`. */
  readonly geodata: Geodata
  /**
   * The Reference Date year `geodata` was loaded for. While a new date loads it stays the previous
   * one, so the previous Territories stay on the Map and editing is never blocked.
   */
  readonly year: number | undefined
  /** The dataset and Reference Date year this result answers; any other request is still loading. */
  readonly key?: string
}

const NOTHING: GeodataLoad = { status: 'loading', geodata: {}, year: undefined }

/**
 * Loads the geo data of the Project's pinned version for its Reference Date through `src/library`
 * (cached in Dexie after the first fetch). A load that is superseded is dropped; a failure leaves
 * `unavailable`, which the next successful load clears. It never throws and never toasts.
 */
export function useGeodata(pin: GeoPin | undefined, referenceYear: number | undefined): GeodataLoad {
  const [load, setLoad] = useState<GeodataLoad>(NOTHING)
  const requestKey = `${pin?.dataset}@${pin?.version}/${referenceYear}`
  const dataset = pin ? `${pin.dataset}@${pin.version}` : undefined
  /** The index of the pinned version, once loaded; the states already held for the current selection. */
  const loaded = useRef<{ dataset: string; index: NonNullable<Geodata['index']> } | undefined>(undefined)
  const held = useRef<Readonly<Record<string, GeoGeometry>>>({})

  useEffect(() => {
    if (!pin || dataset === undefined || referenceYear === undefined) return
    const controller = new AbortController()
    void (async () => {
      if (loaded.current?.dataset !== dataset) {
        loaded.current = undefined
        held.current = {}
        const index = await geo.loadIndex(pin, controller.signal)
        if (controller.signal.aborted) return
        if (!index.ok) return setLoad((previous) => ({ status: 'unavailable', geodata: {}, year: previous.year, key: requestKey }))
        loaded.current = { dataset, index: index.value }
      }
      const { index } = loaded.current
      const selection = selectGeoEntities(index, referenceYear)
      const wanted = (selection?.entities ?? []).map(({ entity, fromYear }) => ({ entityId: entity.id, fromYear }))
      const missing = wanted.filter(({ entityId, fromYear }) => held.current[stateKey(entityId, fromYear)] === undefined)
      let states = held.current
      if (missing.length > 0) {
        const result = await geo.loadStates(pin, missing, controller.signal)
        if (controller.signal.aborted) return
        if (!result.ok) {
          held.current = {}
          return setLoad({ status: 'unavailable', geodata: {}, year: referenceYear, key: requestKey })
        }
        states = { ...held.current, ...result.value }
      }
      // Only the states of this selection are kept: the memory follows the date, not the history.
      const kept: Record<string, GeoGeometry> = {}
      for (const { entityId, fromYear } of wanted) kept[stateKey(entityId, fromYear)] = states[stateKey(entityId, fromYear)]
      held.current = kept
      setLoad({ status: 'ready', geodata: { index, states: kept }, year: referenceYear, key: requestKey })
    })()
    return () => controller.abort()
  }, [pin, dataset, referenceYear, requestKey])

  // A new request is `loading` at once, so a stale « unavailable » goes; the previous Territories and
  // data date stay until the new data arrives.
  return useMemo(() => (load.key === requestKey || load.status === 'loading' ? load : { ...load, status: 'loading' as const }), [load, requestKey])
}
