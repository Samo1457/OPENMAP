// Loading and repainting the Basemap style (AD-6). The pipeline (Story 1.8) builds the style
// structure; the colours come from the Scene, so the style's own colours are overwritten by layer
// id. Anything that goes wrong (404, the SPA fallback page, a parse error) gives the plain land
// colour of the active Basemap: no throw, no toast, no console error.

import type { SceneBasemap } from '@/core'

/** A MapLibre style as far as this module reads it. */
export interface BasemapStyle {
  version: 8
  sources: Record<string, Record<string, unknown>>
  layers: Record<string, unknown>[]
  [key: string]: unknown
}

export interface PaintTarget {
  readonly layer: string
  readonly property: string
  readonly colour: string
}

/**
 * The style layers repainted from the Scene, by id (pipeline/styles.ts): `background` is the sea,
 * `land` the land, `ocean` (relief only), `lakes` and `rivers` the sea again, `coastline` the coast.
 * `relief-shade` is a raster and keeps its own paint. While the tiles have not arrived the
 * background shows the plain land colour (DESIGN.md « Carte »).
 */
export function paintTargets(basemap: SceneBasemap, options: { tilesArrived: boolean }): PaintTarget[] {
  const { sea, land, coast } = basemap.colours
  return [
    { layer: 'background', property: 'background-color', colour: options.tilesArrived ? sea : land },
    { layer: 'land', property: 'fill-color', colour: land },
    { layer: 'ocean', property: 'fill-color', colour: sea },
    { layer: 'lakes', property: 'fill-color', colour: sea },
    { layer: 'rivers', property: 'line-color', colour: sea },
    { layer: 'coastline', property: 'line-color', colour: coast },
  ]
}

/** The style shown without data: the active Basemap's land colour, nothing else. */
export function fallbackStyle(basemap: SceneBasemap): BasemapStyle {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': basemap.colours.land } }],
  }
}

function isStyle(value: unknown): value is BasemapStyle {
  if (typeof value !== 'object' || value === null) return false
  const style = value as Partial<BasemapStyle>
  return style.version === 8 && Array.isArray(style.layers) && typeof style.sources === 'object' && style.sources !== null
}

/** Root-relative paths resolved against the app origin: MapLibre's workers have no page base URL. */
export function absolutizeStyle(style: BasemapStyle, origin: string): BasemapStyle {
  const absolute = (value: unknown) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? `${origin}${value}` : value)
  const result: BasemapStyle = { ...style, sources: {} }
  for (const key of ['glyphs', 'sprite'] as const) if (key in style) result[key] = absolute(style[key])
  for (const [id, source] of Object.entries(style.sources)) {
    const copy: Record<string, unknown> = { ...source }
    if ('url' in copy) copy.url = absolute(copy.url)
    if (typeof copy.data === 'string') copy.data = absolute(copy.data)
    if (Array.isArray(copy.tiles)) copy.tiles = copy.tiles.map(absolute)
    result.sources[id] = copy
  }
  return result
}

/**
 * Fetches the style of `basemap` from the app origin (and later the data origin, AD-16). Resolves to
 * `undefined` on any failure: the caller keeps the plain land colour.
 */
export async function loadBasemapStyle(
  basemap: SceneBasemap,
  options: { origin: string; fetcher?: typeof fetch; signal?: AbortSignal },
): Promise<BasemapStyle | undefined> {
  const fetcher = options.fetcher ?? fetch
  try {
    const response = await fetcher(`${options.origin}${basemap.styleUrl}`, { credentials: 'omit', signal: options.signal })
    if (!response.ok) return undefined
    const parsed: unknown = JSON.parse(await response.text())
    return isStyle(parsed) ? absolutizeStyle(parsed, options.origin) : undefined
  } catch {
    return undefined
  }
}
