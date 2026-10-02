// The output frame and the size scale (AD-23). Sizes are in reference px for a frame whose short
// side is 1080 px; on screen they follow the frame (`s = frameShortSide / 1080`), while chrome never
// scales. Pure geometry: no DOM.

import { OUTPUT_FRAME_SIZES, type OutputFormat } from '../model/project'

/** The short side, in export px, that every reference size is written for. */
export const REFERENCE_SHORT_SIDE = 1080

/** Free space kept around the frame, in screen px. */
export const FRAME_MARGIN = 24
/** Extra space under the frame for the zoom controls, in screen px. */
export const FRAME_BOTTOM_EXTRA = 40

/** Opacity of the `canvas-mask` outside the frame. */
export const FRAME_MASK_OPACITY = 0.55

export interface Size {
  readonly width: number
  readonly height: number
}

export interface Rect extends Size {
  readonly x: number
  readonly y: number
}

/**
 * The output frame inside a Map area of `area` screen px: centred at the Output Format ratio, as
 * large as fits with a margin of at least `FRAME_MARGIN` on every side (and `FRAME_BOTTOM_EXTRA`
 * more at the bottom). A degenerate area gives a 1 px-wide frame at the exact ratio.
 */
export function frameRect(area: Size, format: OutputFormat): Rect {
  const target = OUTPUT_FRAME_SIZES[format]
  const availableWidth = Math.max(1, area.width - 2 * FRAME_MARGIN)
  const availableHeight = Math.max(1, area.height - 2 * FRAME_MARGIN - FRAME_BOTTOM_EXTRA)
  const fit = Math.min(availableWidth / target.width, availableHeight / target.height)
  const width = target.width * fit
  const height = target.height * fit
  return {
    x: FRAME_MARGIN + (availableWidth - width) / 2,
    y: FRAME_MARGIN + (availableHeight - height) / 2,
    width,
    height,
  }
}

/** `s = frameShortSide / 1080` for a frame drawn at `frame` screen px. */
export function frameScale(frame: Size): number {
  return Math.min(frame.width, frame.height) / REFERENCE_SHORT_SIDE
}

/** A reference size (px for a 1080 px short side) as screen px for a frame of `frame` px. */
export function scaleSize(referencePx: number, frame: Size): number {
  return referencePx * frameScale(frame)
}

/** The MapLibre zoom offset of a frame: screen zoom = Scene zoom + log2(s). */
export function zoomOffset(frame: Size): number {
  return Math.log2(frameScale(frame))
}
