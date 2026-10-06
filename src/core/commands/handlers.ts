// One handler per Command type. A handler is pure: it returns the changed document and the
// Command that reverts it, or `null` when the Command changes nothing (no history entry).

import { produce } from 'immer'
import { sameHistoricalDate } from '../dates/historical-date'
import { deepEqual } from '../equal'
import { type BasemapAdjustments, type Project, projectNameSchema } from '../model/project'
import { type Result, err, ok } from '../result'
import type { Batch, Command, SetBasemap, SetBasemapAdjustments, SetCredit, SetMapLocale, SetOutputFormat, SetProjectName, SetReferenceDate } from './command'

export interface Change {
  readonly project: Project
  readonly inverse: Command
}

type Handler<C extends Command> = (project: Project, payload: C['payload']) => Result<Change | null>

const setProjectName: Handler<SetProjectName> = (project, { name }) => {
  const parsed = projectNameSchema.safeParse(name.trim())
  if (!parsed.success) return err('invalid_payload', { type: 'SET_PROJECT_NAME', field: 'name' })
  if (parsed.data === project.name) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.name = parsed.data
    }),
    inverse: { type: 'SET_PROJECT_NAME', payload: { name: project.name } },
  })
}

const setOutputFormat: Handler<SetOutputFormat> = (project, { outputFormat }) => {
  if (outputFormat === project.outputFormat) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.outputFormat = outputFormat
    }),
    inverse: { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: project.outputFormat } },
  })
}

const setMapLocale: Handler<SetMapLocale> = (project, { mapLocale }) => {
  if (mapLocale === project.mapLocale) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.mapLocale = mapLocale
    }),
    inverse: { type: 'SET_MAP_LOCALE', payload: { mapLocale: project.mapLocale } },
  })
}

/** Changing the Basemap keeps the adjustment overrides (DESIGN.md "Réglages du Fond"). */
const setBasemap: Handler<SetBasemap> = (project, { basemap }) => {
  if (basemap === project.map.basemap.id) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.map.basemap.id = basemap
    }),
    inverse: { type: 'SET_BASEMAP', payload: { basemap: project.map.basemap.id } },
  })
}

const ADJUSTMENT_KEYS = ['brightness', 'saturation', 'tintColor', 'tintIntensity'] as const

/** Drops undefined keys and upper-cases the tint colour, so equal settings compare equal. */
function normalizeAdjustments(adjustments: BasemapAdjustments): BasemapAdjustments {
  const result: { -readonly [K in keyof BasemapAdjustments]: BasemapAdjustments[K] } = {}
  if (adjustments.brightness !== undefined) result.brightness = adjustments.brightness
  if (adjustments.saturation !== undefined) result.saturation = adjustments.saturation
  if (adjustments.tintColor !== undefined) result.tintColor = adjustments.tintColor.toUpperCase()
  if (adjustments.tintIntensity !== undefined) result.tintIntensity = adjustments.tintIntensity
  return result
}

const sameAdjustments = (a: BasemapAdjustments, b: BasemapAdjustments) => ADJUSTMENT_KEYS.every((key) => a[key] === b[key])

const setBasemapAdjustments: Handler<SetBasemapAdjustments> = (project, { adjustments }) => {
  const next = normalizeAdjustments(adjustments)
  const previous = project.map.basemap.adjustments
  if (sameAdjustments(next, previous)) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.map.basemap.adjustments = next
    }),
    inverse: { type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments: { ...previous } } },
  })
}

const setReferenceDate: Handler<SetReferenceDate> = (project, { referenceDate }) => {
  if (sameHistoricalDate(referenceDate, project.referenceDate)) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.referenceDate = referenceDate
    }),
    inverse: { type: 'SET_REFERENCE_DATE', payload: { referenceDate: { ...project.referenceDate } } },
  })
}

/** Only `corner` and `prominence` can change: a required credit stays drawn whatever the payload. */
const setCredit: Handler<SetCredit> = (project, { corner, prominence }) => {
  if (corner === undefined && prominence === undefined) return err('invalid_payload', { type: 'SET_CREDIT', field: 'corner' })
  const next = { corner: corner ?? project.credit.corner, prominence: prominence ?? project.credit.prominence }
  if (next.corner === project.credit.corner && next.prominence === project.credit.prominence) return ok(null)
  return ok({
    project: produce(project, (draft) => {
      draft.credit = next
    }),
    inverse: { type: 'SET_CREDIT', payload: { corner: project.credit.corner, prominence: project.credit.prominence } },
  })
}

/** Applies members in order; the inverse replays their inverses in reverse order. */
const batch: Handler<Batch> = (project, { commands }) => {
  let current = project
  const inverses: Command[] = []
  for (const command of commands) {
    const result = applyChange(current, command)
    if (!result.ok) return result
    if (result.value === null) continue
    current = result.value.project
    inverses.unshift(result.value.inverse)
  }
  // Members that cancel out (sombre, then parchment) leave nothing to undo.
  if (inverses.length === 0 || deepEqual(current, project)) return ok(null)
  return ok({ project: current, inverse: { type: 'BATCH', payload: { commands: inverses } } })
}

/** Applies an already validated Command without touching `revision`. */
export function applyChange(project: Project, command: Command): Result<Change | null> {
  switch (command.type) {
    case 'SET_PROJECT_NAME':
      return setProjectName(project, command.payload)
    case 'SET_OUTPUT_FORMAT':
      return setOutputFormat(project, command.payload)
    case 'SET_MAP_LOCALE':
      return setMapLocale(project, command.payload)
    case 'SET_BASEMAP':
      return setBasemap(project, command.payload)
    case 'SET_BASEMAP_ADJUSTMENTS':
      return setBasemapAdjustments(project, command.payload)
    case 'SET_REFERENCE_DATE':
      return setReferenceDate(project, command.payload)
    case 'SET_CREDIT':
      return setCredit(project, command.payload)
    case 'BATCH':
      return batch(project, command.payload)
    default: {
      const unknown: never = command
      throw new Error(`Unhandled Command ${JSON.stringify(unknown)}`)
    }
  }
}
