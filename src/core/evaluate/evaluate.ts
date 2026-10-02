// `evaluate(project, t, ctx) → Scene` (AD-1): pure and deterministic. It is the only place where
// the Map changes with time; renderers draw the Scene it returns and animate nothing themselves.
// No clock, no random, no DOM. This story resolves the Basemap (palette + adjustments), the default
// camera and the fixed `z` bands; elements arrive with later stories.

import { adjustColour, resolveAdjustments } from '../basemap/adjust-colour'
import { mapColors, mapExtraColors } from '../basemap/palettes'
import type { Project } from '../model/project'
import { DEFAULT_BOUNDS, fitBounds } from './camera'
import type { EvaluateContext, Scene, SceneBasemap } from './scene'
import { Z_BANDS } from './z-bands'

/** Root-relative path of a Basemap's MapLibre style, served by the data origin (Story 1.8). */
export function basemapStyleUrl(id: string): string {
  return `/library/v1/styles/${id}.json`
}

function evaluateBasemap(project: Project): SceneBasemap {
  const { id, adjustments } = project.map.basemap
  const palette = mapColors[id]
  const resolved = resolveAdjustments(adjustments)
  return {
    kind: 'basemap',
    z: Z_BANDS.basemap,
    id,
    styleUrl: basemapStyleUrl(id),
    colours: {
      sea: adjustColour(palette['map-sea'], resolved),
      land: adjustColour(palette['map-land-neutral'], resolved),
      coast: adjustColour(palette['map-coast'], resolved),
    },
    ...(id === 'relief' ? { shade: mapExtraColors['map-shade-relief'] } : {}),
  }
}

export function evaluate(project: Project, t: number, ctx: EvaluateContext): Scene {
  return {
    t,
    frame: { width: ctx.frame.width, height: ctx.frame.height },
    camera: fitBounds(DEFAULT_BOUNDS, ctx.frame),
    basemap: evaluateBasemap(project),
    items: [],
  }
}
