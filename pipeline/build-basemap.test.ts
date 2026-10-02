import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { assertReplaceable, buildBasemap, parseArgs, RELIEF_FILE, VECTOR_FILE } from './build-basemap.ts'
import { type Fetcher } from './download.ts'
import { openArchive, FIXTURES, zipOf } from './test-helpers.ts'
import type { Manifest } from './sources.ts'

const dirs: string[] = []
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'openmap-build-'))
  dirs.push(dir)
  return dir
}
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/fixture/'
const RASTER = 'https://naciscdn.org/naturalearth/fixture/relief.zip'
const fixture = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)))
const zip = zipOf('relief.tif', fixture('tiny-relief.tif'))
const bodies = new Map<string, Uint8Array>([
  [`${BASE}tiny-land.shp`, fixture('tiny-land.shp')],
  [`${BASE}tiny-land.dbf`, fixture('tiny-land.dbf')],
  [`${BASE}tiny-places.shp`, fixture('tiny-places.shp')],
  [`${BASE}tiny-places.dbf`, fixture('tiny-places.dbf')],
  [RASTER, zip],
])
const digest = (url: string) => createHash('sha256').update(bodies.get(url)!).digest('hex')

const meta = { version: '5.1.2', source: 'Natural Earth', licence: 'Public-Domain', attribution: 'Made with Natural Earth.', creditRequired: false }
const manifest = (overrides: { licence?: string; rasterSha?: string } = {}): Manifest => ({
  naturalEarthRelease: '5.1.2',
  sources: [
    { id: 'land', kind: 'vector', layer: 'land', ...meta, licence: overrides.licence ?? meta.licence, files: ['shp', 'dbf'].map((e) => ({ name: `tiny-land.${e}`, url: `${BASE}tiny-land.${e}`, sha256: digest(`${BASE}tiny-land.${e}`) })) },
    { id: 'places', kind: 'vector', layer: 'places', ...meta, files: ['shp', 'dbf'].map((e) => ({ name: `tiny-places.${e}`, url: `${BASE}tiny-places.${e}`, sha256: digest(`${BASE}tiny-places.${e}`) })) },
    { id: 'relief', kind: 'raster', layer: 'relief', ...meta, files: [{ name: 'relief.zip', url: RASTER, sha256: overrides.rasterSha ?? '', extract: 'relief.tif' }] },
  ],
})

function setup(m: Manifest) {
  const root = tmp()
  const manifestPath = join(root, 'sources.json')
  writeFileSync(manifestPath, JSON.stringify(m))
  const fetcher: Fetcher = vi.fn<Fetcher>(async (url: string) => {
    const body = bodies.get(url)
    if (!body) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }
    return { ok: true, status: 200, arrayBuffer: async () => body.slice().buffer as ArrayBuffer }
  })
  const options = { manifestPath, outDir: join(root, 'out'), cacheDir: join(root, 'cache'), fetcher, reliefMaxZoom: 1, log: () => {}, warn: () => {} }
  return { root, options, fetcher, manifestPath }
}

const listing = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
    .sort()

describe('buildBasemap', () => {
  it('builds tilesets, four styles, glyphs and datasets.json from fixtures, then re-runs byte-identically without downloading', async () => {
    const { options, fetcher } = setup(manifest())
    const first = await buildBasemap(options)
    const files = listing(first.outDir)
    expect(files).toContain(VECTOR_FILE)
    expect(files).toContain(RELIEF_FILE)
    for (const id of ['parchment', 'sombre', 'clair', 'relief']) expect(files).toContain(`library/v1/styles/${id}.json`)
    expect(files).toContain('library/v1/glyphs/Libre Baskerville Variable/0-255.pbf')
    expect(files).toContain('library/v1/glyphs/Source Sans 3 Variable/0-255.pbf')
    expect(files).toContain('library/v1/datasets.json')
    expect(files.some((f) => f.endsWith('.tmp') || f.endsWith('.part'))).toBe(false)
    expect(existsSync(`${first.outDir}.tmp`)).toBe(false)
    const downloads = vi.mocked(fetcher).mock.calls.length
    expect(downloads).toBe(5)
    const snapshot = new Map(files.map((f) => [f, readFileSync(join(first.outDir, f))]))
    expect(first.totalBytes).toBe([...snapshot.values()].reduce((n, b) => n + b.length, 0))

    const second = await buildBasemap(options)
    expect(vi.mocked(fetcher).mock.calls.length).toBe(downloads)
    expect(listing(second.outDir)).toEqual(files)
    for (const f of files) expect(Buffer.compare(readFileSync(join(second.outDir, f)), snapshot.get(f)!), f).toBe(0)

    const archive = openArchive(new Uint8Array(snapshot.get(VECTOR_FILE)!))
    expect((await archive.getHeader()).maxZoom).toBe(6)
    expect(await archive.getZxy(0, 0, 0)).toBeDefined()
    expect((await openArchive(new Uint8Array(snapshot.get(RELIEF_FILE)!)).getHeader()).maxZoom).toBe(1)
  })

  it('records {source, licence, attribution, creditRequired} for every dataset', async () => {
    const { options } = setup(manifest())
    const { outDir } = await buildBasemap(options)
    const { datasets } = JSON.parse(readFileSync(join(outDir, 'library/v1/datasets.json'), 'utf8')) as { datasets: Record<string, unknown>[] }
    expect(datasets.map((d) => d.id)).toEqual(['natural-earth-v1', 'natural-earth-relief-v1', 'basemap-styles-v1', 'glyphs-v1'])
    for (const d of datasets) {
      expect(typeof d.source).toBe('string')
      expect(typeof d.licence).toBe('string')
      expect(typeof d.attribution).toBe('string')
      expect(typeof d.creditRequired).toBe('boolean')
    }
    expect(datasets[0]).toMatchObject({ tiles: '/natural-earth-v1/{z}/{x}/{y}.mvt', tilejson: '/natural-earth-v1.json', licence: 'Public-Domain', creditRequired: false })
  })

  it('--vector-only skips the raster download and the relief tileset', async () => {
    const { options, fetcher } = setup(manifest())
    const { outDir } = await buildBasemap({ ...options, vectorOnly: true })
    expect(vi.mocked(fetcher).mock.calls.map((c) => c[0])).not.toContain(RASTER)
    expect(existsSync(join(outDir, RELIEF_FILE))).toBe(false)
    expect(existsSync(join(outDir, VECTOR_FILE))).toBe(true)
    const datasets = JSON.parse(readFileSync(join(outDir, 'library/v1/datasets.json'), 'utf8')).datasets as { id: string }[]
    expect(datasets.map((d) => d.id)).not.toContain('natural-earth-relief-v1')
  })

  it('stops on a bad licence before any download or write, naming the source', async () => {
    const { options, fetcher, root } = setup(manifest({ licence: 'CC-BY-NC-4.0' }))
    await expect(buildBasemap(options)).rejects.toThrow(/Source "land".*CC-BY-NC-4\.0/)
    expect(fetcher).not.toHaveBeenCalled()
    expect(readdirSync(root).sort()).toEqual(['sources.json'])
  })

  it('stops on a download failure, names the URL, removes partial files and keeps the previous output', async () => {
    const { options, root } = setup(manifest())
    const first = await buildBasemap(options)
    const before = readFileSync(join(first.outDir, VECTOR_FILE))
    const failing: Fetcher = async (url) => {
      throw new Error(`offline ${url}`)
    }
    rmSync(join(root, 'cache'), { recursive: true })
    await expect(buildBasemap({ ...options, fetcher: failing })).rejects.toThrow(/tiny-land\.shp/)
    expect(existsSync(join(root, 'cache')) ? listing(join(root, 'cache')) : []).toEqual([])
    expect(Buffer.compare(readFileSync(join(first.outDir, VECTOR_FILE)), before)).toBe(0)
  })

  it('--pin records checksums that the manifest leaves empty', async () => {
    const { options, manifestPath } = setup(manifest())
    await buildBasemap({ ...options, pin: true })
    const pinned = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    expect(pinned.sources[2].files[0].sha256).toBe(digest(RASTER))
    expect(statSync(manifestPath).size).toBeGreaterThan(0)
  })

  it('without --pin an empty checksum only warns', async () => {
    const { options } = setup(manifest())
    const warn = vi.fn<(message: string) => void>()
    await buildBasemap({ ...options, warn })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(RASTER))
  })
})

describe('parseArgs', () => {
  it('parses every flag', () => {
    expect(parseArgs([])).toEqual({})
    expect(parseArgs(['--vector-only', '--pin', '--out', 'o', '--cache', 'c', '--manifest', 'm.json'])).toEqual({
      vectorOnly: true,
      pin: true,
      outDir: 'o',
      cacheDir: 'c',
      manifestPath: 'm.json',
    })
  })

  it.each([['--out'], ['--cache'], ['--manifest'], ['--out', '--pin'], ['--cache', '--vector-only'], ['--out', '']])('rejects missing value %j', (...argv) => {
    expect(() => parseArgs(argv)).toThrow(/needs a value/)
  })

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/unknown option --nope/)
    expect(() => parseArgs(['stray'])).toThrow(/unknown option stray/)
  })
})

describe('output safety', () => {
  it('refuses to replace a non-empty directory that is not a pipeline output, leaving it untouched', async () => {
    const { options, root } = setup(manifest())
    const target = join(root, 'precious')
    mkdirSync(target)
    writeFileSync(join(target, 'keep.txt'), 'keep')
    await expect(buildBasemap({ ...options, outDir: target })).rejects.toThrow(/refusing to replace/)
    expect(readFileSync(join(target, 'keep.txt'), 'utf8')).toBe('keep')
    expect(assertReplaceable(join(root, 'missing'))).toBeUndefined()
  })

  it('replaces an empty directory and a previous output, leaving no .old or .tmp', async () => {
    const { options, root } = setup(manifest())
    mkdirSync(options.outDir)
    await buildBasemap(options)
    await buildBasemap(options)
    expect(readdirSync(root).sort()).toEqual(['cache', 'out', 'sources.json'])
  })

  it('aggregates dataset metadata: a required credit from any source is kept', async () => {
    const m = manifest()
    m.sources[1] = { ...m.sources[1], source: 'Other', licence: 'CC-BY-4.0', attribution: 'Credit Other.', creditRequired: true }
    const { options } = setup(m)
    const { outDir } = await buildBasemap({ ...options, vectorOnly: true })
    const vector = JSON.parse(readFileSync(join(outDir, 'library/v1/datasets.json'), 'utf8')).datasets[0]
    expect(vector).toMatchObject({ source: 'Natural Earth, Other', licence: 'Public-Domain, CC-BY-4.0', creditRequired: true })
    expect(vector.attribution).toContain('Credit Other.')
  })

  it('deletes a corrupt cached archive that has no pinned checksum', async () => {
    const { options, root } = setup(manifest())
    const cached = join(root, 'cache/relief/relief.zip')
    mkdirSync(join(root, 'cache/relief'), { recursive: true })
    writeFileSync(cached, '<html>error page</html>')
    await expect(buildBasemap(options)).rejects.toThrow(/not a ZIP/)
    expect(existsSync(cached)).toBe(false)
  })
})
