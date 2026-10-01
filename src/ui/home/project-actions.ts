// Home actions on stored Projects. Every document change goes through a dispatcher and a Command
// (AD-3); persistence goes through src/persistence only (AD-8).

import {
  type Command,
  createBlankProject,
  createDispatcher,
  duplicateProject,
  generateBlankProjectIds,
  type MapLocale,
  type Project,
  toProjectId,
} from '@/core'
import { createProject, loadStoredProject, requestPersistOnce, saveProject } from '@/persistence'
import { newId } from '@/ui/ids'

/** Creates and stores a blank Project; requests persistent storage on the first one (AD-8). */
export async function createBlank(name: string, mapLocale: MapLocale): Promise<Project | undefined> {
  const project = createBlankProject({ ...generateBlankProjectIds(newId), name, mapLocale })
  const outcome = await createProject(project)
  if (!outcome.ok) return undefined
  void requestPersistOnce()
  return project
}

/** Applies one Command to a fresh dispatcher over `project`; `undefined` if it is rejected. */
function applyCommand(project: Project, command: Command): Project | undefined {
  const dispatcher = createDispatcher(project)
  const result = dispatcher.dispatch(command)
  return result.ok ? result.value : undefined
}

/** Renames a stored Project with SET_PROJECT_NAME and saves it with its current epoch. */
export async function renameStored(id: string, name: string): Promise<boolean> {
  const loaded = await loadStoredProject(id)
  if (loaded?.kind !== 'editable') return false
  const renamed = applyCommand(loaded.project, { type: 'SET_PROJECT_NAME', payload: { name } })
  if (!renamed) return false
  if (renamed === loaded.project) return true
  return (await saveProject(renamed, loaded.lockEpoch)).ok
}

/** Stores a copy under a new id with the same seed (AD-2), named by `nameOf(original name)`. */
export async function duplicateStored(id: string, nameOf: (name: string) => string): Promise<boolean> {
  const loaded = await loadStoredProject(id)
  if (loaded?.kind !== 'editable') return false
  const copy = duplicateProject(loaded.project, toProjectId(newId()))
  const named = applyCommand(copy, { type: 'SET_PROJECT_NAME', payload: { name: nameOf(loaded.project.name) } })
  if (!named) return false
  return (await createProject(named)).ok
}
