// The Scene camera (AD-23): framing is stored as bounds and resolved here, against the output
// frame, into a centre and a zoom. Web Mercator, 512 px world at zoom 0 (MapLibre's convention),
// computed in reference px, so the result does not depend on the screen.

import type { Size } from './frame'

/** `[west, south, east, north]` in degrees. */
export type Bounds = readonly [number, number, number, number]

export interface SceneCamera {
  /** `[lon, lat]`. */
  readonly center: readonly [number, number]
  /** Zoom for the output frame in reference px. */
  readonly zoom: number
  readonly bearing: number
  readonly pitch: number
}

/** The whole world, as far as Web Mercator goes. */
export const WORLD_BOUNDS: Bounds = [-180, -85.0511287798, 180, 85.0511287798]

/** Default framing: the world covers the output frame (owner decision, AD-23): no repeated copy, no empty polar band inside it. */
export const DEFAULT_BOUNDS: Bounds = WORLD_BOUNDS

const TILE_SIZE = 512

const mercatorX = (lon: number) => (lon + 180) / 360
const mercatorY = (lat: number) => {
  const sin = Math.sin((lat * Math.PI) / 180)
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)
}
const lonOf = (x: number) => x * 360 - 180
const latOf = (y: number) => (360 / Math.PI) * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - 90

/**
 * The camera for `bounds` in a frame of `frame` reference px (north up, flat): `contain` fits the
 * whole box inside the frame, `cover` fills the frame with it (the larger of the two zooms).
 */
export function fitBounds(bounds: Bounds, frame: Size, mode: 'contain' | 'cover' = 'contain'): SceneCamera {
  const [west, south, east, north] = bounds
  const spanX = Math.abs(mercatorX(east) - mercatorX(west))
  const spanY = Math.abs(mercatorY(south) - mercatorY(north))
  const zoomX = Math.log2(frame.width / (spanX * TILE_SIZE))
  const zoomY = Math.log2(frame.height / (spanY * TILE_SIZE))
  const zoom = mode === 'cover' ? Math.max(zoomX, zoomY) : Math.min(zoomX, zoomY)
  const centerX = (mercatorX(west) + mercatorX(east)) / 2
  const centerY = (mercatorY(south) + mercatorY(north)) / 2
  return { center: [lonOf(centerX), latOf(centerY)], zoom, bearing: 0, pitch: 0 }
}
