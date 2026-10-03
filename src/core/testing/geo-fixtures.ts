// A small deterministic geo dataset for core and UI tests (never imported by app code): the shapes
// of Story 1.9's index and states, with a group, its members, a relation and a gap in the years.

import { type GeoGeometry, type GeoIndex, stateKey } from '../geo/geo'

const square = (x: number, y: number, size = 10): GeoGeometry => ({
  type: 'Polygon',
  coordinates: [
    [
      [x, y],
      [x + size, y],
      [x + size, y + size],
      [x, y + size],
      [x, y],
    ],
  ],
})

/**
 * Years with data: 1000-1100 (rome, gaul), 1101-1200 (rome, empire.group with member gaul), 1400-1500
 * (rome, empire.group, gaul, a relation) and 1900 only (solo). Gaps: 1201-1399, 1501-1899.
 */
export const GEO_INDEX: GeoIndex = {
  schemaVersion: 1,
  dataset: { id: 'cliopatria', version: '0.2.0' },
  entities: [
    { id: 'rome', name: 'Rome', kind: 'polity', memberOf: [], states: [[1000, 1100], [1101, 1200], [1400, 1500]] },
    { id: 'gaul', name: 'Gaul', kind: 'polity', memberOf: ['empire.group'], states: [[1000, 1100], [1101, 1200], [1400, 1500]] },
    { id: 'empire.group', name: '(Empire)', kind: 'group', memberOf: [], states: [[1101, 1200], [1400, 1500]] },
    { id: 'alliance', name: 'Alliance', kind: 'relation', memberOf: [], states: [[1400, 1500]] },
    { id: 'solo', name: 'Solo', kind: 'polity', memberOf: [], states: [[1900, 1900]] },
  ],
}

/** Every state of `GEO_INDEX`, keyed like `Geodata.states`. */
export const GEO_STATES: Readonly<Record<string, GeoGeometry>> = Object.fromEntries(
  GEO_INDEX.entities.flatMap((entity, row) => entity.states.map(([from]) => [stateKey(entity.id, from), square(row * 12 - 20, 0)] as const)),
)
