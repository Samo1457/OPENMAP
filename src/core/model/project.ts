// The Project document (AD-3, AD-4, AD-9, AD-12, AD-13, AD-24, AD-25). v2 adds the geo data pin.
// Fields beyond (Territories, Factions, Step durations, the tileset pin…) arrive with a new
// schemaVersion and a migration (AD-9), never as speculative optional fields here.

import type { Immutable } from 'immer'
import { z } from 'zod'
import { historicalDateSchema } from '../dates/historical-date'
import { layerIdSchema, projectIdSchema, projectSeedSchema, stepIdSchema } from '../ids'

export const MAP_LOCALES = ['fr', 'en'] as const
/** Language of every text generated on the Map (AD-25); independent of the UI language. */
export const mapLocaleSchema = z.enum(MAP_LOCALES)
export type MapLocale = z.infer<typeof mapLocaleSchema>

export const OUTPUT_FORMATS = ['16:9', '9:16', '1:1'] as const
/** Output Format (AD-23): 16:9 = 1920×1080, 9:16 = 1080×1920, 1:1 = 1080×1080. */
export const outputFormatSchema = z.enum(OUTPUT_FORMATS)
export type OutputFormat = z.infer<typeof outputFormatSchema>

/** Output frame size in export px for each Output Format (AD-23); the short side is 1080. */
export const OUTPUT_FRAME_SIZES: Readonly<Record<OutputFormat, { readonly width: number; readonly height: number }>> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
}

export const BASEMAP_IDS = ['parchment', 'sombre', 'clair', 'relief'] as const
export const basemapIdSchema = z.enum(BASEMAP_IDS)
export type BasemapId = z.infer<typeof basemapIdSchema>

export const BASEMAP_ADJUSTMENT_RANGES = {
  brightness: { min: -50, max: 50 },
  saturation: { min: -100, max: 50 },
  tintIntensity: { min: 0, max: 60 },
} as const

const range = (key: keyof typeof BASEMAP_ADJUSTMENT_RANGES) =>
  z.int().min(BASEMAP_ADJUSTMENT_RANGES[key].min).max(BASEMAP_ADJUSTMENT_RANGES[key].max)

/**
 * Basemap adjustments (FR-5, DESIGN.md "Réglages du Fond"), each an optional override:
 * an absent key means the active Basemap's default. Percent values in steps of 1.
 */
export const basemapAdjustmentsSchema = z.strictObject({
  brightness: range('brightness').optional(),
  saturation: range('saturation').optional(),
  tintColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/)
    .optional(),
  tintIntensity: range('tintIntensity').optional(),
})
export type BasemapAdjustments = z.infer<typeof basemapAdjustmentsSchema>

export const basemapSchema = z.strictObject({
  id: basemapIdSchema,
  adjustments: basemapAdjustmentsSchema,
})
export type Basemap = z.infer<typeof basemapSchema>

export const PROJECT_NAME_MAX_LENGTH = 120
/**
 * 1–120 Unicode code points (the `u` pattern counts code points, as JSON Schema `maxLength`
 * does), no control character (newline, tab…), and no leading or trailing whitespace.
 */
export const projectNameSchema = z
  .string()
  .regex(new RegExp(`^\\P{Cc}{1,${PROJECT_NAME_MAX_LENGTH}}$`, 'u'))
  .regex(/^\S(?:[\s\S]*\S)?$/)
export type ProjectName = z.infer<typeof projectNameSchema>

/** A Step (AD-4). `project.steps` order is the Timeline order. */
export const stepSchema = z.strictObject({ id: stepIdSchema })
export type Step = z.infer<typeof stepSchema>

/** One default Layer per element kind, in this draw order (AD-24). */
export const LAYER_KINDS = ['territories', 'arrows', 'tokens', 'texts', 'images'] as const
export const layerKindSchema = z.enum(LAYER_KINDS)
export type LayerKind = z.infer<typeof layerKindSchema>

export const layerSchema = z.strictObject({
  id: layerIdSchema,
  kind: layerKindSchema,
  hidden: z.boolean(),
  locked: z.boolean(),
})
export type Layer = z.infer<typeof layerSchema>

const hasDuplicates = (ids: readonly string[]) => new Set(ids).size !== ids.length

/** A pinned data version (AD-12): the Project keeps showing the data it was made with. */
export const geoPinSchema = z.strictObject({
  /** Dataset id, e.g. `cliopatria`. */
  dataset: z.string().regex(/^[a-z][a-z0-9-]*$/),
  /** Dataset version, e.g. `0.2.0`. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
})
export type GeoPin = z.infer<typeof geoPinSchema>

/** The geo dataset every new Project and every migrated v1 Project pins (Story 1.9 data). */
export const DEFAULT_GEO_PIN: GeoPin = { dataset: 'cliopatria', version: '0.2.0' }

export const pinsSchema = z.strictObject({ geo: geoPinSchema })
export type Pins = z.infer<typeof pinsSchema>

/** Fields shared by every schemaVersion; a later version adds its own on top. */
const projectFields = {
  id: projectIdSchema,
  seed: projectSeedSchema,
  /** Increases on every applied Command, undo and redo; never decreases (AD-3). */
  revision: z.int().min(0),
  name: projectNameSchema,
  mapLocale: mapLocaleSchema,
  outputFormat: outputFormatSchema,
  referenceDate: historicalDateSchema,
  map: z.strictObject({
    basemap: basemapSchema,
    /** Members keyed by canonical reference (AD-22); always empty until Epic 2. */
    members: z.record(z.string(), z.never()),
  }),
  steps: z.array(stepSchema).min(1),
  layers: z.array(layerSchema).min(1),
  /** Factions (AD-11); always empty until the Factions schemaVersion. */
  factions: z.array(z.never()),
}

type UniqueIds = { readonly steps: readonly { readonly id: string }[]; readonly layers: readonly { readonly id: string }[] }
const checkUniqueIds = (project: UniqueIds, ctx: z.RefinementCtx) => {
  if (hasDuplicates(project.steps.map((step) => step.id))) ctx.addIssue({ code: 'custom', path: ['steps'], message: 'Step ids must be unique.' })
  if (hasDuplicates(project.layers.map((layer) => layer.id))) ctx.addIssue({ code: 'custom', path: ['layers'], message: 'Layer ids must be unique.' })
}

/** The v1 document, kept so its committed snapshot stays checkable and the migration has a fixture. */
export const projectSchemaV1 = z.strictObject({ schemaVersion: z.literal(1), ...projectFields }).superRefine(checkUniqueIds)

/** v2: adds `pins.geo` (Story 1.11). */
export const projectSchemaV2 = z
  .strictObject({
    schemaVersion: z.literal(2),
    ...projectFields,
    /** Data versions the Project is made with (AD-12). */
    pins: pinsSchema,
  })
  .superRefine(checkUniqueIds)

/** The current Project document. Immutable: change it only through Commands (AD-3). */
export type Project = Immutable<z.infer<typeof projectSchemaV2>>
