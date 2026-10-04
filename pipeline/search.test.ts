import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { describe, expect, it } from 'vitest'
import { SEARCH_DATASET_ID as CORE_ID, SEARCH_DATASET_VERSION as CORE_VERSION, parseSearchIndex } from '../src/core/search/index.ts'
import { assertSearchData, buildSearchData, SEARCH_DATASET_ID, SEARCH_DATASET_VERSION, SEARCH_FLOOR, type SearchData } from './search.ts'
import { FIXTURES } from './test-helpers.ts'
import { readShapefile } from './vector.ts'

const META = { source: 'Natural Earth', licence: 'Public-Domain', attribution: 'Made with Natural Earth.', creditRequired: false }
const box = (x0: number, y0: number, x1: number, y1: number) => [[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]
const collection = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features })
const country = (properties: Record<string, unknown>, geometry: Geometry | null = { type: 'Polygon', coordinates: [box(0, 0, 10, 10)] }): Feature => ({ type: 'Feature', properties, geometry: geometry as Geometry })
const place = (properties: Record<string, unknown>, coordinates: number[] | null = [1, 2]): Feature => ({
  type: 'Feature',
  properties,
  geometry: coordinates ? { type: 'Point', coordinates } : (null as never),
})
const build = (countries: Feature[], places: Feature[]) => buildSearchData(collection(countries), collection(places), META)

describe('search data', () => {
  it('uses the dataset id and version of the client', () => {
    expect([SEARCH_DATASET_ID, SEARCH_DATASET_VERSION]).toEqual([CORE_ID, CORE_VERSION])
  })

  it('keeps French only when it differs from English, and falls back from NAME_EN to NAME', () => {
    const { index } = build(
      [country({ NAME: 'Germany', NAME_EN: 'Germany', NAME_FR: 'Allemagne' }), country({ NAME: 'Ukraine', NAME_EN: 'Ukraine', NAME_FR: 'Ukraine' }), country({ NAME: 'Chad', NAME_EN: '', NAME_FR: 'Tchad' })],
      [],
    )
    expect(index.countries.map(({ en, fr }) => [en, fr])).toEqual([['Chad', 'Tchad'], ['Germany', 'Allemagne'], ['Ukraine', '']])
  })

  it('strips NUL padding and surrounding space, and composes accents', () => {
    const { index } = build([country({ NAME_EN: 'Ivory Coast\u0000\u0000\u0000', NAME_FR: ` Côte d'Ivoire\u0000 ` })], [])
    expect(index.countries[0]).toMatchObject({ en: 'Ivory Coast', fr: "Côte d'Ivoire" })
  })

  it('takes the label point and the extent of the main landmass, rounded', () => {
    const geometry: Geometry = { type: 'MultiPolygon', coordinates: [[box(50, 50, 51, 51)], [box(0.123456, 0.123456, 10.987654, 10.987654)]] }
    const { index } = build([country({ NAME_EN: 'A', LABEL_X: 5.55555, LABEL_Y: 6.66666, POP_EST: 1234.6 }, geometry)], [])
    expect(index.countries[0]).toEqual({ en: 'A', fr: '', lon: 5.556, lat: 6.667, bounds: [0.12, 0.12, 10.99, 10.99], pop: 1235 })
  })

  it('falls back to the middle of the extent without a label point', () => {
    const { index } = build([country({ NAME_EN: 'A' })], [])
    expect(index.countries[0]).toMatchObject({ lon: 5, lat: 5 })
  })

  it('skips a country without name or geometry and counts it', () => {
    const result = build([country({ NAME_EN: '', NAME: '' }), country({ NAME_EN: 'Z' }, null), country({ NAME_EN: 'Y' }, { type: 'Polygon', coordinates: [] }), country({ NAME_EN: 'Ok' })], [])
    expect(result.index.countries.map((c) => c.en)).toEqual(['Ok'])
    expect(result.skipped.countries).toBe(3)
  })

  it('builds a place as [en, fr, lon, lat, popMax, country], the country by index', () => {
    const { index } = build(
      [country({ NAME_EN: 'Zed', ADM0_A3: 'ZED' }), country({ NAME_EN: 'Alp', ADM0_A3: 'ALP' })],
      [place({ NAME_EN: 'London', NAME_FR: 'Londres', ADM0_A3: 'ALP', POP_MAX: 8567000.4 }, [-0.1186684, 51.5019406])],
    )
    // Countries are sorted by English name: Alp is 0.
    expect(index.places).toEqual([['London', 'Londres', -0.119, 51.502, 8567000, 0]])
  })

  it('matches the country by its English name when the code is unknown, else keeps the name', () => {
    const { index, unmatchedCountry } = build(
      [country({ NAME_EN: 'Alphaland', ADM0_A3: 'ALP' })],
      [place({ NAME_EN: 'A', ADM0_A3: 'XXX', ADM0NAME: 'Alphaland' }), place({ NAME_EN: 'B', ADM0_A3: 'YYY', ADM0NAME: 'Nowhere' }, [3, 4]), place({ NAME_EN: 'C', ADM0_A3: 'ZZZ' }, [5, 6])],
    )
    expect(index.places.map((p) => p[5])).toEqual([0, 'Nowhere', ''])
    expect(unmatchedCountry).toBe(1)
  })

  it('never matches the placeholder code -99', () => {
    const { index } = build([country({ NAME_EN: 'Somewhere', ADM0_A3: '-99' })], [place({ NAME_EN: 'P', ADM0_A3: '-99', ADM0NAME: 'Elsewhere' })])
    expect(index.places[0][5]).toBe('Elsewhere')
  })

  it('falls back to LONGITUDE and LATITUDE, skips a place without a name or a usable point, and drops exact duplicates', () => {
    const result = build(
      [],
      [
        place({ NAME_EN: 'Geo', LONGITUDE: 10.5, LATITUDE: 20.5 }, null),
        place({ NAME_EN: '' }, [1, 1]),
        place({ NAME_EN: 'Far' }, [200, 0]),
        place({ NAME_EN: 'Dup', NAME_FR: 'Doublon' }, [1.0001, 2]),
        place({ NAME_EN: 'Dup', NAME_FR: 'Doublon' }, [1.0002, 2]),
        place({ NAME_EN: 'Dup', NAME_FR: 'Autre' }, [1.0001, 2]),
      ],
    )
    expect(result.index.places.map((p) => [p[0], p[1], p[2]])).toEqual([['Dup', 'Autre', 1], ['Dup', 'Doublon', 1], ['Geo', '', 10.5]])
    expect(result.skipped).toEqual({ countries: 0, places: 2, duplicatePlaces: 1 })
  })

  it('is sorted and does not depend on the input order', () => {
    const countries = [country({ NAME_EN: 'B', ADM0_A3: 'BBB' }), country({ NAME_EN: 'A', ADM0_A3: 'AAA' })]
    const places = [place({ NAME_EN: 'Y', ADM0_A3: 'AAA' }, [1, 1]), place({ NAME_EN: 'X', ADM0_A3: 'BBB' }, [2, 2]), place({ NAME_EN: 'X', ADM0_A3: 'AAA' }, [1, 2])]
    const forward = build(countries, places)
    const backward = build([...countries].reverse(), [...places].reverse())
    expect(JSON.stringify(backward.index)).toBe(JSON.stringify(forward.index))
    expect(forward.index.places.map((p) => p[0] + p[2])).toEqual(['X1', 'X2', 'Y1'])
  })

  it('carries the dataset metadata, source, licence, attribution and credit', () => {
    expect(build([], []).index.dataset).toEqual({ id: 'places-search', version: '1', ...META })
  })

  it('writes what the client accepts', () => {
    const { index } = build([country({ NAME_EN: 'Alp', ADM0_A3: 'ALP' })], [place({ NAME_EN: 'P', ADM0_A3: 'ALP' }), place({ NAME_EN: 'Q', ADM0_A3: 'NONE', ADM0NAME: 'Nowhere' }, [3, 4])])
    expect(parseSearchIndex(JSON.parse(JSON.stringify(index))).ok).toBe(true)
  })
})

describe('with the fixture shapefiles', () => {
  const read = (name: string) => readFileSync(join(FIXTURES, name))
  it('reads Natural Earth field names from a real DBF and shapefile', async () => {
    const countries = await readShapefile(read('tiny-countries.shp'), read('tiny-countries.dbf'))
    const places = await readShapefile(read('tiny-places-names.shp'), read('tiny-places-names.dbf'))
    const { index, unmatchedCountry } = buildSearchData(countries, places, META)
    expect(index.countries).toEqual([
      { en: 'Alphaland', fr: 'Alphalande', lon: 20.5, lat: 21.25, bounds: [10, 10, 30, 30], pop: 5000000 },
      { en: 'Betaland', fr: '', lon: -20, lat: -20, bounds: [-30, -30, -10, -10], pop: 800000 },
    ])
    expect(index.places).toEqual([
      ['Alphaville', 'Alphaville-sur-Mer', 20.123, 21.432, 120000, 0],
      ['Betatown', '', -19.5, -20.25, 4500, 1],
      ['Faraway', 'Éloigné', 100, 10, 10, 'Zedland'],
    ])
    expect(unmatchedCountry).toBe(1)
  })
})

describe('assertSearchData', () => {
  const good = (): SearchData =>
    JSON.parse(JSON.stringify(build([country({ NAME_EN: 'Alp', ADM0_A3: 'ALP' })], [place({ NAME_EN: 'P', ADM0_A3: 'ALP' })]).index))
  const none = { countries: 0, places: 0 }

  it('accepts a good build, and has the real floor above the fixture sizes', () => {
    expect(() => assertSearchData(good(), none)).not.toThrow()
    expect(SEARCH_FLOOR).toEqual({ countries: 200, places: 5000 })
    expect(() => assertSearchData(good())).toThrow(/1 countries, at least 200 expected/)
  })

  // The client's schema and this check refuse the same rows.
  it.each([
    ['a place outside the world', (i: SearchData) => (i.places[0][2] = 181)],
    ['a latitude out of range', (i: SearchData) => (i.places[0][3] = -91)],
    ['a nameless place', (i: SearchData) => (i.places[0][0] = '')],
    ['a negative population', (i: SearchData) => (i.places[0][4] = -1)],
    ['an unknown country', (i: SearchData) => (i.places[0][5] = 9)],
    ['unordered bounds', (i: SearchData) => (i.countries[0].bounds = [10, 0, 5, 1])],
    ['a nameless country', (i: SearchData) => (i.countries[0].en = '')],
    ['another dataset', (i: SearchData) => (i.dataset.id = 'cliopatria')],
  ])('refuses %s, like the client', (_label, damage) => {
    const index = good()
    damage(index)
    expect(() => assertSearchData(index, none)).toThrow(/not valid/)
    expect(parseSearchIndex(index).ok).toBe(false)
  })

  it('builds that the client accepts pass', () => {
    const index = good()
    expect(parseSearchIndex(index).ok).toBe(true)
    expect(() => assertSearchData(index, none)).not.toThrow()
  })
})
