import { afterEach, describe, expect, it, vi } from 'vitest'
import { DATASETS_META } from '@/core/testing/geo-fixtures'
import type { LibraryCache } from './geo'
import { createDatasetsClient, DATASETS_CACHE_KEY, DATASETS_FETCH_TIMEOUT_MS, DATASETS_PATH } from './datasets'

function memoryCache(): LibraryCache & { rows: Map<string, unknown> } {
  const rows = new Map<string, unknown>()
  return {
    rows,
    read: async (keys) => new Map(keys.flatMap((key) => (rows.has(key) ? [[key, rows.get(key)] as const] : []))),
    write: async (key, value) => void rows.set(key, value),
  }
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
const wire = () => ({ schemaVersion: 1, datasets: DATASETS_META.map((meta) => ({ ...meta, kind: 'x', inputs: [] })) })
const unavailable = (reason: string) => ({ ok: false, error: { code: 'datasets_unavailable', params: { reason } } })

describe('datasets client', () => {
  it('reads the app origin path, caches the validated metadata, and then makes no request', async () => {
    const cache = memoryCache()
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    const client = createDatasetsClient({ cache, fetch })
    expect(await client.load()).toEqual({ ok: true, value: DATASETS_META })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('/library/v1/datasets.json')
    expect(DATASETS_PATH).toBe('/library/v1/datasets.json')
    expect([...cache.rows.keys()]).toEqual([DATASETS_CACHE_KEY])
    expect(DATASETS_CACHE_KEY).toBe('library/v1/datasets')
    expect(await client.load()).toEqual({ ok: true, value: DATASETS_META })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('calls only a relative path: never another origin', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    await createDatasetsClient({ cache: memoryCache(), fetch }).load()
    for (const [input] of fetch.mock.calls) expect(String(input).startsWith('/')).toBe(true)
  })

  it('a second session reads from the cache with the network cut', async () => {
    const cache = memoryCache()
    await createDatasetsClient({ cache, fetch: async () => json(wire()) }).load()
    const offline = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError('network down')
    })
    const second = createDatasetsClient({ cache, fetch: offline })
    expect(await second.load()).toEqual({ ok: true, value: DATASETS_META })
    expect(offline).not.toHaveBeenCalled()
  })

  it.each([
    ['a 404', () => new Response('missing', { status: 404 }), 'http'],
    ['a 500', () => new Response('boom', { status: 500 }), 'http'],
    ['the HTML fallback with status 200', () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }), 'json'],
    ['invalid JSON', () => new Response('{"schemaVersion": ', { status: 200 }), 'json'],
    ['an empty body', () => new Response('', { status: 200 }), 'json'],
    ['a JSON document of another shape', () => json({ hello: 'world' }), 'invalid_datasets'],
    ['another schemaVersion', () => json({ ...wire(), schemaVersion: 2 }), 'invalid_datasets'],
    ['a dataset without attribution', () => json({ ...wire(), datasets: [{ id: 'x', source: 'X', licence: 'CC0', creditRequired: false }] }), 'invalid_datasets'],
  ])('is unavailable on %s, and stores nothing', async (_label, respond, reason) => {
    const cache = memoryCache()
    const client = createDatasetsClient({ cache, fetch: async () => respond() })
    expect(await client.load()).toEqual(unavailable(reason))
    expect(cache.rows.size).toBe(0)
  })

  it('is unavailable when the request itself fails', async () => {
    const client = createDatasetsClient({
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
    const client = createDatasetsClient({ cache: memoryCache(), fetch })
    expect((await client.load()).ok).toBe(false)
    healthy = true
    expect((await client.load()).ok).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('shares one load between concurrent calls', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    const client = createDatasetsClient({ cache: memoryCache(), fetch })
    const [a, b, c] = await Promise.all([client.load(), client.load(), client.load()])
    expect(a).toEqual(b)
    expect(b).toEqual(c)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('treats a damaged cache row as a miss and replaces it', async () => {
    const cache = memoryCache()
    cache.rows.set(DATASETS_CACHE_KEY, { not: 'a datasets file' })
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    expect(await createDatasetsClient({ cache, fetch }).load()).toEqual({ ok: true, value: DATASETS_META })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cache.rows.get(DATASETS_CACHE_KEY)).toEqual(wire())
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
    expect(await createDatasetsClient({ cache: broken, fetch }).load()).toEqual({ ok: true, value: DATASETS_META })
  })

  it('reads the global fetch at call time', async () => {
    const original = globalThis.fetch
    const fake = vi.fn<typeof globalThis.fetch>(async () => json(wire()))
    globalThis.fetch = fake
    try {
      const client = createDatasetsClient({ cache: memoryCache() })
      expect((await client.load()).ok).toBe(true)
      expect(fake).toHaveBeenCalledTimes(1)
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('datasets client timeout', () => {
  afterEach(() => vi.useRealTimers())
  /** A fetch that never answers and ignores its signal, as a stalled connection does. */
  const hang = () => vi.fn<typeof globalThis.fetch>(() => new Promise<Response>(() => undefined))

  it('gives up on a request that never answers: unavailable, nothing cached', async () => {
    vi.useFakeTimers()
    const cache = memoryCache()
    const fetch = hang()
    const client = createDatasetsClient({ cache, fetch })
    const pending = client.load()
    await vi.advanceTimersByTimeAsync(DATASETS_FETCH_TIMEOUT_MS - 1)
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
    expect(DATASETS_FETCH_TIMEOUT_MS).toBe(15_000)
  })

  it('a timed-out load is not remembered: the next load tries again and can succeed', async () => {
    vi.useFakeTimers()
    let healthy = false
    const fetch = vi.fn<typeof globalThis.fetch>(() => (healthy ? Promise.resolve(json(wire())) : new Promise<Response>(() => undefined)))
    const client = createDatasetsClient({ cache: memoryCache(), fetch, timeoutMs: 1000 })
    const first = client.load()
    await vi.advanceTimersByTimeAsync(1000)
    expect(await first).toEqual(unavailable('timeout'))
    healthy = true
    expect(await client.load()).toEqual({ ok: true, value: DATASETS_META })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('a quick answer clears the timer', async () => {
    vi.useFakeTimers()
    const client = createDatasetsClient({ cache: memoryCache(), fetch: async () => json(wire()) })
    expect((await client.load()).ok).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
