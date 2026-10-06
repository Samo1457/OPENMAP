// Command shapes (AD-3): `{type: SCREAMING_SNAKE, payload}`. Payloads are validated by Zod before
// `apply` touches the document; an invalid one yields `invalid_payload`.

import { z } from 'zod'
import { historicalDateSchema, type HistoricalDate } from '../dates/historical-date'
import {
  BASEMAP_ADJUSTMENT_RANGES,
  type BasemapAdjustments,
  type BasemapId,
  basemapIdSchema,
  type CreditCorner,
  creditCornerSchema,
  type CreditProminence,
  creditProminenceSchema,
  type MapLocale,
  mapLocaleSchema,
  type OutputFormat,
  outputFormatSchema,
} from '../model/project'

export type SetProjectName = { readonly type: 'SET_PROJECT_NAME'; readonly payload: { readonly name: string } }
export type SetOutputFormat = { readonly type: 'SET_OUTPUT_FORMAT'; readonly payload: { readonly outputFormat: OutputFormat } }
export type SetMapLocale = { readonly type: 'SET_MAP_LOCALE'; readonly payload: { readonly mapLocale: MapLocale } }
export type SetBasemap = { readonly type: 'SET_BASEMAP'; readonly payload: { readonly basemap: BasemapId } }
/** Replaces every adjustment override; `{}` restores the Basemap defaults. */
export type SetBasemapAdjustments = {
  readonly type: 'SET_BASEMAP_ADJUSTMENTS'
  readonly payload: { readonly adjustments: BasemapAdjustments }
}
export type SetReferenceDate = { readonly type: 'SET_REFERENCE_DATE'; readonly payload: { readonly referenceDate: HistoricalDate } }
/**
 * Changes where and how loudly the Map credit shows (Story 1.13, AD-17). At least one of the two keys; an
 * absent key keeps its value. It cannot hide a credit: no payload field does that.
 */
export type SetCredit = {
  readonly type: 'SET_CREDIT'
  readonly payload: { readonly corner?: CreditCorner; readonly prominence?: CreditProminence }
}
/** A compound Command: one undo entry; any invalid member rejects the whole batch. */
export type Batch = { readonly type: 'BATCH'; readonly payload: { readonly commands: readonly Command[] } }

export type Command = SetProjectName | SetOutputFormat | SetMapLocale | SetBasemap | SetBasemapAdjustments | SetReferenceDate | SetCredit | Batch
export type CommandType = Command['type']

const command = <T extends string, P extends z.ZodRawShape>(type: T, payload: P) =>
  z.strictObject({ type: z.literal(type), payload: z.strictObject(payload) })

const adjustment = (key: keyof typeof BASEMAP_ADJUSTMENT_RANGES) =>
  z.int().min(BASEMAP_ADJUSTMENT_RANGES[key].min).max(BASEMAP_ADJUSTMENT_RANGES[key].max).optional()

/** Accepts any-case hex from a colour input; the handler stores it upper-case. */
const payloadAdjustmentsSchema = z.strictObject({
  brightness: adjustment('brightness'),
  saturation: adjustment('saturation'),
  tintColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  tintIntensity: adjustment('tintIntensity'),
})

const leafCommandSchema = z.discriminatedUnion('type', [
  // Length and trimming rules are checked on the trimmed name by the handler.
  command('SET_PROJECT_NAME', { name: z.string() }),
  command('SET_OUTPUT_FORMAT', { outputFormat: outputFormatSchema }),
  command('SET_MAP_LOCALE', { mapLocale: mapLocaleSchema }),
  command('SET_BASEMAP', { basemap: basemapIdSchema }),
  command('SET_BASEMAP_ADJUSTMENTS', { adjustments: payloadAdjustmentsSchema }),
  command('SET_REFERENCE_DATE', { referenceDate: historicalDateSchema }),
  // At least one key is checked by the handler.
  command('SET_CREDIT', { corner: creditCornerSchema.optional(), prominence: creditProminenceSchema.optional() }),
])

const batchSchema: z.ZodType<Batch> = z.strictObject({
  type: z.literal('BATCH'),
  payload: z.strictObject({
    get commands() {
      return z.array(commandSchema)
    },
  }),
})

export const commandSchema: z.ZodType<Command> = z.union([leafCommandSchema, batchSchema])

/** Deepest BATCH nesting accepted; deeper input is `invalid_payload`, never a stack overflow. */
export const MAX_BATCH_DEPTH = 16

/** Whether `value` nests BATCH Commands deeper than MAX_BATCH_DEPTH. Recursion stops at the limit. */
export function exceedsBatchDepth(value: unknown, depth = 1): boolean {
  if (typeof value !== 'object' || value === null) return false
  const { type, payload } = value as { type?: unknown; payload?: unknown }
  if (type !== 'BATCH') return false
  if (depth > MAX_BATCH_DEPTH) return true
  const commands = typeof payload === 'object' && payload !== null ? (payload as { commands?: unknown }).commands : undefined
  return Array.isArray(commands) && commands.some((member) => exceedsBatchDepth(member, depth + 1))
}
