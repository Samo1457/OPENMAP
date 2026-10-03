import { describe, expect, it } from 'vitest'
import { geoEntityKey, parseGeoIndex, parseGeoState, stateKey } from './geo'
import { GEO_INDEX } from '../testing/geo-fixtures'

const PIN = { dataset: 'cliopatria', version: '0.2.0' }
const ring = [[0, 0], [1, 0], [1, 1], [0, 0]]
const feature = (overrides: Record<string, unknown> = {}) => ({
  type: 'Feature',
  id: 'cliopatria@0.2.0:rome',
  properties: { fromYear: 1000, toYear: 1100, area: 1 },
  geometry: { type: 'Polygon', coordinates: [ring] },
  ...overrides,
})

describe('keys', () => {
  it('writes the canonical entity key and the state key', () => {
    expect(geoEntityKey(PIN, 'rome')).toBe('cliopatria@0.2.0:rome')
    expect(stateKey('rome', -404)).toBe('rome/-404')
  })
})

describe('parseGeoIndex', () => {
  it('accepts the pinned dataset and drops the keys it does not use', () => {
    const raw = { ...GEO_INDEX, extra: 1, dataset: { ...GEO_INDEX.dataset, licence: 'CC-BY-4.0' } }
    expect(parseGeoIndex(raw, PIN)).toEqual({ ok: true, value: GEO_INDEX })
  })

  it('refuses another dataset version', () => {
    expect(parseGeoIndex(GEO_INDEX, { dataset: 'cliopatria', version: '0.3.0' })).toMatchObject({ ok: false, error: { code: 'geo_unavailable', params: { reason: 'other_version' } } })
  })

  it.each([['a/b'], ['A'], ['-x'], ['x y'], ['']])('refuses the entity id %j', (id) => {
    expect(parseGeoIndex({ ...GEO_INDEX, entities: [{ ...GEO_INDEX.entities[0], id }] }, PIN)).toMatchObject({ ok: false })
  })

  it.each([[null], ['<!doctype html>'], [{}], [{ ...GEO_INDEX, schemaVersion: 2 }], [{ ...GEO_INDEX, entities: [{ id: 'x' }] }], [{ ...GEO_INDEX, entities: [{ ...GEO_INDEX.entities[0], kind: 'empire' }] }]])(
    'refuses %j',
    (raw) => {
      expect(parseGeoIndex(raw, PIN)).toMatchObject({ ok: false, error: { code: 'geo_unavailable' } })
    },
  )
})

describe('parseGeoState', () => {
  it('accepts a Polygon and a MultiPolygon Feature', () => {
    expect(parseGeoState(feature(), PIN, 'rome', 1000)).toEqual({ ok: true, value: { entityId: 'rome', fromYear: 1000, geometry: { type: 'Polygon', coordinates: [ring] } } })
    const multi = { type: 'MultiPolygon', coordinates: [[ring], [ring]] }
    expect(parseGeoState(feature({ geometry: multi }), PIN, 'rome', 1000)).toMatchObject({ ok: true })
  })

  it.each([
    ['null', null],
    ['an HTML string', '<html>'],
    ['not a Feature', feature({ type: 'FeatureCollection' })],
    ['another entity', feature({ id: 'cliopatria@0.2.0:gaul' })],
    ['another version', feature({ id: 'cliopatria@0.3.0:rome' })],
    ['another period', feature({ properties: { fromYear: 1001 } })],
    ['no properties', feature({ properties: null })],
    ['a Point', feature({ geometry: { type: 'Point', coordinates: [0, 0] } })],
    ['an open ring', feature({ geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] } })],
    ['a ring that is too short', feature({ geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] } })],
    ['a NaN coordinate', feature({ geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, Number.NaN], [0, 0]]] } })],
    ['no polygon', feature({ geometry: { type: 'MultiPolygon', coordinates: [] } })],
  ])('refuses %s', (_label, raw) => {
    expect(parseGeoState(raw, PIN, 'rome', 1000)).toMatchObject({ ok: false, error: { code: 'geo_unavailable' } })
  })
})
