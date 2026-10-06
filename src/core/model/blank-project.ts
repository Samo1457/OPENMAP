// Blank Project creation and duplication (Story 1.3 AC 1, AD-2, AD-12). Pure: every id and the
// seed are passed in by the caller.

import { freeze } from 'immer'
import type { HistoricalDate } from '../dates/historical-date'
import { type IdSource, type LayerId, type ProjectId, type ProjectSeed, type StepId, toLayerId, toProjectId, toProjectSeed, toStepId } from '../ids'
import { DEFAULT_CREDIT, DEFAULT_GEO_PIN, LAYER_KINDS, type LayerKind, type MapLocale, type Project, type ProjectName, projectNameSchema } from './project'

export const DEFAULT_REFERENCE_DATE: HistoricalDate = { year: 1900 }

export interface BlankProjectIds {
  readonly id: ProjectId
  readonly seed: ProjectSeed
  readonly stepId: StepId
  readonly layerIds: Readonly<Record<LayerKind, LayerId>>
}

export interface BlankProjectInput extends BlankProjectIds {
  /** The default name in the UI language ("Projet sans titre" / "Untitled project"); core has no i18n. */
  readonly name: string
  /** Defaults to the UI language at creation (AD-25). */
  readonly mapLocale: MapLocale
}

/** Draws the ids and the seed of a blank Project from `source` (nanoid from src/ui/ids.ts in the shell). */
export function generateBlankProjectIds(source: IdSource): BlankProjectIds {
  const id = toProjectId(source())
  const seed = toProjectSeed(source())
  const stepId = toStepId(source())
  const layerIds = Object.fromEntries(LAYER_KINDS.map((kind) => [kind, toLayerId(source())])) as Record<LayerKind, LayerId>
  return { id, seed, stepId, layerIds }
}

/**
 * A blank Project: revision 0, the geo data pin, the default credit placement, reference date 1900, parchment Basemap without adjustment
 * overrides, 16:9, one Step (Step 0), one Layer per element kind, no Factions or members.
 * Throws on a programmer error (invalid name or ids); UI input goes through SET_PROJECT_NAME.
 */
export function createBlankProject(input: BlankProjectInput): Project {
  const name: ProjectName = projectNameSchema.parse(input.name.trim())
  const layerIds = new Set(LAYER_KINDS.map((kind) => input.layerIds[kind]))
  if (layerIds.size !== LAYER_KINDS.length) throw new Error('Layer ids must be distinct.')
  return freeze(
    {
      schemaVersion: 3,
      id: toProjectId(input.id),
      seed: toProjectSeed(input.seed),
      revision: 0,
      name,
      mapLocale: input.mapLocale,
      outputFormat: '16:9',
      referenceDate: { ...DEFAULT_REFERENCE_DATE },
      map: { basemap: { id: 'parchment', adjustments: {} }, members: {} },
      steps: [{ id: toStepId(input.stepId) }],
      layers: LAYER_KINDS.map((kind) => ({ id: toLayerId(input.layerIds[kind]), kind, hidden: false, locked: false })),
      factions: [],
      pins: { geo: { ...DEFAULT_GEO_PIN } },
      credit: { ...DEFAULT_CREDIT },
    } satisfies Project,
    true,
  )
}

/**
 * A copy of `project` under a new id. The seed and every inner id are kept (AD-2), so the copy
 * animates identically; the copy starts at revision 0. Renaming the copy is the caller's job.
 */
export function duplicateProject(project: Project, newId: ProjectId): Project {
  if (newId === project.id) throw new Error('A duplicate needs a new id.')
  // Sub-objects are shared: the document is immutable (AD-3).
  return freeze({ ...project, id: toProjectId(newId), revision: 0 }, true)
}
