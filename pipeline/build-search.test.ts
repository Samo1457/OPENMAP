import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildSearch, SEARCH_INDEX } from './build-search.ts'
import { DownloadError, sha256, type Fetcher } from './download.ts'
import { FIXTURES } from './test-helpers.ts'

const root = mkdtempSync(join(tmpdir(), 'openmap-search-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/10m_cultural/'
const FILES = {
  'ne_10m_admin_0_countries.shp': 'tiny-countries.shp',
  'ne_10m_admin_0_countries.dbf': 'tiny-countries.dbf',
  'ne_10m_populated_places.shp': 'tiny-places-names.shp',
  'ne_10m_populated_places.dbf': 'tiny-places-names.dbf',
} as const
const bytes = (name: keyof typeof FILES) => new Uint8Array(readFileSync(join(FIXTURES, FILES[name])))

function fixture(name: string, licence = 'Public-Domain') {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  const source = (id: string, layer: string, stems: string[]) => ({
    id,
    kind: 'search',
    layer,
    version: '5.1.2',
    source: 'Natural Earth',
    licence,
    attribution: 'Made with Natural Earth.',
    creditRequired: false,
    files: stems.map((file) => ({ name: file, url: `${BASE}${file}`, sha256: sha256(bytes(file as keyof typeof FILES)) })),
  })
  const manifest = {
    naturalEarthRelease: '5.1.2',
    sources: [
      source('ne-10m-admin-0-countries', 'countries', ['ne_10m_admin_0_countries.shp', 'ne_10m_admin_0_countries.dbf']),
      source('ne-10m-populated-places-names', 'places', ['ne_10m_populated_places.shp', 'ne_10m_populated_places.dbf']),
    ],
  }
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest))
  const urls: string[] = []
  const fetcher: Fetcher = async (url) => {
    urls.push(url)
    const name = url.slice(BASE.length) as keyof typeof FILES
    const data = bytes(name)
    return { ok: true, status: 200, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer }
  }
  return { manifestPath, fetcher, outDir: join(dir, 'out-search'), cacheDir: join(dir, 'cache'), urls }
}

const quiet = { log: () => {}, warn: () => {}, floor: { countries: 0, places: 0 } }
const snapshot = (dir: string): Record<string, string> => {
  const files: Record<string, string> = {}
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name))
      else files[join(d, e.name).slice(dir.length)] = readFileSync(join(d, e.name), 'utf8')
    }
  }
  walk(dir)
  return files
}

describe('search pipeline', () => {
  it('builds one index, then re-runs byte-identically without downloading', async () => {
    const f = fixture('first')
    const logs: string[] = []
    const report = await buildSearch({ ...f, ...quiet, log: (m) => logs.push(m) })
    expect(report).toMatchObject({ countries: 2, places: 3, unmatchedCountry: 1, frenchNames: 2 })
    expect(report.indexBytes).toBeGreaterThan(0)
    expect(report.gzipBytes).toBeGreaterThan(0)
    expect(f.urls).toHaveLength(4)
    const index = JSON.parse(readFileSync(join(f.outDir, SEARCH_INDEX), 'utf8'))
    expect(index.dataset).toMatchObject({ id: 'places-search', version: '1', source: 'Natural Earth', licence: 'Public-Domain', creditRequired: false, attribution: 'Made with Natural Earth.' })
    expect(index.countries.map((c: { en: string }) => c.en)).toEqual(['Alphaland', 'Betaland'])
    expect(logs.join('\n')).toMatch(/places: 3/)
    expect(logs.join('\n')).toMatch(/index\.json: /)
    expect(existsSync(`${f.outDir}.tmp`)).toBe(false)

    const before = snapshot(f.outDir)
    await buildSearch({ ...f, ...quiet })
    expect(f.urls).toHaveLength(4)
    expect(snapshot(f.outDir)).toEqual(before)
    expect(Object.keys(before)).toEqual([`/${SEARCH_INDEX}`])
  })

  it('fails under the sanity floor, naming the counts, and leaves the previous output untouched', async () => {
    const good = fixture('floor-good')
    await buildSearch({ ...good, ...quiet })
    const before = snapshot(good.outDir)
    const small = fixture('floor-small')
    // The fixture has 2 countries and 3 places: the real floor refuses it.
    await expect(buildSearch({ ...small, outDir: good.outDir, log: () => {}, warn: () => {} })).rejects.toThrow(/2 countries, at least 200 expected/)
    await expect(buildSearch({ ...small, outDir: good.outDir, log: () => {}, warn: () => {}, floor: { countries: 1, places: 4 } })).rejects.toThrow(/3 places, at least 4 expected/)
    expect(snapshot(good.outDir)).toEqual(before)
    expect(existsSync(`${good.outDir}.tmp`)).toBe(false)
    expect(existsSync(join(root, 'floor-small', 'out-search'))).toBe(false)
  })

  it('stops on a wrong checksum, naming the URL, and leaves no partial file', async () => {
    const f = fixture('badsum')
    const wrong: Fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer as ArrayBuffer })
    const error = await buildSearch({ ...f, fetcher: wrong, ...quiet }).catch((e) => e)
    expect(error).toBeInstanceOf(DownloadError)
    expect(error.message).toContain('ne_10m_admin_0_countries.shp')
    expect(existsSync(join(f.cacheDir, 'ne-10m-admin-0-countries'))).toBe(false)
    expect(existsSync(f.outDir)).toBe(false)
  })

  it('stops on a network error naming the URL, and keeps the previous output', async () => {
    const good = fixture('keep')
    await buildSearch({ ...good, ...quiet })
    const before = snapshot(good.outDir)
    const f = fixture('network')
    const down: Fetcher = async () => {
      throw new Error('offline')
    }
    await expect(buildSearch({ ...f, outDir: good.outDir, fetcher: down, ...quiet })).rejects.toThrow(/ne_10m_admin_0_countries\.shp.*offline/)
    expect(snapshot(good.outDir)).toEqual(before)
    expect(existsSync(`${good.outDir}.tmp`)).toBe(false)
  })

  it.each(['CC-BY-NC-4.0', 'ODbL-1.0', 'CC-BY-SA-4.0', 'GPL-3.0-only'])('refuses %s before any download or write', async (licence) => {
    const f = fixture(`licence-${licence}`, licence)
    await expect(buildSearch({ ...f, ...quiet })).rejects.toThrow(new RegExp(`ne-10m-admin-0-countries.*${licence}`))
    expect(f.urls).toHaveLength(0)
    expect(existsSync(f.outDir)).toBe(false)
    expect(existsSync(f.cacheDir)).toBe(false)
  })

  it('refuses to replace a directory that is not a search output', async () => {
    const f = fixture('foreign')
    mkdirSync(f.outDir, { recursive: true })
    writeFileSync(join(f.outDir, 'mine.txt'), 'x')
    await expect(buildSearch({ ...f, ...quiet })).rejects.toThrow(/refusing to replace/)
    expect(f.urls).toHaveLength(0)
    expect(readFileSync(join(f.outDir, 'mine.txt'), 'utf8')).toBe('x')
  })

  it('checks the licence before the output directory', async () => {
    const f = fixture('order', 'CC-BY-NC-4.0')
    mkdirSync(f.outDir, { recursive: true })
    writeFileSync(join(f.outDir, 'mine.txt'), 'x')
    await expect(buildSearch({ ...f, ...quiet })).rejects.toThrow(/CC-BY-NC-4.0/)
  })

  it('does not touch the basemap or the geo output roots', async () => {
    const f = fixture('roots')
    await buildSearch({ ...f, ...quiet })
    expect(readdirSync(join(root, 'roots')).sort()).toEqual(['cache', 'manifest.json', 'out-search'])
  })

  it('the CLI rejects the basemap-only options and an unknown one', () => {
    for (const flag of ['--vector-only', '--pin']) {
      const r = spawnSync(process.execPath, [join(import.meta.dirname, 'build-search.ts'), flag, '--out', join(root, 'cli-out')], { encoding: 'utf8' })
      expect(r.status).not.toBe(0)
      expect(r.stderr).toContain(`${flag} only applies to pipeline:basemap`)
    }
    const unknown = spawnSync(process.execPath, [join(import.meta.dirname, 'build-search.ts'), '--nope'], { encoding: 'utf8' })
    expect(unknown.status).not.toBe(0)
    expect(unknown.stderr).toContain('unknown option --nope')
    expect(existsSync(join(root, 'cli-out'))).toBe(false)
  })
})
