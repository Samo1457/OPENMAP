// Cliopatria rows to GeoEntities and states (Story 1.9, AD-12, AD-18).
// Pure and deterministic: no I/O, no clock, no randomness. Geometry is kept whole
// (never clipped), simplified at a fixed level and rounded.

import { createHash } from 'node:crypto'

/** Fixed simplification level of dataset version cliopatria@0.2.0 (changing it means /library/v2/). */
export const SIMPLIFICATION = { algorithm: 'douglas-peucker', tolerance: 0.005, unit: 'degree', decimals: 4 } as const

export type Position = [number, number]
export type Ring = Position[]
export type Polygon = Ring[]
export type GeoGeometry = { type: 'Polygon'; coordinates: Polygon } | { type: 'MultiPolygon'; coordinates: Polygon[] }

export type EntityKind = 'polity' | 'group' | 'relation'

export interface CliopatriaRow {
  name: string
  fromYear: number
  toYear: number
  area: number
  type: string
  wikipedia: string
  wikidata: string
  seshatId: string
  components: string[]
  memberOf: string[]
  geometry: { type: string; coordinates: unknown }
}

export interface EntityIndexEntry {
  id: string
  name: string
  kind: EntityKind
  components?: string[]
  wikidata: string
  wikipedia: string
  seshatId: string
  memberOf: string[]
  states: [number, number][]
}

export interface StateFile {
  /** Path below the geo root, e.g. `han-1a2b3c/-404.json`. */
  path: string
  data: string
}

/** Rings and polygons removed by simplification and rounding (under 4 points, or no area left). */
export interface DropStats {
  droppedRings: number
  droppedPolygons: number
}

export interface GeoBuild {
  dropped: DropStats
  index: {
    schemaVersion: 1
    dataset: {
      id: string
      version: string
      source: string
      licence: string
      attribution: string
      creditRequired: boolean
      simplification: typeof SIMPLIFICATION
      counts: { entities: number; polities: number; groups: number; relations: number; states: number }
    }
    entities: EntityIndexEntry[]
  }
  states: StateFile[]
}

export interface DatasetMeta {
  id: string
  version: string
  source: string
  licence: string
  attribution: string
  creditRequired: boolean
}

// ---------------------------------------------------------------- ids

const TRANSLITERATE: Record<string, string> = { đ: 'd', ð: 'd', ł: 'l', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', þ: 'th', ı: 'i' }

/** ASCII slug of a Cliopatria Name, parentheses stripped (no `.group` suffix here). */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[đðłøæœßþı]/g, (c) => TRANSLITERATE[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const isParenthesised = (name: string) => /^\(.*\)$/.test(name)

export const entityKind = (name: string, type: string): EntityKind => (type === 'RELATION' ? 'relation' : isParenthesised(name) ? 'group' : 'polity')

/** First 6 hex of the SHA-256 of the exact Name: disambiguates colliding slugs. */
const nameHash = (name: string) => createHash('sha256').update(name, 'utf8').digest('hex').slice(0, 6)

/**
 * Maps every Name to its entityId. Aggregates (a polity named in parentheses) get the suffix
 * `.group`; any residual collision gets `-<hash>` on every colliding Name; one that survives fails.
 */
export function assignEntityIds(names: Map<string, EntityKind>): Map<string, string> {
  const base = new Map<string, string>()
  const bySlug = new Map<string, string[]>()
  for (const [name, kind] of names) {
    const slug = slugify(name)
    if (slug === '') throw new Error(`entity name "${name}" has an empty id`)
    const id = kind === 'group' ? `${slug}.group` : slug
    base.set(name, id)
    bySlug.set(id, [...(bySlug.get(id) ?? []), name])
  }
  const ids = new Map<string, string>()
  for (const [name, id] of base) {
    const colliding = (bySlug.get(id) ?? []).length > 1
    ids.set(name, colliding ? `${id}-${nameHash(name)}` : id)
  }
  const seen = new Map<string, string>()
  for (const [name, id] of ids) {
    const other = seen.get(id)
    if (other !== undefined) throw new Error(`unresolved entity id collision "${id}": "${other}" and "${name}"`)
    seen.set(id, name)
  }
  return ids
}

// ---------------------------------------------------------------- geometry

const distanceToSegment = (p: Position, a: Position, b: Position): number => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy
  let t = lengthSquared === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Douglas-Peucker on an open polyline; returns the indices kept (iterative, no recursion limit). */
function simplifyOpen(points: Position[], first: number, last: number, tolerance: number, keep: Uint8Array): void {
  keep[first] = 1
  keep[last] = 1
  const stack: [number, number][] = [[first, last]]
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number]
    let worst = -1
    let worstDistance = tolerance
    for (let i = from + 1; i < to; i++) {
      const d = distanceToSegment(points[i], points[from], points[to])
      if (d > worstDistance) {
        worst = i
        worstDistance = d
      }
    }
    if (worst >= 0) {
      keep[worst] = 1
      stack.push([from, worst], [worst, to])
    }
  }
}

/** Simplifies a closed ring (first point = last point), splitting it at the vertex farthest from its start. */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  const n = ring.length - 1
  if (n < 3) return ring
  let split = 1
  let far = -1
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (d > far) {
      far = d
      split = i
    }
  }
  const keep = new Uint8Array(ring.length)
  simplifyOpen(ring, 0, split, tolerance, keep)
  simplifyOpen(ring, split, n, tolerance, keep)
  keep[n] = 1
  return ring.filter((_, i) => keep[i] === 1)
}

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return rounded === 0 ? 0 : rounded // no negative zero
}

/** Signed area (shoelace): positive for counter-clockwise rings. */
export function signedArea(ring: Ring): number {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  return sum / 2
}

/** Simplifies, rounds and orients one ring; undefined when fewer than 4 points (or no area) remain. */
function prepareRing(source: Ring, outer: boolean): Ring | undefined {
  const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1]
  // An open source ring is closed before simplification (GeoJSON rings are closed).
  const ring = source.length > 0 && !same(source[0], source[source.length - 1]) ? [...source, source[0]] : source
  const rounded: Ring = []
  for (const [lon, lat] of simplifyRing(ring, SIMPLIFICATION.tolerance)) {
    const point: Position = [round(lon, SIMPLIFICATION.decimals), round(lat, SIMPLIFICATION.decimals)]
    const previous = rounded[rounded.length - 1]
    if (!previous || !same(previous, point)) rounded.push(point)
  }
  // Dedupe may have removed the closing point: close again.
  if (rounded.length > 0 && !same(rounded[0], rounded[rounded.length - 1])) rounded.push([rounded[0][0], rounded[0][1]])
  if (rounded.length < 4) return undefined
  const area = signedArea(rounded)
  if (area === 0) return undefined
  // RFC 7946: exterior rings counter-clockwise, holes clockwise.
  return (area > 0) === outer ? rounded : rounded.reverse()
}

function preparePolygon(polygon: Polygon, stats?: DropStats): Polygon | undefined {
  const [shell, ...holes] = polygon
  const outer = shell && prepareRing(shell, true)
  if (!outer) {
    if (stats) {
      stats.droppedPolygons++
      stats.droppedRings += polygon.length
    }
    return undefined
  }
  const keptHoles = holes.map((hole) => prepareRing(hole, false)).filter((r): r is Ring => r !== undefined)
  if (stats) stats.droppedRings += holes.length - keptHoles.length
  return [outer, ...keptHoles]
}

/** Whole geometry, simplified and rounded; undefined when no polygon survives. */
export function prepareGeometry(geometry: { type: string; coordinates: unknown }, stats?: DropStats): GeoGeometry | undefined {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates as Polygon] : geometry.type === 'MultiPolygon' ? (geometry.coordinates as Polygon[]) : undefined
  if (!polygons) throw new Error(`unsupported geometry type ${geometry.type}`)
  const kept = polygons.map((p) => preparePolygon(p, stats)).filter((p): p is Polygon => p !== undefined)
  if (kept.length === 0) return undefined
  return kept.length === 1 ? { type: 'Polygon', coordinates: kept[0] } : { type: 'MultiPolygon', coordinates: kept }
}

// ---------------------------------------------------------------- rows

const splitList = (value: string): string[] => value.split(';').map((s) => s.trim()).filter((s) => s !== '')

/** Nested arrays whose leaves are positions of finite numbers. */
function validCoordinates(value: unknown): boolean {
  if (!Array.isArray(value)) return false
  if (value.length > 0 && typeof value[0] === 'number') {
    return value.length >= 2 && value.every((n) => typeof n === 'number' && Number.isFinite(n))
  }
  return value.every((v) => validCoordinates(v))
}

/** Reads a parsed Cliopatria FeatureCollection into typed rows; a malformed row fails naming its position. */
export function readRows(collection: unknown): CliopatriaRow[] {
  const features = (collection as { features?: unknown[] } | undefined)?.features
  if (!Array.isArray(features)) throw new Error('Cliopatria file is not a GeoJSON FeatureCollection')
  return features.map((feature, i) => {
    if (feature === null || typeof feature !== 'object') throw new Error(`Cliopatria row ${i} is not an object`)
    const f = feature as { properties?: Record<string, unknown>; geometry?: { type: string; coordinates: unknown } | null }
    const p = f.properties
    const where = `Cliopatria row ${i}${typeof p?.Name === 'string' ? ` ("${p.Name}")` : ''}`
    if (!p || typeof p.Name !== 'string' || p.Name === '' || !Number.isInteger(p.FromYear) || !Number.isInteger(p.ToYear) || typeof p.Type !== 'string') {
      throw new Error(`${where} is malformed`)
    }
    if (typeof p.Area !== 'number' || !Number.isFinite(p.Area)) throw new Error(`${where} has a non-numeric Area`)
    if (!f.geometry) throw new Error(`${where} has no geometry`)
    if (!validCoordinates(f.geometry.coordinates)) throw new Error(`${where} has a non-finite or malformed coordinate`)
    const text = (key: string) => (typeof p[key] === 'string' ? (p[key] as string) : '')
    return {
      name: p.Name,
      fromYear: p.FromYear as number,
      toYear: p.ToYear as number,
      area: p.Area,
      type: p.Type,
      wikipedia: text('Wikipedia'),
      wikidata: text('Wikidata'),
      seshatId: text('SeshatID'),
      components: splitList(text('Components')),
      memberOf: splitList(text('MemberOf')),
      geometry: f.geometry,
    }
  })
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** First non-empty value in chronological order (metadata may drift between the rows of one entity). */
const firstNonEmpty = (rows: CliopatriaRow[], pick: (r: CliopatriaRow) => string) => rows.map(pick).find((v) => v !== '') ?? ''

/**
 * Groups rows by Name into entities and writes one compact GeoJSON Feature per state.
 * Fails (naming the entity) on overlapping states, unknown references or a state without polygon.
 */
export function buildGeo(rows: CliopatriaRow[], dataset: DatasetMeta): GeoBuild {
  const byName = new Map<string, CliopatriaRow[]>()
  for (const row of rows) byName.set(row.name, [...(byName.get(row.name) ?? []), row])

  const kinds = new Map<string, EntityKind>()
  for (const [name, list] of byName) {
    const types = new Set(list.map((r) => r.type))
    if (types.size > 1) throw new Error(`entity "${name}" mixes row types ${[...types].join(', ')}`)
    kinds.set(name, entityKind(name, list[0].type))
  }
  const ids = assignEntityIds(kinds)
  const idOf = (name: string, from: string): string => {
    const id = ids.get(name)
    if (id === undefined) throw new Error(`entity "${from}" refers to unknown entity "${name}"`)
    return id
  }

  const entities: EntityIndexEntry[] = []
  const states: StateFile[] = []
  const dropped: DropStats = { droppedRings: 0, droppedPolygons: 0 }
  for (const [name, unsorted] of byName) {
    const list = [...unsorted].sort((a, b) => a.fromYear - b.fromYear || a.toYear - b.toYear)
    const id = ids.get(name) as string
    const kind = kinds.get(name) as EntityKind
    for (let i = 0; i < list.length; i++) {
      if (list[i].toYear < list[i].fromYear) throw new Error(`entity "${name}": state ${list[i].fromYear} ends before it starts (${list[i].toYear})`)
      if (i > 0 && list[i].fromYear <= list[i - 1].toYear) {
        throw new Error(`entity "${name}": states ${list[i - 1].fromYear}..${list[i - 1].toYear} and ${list[i].fromYear}..${list[i].toYear} overlap in time`)
      }
    }
    const union = (pick: (r: CliopatriaRow) => string[]) => [...new Set(list.flatMap((r) => pick(r).map((n) => idOf(n, name))))].sort(compare)
    const entry: EntityIndexEntry = {
      id,
      name,
      kind,
      ...(kind === 'relation' ? { components: union((r) => r.components) } : {}),
      wikidata: firstNonEmpty(list, (r) => r.wikidata),
      wikipedia: firstNonEmpty(list, (r) => r.wikipedia),
      seshatId: firstNonEmpty(list, (r) => r.seshatId),
      memberOf: kind === 'relation' ? [] : union((r) => r.memberOf),
      states: list.map((r) => [r.fromYear, r.toYear]),
    }
    entities.push(entry)
    for (const row of list) {
      const geometry = prepareGeometry(row.geometry, dropped)
      if (!geometry) throw new Error(`entity "${name}": state ${row.fromYear}..${row.toYear} has no polygon left after simplification`)
      const feature = {
        type: 'Feature',
        id: `${dataset.id}@${dataset.version}:${id}`,
        properties: { fromYear: row.fromYear, toYear: row.toYear, area: row.area },
        geometry,
      }
      states.push({ path: `${id}/${row.fromYear}.json`, data: JSON.stringify(feature) })
    }
  }
  entities.sort((a, b) => compare(a.id, b.id))
  states.sort((a, b) => compare(a.path, b.path))

  const count = (kind: EntityKind) => entities.filter((e) => e.kind === kind).length
  return {
    dropped,
    index: {
      schemaVersion: 1,
      dataset: {
        ...dataset,
        simplification: SIMPLIFICATION,
        counts: { entities: entities.length, polities: count('polity'), groups: count('group'), relations: count('relation'), states: states.length },
      },
      entities,
    },
    states,
  }
}
