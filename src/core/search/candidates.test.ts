import { describe, expect, it } from 'vitest'
import type { Geodata } from '../geo/geo'
import { GEO_INDEX, GEO_STATES } from '../testing/geo-fixtures'
import { SEARCH_GEO_INDEX, SEARCH_GEO_STATES } from '../testing/search-fixtures'
import { drawnCandidates, entityCandidates } from './candidates'

const data: Geodata = { index: SEARCH_GEO_INDEX, states: SEARCH_GEO_STATES }
const keys = (year: number | undefined, geodata = data) => entityCandidates(geodata, year).map((c) => c.key.replace('cliopatria@0.2.0:', ''))

describe('entityCandidates', () => {
  it('are the entities the Map shows at the data date, by canonical key', () => {
    expect(entityCandidates(data, 1900).map((c) => c.key)).toEqual(['cliopatria@0.2.0:ottoman-empire'])
  })

  it('never offers a relation or a polity hidden inside a valid group', () => {
    expect(keys(1400)).toEqual(['ottoman-empire', 'kingdom-of-france'])
    expect(keys(100)).toEqual(['roman-empire.group'])
  })

  it('follow the date', () => {
    expect(keys(1750)).toEqual(['ottoman-empire', 'kingdom-of-france', 'prussia'])
    expect(keys(1900)).toEqual(['ottoman-empire'])
  })

  it('use the nearest data date when the year has none', () => {
    expect(keys(1990)).toEqual(['ottoman-empire'])
  })

  it('carry the English name and the extent of the main landmass', () => {
    const [ottoman] = entityCandidates(data, 1900)
    expect(ottoman.name).toBe('Ottoman Empire')
    // The empire has a large part and a small island far away: the extent is the large part's.
    expect(ottoman.bounds).toEqual([-10, 5, 2, 17])
  })

  it('keep the group name as Cliopatria writes it', () => {
    expect(entityCandidates(data, 100)[0].name).toBe('(Roman Empire)')
  })

  it('skip an entity whose state is not loaded', () => {
    const partial: Geodata = { index: SEARCH_GEO_INDEX, states: { ...SEARCH_GEO_STATES, 'ottoman-empire/1300': undefined as never } }
    expect(keys(1900, partial)).toEqual([])
  })

  it('are empty without index, states or year', () => {
    expect(entityCandidates({}, 1900)).toEqual([])
    expect(entityCandidates({ index: SEARCH_GEO_INDEX }, 1900)).toEqual([])
    expect(entityCandidates(data, undefined)).toEqual([])
  })

  it('work on another dataset too', () => {
    expect(entityCandidates({ index: GEO_INDEX, states: GEO_STATES }, 1900).map((c) => c.name)).toEqual(['Solo'])
  })
})

describe('drawnCandidates', () => {
  const all = entityCandidates({ index: SEARCH_GEO_INDEX, states: SEARCH_GEO_STATES }, 1750)

  it('keeps the candidates the Scene draws, in order', () => {
    expect(all.map((c) => c.name)).toEqual(['Ottoman Empire', 'Kingdom of France', 'Prussia'])
    const items = [{ key: all[2].key }, { key: all[0].key }]
    expect(drawnCandidates(all, items).map((c) => c.name)).toEqual(['Ottoman Empire', 'Prussia'])
  })

  it('offers nothing when the Scene draws no Territory (Territories Layer hidden), so nothing is selected', () => {
    expect(drawnCandidates(all, [])).toEqual([])
    expect(drawnCandidates(all, [{}])).toEqual([])
  })
})
