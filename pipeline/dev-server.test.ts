import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { basemapDataPlugin, createDataMiddleware, type Middleware } from './dev-server.ts'
import { writePmtiles } from './pmtiles-writer.ts'

const encode = (text: string) => new TextEncoder().encode(text)
const build = (type: 'mvt' | 'webp', tiles: { z: number; x: number; y: number; data: Uint8Array }[]) =>
  writePmtiles({
    tiles,
    tileType: type,
    tileCompression: type === 'mvt' ? 'gzip' : 'none',
    metadata: { name: `fixture-${type}`, attribution: 'Natural Earth', vector_layers: [{ id: 'land' }] },
    bounds: [-180, -85, 180, 85],
    center: { lon: 0, lat: 20, zoom: 1 },
  })

const root = mkdtempSync(join(tmpdir(), 'openmap-dev-'))
const out = join(root, 'out')
const empty = join(root, 'empty')
const geoOut = join(root, 'out-geo')
let server: Server
let empty_server: Server
let base = ''
let emptyBase = ''
const hints: string[] = []
const emptyHints: string[] = []

const listen = (dir: string, hint: (m: string) => void, geoOutDir = join(dir, 'no-geo')) =>
  new Promise<{ server: Server; base: string }>((resolve) => {
    const middleware = createDataMiddleware({ outDir: dir, geoOutDir, hint })
    const s = createServer((req, res) => middleware(req, res, () => {
      res.statusCode = 418
      res.end('next')
    }))
    s.listen(0, '127.0.0.1', () => resolve({ server: s, base: `http://127.0.0.1:${(s.address() as { port: number }).port}` }))
  })

beforeAll(async () => {
  mkdirSync(join(out, 'library/v1/styles'), { recursive: true })
  mkdirSync(join(out, 'library/v1/glyphs/Test Font'), { recursive: true })
  mkdirSync(empty, { recursive: true })
  writeFileSync(join(out, 'natural-earth-v1.pmtiles'), build('mvt', [{ z: 0, x: 0, y: 0, data: encode('mvt-bytes') }]))
  writeFileSync(join(out, 'natural-earth-relief-v1.pmtiles'), build('webp', [{ z: 0, x: 0, y: 0, data: encode('RIFFxxxxWEBP') }]))
  writeFileSync(join(out, 'library/v1/styles/parchment.json'), '{"version":8}')
  writeFileSync(join(out, 'library/v1/datasets.json'), '{"datasets":[]}')
  writeFileSync(join(out, 'library/v1/glyphs/Test Font/0-255.pbf'), encode('pbf'))
  writeFileSync(join(root, 'secret.txt'), 'secret')
  mkdirSync(join(geoOut, 'library/v1/geo/han-861af5'), { recursive: true })
  writeFileSync(join(geoOut, 'library/v1/geo/index.json'), '{"entities":[]}')
  writeFileSync(join(geoOut, 'library/v1/geo/han-861af5/-404.json'), '{"type":"Feature"}')
  writeFileSync(join(geoOut, 'library/v1/geo/han-861af5/12.json'), '{"type":"Feature","n":12}')
  ;({ server, base } = await listen(out, (m) => hints.push(m), geoOut))
  ;({ server: empty_server, base: emptyBase } = await listen(empty, (m) => emptyHints.push(m)))
})
afterAll(() => {
  server.close()
  empty_server.close()
  rmSync(root, { recursive: true, force: true })
})

describe('data middleware with a built tileset', () => {
  it('serves vector tiles decompressed with the MVT content type', async () => {
    const res = await fetch(`${base}/natural-earth-v1/0/0/0.mvt`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/vnd.mapbox-vector-tile')
    expect(res.headers.get('content-encoding')).toBeNull()
    expect(await res.text()).toBe('mvt-bytes')
  })

  it('serves raster tiles as image/webp', async () => {
    const res = await fetch(`${base}/natural-earth-relief-v1/0/0/0.webp`)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(await res.text()).toBe('RIFFxxxxWEBP')
  })

  it('answers 204 for a tile the archive does not hold', async () => {
    expect((await fetch(`${base}/natural-earth-v1/3/1/1.mvt`)).status).toBe(204)
  })

  it('serves TileJSON pointing back at the app origin', async () => {
    const res = await fetch(`${base}/natural-earth-v1.json`)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toMatchObject({
      tilejson: '3.0.0',
      name: 'fixture-mvt',
      attribution: 'Natural Earth',
      tiles: [`${base}/natural-earth-v1/{z}/{x}/{y}.mvt`],
      minzoom: 0,
      maxzoom: 0,
      vector_layers: [{ id: 'land' }],
    })
    const relief = (await (await fetch(`${base}/natural-earth-relief-v1.json`)).json()) as { tiles: string[] }
    expect(relief.tiles).toEqual([`${base}/natural-earth-relief-v1/{z}/{x}/{y}.webp`])
  })

  it('serves styles, datasets.json and glyphs (URL-encoded fontstack) with the right content types', async () => {
    const style = await fetch(`${base}/library/v1/styles/parchment.json`)
    expect(style.headers.get('content-type')).toContain('application/json')
    expect(await style.text()).toBe('{"version":8}')
    expect((await fetch(`${base}/library/v1/datasets.json`)).status).toBe(200)
    const glyphs = await fetch(`${base}/library/v1/glyphs/Test%20Font/0-255.pbf`)
    expect(glyphs.headers.get('content-type')).toBe('application/x-protobuf')
    expect(await glyphs.text()).toBe('pbf')
    expect((await fetch(`${base}/library/v1/glyphs/Missing,Test%20Font/0-255.pbf`)).status).toBe(200)
  })

  it('404s an unknown style and refuses path traversal', async () => {
    expect((await fetch(`${base}/library/v1/styles/nope.json`)).status).toBe(404)
    expect((await fetch(`${base}/library/v1/glyphs/..%2F..%2F..%2Fsecret/0-255.pbf`)).status).toBe(404)
    expect((await fetch(`${base}/library/v1/glyphs/%2e%2e/0-255.pbf`)).status).not.toBe(200)
  })

  it('404s out-of-range tile coordinates without reaching the archive', async () => {
    for (const path of ['natural-earth-v1/31/0/0.mvt', 'natural-earth-v1/1/2/0.mvt', 'natural-earth-v1/1/0/2.mvt', 'natural-earth-v1/99/0/0.mvt']) {
      expect((await fetch(`${base}/${path}`)).status).toBe(404)
    }
  })

  it('leaves every other path to the app', async () => {
    expect((await fetch(`${base}/index.html`)).status).toBe(418)
    expect((await fetch(`${base}/natural-earth-v1/0/0/0.webp`)).status).toBe(418)
    const post = await fetch(`${base}/natural-earth-v1.json`, { method: 'POST' })
    expect(post.status).toBe(418)
  })
})

describe('historical borders routes', () => {
  it('serves the index and state files (BCE years negative) with a JSON type', async () => {
    const index = await fetch(`${base}/library/v1/geo/index.json`)
    expect(index.status).toBe(200)
    expect(index.headers.get('content-type')).toContain('application/json')
    expect(await index.text()).toBe('{"entities":[]}')
    const bce = await fetch(`${base}/library/v1/geo/han-861af5/-404.json`)
    expect(bce.headers.get('content-type')).toContain('application/json')
    expect(await bce.text()).toBe('{"type":"Feature"}')
    expect(await (await fetch(`${base}/library/v1/geo/han-861af5/12.json`)).json()).toMatchObject({ n: 12 })
  })

  it('404s an unknown id or year and refuses traversal, never falling through to the app', async () => {
    for (const path of ['nope/-404.json', 'han-861af5/13.json', 'han-861af5/abc.json', '..%2f..%2fsecret/12.json', 'han-861af5/..%2f..%2f..%2f..%2fsecret.json', 'han-861af5/-404.txt', 'x', '']) {
      const res = await fetch(`${base}/library/v1/geo${path === '' ? '' : `/${path}`}`)
      expect(res.status, path).toBe(404)
    }
  })
})

describe('data middleware without a build', () => {
  it('404s with a one-line console hint, once per missing output', async () => {
    const res = await fetch(`${emptyBase}/natural-earth-v1/0/0/0.mvt`)
    expect(res.status).toBe(404)
    await fetch(`${emptyBase}/natural-earth-v1/1/0/0.mvt`)
    await fetch(`${emptyBase}/natural-earth-v1.json`)
    await fetch(`${emptyBase}/library/v1/styles/parchment.json`)
    expect(emptyHints).toHaveLength(2)
    expect(emptyHints[0]).toMatch(/^[^\n]+$/)
    expect(emptyHints[0]).toContain('npm run pipeline:basemap')
  })

  it('answers 404 for historical borders with one hint naming the command', async () => {
    emptyHints.length = 0
    expect((await fetch(`${emptyBase}/library/v1/geo/index.json`)).status).toBe(404)
    expect((await fetch(`${emptyBase}/library/v1/geo/a/1.json`)).status).toBe(404)
    expect(emptyHints).toHaveLength(1)
    expect(emptyHints[0]).toContain('npm run pipeline:geo')
  })

  it('does not touch the disk when nothing requests data', () => {
    expect(() => createDataMiddleware({ outDir: join(root, 'does-not-exist') })).not.toThrow()
  })
})

describe('basemapDataPlugin', () => {
  it('registers the middleware on the dev server and serves a path through it', async () => {
    let registered: Middleware | undefined
    const plugin = basemapDataPlugin({ outDir: out })
    plugin.configureServer({ middlewares: { use: (fn) => (registered = fn) } })
    expect(plugin.name).toBe('openmap-basemap-data')
    expect(registered).toBeTypeOf('function')
    const s = createServer((req, res) => registered!(req, res, () => res.end('next')))
    await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve))
    try {
      const res = await fetch(`http://127.0.0.1:${(s.address() as { port: number }).port}/library/v1/datasets.json`)
      expect(await res.text()).toBe('{"datasets":[]}')
    } finally {
      s.close()
    }
  })
})
