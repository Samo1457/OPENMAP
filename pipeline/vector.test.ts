import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import { describe, expect, it } from 'vitest'
import { openArchive, FIXTURES } from './test-helpers.ts'
import { writePmtiles } from './pmtiles-writer.ts'
import type { FeatureCollection } from 'geojson'
import { buildVectorTiles, dropTinyRings, MAX_PLACE_SCALE, MIN_RING_AREA, OCEAN_TOLERANCE, readShapefile, shapeLayer, VECTOR_MAX_ZOOM } from './vector.ts'

const read = (name: string) => readFileSync(join(FIXTURES, name))
const land = shapeLayer('land', await readShapefile(read('tiny-land.shp'), read('tiny-land.dbf')))
const places = shapeLayer('places', await readShapefile(read('tiny-places.shp'), read('tiny-places.dbf')))

const decode = (data: Uint8Array) => new VectorTile(new Pbf(data))

describe('shapefile reading', () => {
  it('reads polygons and keeps UTF-8 names', () => {
    expect(land.features).toHaveLength(2)
    expect(land.features[0].geometry.type).toBe('Polygon')
    expect(places.features.map((f) => f.properties?.name)).toEqual(['Paris', 'Rome', 'Chambéry'])
  })

  it('keeps only the declared fields, renamed to name, rank, scale and pop', () => {
    expect(places.features[0].properties).toEqual({ name: 'Paris', rank: 1, scale: 1, pop: 10858000 })
    expect(land.features[0].properties).toEqual({})
  })
})

describe('vector tiles', () => {
  const built = buildVectorTiles({ land, places })

  it('covers z0 to z6 and nothing beyond', () => {
    const zooms = new Set(built.tiles.map((t) => t.z))
    expect(Math.min(...zooms)).toBe(0)
    expect(Math.max(...zooms)).toBe(VECTOR_MAX_ZOOM)
    expect(built.tiles.find((t) => t.z === 0)).toBeDefined()
  })

  it('declares the layers it holds', () => {
    expect(built.layers.map((l) => l.id)).toEqual(['land', 'places'])
    expect(built.layers[1].fields).toEqual({ name: 'String', rank: 'Number', scale: 'Number', pop: 'Number' })
  })

  it('writes land and places into the world tile', () => {
    const tile = decode(built.tiles.find((t) => t.z === 0)!.data)
    expect(Object.keys(tile.layers).sort()).toEqual(['land', 'places'])
    expect(tile.layers.land.length).toBe(2)
  })

  it('thins populated places by zoom using their scale rank', () => {
    const names = (z: number) => {
      const names: string[] = []
      for (const t of built.tiles.filter((x) => x.z === z)) {
        const layer = decode(t.data).layers.places
        for (let i = 0; layer && i < layer.length; i++) names.push(String(layer.feature(i).properties.name))
      }
      return [...new Set(names)].sort()
    }
    expect(MAX_PLACE_SCALE).toHaveLength(VECTOR_MAX_ZOOM + 1)
    expect(names(0)).toEqual(['Paris', 'Rome'])
    expect(names(4)).toEqual(['Paris', 'Rome'])
    expect(names(6)).toEqual(['Chambéry', 'Paris', 'Rome'])
  })

  it('is deterministic', () => {
    const again = buildVectorTiles({ land, places })
    expect(again.tiles.length).toBe(built.tiles.length)
    expect(again.tiles.every((t, i) => Buffer.compare(t.data, built.tiles[i].data) === 0)).toBe(true)
  })

  it('survives a PMTiles round trip as valid, gzip-compressed MVT', async () => {
    const bytes = writePmtiles({ tiles: built.tiles, tileType: 'mvt', tileCompression: 'gzip', metadata: {}, bounds: [-180, -85, 180, 85], center: { lon: 0, lat: 0, zoom: 0 } })
    const got = await openArchive(bytes).getZxy(0, 0, 0)
    expect(got).toBeDefined()
    expect(decode(new Uint8Array(got!.data)).layers.land).toBeDefined()
  })
})

describe('tiny rings (ocean wedge over Greenland)', () => {
  /** One world-sized polygon (the ocean) with a Greenland-like hole and a speck of an island. */
  const ocean: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [[-180, -85], [-180, 85], [180, 85], [180, -85], [-180, -85]],
            [[-60, 60], [-20, 60], [-20, 80], [-60, 80], [-60, 60]],
            [[100, 10], [100.01, 10], [100.01, 10.01], [100, 10.01], [100, 10]],
          ],
        },
      },
    ],
  }
  const ringArea2 = (ring: { x: number; y: number }[]) => {
    let sum = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j].x - ring[i].x) * (ring[i].y + ring[j].y)
    return sum
  }

  it('keeps no ring smaller than a screen pixel in a polygon layer, so winding classification stays sound', () => {
    const built = buildVectorTiles({ ocean })
    const world = decode(built.tiles.find((t) => t.z === 0)!.data).layers.ocean
    const areas = []
    for (let i = 0; i < world.length; i++) for (const ring of (world.feature(i) as unknown as { loadGeometry(): { x: number; y: number }[][] }).loadGeometry()) areas.push(Math.abs(ringArea2(ring)))
    expect(areas.length).toBeGreaterThan(1) // the big hole stays
    expect(Math.min(...areas)).toBeGreaterThanOrEqual(MIN_RING_AREA)
  })

  it('drops a collapsed sliver with flipped winding that would start a polygon of its own', () => {
    const feature = {
      type: 3 as const,
      tags: {},
      geometry: [
        [[0, 0], [0, 4096], [4096, 4096], [4096, 0], [0, 0]],
        [[100, 100], [100, 900], [900, 900], [900, 100], [100, 100]],
        [[2000, 2000], [2002, 2001], [2004, 2000], [2000, 2000]], // a sliver
      ],
    }
    const kept = dropTinyRings(feature as never)
    expect(kept).toBeDefined()
    expect((kept!.geometry as unknown as number[][][]).length).toBe(2)
    expect(dropTinyRings({ ...feature, geometry: [feature.geometry[2]] } as never)).toBeUndefined()
    const point = { type: 1 as const, tags: {}, geometry: [[1, 1]] }
    expect(dropTinyRings(point as never)).toBe(point)
  })
})

describe('ocean simplification', () => {
  it('keeps the ocean finer than the other layers, so its holes stay simple', () => {
    expect(OCEAN_TOLERANCE).toBeLessThan(3)
  })
})
