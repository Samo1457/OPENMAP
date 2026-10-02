// The fixed `z` bands of the Scene (AD-6), bottom to top. Every Scene item carries a `z` inside
// its band; Project Layers occupy `projectLayers + index` in document order.

export const Z_BANDS = {
  basemap: 0,
  personalBackground: 1000,
  projectLayers: 2000,
  placeLabels: 3000,
  screenOverlays: 4000,
  credit: 5000,
} as const

export type ZBand = keyof typeof Z_BANDS

/** Items per band: a Layer index stays below the next band. */
export const Z_BAND_SIZE = 1000

/** The `z` of the Project Layer at `index` in document order (bottom first). */
export function layerZ(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= Z_BAND_SIZE) throw new RangeError(`Layer index out of range: ${index}`)
  return Z_BANDS.projectLayers + index
}
