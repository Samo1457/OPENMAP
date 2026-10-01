// `apply(project, command)` (AD-3): pure, no I/O, no clock, no randomness (AD-2).

import { produce } from 'immer'
import type { Project } from '../model/project'
import { type Result, err, ok } from '../result'
import { type Command, commandSchema, exceedsBatchDepth, MAX_BATCH_DEPTH } from './command'
import { applyChange } from './handlers'

export type ApplyOutcome =
  /** The document changed: `revision` went up by one and `inverse` reverts the change. */
  | { readonly changed: true; readonly project: Project; readonly inverse: Command }
  /** The Command sets values equal to the current ones: same document, no history entry. */
  | { readonly changed: false; readonly project: Project }

/**
 * Validates `command`, applies it and bumps `revision` once (a BATCH counts once).
 * An invalid Command returns `invalid_payload` and leaves the document untouched.
 */
export function apply(project: Project, command: Command): Result<ApplyOutcome> {
  if (exceedsBatchDepth(command)) return err('invalid_payload', { type: 'BATCH', maxDepth: MAX_BATCH_DEPTH })
  const parsed = commandSchema.safeParse(command)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return err('invalid_payload', { type: describeType(command), path: issue ? issue.path.join('.') : '' })
  }
  const result = applyChange(project, parsed.data)
  if (!result.ok) return result
  if (result.value === null) return ok({ changed: false, project })
  const changed = produce(result.value.project, (draft) => {
    draft.revision = project.revision + 1
  })
  return ok({ changed: true, project: changed, inverse: result.value.inverse })
}

function describeType(command: unknown): string {
  const type = typeof command === 'object' && command !== null ? (command as { type?: unknown }).type : undefined
  return typeof type === 'string' ? type : 'unknown'
}
