// Deterministic fixtures for core tests (never imported by app code).

import { apply } from '../commands/apply'
import type { Command } from '../commands/command'
import { createDeterministicIdSource } from '../ids'
import { createBlankProject, generateBlankProjectIds } from '../model/blank-project'
import type { MapLocale, Project } from '../model/project'

export function blankProject(options: { name?: string; mapLocale?: MapLocale; prefix?: string } = {}): Project {
  return createBlankProject({
    ...generateBlankProjectIds(createDeterministicIdSource(options.prefix ?? 'p')),
    name: options.name ?? 'Untitled project',
    mapLocale: options.mapLocale ?? 'en',
  })
}

/** The document without `revision`, for "deep-equal except revision" assertions. */
export function withoutRevision(project: Project): Omit<Project, 'revision'> {
  const { revision: _revision, ...rest } = project
  return rest
}

/** Applies `command`, then its inverse; throws unless both change the document. */
export function roundTrip(project: Project, command: Command): { changed: Project; inverse: Command; reverted: Project } {
  const applied = apply(project, command)
  if (!applied.ok || !applied.value.changed) throw new Error(`Expected a change, got ${JSON.stringify(applied)}`)
  const reverted = apply(applied.value.project, applied.value.inverse)
  if (!reverted.ok || !reverted.value.changed) throw new Error(`Expected the inverse to change, got ${JSON.stringify(reverted)}`)
  return { changed: applied.value.project, inverse: applied.value.inverse, reverted: reverted.value.project }
}
