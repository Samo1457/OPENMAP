import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertLicences, LicenceError, loadGeoManifest, loadManifest, loadSearchManifest, ManifestError, validateGeoManifest, validateManifest, validateSearchManifest, type Manifest } from './sources.ts'

const real = loadManifest(join(import.meta.dirname, 'sources.json'))

function withLicence(licence: string, extra: Partial<Manifest['sources'][number]> = {}): Manifest {
  const source = { ...real.sources[0], ...extra, licence }
  return { ...real, sources: [source, ...real.sources.slice(1)] }
}

describe('licence gate', () => {
  it('accepts the committed manifest: Natural Earth, public domain, pinned', () => {
    expect(real.sources.length).toBeGreaterThan(0)
    for (const source of real.sources) {
      expect(source.licence).toBe('Public-Domain')
      expect(source.creditRequired).toBe(false)
      expect(source.source).toBe('Natural Earth')
      for (const file of source.files) expect(file.url).toMatch(/v5\.1\.2\/|naciscdn\.org\/naturalearth/)
    }
  })

  it.each(['Public-Domain', 'CC0-1.0', 'CC-BY-4.0'])('accepts %s', (licence) => {
    expect(() => assertLicences(withLicence(licence))).not.toThrow()
  })

  it.each(['CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-SA-4.0', 'ODbL-1.0', 'GPL-3.0-only', 'AGPL-3.0', 'LGPL-2.1'])('refuses %s and names the source', (licence) => {
    expect(() => assertLicences(withLicence(licence))).toThrow(LicenceError)
    expect(() => assertLicences(withLicence(licence))).toThrow(new RegExp(`${real.sources[0].id}.*refused`))
  })

  it.each(['MIT', 'Proprietary', '', 'CC-BY-3.0'])('refuses the unlisted licence "%s"', (licence) => {
    expect(() => assertLicences(withLicence(licence))).toThrow(/not on the data allowlist/)
  })

  it('refuses road, rail and infrastructure layers', () => {
    expect(() => assertLicences(withLicence('Public-Domain', { id: 'ne-10m-roads', layer: 'roads' }))).toThrow(/infrastructure/)
    expect(() => assertLicences(withLicence('Public-Domain', { layer: 'railroads' }))).toThrow(/infrastructure/)
  })
})

describe('manifest validation', () => {
  it('rejects URLs that are not version pinned', () => {
    const bad = structuredClone(real)
    bad.sources[0].files[0].url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/50m_physical/ne_50m_land.shp'
    expect(() => validateManifest(bad)).toThrow(ManifestError)
  })

  it('rejects third-party hosts', () => {
    const bad = structuredClone(real)
    bad.sources[0].files[0].url = 'https://example.com/v5.1.2/ne_50m_land.shp'
    expect(() => validateManifest(bad)).toThrow(/pinned/)
  })

  it('rejects malformed checksums but allows an empty one', () => {
    const bad = structuredClone(real)
    bad.sources[0].files[0].sha256 = 'abc'
    expect(() => validateManifest(bad)).toThrow(/SHA-256/)
    const empty = structuredClone(real)
    empty.sources[0].files[0].sha256 = ''
    expect(() => validateManifest(empty)).not.toThrow()
  })

  it('rejects missing fields and duplicate ids', () => {
    expect(() => validateManifest({})).toThrow(ManifestError)
    const dup = structuredClone(real)
    dup.sources[1].id = dup.sources[0].id
    expect(() => validateManifest(dup)).toThrow(/duplicate/)
  })
})

describe('Cliopatria manifest', () => {
  const geo = loadGeoManifest(join(import.meta.dirname, 'sources-geo.json'))

  it('pins Cliopatria v0.2.0, CC-BY-4.0, credit required', () => {
    const [source] = geo.sources
    expect(geo.cliopatriaRelease).toBe('0.2.0')
    expect(source).toMatchObject({ licence: 'CC-BY-4.0', creditRequired: true, version: '0.2.0' })
    expect(source.attribution).toMatch(/Cliopatria/)
    expect(source.attribution).toMatch(/Seshat Global History Databank/)
    expect(source.files[0].url).toContain('/cliopatria/v0.2.0/cliopatria.geojson.zip')
    expect(source.files[0].sha256).toBe('d01ae3a20d358cc5d54f69d9d725d390767d9c8759ac89ad6f90c58d106f3370')
    expect(source.files[0].extract).toBe('cliopatria_polities_only.geojson')
  })

  it.each(['CC-BY-NC-4.0', 'ODbL-1.0', 'CC-BY-SA-4.0', 'MIT'])('refuses %s through the shared gate', (licence) => {
    const bad = structuredClone(geo)
    bad.sources[0].licence = licence
    expect(() => assertLicences(bad)).toThrow(LicenceError)
  })

  it('rejects unpinned URLs, other hosts, unpinned checksums and version drift', () => {
    const edit = (change: (m: typeof geo) => void) => {
      const m = structuredClone(geo)
      change(m)
      return m
    }
    expect(() => validateGeoManifest(edit((m) => (m.sources[0].files[0].url = 'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/main/cliopatria.geojson.zip')))).toThrow(/pinned Cliopatria URL/)
    expect(() => validateGeoManifest(edit((m) => (m.sources[0].files[0].url = 'https://example.com/cliopatria/v0.2.0/x.zip')))).toThrow(/pinned/)
    expect(() => validateGeoManifest(edit((m) => (m.sources[0].files[0].sha256 = '')))).toThrow(/must be pinned/)
    expect(() => validateGeoManifest(edit((m) => (m.sources[0].version = '0.3.0')))).toThrow(/differs/)
    expect(() => validateGeoManifest(edit((m) => (m.sources[0].files[0].url = m.sources[0].files[0].url.replace('v0.2.0', 'v0.1.0'))))).toThrow(/pinned to tag v0\.1\.0, not release v0\.2\.0/)
    expect(() => validateGeoManifest(edit((m) => (m.sources[0].files[0].extract = undefined)))).toThrow(/extract/)
    expect(() => validateGeoManifest({})).toThrow(ManifestError)
  })

  it('is not accepted as a Natural Earth manifest, nor the reverse', () => {
    expect(() => validateManifest(geo)).toThrow(ManifestError)
    expect(() => validateGeoManifest(real)).toThrow(ManifestError)
  })
})

describe('place search manifest', () => {
  const search = loadSearchManifest(join(import.meta.dirname, 'sources-search.json'))
  const edit = (change: (m: typeof search) => void) => {
    const m = structuredClone(search)
    change(m)
    return m
  }

  it('pins Natural Earth 5.1.2 countries and populated places, public domain, checksums pinned', () => {
    expect(search.naturalEarthRelease).toBe('5.1.2')
    expect(search.sources.map((s) => s.layer).sort()).toEqual(['countries', 'places'])
    for (const source of search.sources) {
      expect(source).toMatchObject({ kind: 'search', licence: 'Public-Domain', creditRequired: false, source: 'Natural Earth', version: '5.1.2' })
      expect(source.files.map((f) => f.name.split('.').pop()).sort()).toEqual(['dbf', 'shp'])
      for (const file of source.files) {
        expect(file.url).toContain('/natural-earth-vector/v5.1.2/10m_cultural/')
        expect(file.sha256).toMatch(/^[0-9a-f]{64}$/)
      }
    }
    expect(search.sources.flatMap((s) => s.files.map((f) => f.name)).sort()).toEqual([
      'ne_10m_admin_0_countries.dbf',
      'ne_10m_admin_0_countries.shp',
      'ne_10m_populated_places.dbf',
      'ne_10m_populated_places.shp',
    ])
  })

  it.each(['CC-BY-NC-4.0', 'ODbL-1.0', 'CC-BY-SA-4.0', 'GPL-3.0-only', 'MIT'])('refuses %s through the shared gate', (licence) => {
    expect(() => assertLicences(edit((m) => (m.sources[1].licence = licence)))).toThrow(LicenceError)
  })

  it('rejects unpinned URLs, other hosts, unpinned checksums, version drift and the wrong layers', () => {
    expect(() => validateSearchManifest(edit((m) => (m.sources[0].files[0].url = m.sources[0].files[0].url.replace('v5.1.2', 'master'))))).toThrow(/pinned Natural Earth URL/)
    expect(() => validateSearchManifest(edit((m) => (m.sources[0].files[0].url = 'https://example.com/v5.1.2/x.shp')))).toThrow(/pinned/)
    expect(() => validateSearchManifest(edit((m) => (m.sources[0].files[0].sha256 = '')))).toThrow(/must be pinned/)
    expect(() => validateSearchManifest(edit((m) => (m.sources[0].version = '5.1.1')))).toThrow(/differs/)
    expect(() => validateSearchManifest(edit((m) => (m.sources[0].files[0].url = m.sources[0].files[0].url.replace('v5.1.2', 'v5.1.1'))))).toThrow(/pinned to tag v5\.1\.1, not release v5\.1\.2/)
    expect(() => validateSearchManifest(edit((m) => (m.sources[0].layer = 'places')))).toThrow(/exactly one "countries"/)
    expect(() => validateSearchManifest(edit((m) => m.sources[0].files.pop()))).toThrow(/one \.shp and one \.dbf/)
    expect(() => validateSearchManifest(edit((m) => m.sources.pop()))).toThrow(/exactly one source/)
    expect(() => validateSearchManifest({})).toThrow(ManifestError)
  })

  it('is not accepted as another pipeline manifest, nor the reverse', () => {
    expect(() => validateManifest(search)).toThrow(ManifestError)
    expect(() => validateGeoManifest(search)).toThrow(ManifestError)
    expect(() => validateSearchManifest(real)).toThrow(ManifestError)
  })
})
