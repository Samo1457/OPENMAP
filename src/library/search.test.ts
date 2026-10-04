import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEARCH_INDEX } from '@/core/testing/search-fixtures'
import type { LibraryCache } from './geo'
import { createSearchClient, SEARCH_CACHE_KEY, SEARCH_FETCH_TIMEOUT_MS, SEARCH_INDEX_PATH } from './search'

function memoryCache(): LibraryCache & { rows: Map<string, unknown> } {
  const rows = new Map<string, unknown>()
  return {
    rows,
    read: async (keys) => new Map(keys.flatMap((key) => (rows.has(key) ? [[key, rows.get(key)] as const] : []))),
    write: async (key, value) => void rows.set(key, value),
  }
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
const wire = () => JSON.parse(JSON.stringify(SEARCH_INDEX))
const unavailable = (reason: string) => ({ ok: false, error: { code: 'search_unavailable', params: { reason } } })

describe('search client', () => {
  it('reads the app origin path, caches the validated index, and then makes no request', async () => {
    const cache = memoryCache()
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    const client = createSearchClient({ cache, fetch })
    expect(await client.load()).toEqual({ ok: true, value: SEARCH_INDEX })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('/library/v1/search/index.json')
    expect(SEARCH_INDEX_PATH).toBe('/library/v1/search/index.json')
    expect([...cache.rows.keys()]).toEqual([SEARCH_CACHE_KEY])
    expect(await client.load()).toEqual({ ok: true, value: SEARCH_INDEX })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('calls only a relative path: never another origin', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    await createSearchClient({ cache: memoryCache(), fetch }).load()
    for (const [input] of fetch.mock.calls) expect(String(input).startsWith('/')).toBe(true)
  })

  it('a second session reads from the cache with the network cut', async () => {
    const cache = memoryCache()
    await createSearchClient({ cache, fetch: async () => json(wire()) }).load()
    const offline = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError('network down')
    })
    const second = createSearchClient({ cache, fetch: offline })
    expect(await second.load()).toEqual({ ok: true, value: SEARCH_INDEX })
    expect(offline).not.toHaveBeenCalled()
  })

  it.each([
    ['a 404', () => new Response('missing', { status: 404 }), 'http'],
    ['a 500', () => new Response('boom', { status: 500 }), 'http'],
    ['the HTML fallback with status 200', () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }), 'json'],
    ['invalid JSON', () => new Response('{"schemaVersion": ', { status: 200 }), 'json'],
    ['an empty body', () => new Response('', { status: 200 }), 'json'],
    ['a JSON document of another shape', () => json({ hello: 'world' }), 'invalid_index'],
    ['another dataset', () => json({ ...wire(), dataset: { ...wire().dataset, id: 'cliopatria' } }), 'invalid_index'],
    ['an index with a place outside the world', () => json({ ...wire(), places: [['X', '', 500, 0, 1, 0]] }), 'invalid_index'],
  ])('is unavailable on %s, and stores nothing', async (_label, respond, reason) => {
    const cache = memoryCache()
    const client = createSearchClient({ cache, fetch: async () => respond() })
    expect(await client.load()).toEqual(unavailable(reason))
    expect(cache.rows.size).toBe(0)
  })

  it('is unavailable when the request itself fails', async () => {
    const client = createSearchClient({
      cache: memoryCache(),
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    expect(await client.load()).toEqual(unavailable('fetch'))
  })

  it('does not remember a failure: the next call tries again', async () => {
    let healthy = false
    const fetch = vi.fn<typeof globalThis.fetch>(async () => (healthy ? json(wire()) : new Response('', { status: 404 })))
    const client = createSearchClient({ cache: memoryCache(), fetch })
    expect((await client.load()).ok).toBe(false)
    healthy = true
    expect((await client.load()).ok).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('shares one load between concurrent calls', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    const client = createSearchClient({ cache: memoryCache(), fetch })
    const [a, b, c] = await Promise.all([client.load(), client.load(), client.load()])
    expect(a).toEqual(b)
    expect(b).toEqual(c)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('treats a damaged cache row as a miss and replaces it', async () => {
    const cache = memoryCache()
    cache.rows.set(SEARCH_CACHE_KEY, { not: 'an index' })
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    expect(await createSearchClient({ cache, fetch }).load()).toEqual({ ok: true, value: SEARCH_INDEX })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cache.rows.get(SEARCH_CACHE_KEY)).toEqual(wire())
  })

  it('treats a failing cache as a miss, and a failing write as nothing', async () => {
    const broken: LibraryCache = {
      read: async () => {
        throw new Error('IndexedDB is gone')
      },
      write: async () => {
        throw new Error('quota')
      },
    }
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    expect(await createSearchClient({ cache: broken, fetch }).load()).toEqual({ ok: true, value: SEARCH_INDEX })
  })

  it('reads the global fetch at call time', async () => {
    const original = globalThis.fetch
    const fake = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    globalThis.fetch = fake
    try {
      const client = createSearchClient({ cache: memoryCache() })
      expect((await client.load()).ok).toBe(true)
      expect(fake).toHaveBeenCalledTimes(1)
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('search client timeout', () => {
  afterEach(() => vi.useRealTimers())
  /** A fetch that never answers and ignores its signal, as a stalled connection does. */
  const hang = () => vi.fn<typeof globalThis.fetch>(() => new Promise<Response>(() => undefined))

  it('gives up on a request that never answers: unavailable, nothing cached', async () => {
    vi.useFakeTimers()
    const cache = memoryCache()
    const fetch = hang()
    const client = createSearchClient({ cache, fetch })
    const pending = client.load()
    await vi.advanceTimersByTimeAsync(SEARCH_FETCH_TIMEOUT_MS - 1)
    let settled = false
    void pending.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await pending).toEqual(unavailable('timeout'))
    expect(cache.rows.size).toBe(0)
    // The request was told to stop.
    expect((fetch.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true)
  })

  it('is about 15 seconds, and can be set', () => {
    expect(SEARCH_FETCH_TIMEOUT_MS).toBe(15_000)
  })

  it('a timed-out load is not remembered: the next load tries again and can succeed', async () => {
    vi.useFakeTimers()
    let healthy = false
    const fetch = vi.fn<typeof globalThis.fetch>(() => (healthy ? Promise.resolve(json(wire())) : new Promise<Response>(() => undefined)))
    const client = createSearchClient({ cache: memoryCache(), fetch, timeoutMs: 1000 })
    const first = client.load()
    await vi.advanceTimersByTimeAsync(1000)
    expect(await first).toEqual(unavailable('timeout'))
    healthy = true
    expect(await client.load()).toEqual({ ok: true, value: SEARCH_INDEX })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('a quick answer clears the timer', async () => {
    vi.useFakeTimers()
    const client = createSearchClient({ cache: memoryCache(), fetch: async () => json(wire()) })
    expect((await client.load()).ok).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
