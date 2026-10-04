// The place search client (Story 1.12, AD-16, AD-27): reads the search index from the app origin at
// `/library/v1/search/index.json` (Story 1.12 layout), validates it, stores it in the Library cache on
// the first fetch and reads it from there ever after, so a second Editor session works offline. The
// path is versioned and immutable: a cached index is never refetched. An index that cannot be loaded
// (404, the app's HTML fallback, bad JSON, an invalid document) is a `search_unavailable` Result,
// never a throw and never a console message. No geocoding service is ever called: the index is built
// by the pipeline from Natural Earth.

import { err, ok, parseSearchIndex, type Result, type SearchIndex } from '@/core'
import type { LibraryCache } from './geo'

/** Path of the index on the app origin (data origin until Epic 7). */
export const SEARCH_INDEX_PATH = '/library/v1/search/index.json'

/** Library cache key of the index: the immutable path, without the leading slash. */
export const SEARCH_CACHE_KEY = 'library/v1/search/index'

/** A request that has not answered after this long is given up on: the search is unavailable until the next try. */
export const SEARCH_FETCH_TIMEOUT_MS = 15_000

export interface SearchClientOptions {
  readonly cache: LibraryCache
  /** Milliseconds before a request is abandoned (default `SEARCH_FETCH_TIMEOUT_MS`). */
  readonly timeoutMs?: number
  /** Defaults to the global `fetch`, read at call time. */
  readonly fetch?: typeof fetch
}

export interface SearchClient {
  /**
   * The index: from memory once loaded, else from the Library cache, else from the network (then
   * cached). Concurrent calls share one load, so none can cancel it. A failure is not remembered, so
   * the next call tries again.
   */
  load(): Promise<Result<SearchIndex>>
}

const unavailable = (reason: string) => err('search_unavailable', { reason })

export function createSearchClient(options: SearchClientOptions): SearchClient {
  const { cache } = options
  const doFetch: typeof fetch = (input, init) => (options.fetch ?? globalThis.fetch)(input, init)
  let loaded: SearchIndex | undefined
  /** The load in progress, shared by concurrent callers. */
  let pending: Promise<Result<SearchIndex>> | undefined

  async function fetchJson(): Promise<Result<unknown>> {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => {
        controller.abort()
        resolve('timeout')
      }, options.timeoutMs ?? SEARCH_FETCH_TIMEOUT_MS)
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
      response = await doFetch(SEARCH_INDEX_PATH, { signal })
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
      return (await cache.read([SEARCH_CACHE_KEY])).get(SEARCH_CACHE_KEY)
    } catch {
      return undefined // a failed cache read is a miss
    }
  }

  async function fetchAndStore(): Promise<Result<SearchIndex>> {
    const json = await fetchJson()
    if (!json.ok) return json
    const index = parseSearchIndex(json.value)
    if (index.ok) {
      try {
        await cache.write(SEARCH_CACHE_KEY, json.value)
      } catch {
        // A failed cache write is not an error: the index still serves this session.
      }
    }
    return index
  }

  async function loadOnce(): Promise<Result<SearchIndex>> {
    const cached = await read()
    if (cached !== undefined) {
      const index = parseSearchIndex(cached)
      if (index.ok) return index
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
