import { describe, expect, it } from 'vitest'
import { SEARCH_INDEX } from '../testing/search-fixtures'
import { parseSearchIndex } from './search-index'

const clone = () => JSON.parse(JSON.stringify(SEARCH_INDEX)) as Record<string, any>

describe('parseSearchIndex', () => {
  it('accepts the index the pipeline writes', () => {
    const parsed = parseSearchIndex(JSON.parse(JSON.stringify(SEARCH_INDEX)))
    expect(parsed).toEqual({ ok: true, value: SEARCH_INDEX })
  })

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['the HTML shell parsed as nothing', {}],
    ['another schema version', { ...clone(), schemaVersion: 2 }],
    ['another dataset', { ...clone(), dataset: { ...clone().dataset, id: 'cliopatria' } }],
    ['another layout version', { ...clone(), dataset: { ...clone().dataset, version: '2' } }],
    ['a missing licence', { ...clone(), dataset: { id: 'places-search', version: '1', source: 'x', attribution: 'x', creditRequired: false } }],
    ['no places', (({ places: _p, ...rest }) => rest)(clone())],
    ['a place with a short tuple', { ...clone(), places: [['London', 'Londres', 0, 0]] }],
    ['a place with an empty name', { ...clone(), places: [['', '', 0, 0, 1, 0]] }],
    ['a longitude out of range', { ...clone(), places: [['X', '', 181, 0, 1, 0]] }],
    ['a latitude out of range', { ...clone(), places: [['X', '', 0, -91, 1, 0]] }],
    ['a negative population', { ...clone(), places: [['X', '', 0, 0, -1, 0]] }],
    ['a place whose country is not in the list', { ...clone(), places: [['X', '', 0, 0, 1, 99]] }],
    ['a country with unordered bounds', { ...clone(), countries: [{ en: 'X', fr: '', lon: 0, lat: 0, bounds: [10, 0, 5, 1], pop: 1 }] }],
    ['a country with a missing name', { ...clone(), countries: [{ fr: '', lon: 0, lat: 0, bounds: [0, 0, 1, 1], pop: 1 }] }],
  ])('refuses %s as search_unavailable', (_label, value) => {
    expect(parseSearchIndex(value)).toEqual({ ok: false, error: { code: 'search_unavailable', params: { reason: 'invalid_index' } } })
  })

  it('accepts a place whose country is a name', () => {
    expect(parseSearchIndex({ ...clone(), places: [['X', '', 0, 0, 1, 'Belgium']] }).ok).toBe(true)
  })
})
