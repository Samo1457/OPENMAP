// `evaluate(project, t, ctx) → Scene` (AD-1): pure and deterministic. It is the only place where
// the Map changes with time; renderers draw the Scene it returns and animate nothing themselves.
// No clock, no random, no DOM. It resolves the Basemap (palette + adjustments), the default camera,
// the fixed `z` bands and the neutral Territories valid at the Reference Date; later stories add
// the other elements.

import { adjustColour, resolveAdjustments } from '../basemap/adjust-colour'
import { mapColors, mapExtraColors } from '../basemap/palettes'
import { creditText, drawnBasemapSources } from '../credit/credit'
import { geoEntityKey, geoSourceMeta, stateKey } from '../geo/geo'
import { selectGeoEntities } from '../geo/select'
import type { Project } from '../model/project'
import { DEFAULT_BOUNDS, fitBounds } from './camera'
import type { EvaluateContext, Scene, SceneBasemap, SceneCredit, SceneItem, SceneTerritory } from './scene'
import { layerZ, Z_BANDS } from './z-bands'

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

/** Outline of a neutral Territory in reference px (Story 1.11): thin, scaled by `s` when drawn. */
export const TERRITORY_OUTLINE_WIDTH = 1.5

/**
 * The neutral Territories of the pinned dataset at the Reference Date (decision A, « countries
 * view »): outline in the Basemap's `coast` colour, no fill, in the Territories Layer's `z`.
 * Without the index of the pinned version, nothing is drawn. An entity whose state is not loaded
 * yet is skipped.
 */
function evaluateTerritories(project: Project, ctx: EvaluateContext, coast: string): { items: SceneTerritory[]; dataDate: Scene['dataDate'] } {
  const { index, states } = ctx.geodata
  const pin = project.pins.geo
  if (!index || index.dataset.id !== pin.dataset || index.dataset.version !== pin.version) return { items: [], dataDate: undefined }
  const selection = selectGeoEntities(index, project.referenceDate.year)
  if (!selection) return { items: [], dataDate: undefined }
  // A hidden or missing Territories Layer is absent from the Scene (AD-24).
  const layerIndex = project.layers.findIndex((layer) => layer.kind === 'territories')
  if (layerIndex < 0 || project.layers[layerIndex].hidden) return { items: [], dataDate: selection.dataDate }
  const z = layerZ(layerIndex)
  const items: SceneTerritory[] = []
  for (const { entity, fromYear } of selection.entities) {
    const geometry = states?.[stateKey(entity.id, fromYear)]
    if (!geometry) continue
    items.push({ kind: 'territory', z, key: geoEntityKey(pin, entity.id), geometry, outline: { colour: coast, width: TERRITORY_OUTLINE_WIDTH } })
  }
  return { items, dataDate: selection.dataDate }
}

/**
 * The credit line of the sources actually drawn (FR-10, AD-17): the Basemap sources whenever the Map is
 * drawn, Cliopatria (the pinned geo dataset) only when Territories are. A source with no loaded metadata
 * is not credited. No required source drawn: no item.
 */
function evaluateCredit(project: Project, ctx: EvaluateContext, territories: readonly SceneTerritory[]): SceneCredit | undefined {
  const geo = territories.length > 0 ? geoSourceMeta(ctx.geodata.index) : undefined
  const text = creditText([...drawnBasemapSources(ctx.datasets, project.map.basemap.id), ...(geo ? [geo] : [])])
  if (text === undefined) return undefined
  return { kind: 'credit', z: Z_BANDS.credit, text, corner: project.credit.corner, prominence: project.credit.prominence }
}

export function evaluate(project: Project, t: number, ctx: EvaluateContext): Scene {
  const basemap = evaluateBasemap(project)
  const { items: territories, dataDate } = evaluateTerritories(project, ctx, basemap.colours.coast)
  const credit = evaluateCredit(project, ctx, territories)
  const items: SceneItem[] = credit ? [...territories, credit] : territories
  return {
    t,
    frame: { width: ctx.frame.width, height: ctx.frame.height },
    camera: fitBounds(DEFAULT_BOUNDS, ctx.frame, 'cover'),
    basemap,
    ...(dataDate ? { dataDate } : {}),
    items,
  }
}
