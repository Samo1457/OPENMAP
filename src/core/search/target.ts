// Where the edit camera goes when a place is picked (Story 1.12, AD-1, AD-23): reference zoom, north
// up, always inside the limits of Story 1.10. Pure; the renderer applies the camera with `jumpTo`.

import { type Bounds, fitBounds, minEditZoom, type SceneCamera, WORLD_BOUNDS } from '../evaluate/camera'
import type { Size } from '../evaluate/frame'

/** A city is shown at this reference zoom: about 21° of longitude across a 1920 px frame. */
export const CITY_ZOOM = 6
/** Share of the frame left free on each side around a fitted country or entity. */
export const FIT_MARGIN = 0.1
/** A very small country or entity is shown at this zoom at most, instead of filling the frame. */
export const MAX_FIT_ZOOM = 8

export interface PlaceTarget {
  readonly center: readonly [number, number]
  readonly bounds?: Bounds
}

/** The camera centred on a city, or fitting the main landmass of a country or an entity, never below the lowest zoom of `frame`. */
export function cameraForPlace(place: PlaceTarget, frame: Size): SceneCamera {
  const lowest = minEditZoom(frame)
  if (!place.bounds) return { center: [place.center[0], place.center[1]], zoom: Math.max(CITY_ZOOM, lowest), bearing: 0, pitch: 0 }
  const inner = { width: frame.width * (1 - 2 * FIT_MARGIN), height: frame.height * (1 - 2 * FIT_MARGIN) }
  // Antarctica reaches latitude -90, where Web Mercator is infinite: fit inside the world.
  const [west, south, east, north] = place.bounds
  const limited: Bounds = [west, Math.max(south, WORLD_BOUNDS[1]), east, Math.min(north, WORLD_BOUNDS[3])]
  const fitted = fitBounds(limited, inner)
  return { center: fitted.center, zoom: Math.min(MAX_FIT_ZOOM, Math.max(lowest, fitted.zoom)), bearing: 0, pitch: 0 }
}
