// The v1 Project document (AD-3, AD-4, AD-9, AD-12, AD-13, AD-24, AD-25). Fields beyond v1
// (Territories, Factions, Step durations, data pins…) arrive with a new schemaVersion and a
// migration (AD-9), never as speculative optional fields here.

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

export const projectSchemaV1 = z
  .strictObject({
  schemaVersion: z.literal(1),
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
    /** Members keyed by canonical reference (AD-22); always empty in v1. */
    members: z.record(z.string(), z.never()),
  }),
  steps: z.array(stepSchema).min(1),
  layers: z.array(layerSchema).min(1),
  /** Factions (AD-11); always empty in v1, defined by the Factions schemaVersion. */
  factions: z.array(z.never()),
  })
  .superRefine((project, ctx) => {
    if (hasDuplicates(project.steps.map((step) => step.id))) ctx.addIssue({ code: 'custom', path: ['steps'], message: 'Step ids must be unique.' })
    if (hasDuplicates(project.layers.map((layer) => layer.id))) ctx.addIssue({ code: 'custom', path: ['layers'], message: 'Layer ids must be unique.' })
  })

/** The current Project document. Immutable: change it only through Commands (AD-3). */
export type Project = Immutable<z.infer<typeof projectSchemaV1>>
