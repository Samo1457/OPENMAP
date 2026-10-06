// The datasets metadata client (Story 1.13, AD-17, AD-27): reads `datasets.json` (Story 1.8) from the
// app origin at `/library/v1/datasets.json`, validates it, stores it in the Library cache on the first
// fetch and reads it from there ever after. The path is versioned and immutable: a cached file is never
// refetched. Metadata that cannot be loaded (404, the app's HTML fallback, bad JSON, an invalid
// document) is a `datasets_unavailable` Result, never a throw and never a console message: the Basemap
// is then neither listed nor credited. The metadata only feeds the credit and « Sources et licences »;
// nothing of the Project is ever sent.

import { err, ok, parseDatasets, type Result, type SourceMeta } from '@/core'
import type { LibraryCache } from './geo'

/** Path of the file on the app origin (data origin until Epic 7). */
export const DATASETS_PATH = '/library/v1/datasets.json'

/** Library cache key of the file: the immutable path, without the leading slash. */
export const DATASETS_CACHE_KEY = 'library/v1/datasets'

/** A request that has not answered after this long is given up on: the metadata is unavailable until the next try. */
export const DATASETS_FETCH_TIMEOUT_MS = 15_000

export interface DatasetsClientOptions {
  readonly cache: LibraryCache
  /** Milliseconds before a request is abandoned (default `DATASETS_FETCH_TIMEOUT_MS`). */
  readonly timeoutMs?: number
  /** Defaults to the global `fetch`, read at call time. */
  readonly fetch?: typeof fetch
}

export interface DatasetsClient {
  /**
   * The metadata: from memory once loaded, else from the Library cache, else from the network (then
   * cached). Concurrent calls share one load, so none can cancel it. A failure is not remembered, so
   * the next call tries again.
   */
  load(): Promise<Result<readonly SourceMeta[]>>
}

const unavailable = (reason: string) => err('datasets_unavailable', { reason })

export function createDatasetsClient(options: DatasetsClientOptions): DatasetsClient {
  const { cache } = options
  const doFetch: typeof fetch = (input, init) => (options.fetch ?? globalThis.fetch)(input, init)
  let loaded: readonly SourceMeta[] | undefined
  /** The load in progress, shared by concurrent callers. */
  let pending: Promise<Result<readonly SourceMeta[]>> | undefined

  async function fetchJson(): Promise<Result<unknown>> {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => {
        controller.abort()
        resolve('timeout')
      }, options.timeoutMs ?? DATASETS_FETCH_TIMEOUT_MS)
    })
    try {
      return await Promise.race([download(controller.signal), timedOut.then(() => unavailable('timeout'))])
    } finally {
      clearTimeout(timer)
    }
  }

  async function download(signal: AbortSignal): Promise<Result<unknown>> {
    let response: Response
    try {
      response = await doFetch(DATASETS_PATH, { signal })
    } catch {
      return unavailable('fetch')
    }
    if (!response.ok) return unavailable('http')
    try {
      return ok(await response.json())
    } catch {
      // The app shell answers an unknown path with HTML and status 200: that is not JSON.
      return unavailable('json')
    }
  }

  async function read(): Promise<unknown> {
    try {
      return (await cache.read([DATASETS_CACHE_KEY])).get(DATASETS_CACHE_KEY)
    } catch {
      return undefined // a failed cache read is a miss
    }
  }

  async function fetchAndStore(): Promise<Result<readonly SourceMeta[]>> {
    const json = await fetchJson()
    if (!json.ok) return json
    const parsed = parseDatasets(json.value)
    if (parsed.ok) {
      try {
        await cache.write(DATASETS_CACHE_KEY, json.value)
      } catch {
        // A failed cache write is not an error: the metadata still serves this session.
      }
    }
    return parsed
  }

  async function loadOnce(): Promise<Result<readonly SourceMeta[]>> {
    const cached = await read()
    if (cached !== undefined) {
      const parsedCache = parseDatasets(cached)
      if (parsedCache.ok) return parsedCache
      // A damaged cache row is a miss.
    }
    return fetchAndStore()
  }

  return {
    async load() {
      if (loaded) return ok(loaded)
      pending ??= loadOnce().finally(() => {
        pending = undefined
      })
      const result = await pending
      if (result.ok) loaded = result.value
      return result
    },
  }
}
