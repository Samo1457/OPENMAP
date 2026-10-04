// The main landmass of a Polygon or MultiPolygon (Story 1.12): the polygon with the largest area, and
// its bounding box. A country or an empire is framed on it, so that French Guiana or Alaska does not
// zoom the camera out to a continent. Pure, and free of imports so that the search pipeline can read
// this file directly (node strips the types).

/** `[west, south, east, north]` in degrees. */
export type LandBounds = readonly [number, number, number, number]

type Ring = readonly (readonly number[])[]
type PolygonRings = readonly Ring[]

export interface LandGeometry {
  readonly type: string
  readonly coordinates: unknown
}

/** Unsigned area of a ring in squared degrees, longitude scaled by `cosLat` (planar, enough to rank landmasses). */
function ringArea(ring: Ring, cosLat: number): number {
  let sum = 0
  for (let i = 0; i + 1 < ring.length; i++) sum += ring[i][0] * cosLat * ring[i + 1][1] - ring[i + 1][0] * cosLat * ring[i][1]
  return Math.abs(sum) / 2
}

const finite = (ring: Ring) => ring.length >= 4 && ring.every((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))

/** Area of a polygon: its outer ring minus its holes. */
function polygonArea(polygon: PolygonRings): number {
  const outer = polygon[0]
  const meanLat = outer.reduce((sum, point) => sum + point[1], 0) / outer.length
  const cosLat = Math.max(0.01, Math.cos((meanLat * Math.PI) / 180))
  return polygon.slice(1).reduce((area, hole) => area - ringArea(hole, cosLat), ringArea(outer, cosLat))
}

function boundsOf(ring: Ring): LandBounds {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const [lon, lat] of ring) {
    if (lon < west) west = lon
    if (lon > east) east = lon
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [west, south, east, north]
}

/** Bounds of the largest polygon, or `undefined` for a geometry with no usable polygon. Ties keep the first. */
export function mainLandmassBounds(geometry: LandGeometry): LandBounds | undefined {
  const polygons: readonly PolygonRings[] =
    geometry.type === 'Polygon' ? [geometry.coordinates as PolygonRings] : geometry.type === 'MultiPolygon' ? (geometry.coordinates as readonly PolygonRings[]) : []
  let best: PolygonRings | undefined
  let bestArea = -Infinity
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0 || !finite(polygon[0])) continue
    const area = polygonArea(polygon)
    if (area > bestArea) {
      best = polygon
      bestArea = area
    }
  }
  return best ? boundsOf(best[0]) : undefined
}
