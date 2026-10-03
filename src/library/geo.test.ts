import { describe, expect, it, vi } from 'vitest'
import { GEO_INDEX } from '@/core/testing/geo-fixtures'
import { createGeoClient, type GeoStateRequest, type LibraryCache } from './geo'

const PIN = { dataset: 'cliopatria', version: '0.2.0' }
const stateFile = (entityId: string, fromYear: number) => ({
  type: 'Feature',
  id: `cliopatria@0.2.0:${entityId}`,
  properties: { fromYear, toYear: fromYear + 5, area: 1 },
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, (Math.abs(fromYear) % 7) + 1], [0, 0]]] },
})

function memoryCache(): LibraryCache & { rows: Map<string, unknown> } {
  const rows = new Map<string, unknown>()
  return {
    rows,
    read: async (keys) => new Map(keys.flatMap((key) => (rows.has(key) ? [[key, rows.get(key)] as const] : []))),
    write: async (key, value) => void rows.set(key, value),
  }
}

type Route = (path: string) => Response | Promise<Response>
function fakeFetch(route: Route) {
  const calls: string[] = []
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const path = String(input)
    calls.push(path)
    return route(path)
  })
  return { fetch, calls }
}
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
const happy: Route = (path) => {
  if (path === '/library/v1/geo/index.json') return json(GEO_INDEX)
  const match = /^\/library\/v1\/geo\/([^/]+)\/(-?\d+)\.json$/.exec(path)
  return match ? json(stateFile(match[1], Number(match[2]))) : new Response('nope', { status: 404 })
}
const wanted = (n: number): GeoStateRequest[] => Array.from({ length: n }, (_, i) => ({ entityId: `e${i}`, fromYear: 1000 + i }))

describe('geo client: index', () => {
  it('fetches the index of the pinned version once, caches it, and then makes no request', async () => {
    const cache = memoryCache()
    const { fetch, calls } = fakeFetch(happy)
    const client = createGeoClient({ cache, fetch })
    expect(await client.loadIndex(PIN)).toEqual({ ok: true, value: GEO_INDEX })
    expect(calls).toEqual(['/library/v1/geo/index.json'])
    expect([...cache.rows.keys()]).toEqual(['cliopatria@0.2.0/index'])
    expect(await client.loadIndex(PIN)).toEqual({ ok: true, value: GEO_INDEX })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a 404', () => new Response('missing', { status: 404 })],
    ['the HTML fallback with status 200', () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } })],
    ['invalid JSON', () => new Response('{"schemaVersion": ', { status: 200 })],
    ['a JSON document of another shape', () => json({ hello: 'world' })],
    ['another dataset version', () => json({ ...GEO_INDEX, dataset: { id: 'cliopatria', version: '0.3.0' } })],
  ])('is unavailable on %s, and stores nothing', async (_label, respond) => {
    const cache = memoryCache()
    const client = createGeoClient({ cache, fetch: fakeFetch(respond).fetch })
    expect(await client.loadIndex(PIN)).toMatchObject({ ok: false, error: { code: 'geo_unavailable' } })
    expect(cache.rows.size).toBe(0)
  })

  it('is unavailable when the network fails, without throwing', async () => {
    const client = createGeoClient({ cache: memoryCache(), fetch: () => Promise.reject(new TypeError('Failed to fetch')) })
    expect(await client.loadIndex(PIN)).toMatchObject({ ok: false, error: { code: 'geo_unavailable', params: { reason: 'fetch' } } })
  })

  it('reports an HTML body with status 200 as a json failure', async () => {
    const client = createGeoClient({ cache: memoryCache(), fetch: fakeFetch(() => new Response('<html></html>', { status: 200 })).fetch })
    expect(await client.loadIndex(PIN)).toMatchObject({ ok: false, error: { params: { reason: 'json' } } })
  })

  it('treats a throwing cache as a miss on read and ignores a failed write', async () => {
    const broken: LibraryCache = { read: () => Promise.reject(new Error('idb')), write: () => Promise.reject(new Error('idb')) }
    const client = createGeoClient({ cache: broken, fetch: fakeFetch(happy).fetch })
    expect(await client.loadIndex(PIN)).toEqual({ ok: true, value: GEO_INDEX })
    expect(await client.loadStates(PIN, wanted(2))).toMatchObject({ ok: true })
  })

  it('stops launching fetches once the signal is aborted', async () => {
    const controller = new AbortController()
    const { fetch, calls } = fakeFetch((path) => {
      controller.abort()
      return happy(path)
    })
    const result = await createGeoClient({ cache: memoryCache(), fetch, concurrency: 1 }).loadStates(PIN, wanted(6), controller.signal)
    expect(calls).toHaveLength(1)
    expect(result).toMatchObject({ ok: false, error: { params: { reason: 'aborted' } } })
  })

  it('refetches when the cached row is damaged', async () => {
    const cache = memoryCache()
    cache.rows.set('cliopatria@0.2.0/index', { broken: true })
    const { fetch } = fakeFetch(happy)
    expect(await createGeoClient({ cache, fetch }).loadIndex(PIN)).toEqual({ ok: true, value: GEO_INDEX })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cache.rows.get('cliopatria@0.2.0/index')).toEqual(GEO_INDEX)
  })

  it('reads the index from the cache offline', async () => {
    const cache = memoryCache()
    await createGeoClient({ cache, fetch: fakeFetch(happy).fetch }).loadIndex(PIN)
    const offline = createGeoClient({ cache, fetch: () => Promise.reject(new TypeError('offline')) })
    expect(await offline.loadIndex(PIN)).toEqual({ ok: true, value: GEO_INDEX })
  })
})

describe('geo client: states', () => {
  it('fetches each state at its path, validates it and keys it by entity and year', async () => {
    const cache = memoryCache()
    const { fetch, calls } = fakeFetch(happy)
    const result = await createGeoClient({ cache, fetch }).loadStates(PIN, [
      { entityId: 'rome', fromYear: -404 },
      { entityId: 'empire.group', fromYear: 1101 },
    ])
    expect(calls.sort()).toEqual(['/library/v1/geo/empire.group/1101.json', '/library/v1/geo/rome/-404.json'])
    expect(result.ok && Object.keys(result.value).sort()).toEqual(['empire.group/1101', 'rome/-404'])
    expect([...cache.rows.keys()].sort()).toEqual(['cliopatria@0.2.0/empire.group/1101', 'cliopatria@0.2.0/rome/-404'])
  })

  it('makes no request when everything is cached, and returns the same geometries', async () => {
    const cache = memoryCache()
    const first = await createGeoClient({ cache, fetch: fakeFetch(happy).fetch }).loadStates(PIN, wanted(5))
    const { fetch } = fakeFetch(() => {
      throw new Error('no request expected')
    })
    const second = await createGeoClient({ cache, fetch }).loadStates(PIN, wanted(5))
    expect(fetch).not.toHaveBeenCalled()
    expect(second).toEqual(first)
  })

  it('fetches only the states that are not cached', async () => {
    const cache = memoryCache()
    await createGeoClient({ cache, fetch: fakeFetch(happy).fetch }).loadStates(PIN, wanted(3))
    const { fetch, calls } = fakeFetch(happy)
    const result = await createGeoClient({ cache, fetch }).loadStates(PIN, wanted(5))
    expect(calls.sort()).toEqual(['/library/v1/geo/e3/1003.json', '/library/v1/geo/e4/1004.json'])
    expect(result.ok && Object.keys(result.value)).toHaveLength(5)
  })

  it('asks for nothing and answers nothing for an empty request', async () => {
    const { fetch } = fakeFetch(happy)
    expect(await createGeoClient({ cache: memoryCache(), fetch }).loadStates(PIN, [])).toEqual({ ok: true, value: {} })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches in bounded parallel', async () => {
    let active = 0
    let peak = 0
    const route: Route = async (path) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return happy(path)
    }
    const result = await createGeoClient({ cache: memoryCache(), fetch: fakeFetch(route).fetch, concurrency: 3 }).loadStates(PIN, wanted(12))
    expect(result.ok && Object.keys(result.value)).toHaveLength(12)
    expect(peak).toBe(3)
  })

  it.each([
    ['a 404', (path: string) => (path.includes('/e2/') ? new Response('x', { status: 404 }) : happy(path))],
    ['HTML', (path: string) => (path.includes('/e2/') ? new Response('<html></html>', { status: 200 }) : happy(path))],
    ['a state for another entity', (path: string) => (path.includes('/e2/') ? json(stateFile('other', 1002)) : happy(path))],
    ['a state for another period', (path: string) => (path.includes('/e2/') ? json(stateFile('e2', 7)) : happy(path))],
  ])('is all or nothing: %s makes the set unavailable, and the good files stay cached', async (_label, route) => {
    const cache = memoryCache()
    const client = createGeoClient({ cache, fetch: fakeFetch(route).fetch, concurrency: 1 })
    expect(await client.loadStates(PIN, wanted(5))).toMatchObject({ ok: false, error: { code: 'geo_unavailable' } })
    expect([...cache.rows.keys()].sort()).toEqual(['cliopatria@0.2.0/e0/1000', 'cliopatria@0.2.0/e1/1001'])
  })

  it('treats an aborted load as unavailable', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetch = vi.fn<typeof globalThis.fetch>((_input, init) => (init?.signal?.aborted ? Promise.reject(new DOMException('aborted', 'AbortError')) : Promise.resolve(happy('/'))))
    expect(await createGeoClient({ cache: memoryCache(), fetch }).loadStates(PIN, wanted(2), controller.signal)).toMatchObject({ ok: false, error: { params: { reason: 'aborted' } } })
  })
})
