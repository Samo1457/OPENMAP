import { describe, expect, it } from 'vitest'
import { SEARCH_INDEX } from '../testing/search-fixtures'
import type { EntityCandidate } from './candidates'
import { groupPlaceResults, MAX_RESULTS, searchPlaces, type PlaceSearchSources, type SearchLocale } from './match'
import type { SearchIndex } from './search-index'

const ENTITIES: readonly EntityCandidate[] = [
  { key: 'cliopatria@0.2.0:ottoman-empire', name: 'Ottoman Empire', bounds: [20, 35, 45, 45] },
  { key: 'cliopatria@0.2.0:roman-empire.group', name: '(Roman Empire)', bounds: [-10, 30, 40, 55] },
]

const sources = (locale: SearchLocale = 'fr', extra: Partial<PlaceSearchSources> = {}): PlaceSearchSources => ({ index: SEARCH_INDEX, entities: ENTITIES, locale, ...extra })
const names = (query: string, locale: SearchLocale = 'fr', extra: Partial<PlaceSearchSources> = {}) => searchPlaces(query, sources(locale, extra)).results.map((r) => `${r.kind}:${r.name}`)

describe('minimum length', () => {
  it.each(['', ' ', 'l', ' l ', '-', "'"])('"%s" shows nothing', (query) => {
    expect(searchPlaces(query, sources())).toEqual({ status: 'short', results: [] })
  })

  it('two characters are enough, and spaces around them do not count', () => {
    expect(searchPlaces('lo', sources()).status).toBe('results')
    expect(searchPlaces('  lo  ', sources()).status).toBe('results')
  })
})

describe('accents, case and both languages', () => {
  it('« londres », « LONDON » and « Londrés » find the same London', () => {
    for (const query of ['londres', 'LONDON', 'Londrés']) expect(searchPlaces(query, sources()).results[0]).toMatchObject({ kind: 'city', id: 'city:0' })
  })

  it('« cote d\'ivoire » finds Côte d\'Ivoire, also by its English name', () => {
    expect(names("cote d'ivoire")).toEqual(["country:Côte d'Ivoire"])
    expect(names('ivory')).toEqual(["country:Côte d'Ivoire"])
    expect(names('COTE D’IVOIRE')).toEqual(["country:Côte d'Ivoire"])
  })

  it('« Allemagne » and « Germany » are the same country, named in the UI language', () => {
    const fr = searchPlaces('Allemagne', sources('fr')).results[0]
    const en = searchPlaces('Germany', sources('fr')).results[0]
    expect(fr.id).toBe(en.id)
    expect(fr).toMatchObject({ kind: 'country', name: 'Allemagne', otherName: 'Germany' })
    expect(searchPlaces('Allemagne', sources('en')).results[0]).toMatchObject({ name: 'Germany', otherName: 'Allemagne' })
  })

  it('shows the secondary name only when it differs', () => {
    expect(searchPlaces('france', sources('fr')).results[0]).toMatchObject({ name: 'France' })
    expect(searchPlaces('france', sources('fr')).results[0].otherName).toBeUndefined()
    expect(searchPlaces('paris', sources('en')).results[0].otherName).toBeUndefined()
    expect(searchPlaces('kyiv', sources('en')).results[0]).toMatchObject({ name: 'Kyiv', otherName: 'Kiev' })
    expect(searchPlaces('kyiv', sources('fr')).results[0]).toMatchObject({ name: 'Kiev', otherName: 'Kyiv' })
  })

  it('uses the English name in a French UI when there is no French one, and the reverse is never empty', () => {
    expect(searchPlaces('ukraine', sources('fr')).results[0]).toMatchObject({ name: 'Ukraine' })
    expect(searchPlaces('ukraine', sources('en')).results[0]).toMatchObject({ name: 'Ukraine' })
  })

  it('matches the ligatures and apostrophes of the data', () => {
    expect(names('are')).toEqual(['city:Åre'])
    expect(names('saint-peters')).toEqual(['city:Saint-Pétersbourg'])
    expect(names('saint petersb', 'en')).toEqual(['city:Saint Petersburg'])
  })
})

describe('what matches', () => {
  it('a name that starts with the query, or has a word that does', () => {
    expect(names('york', 'en')).toEqual(['city:New York'])
    expect(names('new y', 'en')).toEqual(['city:New York'])
    expect(names('empire', 'en')).toEqual(['entity:Roman Empire', 'entity:Ottoman Empire'])
  })

  it('never from the middle of a word', () => {
    expect(names('ndon')).toEqual([])
    expect(names('ottom empire')).toEqual([])
  })

  it('a historical city name does not match', () => {
    const outcome = searchPlaces('Constantinople', sources())
    expect(outcome).toEqual({ status: 'empty', results: [] })
    expect(searchPlaces('Stalingrad', sources()).status).toBe('empty')
  })

  it('« Marioupl » finds nothing (the French name is Marioupol)', () => {
    expect(searchPlaces('Marioupl', sources())).toEqual({ status: 'empty', results: [] })
    expect(names('Marioup')).toEqual(['city:Marioupol'])
  })

  it('finds a GeoEntity on its English name, without the parentheses of a group', () => {
    expect(searchPlaces('ottoman', sources('fr')).results).toEqual([
      expect.objectContaining({ kind: 'entity', name: 'Ottoman Empire', entityKey: 'cliopatria@0.2.0:ottoman-empire', bounds: [20, 35, 45, 45], center: [32.5, 40] }),
    ])
    expect(names('roman')).toEqual(['entity:Roman Empire'])
  })

  it('searches the entities alone when the index is missing', () => {
    expect(names('ottoman', 'fr', { index: undefined })).toEqual(['entity:Ottoman Empire'])
    expect(searchPlaces('londres', sources('fr', { index: undefined }))).toEqual({ status: 'empty', results: [] })
  })

  it('searches the index alone when no entity is valid', () => {
    expect(names('ottoman', 'fr', { entities: [] })).toEqual([])
    expect(names('london', 'en', { entities: [] })).toHaveLength(3)
  })
})

describe('ranking', () => {
  it('puts the exact name before a name that starts with the query', () => {
    const index: SearchIndex = { ...SEARCH_INDEX, countries: [], places: [['Romeo', '', 0, 0, 9_000_000, 'X'], ['Rome', '', 1, 1, 1_000, 'X']] }
    expect(searchPlaces('rome', { index, entities: [], locale: 'en' }).results.map((r) => r.name)).toEqual(['Rome', 'Romeo'])
  })

  it('applies the ranking before the cut-off, then lists by group: an exact city stays in the ten', () => {
    const index: SearchIndex = { ...SEARCH_INDEX, countries: [], places: [['Rome', '', 1, 1, 1_000, 'X']] }
    const entities: EntityCandidate[] = Array.from({ length: 12 }, (_, i) => ({ key: `k:${i}`, name: `Romeo ${String.fromCharCode(97 + i)}`, bounds: [0, 0, 1, 1] as const }))
    const results = searchPlaces('rome', { index, entities, locale: 'en' }).results
    expect(results).toHaveLength(10)
    expect(results.some((r) => r.name === 'Rome')).toBe(true)
    expect(results[results.length - 1].name).toBe('Rome')
  })

  it('puts a name that starts with the query before a name with a word that starts with it', () => {
    const index: SearchIndex = { ...SEARCH_INDEX, countries: [], places: [['Port Orleans', '', 0, 0, 9_000_000, 'X'], ['Orleans', '', 1, 1, 1_000, 'X']] }
    expect(searchPlaces('orl', { index, entities: [], locale: 'en' }).results.map((r) => r.name)).toEqual(['Orleans', 'Port Orleans'])
  })

  it('at equal quality, countries come before historical entities before cities', () => {
    const index: SearchIndex = { ...SEARCH_INDEX, countries: [{ en: 'Gallia Land', fr: '', lon: 0, lat: 0, bounds: [0, 0, 1, 1], pop: 1 }], places: [['Gallia City', '', 0, 0, 99_000_000, 0]] }
    const entities: EntityCandidate[] = [{ key: 'k:g', name: 'Gallia Realm', bounds: [0, 0, 1, 1] }]
    expect(searchPlaces('gallia', { index, entities, locale: 'en' }).results.map((r) => r.kind)).toEqual(['country', 'entity', 'city'])
  })

  it('at equal kind, larger population first, then the shorter name', () => {
    expect(searchPlaces('london', sources('en')).results.map((r) => `${r.name}/${r.country}`)).toEqual(['London/United Kingdom', 'London/Canada', 'London/United States of America'])
    const index: SearchIndex = { ...SEARCH_INDEX, countries: [], places: [['Alphaville', '', 0, 0, 5, 'X'], ['Alpha', '', 1, 1, 5, 'X'], ['Alphabet Town', '', 2, 2, 5, 'X']] }
    expect(searchPlaces('alpha', { index, entities: [], locale: 'en' }).results.map((r) => r.name)).toEqual(['Alpha', 'Alphaville', 'Alphabet Town'])
  })

  it('is stable: the same query gives the same list', () => {
    expect(searchPlaces('lo', sources())).toEqual(searchPlaces('lo', sources()))
  })
})

describe('limits and groups', () => {
  const many: SearchIndex = {
    ...SEARCH_INDEX,
    countries: [],
    places: Array.from({ length: 25 }, (_, i) => [`Town ${String.fromCharCode(97 + i)}`, '', 0, 0, 1_000 - i, 'X'] as const),
  }

  it('returns at most ten results', () => {
    expect(searchPlaces('town', { index: many, entities: [], locale: 'en' }).results).toHaveLength(MAX_RESULTS)
    expect(MAX_RESULTS).toBe(10)
  })

  it('cuts the ranking at ten before grouping: the best ten, then listed by group', () => {
    const entities: EntityCandidate[] = [{ key: 'k:late', name: 'Town Empire', bounds: [0, 0, 1, 1] }]
    const outcome = searchPlaces('town', { index: many, entities, locale: 'en' })
    expect(outcome.results).toHaveLength(10)
    // Same quality for all: the entity ranks before the cities and is listed first.
    expect(outcome.results[0]).toMatchObject({ kind: 'entity', name: 'Town Empire' })
    expect(outcome.results.slice(1).map((r) => r.name)).toEqual(['Town a', 'Town b', 'Town c', 'Town d', 'Town e', 'Town f', 'Town g', 'Town h', 'Town i'])
  })

  it('lists countries, then historical entities, then cities, each group in rank order', () => {
    const outcome = searchPlaces('ro', sources('en'))
    expect(outcome.results.map((r) => r.kind)).toEqual(outcome.results.map((r) => r.kind).sort((a, b) => ['country', 'entity', 'city'].indexOf(a) - ['country', 'entity', 'city'].indexOf(b)))
    expect(groupPlaceResults(outcome.results).map((g) => g.kind)).toEqual(['country', 'entity', 'city'])
  })

  it('groups only the kinds that have results', () => {
    expect(groupPlaceResults(searchPlaces('germany', sources()).results).map((g) => g.kind)).toEqual(['country'])
    expect(groupPlaceResults([])).toEqual([])
  })

  it('gives every result a unique id', () => {
    const { results } = searchPlaces('lo', sources())
    expect(new Set(results.map((r) => r.id)).size).toBe(results.length)
  })
})

describe('result data', () => {
  it('a city has a point and its country in the UI language, no extent', () => {
    expect(searchPlaces('londres', sources('fr')).results[0]).toEqual({ id: 'city:0', kind: 'city', name: 'Londres', otherName: 'London', country: 'Royaume-Uni', center: [-0.119, 51.502] })
    expect(searchPlaces('londres', sources('en')).results[0]).toMatchObject({ name: 'London', otherName: 'Londres', country: 'United Kingdom' })
  })

  it('a city whose country is not in the list shows the name Natural Earth gives', () => {
    expect(searchPlaces('gand', sources('fr')).results[0]).toMatchObject({ name: 'Gand', country: 'Belgium' })
  })

  it('a country has its label point and the extent of its main landmass', () => {
    expect(searchPlaces('italie', sources('fr')).results[0]).toMatchObject({ kind: 'country', center: [12.5, 42.1], bounds: [6.6, 36.6, 18.5, 47.1] })
  })
})
