import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSearchIndex, searchPlaces } from '../src/core/search/index.ts'
import { assertSearchData, type SearchData } from './search.ts'

// Runs only where `npm run pipeline:search` has been run (never in CI): the real Natural Earth index
// must satisfy the client's schema and answer the Story 1.12 examples.
const PATH = join(import.meta.dirname, 'out-search/library/v1/search/index.json')

describe.skipIf(!existsSync(PATH))('the real search index (pipeline/out-search)', () => {
  const raw = existsSync(PATH) ? JSON.parse(readFileSync(PATH, 'utf8')) : undefined
  const parsed = parseSearchIndex(raw)
  const index = parsed.ok ? parsed.value : undefined

  it('is accepted by the client schema and by the pipeline check, with the sanity floor', () => {
    expect(parsed.ok).toBe(true)
    expect(() => assertSearchData(raw as SearchData)).not.toThrow()
    expect(index?.countries).toHaveLength(258)
    expect(index?.places.length).toBeGreaterThan(7000)
    expect(index?.dataset).toMatchObject({ licence: 'Public-Domain', creditRequired: false })
  })

  it.each([
    ['Londres', 'fr', 'Londres', 'city'],
    ['London', 'en', 'London', 'city'],
    ['Allemagne', 'fr', 'Allemagne', 'country'],
    ['Germany', 'en', 'Germany', 'country'],
    ["cote d'ivoire", 'fr', "Côte d'Ivoire", 'country'],
  ] as const)('« %s » finds %s (%s UI)', (query, locale, name, kind) => {
    const results = searchPlaces(query, { index, entities: [], locale }).results
    expect(results[0]).toMatchObject({ name, kind })
  })

  it('« Londres » and « London » reach the same capital, « Allemagne » and « Germany » the same country', () => {
    const id = (query: string) => searchPlaces(query, { index, entities: [], locale: 'en' }).results[0].id
    expect(id('Londres')).toBe(id('London'))
    expect(id('Allemagne')).toBe(id('Germany'))
  })

  it('does not match historical city names', () => {
    expect(searchPlaces('Constantinople', { index, entities: [], locale: 'fr' }).status).toBe('empty')
    expect(searchPlaces('Stalingrad', { index, entities: [], locale: 'fr' }).status).toBe('empty')
  })
})
