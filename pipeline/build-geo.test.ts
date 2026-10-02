import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildGeoBorders, GEO_ROOT } from './build-geo.ts'
import { DownloadError, sha256, type Fetcher } from './download.ts'
import { zipOf } from './test-helpers.ts'

const root = mkdtempSync(join(tmpdir(), 'openmap-geo-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const square = (x: number) => [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]]
const feature = (Name: string, FromYear: number, ToYear: number, x = 0, extra: Record<string, unknown> = {}) => ({
  type: 'Feature',
  properties: { Name, FromYear, ToYear, Area: 5, Type: 'POLITY', Wikipedia: '', Wikidata: '', SeshatID: '', Components: '', MemberOf: '', ...extra },
  geometry: { type: 'Polygon', coordinates: square(x) },
})
const collection = (features: unknown[]) => JSON.stringify({ type: 'FeatureCollection', features })

function fixture(name: string, features: unknown[]) {
  const dir = join(root, name)
  const zip = zipOf('cliopatria_polities_only.geojson', new TextEncoder().encode(collection(features)))
  const manifest = {
    cliopatriaRelease: '0.2.0',
    sources: [
      {
        id: 'cliopatria',
        kind: 'geo',
        layer: 'borders',
        version: '0.2.0',
        source: 'Cliopatria',
        licence: 'CC-BY-4.0',
        attribution: 'Cliopatria, Seshat.',
        creditRequired: true,
        files: [{ name: 'cliopatria.geojson.zip', url: 'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.0/cliopatria.geojson.zip', sha256: sha256(zip), extract: 'cliopatria_polities_only.geojson' }],
      },
    ],
  }
  const manifestPath = join(dir.concat('-manifest.json'))
  writeFileSync(manifestPath, JSON.stringify(manifest))
  let calls = 0
  const fetcher: Fetcher = async () => {
    calls++
    return { ok: true, status: 200, arrayBuffer: async () => zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer }
  }
  return { manifestPath, fetcher, outDir: join(dir, 'out-geo'), cacheDir: join(dir, 'cache'), calls: () => calls, zip }
}

const quiet = { log: () => {}, warn: () => {} }
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

describe('geo pipeline', () => {
  const features = [feature('Alpha', -100, -51), feature('Alpha', -50, 0, 2), feature('(Union)', -100, 0), feature('Beta', 1, 9, 4, { MemberOf: '(Union)' })]

  it('builds the index and one file per state, then re-runs byte-identically without downloading', async () => {
    const f = fixture('first', features)
    const logs: string[] = []
    const report = await buildGeoBorders({ ...f, log: (m) => logs.push(m), warn: () => {} })
    expect(report).toMatchObject({ entities: 3, states: 4 })
    expect(f.calls()).toBe(1)
    const index = JSON.parse(readFileSync(join(f.outDir, GEO_ROOT, 'index.json'), 'utf8'))
    expect(index.dataset).toMatchObject({ id: 'cliopatria', version: '0.2.0', licence: 'CC-BY-4.0', creditRequired: true })
    expect(index.entities.map((e: { id: string }) => e.id)).toEqual(['alpha', 'beta', 'union.group'])
    expect(existsSync(join(f.outDir, GEO_ROOT, 'alpha/-100.json'))).toBe(true)
    expect(existsSync(join(f.outDir, GEO_ROOT, 'alpha/-50.json'))).toBe(true)
    expect(logs.join('\n')).toMatch(/entities: 3/)
    expect(existsSync(`${f.outDir}.tmp`)).toBe(false)

    const before = snapshot(f.outDir)
    await buildGeoBorders({ ...f, ...quiet })
    expect(f.calls()).toBe(1)
    expect(snapshot(f.outDir)).toEqual(before)
  })

  it('stops on overlapping states, naming the entity, and leaves the previous output untouched', async () => {
    const good = fixture('keep', features)
    await buildGeoBorders({ ...good, ...quiet })
    const before = snapshot(good.outDir)
    const bad = fixture('overlap', [feature('Gamma', 0, 10), feature('Gamma', 5, 20)])
    await expect(buildGeoBorders({ ...bad, outDir: good.outDir, ...quiet })).rejects.toThrow(/entity "Gamma".*overlap/)
    expect(snapshot(good.outDir)).toEqual(before)
    expect(existsSync(`${good.outDir}.tmp`)).toBe(false)
  })

  it('stops on a wrong checksum, naming the URL, and leaves no partial file', async () => {
    const f = fixture('badsum', features)
    const wrong: Fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer as ArrayBuffer })
    const error = await buildGeoBorders({ ...f, fetcher: wrong, ...quiet }).catch((e) => e)
    expect(error).toBeInstanceOf(DownloadError)
    expect(error.message).toContain('cliopatria.geojson.zip')
    expect(existsSync(join(f.cacheDir, 'cliopatria'))).toBe(false)
    expect(existsSync(f.outDir)).toBe(false)
  })

  it('stops on a network error naming the URL', async () => {
    const f = fixture('network', features)
    const down: Fetcher = async () => {
      throw new Error('offline')
    }
    await expect(buildGeoBorders({ ...f, fetcher: down, ...quiet })).rejects.toThrow(/cliopatria\.geojson\.zip.*offline/)
    expect(existsSync(join(f.cacheDir, 'cliopatria'))).toBe(false)
    expect(existsSync(f.outDir)).toBe(false)
  })

  it('refuses a bad licence before any download or write', async () => {
    const f = fixture('licence', features)
    const manifest = JSON.parse(readFileSync(f.manifestPath, 'utf8'))
    manifest.sources[0].licence = 'ODbL-1.0'
    writeFileSync(f.manifestPath, JSON.stringify(manifest))
    await expect(buildGeoBorders({ ...f, ...quiet })).rejects.toThrow(/cliopatria.*ODbL-1.0/)
    expect(f.calls()).toBe(0)
    expect(existsSync(f.outDir)).toBe(false)
    expect(existsSync(f.cacheDir)).toBe(false)
  })

  it('refuses to replace a directory that is not a geo output', async () => {
    const f = fixture('foreign', features)
    mkdirSync(f.outDir, { recursive: true })
    writeFileSync(join(f.outDir, 'mine.txt'), 'x')
    await expect(buildGeoBorders({ ...f, ...quiet })).rejects.toThrow(/refusing to replace/)
    expect(f.calls()).toBe(0)
  })

  it('checks the licence before the output directory', async () => {
    const f = fixture('order', features)
    const manifest = JSON.parse(readFileSync(f.manifestPath, 'utf8'))
    manifest.sources[0].licence = 'CC-BY-NC-4.0'
    writeFileSync(f.manifestPath, JSON.stringify(manifest))
    mkdirSync(f.outDir, { recursive: true })
    writeFileSync(join(f.outDir, 'mine.txt'), 'x')
    await expect(buildGeoBorders({ ...f, ...quiet })).rejects.toThrow(/CC-BY-NC-4.0/)
  })

  it('reports dropped rings and polygons', async () => {
    const tiny = feature('Tiny', 0, 9)
    tiny.geometry = { type: 'MultiPolygon', coordinates: [square(0), [[[10, 10], [11, 11], [10, 10]]]] } as never
    const f = fixture('dropped', [tiny])
    const logs: string[] = []
    const report = await buildGeoBorders({ ...f, log: (m) => logs.push(m), warn: () => {} })
    expect(report).toMatchObject({ droppedRings: 1, droppedPolygons: 1 })
    expect(logs.join('\n')).toMatch(/dropped: 1 rings, 1 polygons/)
  })

  it('the CLI rejects the basemap-only options', () => {
    for (const flag of ['--vector-only', '--pin']) {
      const r = spawnSync(process.execPath, [join(import.meta.dirname, 'build-geo.ts'), flag, '--out', join(root, 'cli-out')], { encoding: 'utf8' })
      expect(r.status).not.toBe(0)
      expect(r.stderr).toContain(`${flag} only applies to pipeline:basemap`)
    }
    expect(existsSync(join(root, 'cli-out'))).toBe(false)
  })
})
