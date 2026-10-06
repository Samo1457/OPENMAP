// Source metadata (AD-17): every dataset carries `{source, licence, attribution, creditRequired}`. The
// pipelines write it (`/library/v1/datasets.json` for the Basemap data, the `dataset` block of a geo
// index for Cliopatria); `src/library` loads and validates it, and the evaluator reads it through
// `ctx`, never through the Project. Pure types and validators.

import { z } from 'zod'
import { type Result, err, ok } from '../result'

/** The metadata of one source, as the pipelines write it. */
export const sourceMetaSchema = z.object({
  /** Dataset id: `natural-earth-v1`, `basemap-styles-v1`, `glyphs-v1`, `cliopatria`… */
  id: z.string().min(1),
  /** Display name of the source, e.g. « Natural Earth ». */
  source: z.string().min(1),
  /** SPDX-style licence, e.g. `CC-BY-4.0`. */
  licence: z.string().min(1),
  /** The source's own wording: the credit line uses it as is, in every UI language (AD-20). */
  attribution: z.string().trim().min(1),
  /** The licence asks for the credit on the Map: it can never be hidden (FR-10). */
  creditRequired: z.boolean(),
})
export type SourceMeta = Readonly<z.infer<typeof sourceMetaSchema>>

/** `datasets.json` (Story 1.8): the keys this client does not use are dropped. */
export const datasetsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  datasets: z.array(sourceMetaSchema),
})

/** Validates a `datasets.json` response. */
export function parseDatasets(value: unknown): Result<readonly SourceMeta[]> {
  const parsed = datasetsDocumentSchema.safeParse(value)
  if (!parsed.success) return err('datasets_unavailable', { reason: 'invalid_datasets' })
  return ok(parsed.data.datasets)
}

/** Dataset ids of the Basemap, in credit order (Story 1.8 pipeline). */
export const BASEMAP_SOURCE_IDS = ['natural-earth-v1', 'basemap-styles-v1'] as const
/** The glyph fonts: drawn only when the Basemap style draws labels. */
export const GLYPHS_SOURCE_ID = 'glyphs-v1'
