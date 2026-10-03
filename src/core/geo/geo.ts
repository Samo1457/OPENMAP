// Historical GeoEntity data as the pipeline writes it (Story 1.9, AD-12, AD-18): the dataset index
// and one state file per entity and period. Pure types and validators; fetching and caching are
// `src/library`'s job, and the evaluator reads the result through `ctx.geodata` (AD-1).

import { z } from 'zod'
import { type Result, err, ok } from '../result'

export const ENTITY_KINDS = ['polity', 'group', 'relation'] as const
export type EntityKind = (typeof ENTITY_KINDS)[number]

/** Years `[from, to]` (astronomical, inclusive) during which an entity has one state file. */
const statePeriodSchema = z.tuple([z.int(), z.int()])

export const geoEntitySchema = z.object({
  /** The pipeline's slug alphabet: ids appear in cache keys and URLs, so no `/`. */
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]*$/),
  name: z.string(),
  kind: z.enum(ENTITY_KINDS),
  /** Ids of the groups this polity belongs to (Story 1.9). */
  memberOf: z.array(z.string()),
  states: z.array(statePeriodSchema),
})
export type GeoEntity = Readonly<z.infer<typeof geoEntitySchema>>

/** `index.json` of a dataset version; the keys this client does not use are dropped. */
export const geoIndexSchema = z.object({
  schemaVersion: z.literal(1),
  dataset: z.object({ id: z.string().min(1), version: z.string().min(1) }),
  entities: z.array(geoEntitySchema),
})
export type GeoIndex = Readonly<z.infer<typeof geoIndexSchema>>

type Position = readonly [number, number]
export type GeoGeometry =
  | { readonly type: 'Polygon'; readonly coordinates: readonly (readonly Position[])[] }
  | { readonly type: 'MultiPolygon'; readonly coordinates: readonly (readonly (readonly Position[])[])[] }

/** What a state file holds once validated: the whole polygons of one entity for one period. */
export interface GeoState {
  readonly entityId: string
  readonly fromYear: number
  readonly geometry: GeoGeometry
}

/** The pinned dataset version of a Project (AD-12): `cliopatria@0.2.0`. */
export const datasetKey = (pin: { readonly dataset: string; readonly version: string }): string => `${pin.dataset}@${pin.version}`

/** Canonical key of a GeoEntity (AD-22): `cliopatria@0.2.0:<entityId>`. */
export const geoEntityKey = (pin: { readonly dataset: string; readonly version: string }, entityId: string): string => `${datasetKey(pin)}:${entityId}`

/** Key of one state in `Geodata.states`: `<entityId>/<fromYear>`, the path below the geo root. */
export const stateKey = (entityId: string, fromYear: number): string => `${entityId}/${fromYear}`

/** Geodata given to the evaluator (`ctx.geodata`): the loaded index and states of the pinned version. */
export interface Geodata {
  readonly index?: GeoIndex
  /** Whole polygons keyed by `stateKey`; an entity whose state is missing is not drawn yet. */
  readonly states?: Readonly<Record<string, GeoGeometry>>
}

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number' && Number.isFinite(value[0]) && Number.isFinite(value[1])

const isRing = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return false
  const first = value[0] as Position
  const last = value[value.length - 1] as Position
  return first[0] === last[0] && first[1] === last[1]
}
const isPolygon = (value: unknown): boolean => Array.isArray(value) && value.length >= 1 && value.every(isRing)

function isGeometry(value: unknown): value is GeoGeometry {
  if (typeof value !== 'object' || value === null) return false
  const { type, coordinates } = value as { type?: unknown; coordinates?: unknown }
  if (type === 'Polygon') return isPolygon(coordinates)
  return type === 'MultiPolygon' && Array.isArray(coordinates) && coordinates.length >= 1 && coordinates.every(isPolygon)
}

/** Validates an index response; the dataset must be the pinned one. */
export function parseGeoIndex(value: unknown, pin: { readonly dataset: string; readonly version: string }): Result<GeoIndex> {
  const parsed = geoIndexSchema.safeParse(value)
  if (!parsed.success) return err('geo_unavailable', { reason: 'invalid_index' })
  const { dataset } = parsed.data
  if (dataset.id !== pin.dataset || dataset.version !== pin.version) return err('geo_unavailable', { reason: 'other_version' })
  return ok(parsed.data)
}

/**
 * Validates a state file (a GeoJSON Feature, Story 1.9) against what was asked for: its id must be
 * the canonical key of the entity, its `fromYear` the requested period, its geometry whole polygons.
 */
export function parseGeoState(
  value: unknown,
  pin: { readonly dataset: string; readonly version: string },
  entityId: string,
  fromYear: number,
): Result<GeoState> {
  if (typeof value !== 'object' || value === null) return err('geo_unavailable', { reason: 'invalid_state' })
  const feature = value as { type?: unknown; id?: unknown; properties?: { fromYear?: unknown } | null; geometry?: unknown }
  if (feature.type !== 'Feature' || feature.id !== geoEntityKey(pin, entityId) || feature.properties?.fromYear !== fromYear || !isGeometry(feature.geometry)) {
    return err('geo_unavailable', { reason: 'invalid_state' })
  }
  return ok({ entityId, fromYear, geometry: feature.geometry })
}
