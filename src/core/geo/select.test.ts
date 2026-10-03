import { describe, expect, it } from 'vitest'
import { GEO_INDEX } from '../testing/geo-fixtures'
import type { GeoIndex } from './geo'
import { dataDateFor, selectGeoEntities } from './select'

const ids = (year: number) => selectGeoEntities(GEO_INDEX, year)?.entities.map(({ entity }) => entity.id)

describe('dataDateFor', () => {
  it('is the year itself, exact, when an entity has a state in it', () => {
    expect(dataDateFor(GEO_INDEX, 1050)).toEqual({ year: 1050, exact: true })
    expect(dataDateFor(GEO_INDEX, 1900)).toEqual({ year: 1900, exact: true })
    expect(dataDateFor(GEO_INDEX, 1000)).toEqual({ year: 1000, exact: true })
    expect(dataDateFor(GEO_INDEX, 1200)).toEqual({ year: 1200, exact: true })
  })

  it('takes the nearest year that has data, dataset-wide', () => {
    expect(dataDateFor(GEO_INDEX, 2030)).toEqual({ year: 1900, exact: false })
    expect(dataDateFor(GEO_INDEX, -3500)).toEqual({ year: 1000, exact: false })
    expect(dataDateFor(GEO_INDEX, 1250)).toEqual({ year: 1200, exact: false })
    expect(dataDateFor(GEO_INDEX, 1380)).toEqual({ year: 1400, exact: false })
  })

  it('takes the earlier year on a tie', () => {
    // 1200 and 1400 are 100 apart from 1300.
    expect(dataDateFor(GEO_INDEX, 1300)).toEqual({ year: 1200, exact: false })
  })

  it('counts a year covered only by a relation as having no data', () => {
    const onlyRelation: GeoIndex = { ...GEO_INDEX, entities: [{ id: 'r', name: 'r', kind: 'relation', memberOf: [], states: [[1, 5]] }] }
    expect(dataDateFor(onlyRelation, 3)).toBeUndefined()
    expect(selectGeoEntities(onlyRelation, 3)).toBeUndefined()
  })

  it('merges abutting periods so no year in them is marked inexact', () => {
    expect(dataDateFor(GEO_INDEX, 1101)).toEqual({ year: 1101, exact: true })
  })
})

describe('selectGeoEntities (countries view)', () => {
  it('shows the polities valid at the data date', () => {
    expect(ids(1050)).toEqual(['rome', 'gaul'])
    expect(ids(1900)).toEqual(['solo'])
  })

  it('hides a polity that is a member of a group valid at that date, and keeps the group', () => {
    expect(ids(1150)).toEqual(['rome', 'empire.group'])
  })

  it('hides every relation', () => {
    expect(ids(1450)).toEqual(['rome', 'empire.group'])
  })

  it('uses the nearest data year when the Reference Date has none', () => {
    const selection = selectGeoEntities(GEO_INDEX, 2030)
    expect(selection?.dataDate).toEqual({ year: 1900, exact: false })
    expect(selection?.entities.map(({ entity }) => entity.id)).toEqual(['solo'])
  })

  it('returns the fromYear of the period holding the data year', () => {
    expect(selectGeoEntities(GEO_INDEX, 1150)?.entities.map(({ fromYear }) => fromYear)).toEqual([1101, 1101])
  })

  it('keeps a member visible when its group is not valid then', () => {
    const index: GeoIndex = {
      ...GEO_INDEX,
      entities: [
        { id: 'a', name: 'a', kind: 'polity', memberOf: ['g.group'], states: [[1, 10]] },
        { id: 'g.group', name: '(g)', kind: 'group', memberOf: [], states: [[5, 10]] },
      ],
    }
    expect(selectGeoEntities(index, 3)?.entities.map(({ entity }) => entity.id)).toEqual(['a'])
    expect(selectGeoEntities(index, 7)?.entities.map(({ entity }) => entity.id)).toEqual(['g.group'])
  })

  it('hides a group that belongs to a larger valid group', () => {
    const index: GeoIndex = {
      ...GEO_INDEX,
      entities: [
        { id: 'inner.group', name: '(inner)', kind: 'group', memberOf: ['outer.group'], states: [[1, 10]] },
        { id: 'outer.group', name: '(outer)', kind: 'group', memberOf: [], states: [[1, 10]] },
      ],
    }
    expect(selectGeoEntities(index, 5)?.entities.map(({ entity }) => entity.id)).toEqual(['outer.group'])
  })
})
