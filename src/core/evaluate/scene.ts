// The Scene: what `evaluate(project, t, ctx)` returns and renderers draw (AD-1, AD-6). Plain
// serializable data, no function and no class instance.

import type { SourceMeta } from '../credit/sources'
import type { GeoGeometry, Geodata } from '../geo/geo'
import type { DataDate } from '../geo/select'
import type { BasemapId, CreditCorner, CreditProminence } from '../model/project'
import type { SceneCamera } from './camera'
import type { Size } from './frame'

/** Inputs outside the Project: the loaded geodata of the pinned version, the output frame in reference px and the loaded source metadata. */
export interface EvaluateContext {
  readonly geodata: Geodata
  readonly frame: Size
  /**
   * The metadata of the Basemap datasets (`datasets.json`, AD-17), once loaded. Absent or without a
   * dataset, that source is neither credited nor listed. The geo dataset's own comes with `geodata.index`.
   */
  readonly datasets?: readonly SourceMeta[]
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

/**
 * The Map credit (Story 1.13): the one locked line of the sources drawn that require it, in the
 * source's own wording. It sits in the credit band, above everything, and is never culled. Placement
 * only: the renderer scales the margin and the size by `s` and wraps the text to the frame (AD-23).
 */
export interface SceneCredit {
  readonly kind: 'credit'
  readonly z: number
  readonly text: string
  readonly corner: CreditCorner
  readonly prominence: CreditProminence
}

/** Elements drawn above the Basemap; every one carries its `z`. */
export type SceneItem = SceneTerritory | SceneCredit

export interface Scene {
  readonly t: number
  readonly frame: Size
  readonly camera: SceneCamera
  readonly basemap: SceneBasemap
  /** The year of the data shown, and whether it is the Reference Date's own (nearest-data chip, FR-6). Absent without data. */
  readonly dataDate?: DataDate
  readonly items: readonly SceneItem[]
}

export const isTerritory = (item: SceneItem): item is SceneTerritory => item.kind === 'territory'
export const isCredit = (item: SceneItem): item is SceneCredit => item.kind === 'credit'
