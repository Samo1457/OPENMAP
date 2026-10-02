// The Scene: what `evaluate(project, t, ctx)` returns and renderers draw (AD-1, AD-6). Plain
// serializable data, no function and no class instance.

import type { BasemapId } from '../model/project'
import type { SceneCamera } from './camera'
import type { Size } from './frame'

/** Inputs outside the Project: geodata (empty until Story 1.11) and the output frame in reference px. */
export interface EvaluateContext {
  readonly geodata: Readonly<Record<string, never>>
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

/** Elements drawn above the Basemap (Stories 1.11 on); every one carries its `z`. */
export interface SceneItem {
  readonly kind: string
  readonly z: number
}

export interface Scene {
  readonly t: number
  readonly frame: Size
  readonly camera: SceneCamera
  readonly basemap: SceneBasemap
  readonly items: readonly SceneItem[]
}
