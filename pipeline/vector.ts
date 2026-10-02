// Natural Earth shapefiles to Mapbox Vector Tiles (Story 1.8): land, ocean,
// coastline, rivers, lakes and populated places, z0-6.

import type { Feature, FeatureCollection, Geometry } from 'geojson'
import GeoJSONVT from 'geojson-vt'
import { read as readShapefileBuffers } from 'shapefile'
import { fromGeojsonVt } from 'vt-pbf'
import type { InputTile } from './pmtiles-writer.ts'

export const VECTOR_MAX_ZOOM = 6
const EXTENT = 4096
const TOLERANCE = 3
/**
 * The ocean is one polygon with thousands of holes. At tolerance 3 the simplification makes holes
 * (Greenland's among them) self-intersect, and the renderers' triangulation then covers part of the
 * land with sea (a wedge over Greenland on the Relief Basemap). At 1 the rings stay simple enough.
 */
export const OCEAN_TOLERANCE = 1

/** Populated places shown per zoom: the highest `scalerank` kept at z0..z6 (lower is more important). */
export const MAX_PLACE_SCALE = [1, 2, 3, 4, 5, 7, 10] as const

export type VectorLayerId = 'land' | 'ocean' | 'coastline' | 'rivers' | 'lakes' | 'places'

/** Fields kept per layer, source field to output field. Everything else is dropped. */
const FIELD_MAPS: Record<VectorLayerId, Record<string, string>> = {
  land: {},
  ocean: {},
  coastline: {},
  rivers: { name: 'name', scalerank: 'scale' },
  lakes: { name: 'name', scalerank: 'scale' },
  places: { name: 'name', labelrank: 'rank', scalerank: 'scale', pop_max: 'pop' },
}

export const VECTOR_LAYER_IDS = Object.keys(FIELD_MAPS) as VectorLayerId[]

export async function readShapefile(shp: Uint8Array, dbf: Uint8Array): Promise<FeatureCollection> {
  const collection = await readShapefileBuffers(shp, dbf, { encoding: 'utf-8' })
  return collection as FeatureCollection
}

/** Keeps only the declared fields (renamed); features without geometry are dropped. */
export function shapeLayer(layer: VectorLayerId, collection: FeatureCollection): FeatureCollection {
  const map = FIELD_MAPS[layer]
  const features: Feature<Geometry>[] = []
  for (const feature of collection.features) {
    if (!feature.geometry) continue
    const properties: Record<string, string | number> = {}
    for (const [from, to] of Object.entries(map)) {
      const value = feature.properties?.[from]
      if (value === null || value === undefined || value === '') continue
      properties[to] = value as string | number
    }
    if (layer === 'places' && properties.name === undefined) continue
    if (layer === 'places' && properties.scale === undefined) properties.scale = 10
    features.push({ type: 'Feature', properties, geometry: feature.geometry })
  }
  return { type: 'FeatureCollection', features }
}

/**
 * Rings smaller than this (twice the area, in tile units squared: about one screen pixel at 512 px
 * per tile) are dropped from polygons. geojson-vt's simplification collapses tiny holes into slivers
 * with flipped winding; renderers classify rings by winding, so a flipped sliver starts a new
 * polygon and the holes after it are attached to the wrong outer ring. On the ocean layer that
 * painted sea over Greenland.
 */
export const MIN_RING_AREA = 128

type TileFeature = NonNullable<ReturnType<GeoJSONVT['getTile']>>['features'][number]

const ringArea2 = (ring: readonly number[][]): number => {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j][0] - ring[i][0]) * (ring[i][1] + ring[j][1])
  return sum
}

/** Removes the rings below MIN_RING_AREA from a polygon feature; other geometries are kept. */
export function dropTinyRings(feature: TileFeature): TileFeature | undefined {
  if (feature.type !== 3) return feature
  const rings = (feature.geometry as unknown as number[][][]).filter((ring) => Math.abs(ringArea2(ring)) >= MIN_RING_AREA)
  return rings.length > 0 ? ({ ...feature, geometry: rings } as unknown as TileFeature) : undefined
}

export interface VectorTilesResult {
  tiles: InputTile[]
  layers: { id: VectorLayerId; fields: Record<string, string> }[]
}

/** Slices every layer into tiles z0..VECTOR_MAX_ZOOM and encodes them. Tiles without content are omitted. */
export function buildVectorTiles(layers: Partial<Record<VectorLayerId, FeatureCollection>>): VectorTilesResult {
  const indexes = new Map<VectorLayerId, GeoJSONVT>()
  const coords = new Map<string, { z: number; x: number; y: number }>()
  for (const id of VECTOR_LAYER_IDS) {
    const collection = layers[id]
    if (!collection) continue
    const index = new GeoJSONVT(collection, {
      maxZoom: VECTOR_MAX_ZOOM,
      indexMaxZoom: VECTOR_MAX_ZOOM,
      indexMaxPoints: 0,
      tolerance: id === 'ocean' ? OCEAN_TOLERANCE : TOLERANCE,
      extent: EXTENT,
      buffer: 64,
    })
    indexes.set(id, index)
    for (const c of index.tileCoords) coords.set(`${c.z}/${c.x}/${c.y}`, c)
  }

  const tiles: InputTile[] = []
  for (const { z, x, y } of coords.values()) {
    const encoded: Record<string, { features: NonNullable<ReturnType<GeoJSONVT['getTile']>>['features'] }> = {}
    for (const [id, index] of indexes) {
      const tile = index.getTile(z, x, y)
      if (!tile) continue
      const features =
        id === 'places'
          ? tile.features.filter((f) => Number(f.tags?.scale ?? 10) <= MAX_PLACE_SCALE[z])
          : tile.features.flatMap((f) => dropTinyRings(f) ?? [])
      if (features.length > 0) encoded[id] = { features }
    }
    if (Object.keys(encoded).length === 0) continue
    tiles.push({ z, x, y, data: fromGeojsonVt(encoded, { version: 2, extent: EXTENT }) })
  }
  tiles.sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y)

  return {
    tiles,
    layers: VECTOR_LAYER_IDS.filter((id) => indexes.has(id)).map((id) => ({
      id,
      fields: Object.fromEntries(
        Object.values(FIELD_MAPS[id]).map((to) => [to, to === 'name' ? 'String' : 'Number']),
      ),
    })),
  }
}
