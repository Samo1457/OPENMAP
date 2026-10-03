import { describe, expect, it } from 'vitest'
import { assignEntityIds, buildGeo, entityKind, prepareGeometry, readRows, signedArea, simplifyRing, slugify, type CliopatriaRow, type GeoGeometry, type Ring } from './geo.ts'

const DATASET = { id: 'cliopatria', version: '0.2.0', source: 'Cliopatria', licence: 'CC-BY-4.0', attribution: 'a', creditRequired: true }

const square = (x: number, y: number, size = 1, ccw = true): Ring => {
  const ring: Ring = [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]
  return ccw ? ring : ring.reverse()
}

function row(name: string, fromYear: number, toYear: number, extra: Partial<CliopatriaRow> = {}): CliopatriaRow {
  return {
    name,
    fromYear,
    toYear,
    area: 10,
    type: 'POLITY',
    wikipedia: '',
    wikidata: '',
    seshatId: '',
    components: [],
    memberOf: [],
    geometry: { type: 'Polygon', coordinates: [square(0, 0)] },
    ...extra,
  }
}

describe('entity ids', () => {
  it('slugs to ASCII, strips parentheses and diacritics', () => {
    expect(slugify('Âu Lạc')).toBe('au-lac')
    expect(slugify('(Kingdom of the Franks)')).toBe('kingdom-of-the-franks')
    expect(slugify('Đại Việt')).toBe('dai-viet')
    expect(slugify('Göktürk Khaganate')).toBe('gokturk-khaganate')
  })

  it('marks aggregates with .group and relations as kind relation', () => {
    expect(entityKind('(Holy Roman Empire)', 'POLITY')).toBe('group')
    expect(entityKind('Holy Roman Empire', 'POLITY')).toBe('polity')
    expect(entityKind('(Alliance between A and B)', 'RELATION')).toBe('relation')
    const ids = assignEntityIds(new Map([['(Netherlands)', 'group'], ['Netherlands', 'polity']]))
    expect(ids.get('(Netherlands)')).toBe('netherlands.group')
    expect(ids.get('Netherlands')).toBe('netherlands')
  })

  it('hashes every colliding Name, stably', () => {
    const names = new Map([['Han', 'polity'], ['Hán', 'polity'], ['Qin', 'polity']] as const)
    const a = assignEntityIds(names)
    const b = assignEntityIds(new Map([...names].reverse()))
    expect(a.get('Han')).toMatch(/^han-[0-9a-f]{6}$/)
    expect(a.get('Hán')).toMatch(/^han-[0-9a-f]{6}$/)
    expect(a.get('Han')).not.toBe(a.get('Hán'))
    expect(a.get('Qin')).toBe('qin')
    expect(b.get('Han')).toBe(a.get('Han'))
  })

  it('fails on a residual collision and on an empty slug', () => {
    const distinct = assignEntityIds(new Map([['Qin', 'polity'], ['Qin X', 'polity']]))
    expect([...distinct.values()]).toEqual(['qin', 'qin-x'])
    expect(() => assignEntityIds(new Map([['???', 'polity']]))).toThrow(/empty id/)
    // A name that already looks like a hashed id of a colliding pair.
    const first = assignEntityIds(new Map([['Han', 'polity'], ['Hán', 'polity']])).get('Han') as string
    expect(() => assignEntityIds(new Map([['Han', 'polity'], ['Hán', 'polity'], [first, 'polity']]))).toThrow(/unresolved entity id collision/)
  })
})

describe('geometry', () => {
  it('simplifies at 0.005 degrees, then rounds to 4 decimals', () => {
    const ring: Ring = [[0, 0], [0.5, 0.001], [1, 0], [1, 1], [0, 1], [0, 0]]
    const geometry = prepareGeometry({ type: 'Polygon', coordinates: [ring] })
    expect(geometry?.coordinates).toEqual([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]])
    const precise = prepareGeometry({ type: 'Polygon', coordinates: [square(0.123456789, 0.987654321)] })
    expect(((precise as GeoGeometry).coordinates as number[][][])[0][0]).toEqual([0.1235, 0.9877])
  })

  it('keeps detail above the tolerance and never clips', () => {
    const ring: Ring = [[0, 0], [0.5, 0.02], [1, 0], [1, 1], [0, 1], [0, 0]]
    expect(((prepareGeometry({ type: 'Polygon', coordinates: [ring] }) as GeoGeometry).coordinates as Ring[])[0]).toHaveLength(6)
    expect(simplifyRing(square(170, 80, 20), 0.005)).toHaveLength(5)
  })

  it('applies RFC 7946 winding: exterior counter-clockwise, holes clockwise', () => {
    const geometry = prepareGeometry({ type: 'Polygon', coordinates: [square(0, 0, 10, false), square(2, 2, 2, true)] })
    const [outer, hole] = (geometry as GeoGeometry).coordinates as Ring[]
    expect(signedArea(outer)).toBeGreaterThan(0)
    expect(signedArea(hole)).toBeLessThan(0)
  })

  it('drops rings below 4 points, and a polygon whose exterior goes, but keeps the rest', () => {
    const sliver: Ring = [[0, 0], [1, 1], [0, 0]]
    const geometry = prepareGeometry({ type: 'MultiPolygon', coordinates: [[sliver], [square(5, 5), [[6, 6], [6.0001, 6], [6, 6]]]] })
    expect(geometry).toEqual({ type: 'Polygon', coordinates: [square(5, 5)] })
    expect(prepareGeometry({ type: 'Polygon', coordinates: [sliver] })).toBeUndefined()
  })

  it('closes an open source ring, and re-closes a ring whose closing point rounding removed', () => {
    const open: Ring = [[0, 0], [1, 0], [1, 1], [0, 1]]
    expect((prepareGeometry({ type: 'Polygon', coordinates: [open] }) as GeoGeometry).coordinates).toEqual([square(0, 0)])
    // The last real vertex rounds onto the closing point: dedupe must not leave the ring open.
    const nearClosing: Ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0.00001, 0.00001], [0, 0]]
    const [ring] = (prepareGeometry({ type: 'Polygon', coordinates: [nearClosing] }) as GeoGeometry).coordinates as Ring[]
    expect(ring[0]).toEqual(ring[ring.length - 1])
    expect(ring.length).toBeGreaterThanOrEqual(4)
  })

  it('counts dropped rings and polygons', () => {
    const stats = { droppedRings: 0, droppedPolygons: 0 }
    const sliver: Ring = [[0, 0], [1, 1], [0, 0]]
    prepareGeometry({ type: 'MultiPolygon', coordinates: [[sliver, sliver], [square(5, 5), sliver]] }, stats)
    expect(stats).toEqual({ droppedRings: 3, droppedPolygons: 1 })
  })

  it('is deterministic', () => {
    const input = { type: 'Polygon', coordinates: [square(0.00004, 1.23456, 3)] }
    expect(JSON.stringify(prepareGeometry(input))).toBe(JSON.stringify(prepareGeometry(input)))
  })
})

describe('readRows', () => {
  const feature = (properties: Record<string, unknown>, geometry: unknown = { type: 'Polygon', coordinates: [square(0, 0)] }) => ({ properties, geometry })
  const props = { Name: 'A', FromYear: -10, ToYear: 5, Area: 1, Type: 'POLITY', Components: 'B;C', MemberOf: '(X);(Y)' }

  it('reads rows and splits the lists on semicolons', () => {
    const [r] = readRows({ features: [feature(props)] })
    expect(r).toMatchObject({ name: 'A', fromYear: -10, toYear: 5, components: ['B', 'C'], memberOf: ['(X)', '(Y)'], wikidata: '' })
  })

  it('fails on a malformed row, naming it', () => {
    expect(() => readRows({})).toThrow(/FeatureCollection/)
    expect(() => readRows({ features: [feature({ ...props, FromYear: 'x' })] })).toThrow(/row 0 \("A"\) is malformed/)
    expect(() => readRows({ features: [feature(props, null)] })).toThrow(/no geometry/)
    expect(() => readRows({ features: [null] })).toThrow(/row 0 is not an object/)
    expect(() => readRows({ features: [feature(props), 'x'] })).toThrow(/row 1 is not an object/)
    expect(() => readRows({ features: [feature({ ...props, Area: 'big' })] })).toThrow(/row 0 \("A"\) has a non-numeric Area/)
    expect(() => readRows({ features: [feature({ ...props, Area: null })] })).toThrow(/non-numeric Area/)
    const bad = (c: unknown) => readRows({ features: [feature(props, { type: 'Polygon', coordinates: c })] })
    expect(() => bad([[[0, 0], [1, 'x'], [0, 0]]])).toThrow(/row 0 \("A"\) has a non-finite or malformed coordinate/)
    expect(() => bad([[[0, 0], [1, null], [0, 0]]])).toThrow(/malformed coordinate/)
    expect(() => bad([[[0, 0], [Infinity, 1], [0, 0]]])).toThrow(/malformed coordinate/)
    expect(() => bad([[[0], [1, 1], [0, 0]]])).toThrow(/malformed coordinate/)
  })
})

describe('buildGeo', () => {
  it('builds entities, kinds, references and sorted states', () => {
    const rows = [
      row('B', 10, 19, { memberOf: ['(Union)'], wikidata: 'Q2' }),
      row('B', 0, 9, { memberOf: ['(Union)', '(Other)'], wikidata: '' , seshatId: 'b_1'}),
      row('(Union)', 0, 50),
      row('(Other)', 0, 50),
      row('(Alliance of A and B)', 0, 5, { type: 'RELATION', components: ['A', 'B'], memberOf: ['(Union)'] }),
      row('A', -20, -1),
    ]
    const { index, states } = buildGeo(rows, DATASET)
    expect(index.dataset.counts).toEqual({ entities: 5, polities: 2, groups: 2, relations: 1, states: 6 })
    expect(index.entities.map((e) => e.id)).toEqual(['a', 'alliance-of-a-and-b', 'b', 'other.group', 'union.group'])
    const b = index.entities.find((e) => e.id === 'b')
    expect(b).toMatchObject({ name: 'B', kind: 'polity', wikidata: 'Q2', seshatId: 'b_1', memberOf: ['other.group', 'union.group'], states: [[0, 9], [10, 19]] })
    expect(b).not.toHaveProperty('components')
    expect(index.entities.find((e) => e.kind === 'relation')).toMatchObject({ components: ['a', 'b'], memberOf: [] })
    expect(states.map((s) => s.path)).toContain('a/-20.json')
    const feature = JSON.parse(states.find((s) => s.path === 'b/10.json')?.data as string)
    expect(feature).toMatchObject({ type: 'Feature', id: 'cliopatria@0.2.0:b', properties: { fromYear: 10, toYear: 19, area: 10 }, geometry: { type: 'Polygon' } })
    expect(states[0].data).not.toContain('\n')
  })

  it('is independent of row order', () => {
    const rows = [row('A', 0, 1), row('A', 2, 3), row('B', 0, 1)]
    expect(JSON.stringify(buildGeo(rows, DATASET))).toBe(JSON.stringify(buildGeo([...rows].reverse(), DATASET)))
  })

  it('fails naming the entity on overlapping states', () => {
    expect(() => buildGeo([row('Aaa', 0, 10), row('Aaa', 10, 20)], DATASET)).toThrow(/entity "Aaa".*overlap/)
  })

  it('fails on inverted years, unknown references, mixed types and empty states', () => {
    expect(() => buildGeo([row('A', 5, 1)], DATASET)).toThrow(/ends before it starts/)
    expect(() => buildGeo([row('A', 0, 1, { memberOf: ['(Nope)'] })], DATASET)).toThrow(/unknown entity "\(Nope\)"/)
    expect(() => buildGeo([row('A', 0, 1), row('A', 2, 3, { type: 'RELATION' })], DATASET)).toThrow(/mixes row types/)
    const empty = row('Tiny', 7, 9, { geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [0, 0]]] } })
    expect(() => buildGeo([empty], DATASET)).toThrow(/entity "Tiny": state 7\.\.9 has no polygon/)
  })
})

describe('writer and reader agree (Story 1.11)', () => {
  it('the index and states the pipeline builds pass the app validators and the entity selection', async () => {
    const { parseGeoIndex, parseGeoState, selectGeoEntities } = await import('../src/core/geo/index.ts')
    const rows = [
      row('Rome', 100, 200),
      row('Gaul', 100, 200, { memberOf: ['(Empire)'] }),
      row('(Empire)', 150, 200),
      row('Alliance', 100, 200, { type: 'RELATION', components: ['Rome', 'Gaul'] }),
      row('Âu Lạc', 300, 310),
    ]
    const build = buildGeo(rows, DATASET)
    const pin = { dataset: 'cliopatria', version: '0.2.0' }
    const index = parseGeoIndex(JSON.parse(JSON.stringify(build.index)), pin)
    if (!index.ok) throw new Error(`index refused: ${JSON.stringify(index.error)}`)
    // Every state file the index lists exists at its path and is accepted by the reader.
    for (const entity of index.value.entities) {
      for (const [from] of entity.states) {
        const file = build.states.find((state) => state.path === `${entity.id}/${from}.json`)
        expect(file, `${entity.id}/${from}`).toBeDefined()
        expect(parseGeoState(JSON.parse(file!.data), pin, entity.id, from)).toMatchObject({ ok: true })
      }
    }
    expect(build.states).toHaveLength(index.value.entities.reduce((n, entity) => n + entity.states.length, 0))
    // Countries view: Gaul is hidden once its group exists; the relation never shows.
    const at = (year: number) => selectGeoEntities(index.value, year)?.entities.map(({ entity }) => entity.id)
    expect(at(120)).toEqual(['gaul', 'rome'])
    expect(at(170)).toEqual(['empire.group', 'rome'])
    expect(at(305)).toEqual(['au-lac'])
    expect(selectGeoEntities(index.value, 250)?.dataDate).toEqual({ year: 200, exact: false })
  })
})
