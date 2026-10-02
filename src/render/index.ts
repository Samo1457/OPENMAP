// Public API of the render adapter. Other layers import this file only (spine Design Paradigm).
// MapLibre and deck.gl are heavy: they live in a separate chunk that only the Editor loads, through
// `loadMapView`; Home never pays for them.

export type { MapLayout, MapView, MapViewOptions } from './map-view'
export { OVERLAY_MODE } from './overlay-mode'
export { fallbackStyle, paintTargets } from './style'

/** Loads the Map code (one lazy chunk) and returns the factory that creates a Map view. */
export async function loadMapView(): Promise<typeof import('./map-view').createMapView> {
  const module = await import('./map-view')
  return module.createMapView
}
