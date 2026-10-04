// Natural Earth countries and populated places to the place search index (Story 1.12, FR-8, AD-16,
// AD-17): English and French names, a point or an extent to centre the camera on, a population to rank
// by. Pure and deterministic: rows are sorted, so the output does not depend on the shapefile order.

import type { Feature, FeatureCollection } from 'geojson'
import { mainLandmassBounds } from '../src/core/search/landmass.ts'

/** Dataset id and layout version of the index; `src/core/search/search-index.ts` holds the same two values (a test checks it). */
export const SEARCH_DATASET_ID = 'places-search'
export const SEARCH_DATASET_VERSION = '1'

export interface SearchDatasetMeta {
  source: string
  licence: string
  attribution: string
  creditRequired: boolean
}

export interface SearchCountryEntry {
  en: string
  fr: string
  lon: number
  lat: number
  bounds: [number, number, number, number]
  pop: number
}

/** `[en, fr, lon, lat, popMax, country]`, country being an index into `countries` or a name. */
export type SearchPlaceEntry = [string, string, number, number, number, number | string]

export interface SearchData {
  schemaVersion: 1
  dataset: { id: string; version: string } & SearchDatasetMeta
  countries: SearchCountryEntry[]
  places: SearchPlaceEntry[]
}

export interface SearchBuild {
  index: SearchData
  /** Features left out and why, for the report. */
  skipped: { countries: number; places: number; duplicatePlaces: number }
  /** Places whose country is not in the countries list (kept, with the country's name). */
  unmatchedCountry: number
}

/** Codepoint order: the same on every platform, unlike `localeCompare`. */
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** Natural Earth's tables pad some text fields with NUL characters. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.replaceAll('\u0000', '').normalize('NFC').trim() : ''
}

const number = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

/** `fr` is stored only when it differs from `en`: the client falls back to the other language. */
function names(properties: Record<string, unknown>): { en: string; fr: string } | undefined {
  const en = text(properties.NAME_EN) || text(properties.NAME)
  const fr = text(properties.NAME_FR)
  if (en === '' && fr === '') return undefined
  const english = en || fr
  return { en: english, fr: fr === english ? '' : fr }
}

function buildCountries(collection: FeatureCollection) {
  const countries: (SearchCountryEntry & { adm0: string; aliases: string[] })[] = []
  let skipped = 0
  for (const feature of collection.features) {
    const properties = (feature.properties ?? {}) as Record<string, unknown>
    const name = names(properties)
    const landmass = feature.geometry && feature.geometry.type !== 'GeometryCollection' ? mainLandmassBounds(feature.geometry) : undefined
    if (!name || !landmass) {
      skipped++
      continue
    }
    const bounds = landmass.map((value) => round(value, 2)) as SearchCountryEntry['bounds']
    countries.push({
      ...name,
      lon: round(number(properties.LABEL_X) ?? (bounds[0] + bounds[2]) / 2, 3),
      lat: round(number(properties.LABEL_Y) ?? (bounds[1] + bounds[3]) / 2, 3),
      bounds,
      pop: Math.max(0, Math.round(number(properties.POP_EST) ?? 0)),
      adm0: text(properties.ADM0_A3),
      aliases: [name.en, text(properties.NAME), text(properties.ADMIN)].filter((alias) => alias !== ''),
    })
  }
  countries.sort((a, b) => compare(a.en, b.en) || compare(a.fr, b.fr) || a.lon - b.lon)
  return { countries, skipped }
}

function pointOf(feature: Feature, properties: Record<string, unknown>): [number, number] | undefined {
  const coordinates = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : undefined
  const lon = number(coordinates?.[0]) ?? number(properties.LONGITUDE)
  const lat = number(coordinates?.[1]) ?? number(properties.LATITUDE)
  return lon === undefined || lat === undefined || Math.abs(lon) > 180 || Math.abs(lat) > 90 ? undefined : [round(lon, 3), round(lat, 3)]
}

/**
 * The index from the `ne_10m_admin_0_countries` and `ne_10m_populated_places` features. A place
 * refers to its country by index when Natural Earth's `ADM0_A3` is one of the countries' codes or its
 * `ADM0NAME` one of their English names, else by that name as text.
 */
export function buildSearchData(countryFeatures: FeatureCollection, placeFeatures: FeatureCollection, meta: SearchDatasetMeta): SearchBuild {
  const { countries, skipped: skippedCountries } = buildCountries(countryFeatures)
  // A place's `ADM0_A3` is a country's own code; failing that, its `ADM0NAME` is one of the country's English names.
  const byCode = new Map<string, number>()
  const byName = new Map<string, number>()
  countries.forEach((country, row) => {
    if (country.adm0 !== '' && country.adm0 !== '-99' && !byCode.has(country.adm0)) byCode.set(country.adm0, row)
    for (const alias of country.aliases) if (!byName.has(alias)) byName.set(alias, row)
  })

  const places: SearchPlaceEntry[] = []
  const seen = new Set<string>()
  let skippedPlaces = 0
  let duplicates = 0
  let unmatched = 0
  for (const feature of placeFeatures.features) {
    const properties = (feature.properties ?? {}) as Record<string, unknown>
    const name = names(properties)
    const point = pointOf(feature, properties)
    if (!name || !point) {
      skippedPlaces++
      continue
    }
    const key = `${name.en}|${name.fr}|${point[0]}|${point[1]}`
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    const adm0 = text(properties.ADM0NAME)
    const row = byCode.get(text(properties.ADM0_A3)) ?? byName.get(adm0)
    if (row === undefined && adm0 !== '') unmatched++
    places.push([name.en, name.fr, point[0], point[1], Math.max(0, Math.round(number(properties.POP_MAX) ?? 0)), row ?? adm0])
  }
  places.sort((a, b) => compare(a[0], b[0]) || compare(a[1], b[1]) || a[2] - b[2] || a[3] - b[3])

  return {
    index: {
      schemaVersion: 1,
      dataset: { id: SEARCH_DATASET_ID, version: SEARCH_DATASET_VERSION, ...meta },
      countries: countries.map(({ adm0: _adm0, aliases: _aliases, ...country }) => country),
      places,
    },
    skipped: { countries: skippedCountries, places: skippedPlaces, duplicatePlaces: duplicates },
    unmatchedCountry: unmatched,
  }
}

/** What a real build must hold at least: Natural Earth 5.1.2 has 258 countries and 7,342 places. */
export const SEARCH_FLOOR = { countries: 200, places: 5000 } as const
export interface SearchFloor {
  countries: number
  places: number
}

/**
 * Checks the index with the rules of the client's schema (`src/core/search/search-index.ts`: a test
 * runs both on the same rows), and that it is not suspiciously small. Throws on the first problem, so
 * a bad build never replaces the previous output.
 */
export function assertSearchData(index: SearchData, floor: SearchFloor = SEARCH_FLOOR): void {
  const fail = (what: string): never => {
    throw new Error(`the search index is not valid: ${what}`)
  }
  const inRange = (value: unknown, limit: number) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
  if (index.dataset.id !== SEARCH_DATASET_ID || index.dataset.version !== SEARCH_DATASET_VERSION) fail('dataset id or version')
  if (typeof index.dataset.licence !== 'string' || typeof index.dataset.source !== 'string' || typeof index.dataset.attribution !== 'string') fail('dataset metadata')
  index.countries.forEach((country, row) => {
    const [west, south, east, north] = country.bounds
    if (country.en === '' || typeof country.fr !== 'string') fail(`country ${row} has no name`)
    if (![country.lon, west, east].every((v) => inRange(v, 180)) || ![country.lat, south, north].every((v) => inRange(v, 90))) fail(`country ${row} (${country.en}) is outside the world`)
    if (west > east || south > north) fail(`country ${row} (${country.en}) has unordered bounds`)
    if (!(country.pop >= 0)) fail(`country ${row} (${country.en}) has a negative population`)
  })
  index.places.forEach(([en, fr, lon, lat, pop, country], row) => {
    if (en === '' || typeof fr !== 'string') fail(`place ${row} has no name`)
    if (!inRange(lon, 180) || !inRange(lat, 90)) fail(`place ${row} (${en}) is outside the world`)
    if (!(pop >= 0)) fail(`place ${row} (${en}) has a negative population`)
    if (typeof country === 'number' && !(Number.isInteger(country) && country >= 0 && country < index.countries.length)) fail(`place ${row} (${en}) refers to an unknown country`)
  })
  if (index.countries.length < floor.countries) fail(`${index.countries.length} countries, at least ${floor.countries} expected`)
  if (index.places.length < floor.places) fail(`${index.places.length} places, at least ${floor.places} expected`)
}
