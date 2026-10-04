// Place search (Story 1.12, FR-8): which countries, GeoEntities and cities answer a query, in which
// order. Pure and deterministic: the same index, entities and query always give the same list.

import type { Bounds } from '../evaluate/camera'
import type { EntityCandidate } from './candidates'
import { foldName } from './fold'
import type { SearchIndex } from './search-index'

export type PlaceKind = 'country' | 'entity' | 'city'
/** The order of the groups and, at equal match quality, of the results. */
export const PLACE_KIND_ORDER: readonly PlaceKind[] = ['country', 'entity', 'city']
export type SearchLocale = 'fr' | 'en'

/** The query must have this many characters (after folding) before anything shows. */
export const MIN_QUERY_LENGTH = 2
export const MAX_RESULTS = 10

export interface PlaceResult {
  /** Unique in a list, stable for a given index. */
  readonly id: string
  readonly kind: PlaceKind
  /** The name in the UI language: French for a French UI when it exists, else English. */
  readonly name: string
  /** The name in the other language, when it differs. */
  readonly otherName?: string
  /** A city's country, in the UI language. */
  readonly country?: string
  /** `[lon, lat]`: where a city is, the label point of a country, the middle of an entity's extent. */
  readonly center: readonly [number, number]
  /** Extent of the main landmass of a country or an entity; a city has none. */
  readonly bounds?: Bounds
  /** Canonical key of the GeoEntity, for an entity result. */
  readonly entityKey?: string
}

export interface PlaceSearchSources {
  /** Absent while it loads or when it cannot be loaded: the entities are still searched. */
  readonly index?: SearchIndex
  readonly entities: readonly EntityCandidate[]
  readonly locale: SearchLocale
}

export interface PlaceSearchOutcome {
  /** `short`: fewer than `MIN_QUERY_LENGTH` characters, show nothing. */
  readonly status: 'short' | 'results' | 'empty'
  /** At most `MAX_RESULTS`, in group order (countries, historical entities, cities), best first in each. */
  readonly results: readonly PlaceResult[]
}

/** Cliopatria writes an aggregate as « (Roman Empire) »: shown without the parentheses. */
export function entityDisplayName(name: string): string {
  const match = /^\((.*)\)$/.exec(name.trim())
  return (match ? match[1] : name).trim()
}

/** Quality of a match, best first: the whole name, its beginning, the beginning of one of its words. */
const EXACT = 0
const STARTS = 1
const WORD = 2

function quality(name: string, query: string): number | undefined {
  if (name === query) return EXACT
  if (name.startsWith(query)) return STARTS
  return name.includes(` ${query}`) ? WORD : undefined
}

interface Entry {
  readonly kind: PlaceKind
  /** Position in the list the entry comes from. */
  readonly row: number
  /** Folded names, English first, without duplicates. */
  readonly names: readonly string[]
  readonly pop: number
  /** Length of the name shown in each language: a shorter name ranks first. */
  readonly length: Readonly<Record<SearchLocale, number>>
}

const folded = (...names: string[]): string[] => [...new Set(names.filter((name) => name !== '').map(foldName))]
const lengths = (en: string, fr: string): Record<SearchLocale, number> => ({ en: en.length, fr: (fr || en).length })

/** The folded entries of an index, made once per loaded index. */
const corpusCache = new WeakMap<SearchIndex, readonly Entry[]>()

function corpus(index: SearchIndex): readonly Entry[] {
  const cached = corpusCache.get(index)
  if (cached) return cached
  const entries: Entry[] = [
    ...index.countries.map((country, row): Entry => ({ kind: 'country', row, names: folded(country.en, country.fr), pop: country.pop, length: lengths(country.en, country.fr) })),
    ...index.places.map(([en, fr, , , pop], row): Entry => ({ kind: 'city', row, names: folded(en, fr), pop, length: lengths(en, fr) })),
  ]
  corpusCache.set(index, entries)
  return entries
}

const pickName = (locale: SearchLocale, en: string, fr: string): string => (locale === 'fr' ? fr || en : en || fr)

/** The name and, when it differs, the name in the other language. */
function names(locale: SearchLocale, en: string, fr: string): { name: string; otherName?: string } {
  const name = pickName(locale, en, fr)
  const other = pickName(locale === 'fr' ? 'en' : 'fr', en, fr)
  return other !== name && other.trim() !== '' ? { name, otherName: other } : { name }
}

const KIND_RANK: Record<PlaceKind, number> = { country: 0, entity: 1, city: 2 }

interface Candidate {
  readonly entry: Entry
  readonly quality: number
}

/**
 * The places that answer `rawQuery`. A result is an entry with a name that starts with the query or
 * has a word that does, in English or French, accents and case ignored. Ranking: exact name, name
 * starts with, word starts with; then countries before historical entities before cities; then the
 * larger population, then the shorter name. At most ten results, listed by group.
 */
export function searchPlaces(rawQuery: string, sources: PlaceSearchSources): PlaceSearchOutcome {
  const query = foldName(rawQuery)
  if (query.length < MIN_QUERY_LENGTH) return { status: 'short', results: [] }
  const { index, entities, locale } = sources

  const matches: Candidate[] = []
  const consider = (entry: Entry) => {
    let best: number | undefined
    for (const name of entry.names) {
      const q = quality(name, query)
      if (q !== undefined && (best === undefined || q < best)) best = q
    }
    if (best !== undefined) matches.push({ entry, quality: best })
  }
  if (index) for (const entry of corpus(index)) consider(entry)
  entities.forEach((entity, row) => {
    const display = entityDisplayName(entity.name)
    consider({ kind: 'entity', row, names: folded(display), pop: 0, length: lengths(display, '') })
  })

  matches.sort(
    (a, b) =>
      a.quality - b.quality ||
      KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind] ||
      b.entry.pop - a.entry.pop ||
      a.entry.length[locale] - b.entry.length[locale] ||
      a.entry.row - b.entry.row,
  )

  const top = matches.slice(0, MAX_RESULTS)
  // Grouped, each group keeping the order above.
  const results = PLACE_KIND_ORDER.flatMap((kind) => top.filter(({ entry }) => entry.kind === kind).map(({ entry }) => build(entry, sources)))
  return { status: results.length > 0 ? 'results' : 'empty', results }
}

function build(entry: Entry, { index, entities, locale }: PlaceSearchSources): PlaceResult {
  if (entry.kind === 'entity') {
    const entity = entities[entry.row]
    const [west, south, east, north] = entity.bounds
    return { id: `entity:${entity.key}`, kind: 'entity', name: entityDisplayName(entity.name), center: [(west + east) / 2, (south + north) / 2], bounds: entity.bounds, entityKey: entity.key }
  }
  const data = index as SearchIndex
  if (entry.kind === 'country') {
    const country = data.countries[entry.row]
    return { id: `country:${entry.row}`, kind: 'country', ...names(locale, country.en, country.fr), center: [country.lon, country.lat], bounds: country.bounds }
  }
  const [en, fr, lon, lat, , countryRef] = data.places[entry.row]
  const country = typeof countryRef === 'number' ? pickName(locale, data.countries[countryRef].en, data.countries[countryRef].fr) : countryRef
  return { id: `city:${entry.row}`, kind: 'city', ...names(locale, en, fr), ...(country ? { country } : {}), center: [lon, lat] }
}

/** The results as the list shows them: one group per kind, in order, empty groups left out. */
export function groupPlaceResults(results: readonly PlaceResult[]): readonly { readonly kind: PlaceKind; readonly results: readonly PlaceResult[] }[] {
  return PLACE_KIND_ORDER.map((kind) => ({ kind, results: results.filter((result) => result.kind === kind) })).filter((group) => group.results.length > 0)
}
