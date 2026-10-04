// The place search index as the pipeline writes it (Story 1.12, AD-16, AD-17): Natural Earth countries
// and populated places with their English and French names. Pure types and validator; fetching and
// caching are `src/library`'s job. Compact on purpose (about 0.4 MB): a place is a tuple.

import { z } from 'zod'
import { type Result, err, ok } from '../result'

/** Dataset id and layout version of the index (`/library/v1/search/index.json`). */
export const SEARCH_DATASET_ID = 'places-search'
export const SEARCH_DATASET_VERSION = '1'

const lon = z.number().min(-180).max(180)
const lat = z.number().min(-90).max(90)

/** A country: names, label point, extent of its main landmass, estimated population. `fr` is `''` when it equals `en`. */
export const searchCountrySchema = z
  .object({
    en: z.string().min(1),
    fr: z.string(),
    lon,
    lat,
    bounds: z.tuple([lon, lat, lon, lat]),
    pop: z.number().min(0),
  })
  .refine(({ bounds: [west, south, east, north] }) => west <= east && south <= north, { message: 'bounds are not ordered' })
export type SearchCountry = Readonly<z.infer<typeof searchCountrySchema>>

/**
 * A populated place: `[en, fr, lon, lat, popMax, country]`. `fr` is `''` when it equals `en`; `country`
 * is the index of a country, or its English name when Natural Earth's country is not in the list.
 */
export const searchPlaceSchema = z.tuple([z.string().min(1), z.string(), lon, lat, z.number().min(0), z.union([z.int().min(0), z.string()])])
export type SearchPlace = Readonly<z.infer<typeof searchPlaceSchema>>

/** `index.json` of the search dataset. */
export const searchIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    dataset: z.object({
      id: z.literal(SEARCH_DATASET_ID),
      version: z.literal(SEARCH_DATASET_VERSION),
      source: z.string(),
      licence: z.string(),
      attribution: z.string(),
      creditRequired: z.boolean(),
    }),
    countries: z.array(searchCountrySchema),
    places: z.array(searchPlaceSchema),
  })
  .superRefine((index, context) => {
    const bad = index.places.findIndex(([, , , , , country]) => typeof country === 'number' && country >= index.countries.length)
    if (bad >= 0) context.addIssue({ code: 'custom', message: `place ${bad} refers to an unknown country`, path: ['places', bad] })
  })
export type SearchIndex = Readonly<z.infer<typeof searchIndexSchema>>

/** Validates an index response; anything else is `search_unavailable`. */
export function parseSearchIndex(value: unknown): Result<SearchIndex> {
  const parsed = searchIndexSchema.safeParse(value)
  return parsed.success ? ok(parsed.data) : err('search_unavailable', { reason: 'invalid_index' })
}
