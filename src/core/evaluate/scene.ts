// The Scene: what `evaluate(project, t, ctx)` returns and renderers draw (AD-1, AD-6). Plain
// serializable data, no function and no class instance.

import type { GeoGeometry, Geodata } from '../geo/geo'
import type { DataDate } from '../geo/select'
import type { BasemapId } from '../model/project'
import type { SceneCamera } from './camera'
import type { Size } from './frame'

/** Inputs outside the Project: the loaded geodata of the pinned version and the output frame in reference px. */
export interface EvaluateContext {
  readonly geodata: Geodata
  readonly frame: Size
}

/** The Basemap colours of the Scene: the palette of the active Basemap with the adjustments applied. */
export interface BasemapColours {
  readonly sea: string
  readonly land: string
  readonly coast: string
}

export interface SceneBasemap {
  readonly kind: 'basemap'
  readonly z: number
  readonly id: BasemapId
  /** Root-relative path of the MapLibre style (Story 1.8). */
  readonly styleUrl: string
  readonly colours: BasemapColours
  /** Relief shading colour, only for the Basemap that shades (UX-DR4). */
  readonly shade?: string
}

/**
 * A neutral Territory (Story 1.11): the whole polygons of one historical GeoEntity, drawn as a thin
 * outline with no fill. `outline.width` is in reference px: the renderer scales it by `s` (AD-23).
 */
export interface SceneTerritory {
  readonly kind: 'territory'
  readonly z: number
  /** Canonical GeoEntity key `dataset@version:entityId` (AD-22). */
  readonly key: string
  readonly geometry: GeoGeometry
  readonly outline: { readonly colour: string; readonly width: number }
}

/** Elements drawn above the Basemap; every one carries its `z`. */
export type SceneItem = SceneTerritory

export interface Scene {
  readonly t: number
  readonly frame: Size
  readonly camera: SceneCamera
  readonly basemap: SceneBasemap
  /** The year of the data shown, and whether it is the Reference Date's own (nearest-data chip, FR-6). Absent without data. */
  readonly dataDate?: DataDate
  readonly items: readonly SceneItem[]
}
