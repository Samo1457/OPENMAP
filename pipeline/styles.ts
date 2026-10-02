// The four MapLibre styles (parchment, sombre, clair, relief), built from the
// `map-*` tokens (UX-DR3, UX-DR4). No text layer: labels are deck.gl (AD-6).

import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { mapColors, mapExtraColors } from '../src/ui/theme/tokens.ts'

export type BasemapId = keyof typeof mapColors

export const BASEMAP_IDS = Object.keys(mapColors) as BasemapId[]

/** Relief shading strength over land (UX-DR4). */
export const RELIEF_SHADE_OPACITY = 0.35

export const VECTOR_TILEJSON_PATH = '/natural-earth-v1.json'
export const RELIEF_TILEJSON_PATH = '/natural-earth-relief-v1.json'
export const GLYPHS_PATH = '/library/v1/glyphs/{fontstack}/{range}.pbf'

export interface StyleSpec {
  version: 8
  name: string
  metadata: Record<string, unknown>
  glyphs: string
  sources: Record<string, unknown>
  layers: Record<string, unknown>[]
}

export function buildStyle(id: BasemapId): StyleSpec {
  const c = mapColors[id]
  const relief = id === 'relief'
  const sources: Record<string, unknown> = {
    'natural-earth': { type: 'vector', url: VECTOR_TILEJSON_PATH },
  }
  if (relief) sources['natural-earth-relief'] = { type: 'raster', url: RELIEF_TILEJSON_PATH, tileSize: 256 }

  const layers: Record<string, unknown>[] = [
    { id: 'background', type: 'background', paint: { 'background-color': c['map-sea'] } },
    { id: 'land', type: 'fill', source: 'natural-earth', 'source-layer': 'land', paint: { 'fill-color': c['map-land-neutral'], 'fill-antialias': true } },
  ]
  if (relief) {
    layers.push(
      {
        id: 'relief-shade',
        type: 'raster',
        source: 'natural-earth-relief',
        paint: { 'raster-opacity': RELIEF_SHADE_OPACITY, 'raster-fade-duration': 0, 'raster-resampling': 'linear' },
      },
      // The shade mask is drawn over everything; sea and lakes are painted back on top so only land is shaded.
      { id: 'ocean', type: 'fill', source: 'natural-earth', 'source-layer': 'ocean', paint: { 'fill-color': c['map-sea'] } },
    )
  }
  layers.push(
    { id: 'lakes', type: 'fill', source: 'natural-earth', 'source-layer': 'lakes', paint: { 'fill-color': c['map-sea'] } },
    {
      id: 'rivers',
      type: 'line',
      source: 'natural-earth',
      'source-layer': 'rivers',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c['map-sea'], 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 6, 1.2] },
    },
    {
      id: 'coastline',
      type: 'line',
      source: 'natural-earth',
      'source-layer': 'coastline',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c['map-coast'], 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 6, 1.1] },
    },
  )

  return {
    version: 8,
    name: `OPENMAP ${id}`,
    metadata: relief
      ? { 'openmap:basemap': id, 'openmap:shade-relief-colour': mapExtraColors['map-shade-relief'] }
      : { 'openmap:basemap': id },
    glyphs: GLYPHS_PATH,
    sources,
    layers,
  }
}

/** Style-spec validation errors; empty when the style is valid. */
export function styleErrors(style: StyleSpec): string[] {
  return validateStyleMin(style as never).map((e) => e.message)
}

export function buildStyles(): Record<BasemapId, StyleSpec> {
  const styles = {} as Record<BasemapId, StyleSpec>
  for (const id of BASEMAP_IDS) {
    const style = buildStyle(id)
    const errors = styleErrors(style)
    if (errors.length > 0) throw new Error(`style ${id} is invalid: ${errors.join('; ')}`)
    styles[id] = style
  }
  return styles
}
