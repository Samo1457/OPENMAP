// Which GeoEntities the Map shows at a Reference Date (FR-6, AD-12, Story 1.11 decision A,
// « countries view »). Pure: the same index and year always select the same entities.

import { type GeoEntity, type GeoIndex } from './geo'

export interface DataDate {
  /** The year whose data is shown. */
  readonly year: number
  /** False when the Reference Date has no data and `year` is the nearest year that has some. */
  readonly exact: boolean
}

/** One entity to draw: its id and the `fromYear` of the state file valid at the data date. */
export interface SelectedEntity {
  readonly entity: GeoEntity
  readonly fromYear: number
}

export interface GeoSelection {
  readonly dataDate: DataDate
  /** In index order. */
  readonly entities: readonly SelectedEntity[]
}

/** Merged `[from, to]` year intervals covered by at least one polity or group, sorted. */
const coverageCache = new WeakMap<GeoIndex, readonly (readonly [number, number])[]>()

function coverage(index: GeoIndex): readonly (readonly [number, number])[] {
  const cached = coverageCache.get(index)
  if (cached) return cached
  const periods: [number, number][] = []
  for (const entity of index.entities) {
    if (entity.kind === 'relation') continue
    for (const [from, to] of entity.states) periods.push([from, to])
  }
  periods.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: [number, number][] = []
  for (const [from, to] of periods) {
    const last = merged[merged.length - 1]
    // Consecutive years (to + 1 = from) leave no gap.
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to)
    else merged.push([from, to])
  }
  coverageCache.set(index, merged)
  return merged
}

/**
 * The data date for a Reference Date year: the year itself when an entity has a state in it, else the
 * nearest year that has data across the whole dataset (never per entity, so an extinct entity is not
 * brought back). A tie takes the earlier year. `undefined` for a dataset with no data at all.
 */
export function dataDateFor(index: GeoIndex, year: number): DataDate | undefined {
  const intervals = coverage(index)
  if (intervals.length === 0) return undefined
  let nearest: number | undefined
  let distance = Number.POSITIVE_INFINITY
  for (const [from, to] of intervals) {
    if (year >= from && year <= to) return { year, exact: true }
    const edge = year < from ? from : to
    const gap = Math.abs(edge - year)
    if (gap < distance) {
      distance = gap
      nearest = edge
    }
  }
  return nearest === undefined ? undefined : { year: nearest, exact: false }
}

const periodAt = (entity: GeoEntity, year: number): number | undefined => {
  for (const [from, to] of entity.states) if (year >= from && year <= to) return from
  return undefined
}

/**
 * The entities shown at the data date of `year`: every `polity` and `group` with a state in it,
 * except those that are a member (`memberOf`) of a group also valid then; relations are never shown.
 */
export function selectGeoEntities(index: GeoIndex, year: number): GeoSelection | undefined {
  const dataDate = dataDateFor(index, year)
  if (!dataDate) return undefined
  const valid: SelectedEntity[] = []
  const validGroups = new Set<string>()
  for (const entity of index.entities) {
    if (entity.kind === 'relation') continue
    const fromYear = periodAt(entity, dataDate.year)
    if (fromYear === undefined) continue
    valid.push({ entity, fromYear })
    if (entity.kind === 'group') validGroups.add(entity.id)
  }
  // A group that belongs to a larger valid group is hidden too (1500: Bohemia inside the Holy Roman
  // Empire), which gives the 112 outlines of the owner's decision.
  const entities = valid.filter(({ entity }) => !entity.memberOf.some((group) => validGroups.has(group)))
  return { dataDate, entities }
}
