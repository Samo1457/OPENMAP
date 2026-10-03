// The GeoEntity data client (Story 1.11, AD-12, AD-27): reads the Cliopatria index and state files
// of a Project's pinned version from the app origin at `/library/v1/geo/…` (Story 1.9 layout),
// validates every response, stores each file in the Library cache on the first fetch and reads it from
// there ever after. The paths are immutable, so a cached file is never refetched or invalidated.
// An unavailable file (404, the app's HTML fallback, bad JSON, another version) is a `geo_unavailable`
// Result, never a throw and never a console message: the Editor shows « Données historiques
// indisponibles. » and carries on.

import {
  datasetKey,
  err,
  type GeoGeometry,
  type GeoIndex,
  type GeoPin,
  ok,
  parseGeoIndex,
  parseGeoState,
  type Result,
  stateKey,
} from '@/core'

/** Root of the geo data on the app origin (data origin until Epic 7). */
export const GEO_ROOT = '/library/v1/geo'

/** Files fetched at once: enough to fill a view quickly without opening hundreds of connections. */
export const GEO_FETCH_CONCURRENCY = 8

/** The Library cache the client reads and fills (`src/persistence` in the app, a map in tests). */
export interface LibraryCache {
  read(keys: readonly string[]): Promise<Map<string, unknown>>
  write(key: string, value: unknown): Promise<unknown>
}

export interface GeoClientOptions {
  readonly cache: LibraryCache
  /** Defaults to the global `fetch`, read at call time. */
  readonly fetch?: typeof fetch
  readonly concurrency?: number
}

/** A state file to load: the entity and the `fromYear` of the period (`Geodata.states` key `stateKey`). */
export interface GeoStateRequest {
  readonly entityId: string
  readonly fromYear: number
}

export interface GeoClient {
  /** The index of the pinned dataset version. */
  loadIndex(pin: GeoPin, signal?: AbortSignal): Promise<Result<GeoIndex>>
  /**
   * The whole polygons of the requested states, keyed by `stateKey`. All or nothing: when one file
   * cannot be loaded, no Territory is drawn from a partial set.
   */
  loadStates(pin: GeoPin, wanted: readonly GeoStateRequest[], signal?: AbortSignal): Promise<Result<Record<string, GeoGeometry>>>
}

const unavailable = (reason: string) => err('geo_unavailable', { reason })

export function createGeoClient(options: GeoClientOptions): GeoClient {
  const { cache } = options
  const concurrency = Math.max(1, options.concurrency ?? GEO_FETCH_CONCURRENCY)
  const doFetch: typeof fetch = (input, init) => (options.fetch ?? globalThis.fetch)(input, init)

  /** The JSON of `path`, or why not. */
  async function fetchJson(path: string, signal?: AbortSignal): Promise<Result<unknown>> {
    let response: Response
    try {
      response = await doFetch(path, { signal })
    } catch {
      return unavailable(signal?.aborted ? 'aborted' : 'fetch')
    }
    if (!response.ok) return unavailable('http')
    try {
      return ok(await response.json())
    } catch {
      // The app shell answers an unknown path with HTML and status 200: that is not JSON.
      return unavailable(signal?.aborted ? 'aborted' : 'json')
    }
  }

  /** A failed cache read is a miss. */
  async function readCache(keys: readonly string[]): Promise<Map<string, unknown>> {
    try {
      return await cache.read(keys)
    } catch {
      return new Map()
    }
  }

  /** A failed cache write is not an error: the data still shows this session. */
  async function writeCache(key: string, value: unknown): Promise<void> {
    try {
      await cache.write(key, value)
    } catch {
      // ignored
    }
  }

  async function loadIndex(pin: GeoPin, signal?: AbortSignal): Promise<Result<GeoIndex>> {
    const key = `${datasetKey(pin)}/index`
    const cached = (await readCache([key])).get(key)
    if (cached !== undefined) {
      const index = parseGeoIndex(cached, pin)
      if (index.ok) return index
      // A damaged cache row is a miss.
    }
    const json = await fetchJson(`${GEO_ROOT}/index.json`, signal)
    if (!json.ok) return json
    const index = parseGeoIndex(json.value, pin)
    if (index.ok) await writeCache(key, index.value)
    return index
  }

  async function loadStates(pin: GeoPin, wanted: readonly GeoStateRequest[], signal?: AbortSignal): Promise<Result<Record<string, GeoGeometry>>> {
    const loaded: Record<string, GeoGeometry> = {}
    const cacheKey = (request: GeoStateRequest) => `${datasetKey(pin)}/${stateKey(request.entityId, request.fromYear)}`
    const cached = wanted.length > 0 ? await readCache(wanted.map(cacheKey)) : new Map<string, unknown>()
    const missing: GeoStateRequest[] = []
    for (const request of wanted) {
      const state = cached.has(cacheKey(request)) ? parseGeoState(cached.get(cacheKey(request)), pin, request.entityId, request.fromYear) : undefined
      if (state?.ok) loaded[stateKey(request.entityId, request.fromYear)] = state.value.geometry
      else missing.push(request)
    }
    if (missing.length === 0) return ok(loaded)

    const stored: Promise<unknown>[] = []
    let failure: Result<never> | undefined
    let next = 0
    const worker = async () => {
      while (!failure && !signal?.aborted) {
        const request = missing[next++]
        if (!request) return
        const json = await fetchJson(`${GEO_ROOT}/${encodeURIComponent(request.entityId)}/${request.fromYear}.json`, signal)
        if (failure) return
        if (!json.ok) {
          failure = json
          return
        }
        const state = parseGeoState(json.value, pin, request.entityId, request.fromYear)
        if (!state.ok) {
          failure = state
          return
        }
        loaded[stateKey(request.entityId, request.fromYear)] = state.value.geometry
        stored.push(writeCache(cacheKey(request), json.value))
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, missing.length) }, worker))
    // What was fetched stays cached even when a later file failed: the next visit starts from it.
    await Promise.all(stored)
    if (signal?.aborted) return unavailable('aborted')
    return failure ?? ok(loaded)
  }

  return { loadIndex, loadStates }
}
