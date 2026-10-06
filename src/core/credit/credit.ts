// The Map credit (Story 1.13, FR-10, AD-17, AD-20): one locked line built from the `attribution` of
// every source actually drawn whose licence requires it, in the source's own wording. Pure: no UI
// text, no clock, no random. Which sources are drawn is decided here; where the line sits and how loud
// it is come from `project.credit`. A source whose metadata is not loaded is never credited and never
// listed: the line is never guessed.

import type { BasemapId } from '../model/project'
import { BASEMAP_SOURCE_IDS, GLYPHS_SOURCE_ID, type SourceMeta } from './sources'

/** Between two attributions on the credit line. */
export const CREDIT_SEPARATOR = ' · '

/**
 * Whether the Basemap's MapLibre style draws text (and so loads the glyph fonts). The pipeline styles
 * have no text layer: every label is a deck.gl layer (AD-6). A Basemap that draws labels adds
 * `glyphs-v1` to the sources drawn.
 */
export function basemapDrawsLabels(_basemap: BasemapId): boolean {
  return false
}

/**
 * The Basemap sources drawn whenever the Map is drawn: the vector tiles and the styles, plus the glyph
 * fonts when the style draws labels. Only those whose metadata is loaded; fixed order.
 */
export function drawnBasemapSources(
  datasets: readonly SourceMeta[] | undefined,
  basemap: BasemapId,
  /** Whether the style draws labels; a seam for tests, the Basemap's own answer by default. */
  drawsLabels: boolean = basemapDrawsLabels(basemap),
): SourceMeta[] {
  const ids: readonly string[] = drawsLabels ? [...BASEMAP_SOURCE_IDS, GLYPHS_SOURCE_ID] : BASEMAP_SOURCE_IDS
  return ids.flatMap((id) => datasets?.find((dataset) => dataset.id === id) ?? [])
}

/**
 * The credit line of the sources drawn, in the order given (Basemap sources, then the geo dataset):
 * the `attribution` of each one that requires a credit, joined with « · », an attribution shared by two
 * sources (the tiles and the styles are both Natural Earth) written once. Nothing required: no line.
 */
export function creditText(drawn: readonly SourceMeta[]): string | undefined {
  const lines: string[] = []
  for (const source of drawn) {
    const text = source.attribution.trim()
    if (source.creditRequired && text !== '' && !lines.includes(text)) lines.push(text)
  }
  return lines.length > 0 ? lines.join(CREDIT_SEPARATOR) : undefined
}

/** A row of « Sources et licences »: one or more datasets that share one name, licence and attribution. */
export interface SourceEntry {
  /** Dataset ids, e.g. `['natural-earth-v1', 'basemap-styles-v1']`. */
  readonly ids: readonly string[]
  readonly source: string
  readonly licence: string
  readonly attribution: string
  readonly creditRequired: boolean
}

/**
 * Every source whose metadata is loaded for this Project, drawn or not (a hidden Territories Layer
 * still lists Cliopatria): the datasets of `datasets.json` in file order, then the geo dataset.
 * Datasets that share name, licence and attribution make one row.
 */
export function listSources(datasets: readonly SourceMeta[] | undefined, geo: SourceMeta | undefined): SourceEntry[] {
  const entries: { ids: string[]; source: string; licence: string; attribution: string; creditRequired: boolean }[] = []
  for (const meta of [...(datasets ?? []), ...(geo ? [geo] : [])]) {
    const same = entries.find((entry) => entry.source === meta.source && entry.licence === meta.licence && entry.attribution === meta.attribution)
    if (same) {
      if (!same.ids.includes(meta.id)) same.ids.push(meta.id)
      same.creditRequired ||= meta.creditRequired
    } else {
      entries.push({ ids: [meta.id], source: meta.source, licence: meta.licence, attribution: meta.attribution, creditRequired: meta.creditRequired })
    }
  }
  return entries
}
