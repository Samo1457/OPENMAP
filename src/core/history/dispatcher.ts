// The dispatcher and its in-memory undo engine (AD-3, AD-15, FR-55). History is never persisted;
// `clear()` empties it when the tab loses the edit lock. Read-only mode rejects every edit.

import { apply } from '../commands/apply'
import type { Command } from '../commands/command'
import type { Project } from '../model/project'
import { type Result, err, ok } from '../result'

export const UNDO_DEPTH = 100

export interface DispatcherState {
  readonly project: Project
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly readOnly: boolean
}

export type DispatcherListener = (state: DispatcherState) => void

export interface Dispatcher {
  /** A stable snapshot: the same object until something changes (fits `useSyncExternalStore`). */
  getState(): DispatcherState
  /** Applies a Command as one undo entry; a no-op Command adds no entry. Clears the redo stack. */
  dispatch(command: Command): Result<Project>
  undo(): Result<Project>
  redo(): Result<Project>
  canUndo(): boolean
  canRedo(): boolean
  /** Empties undo and redo (lock loss, AD-15); the document is kept. */
  clear(): void
  setReadOnly(readOnly: boolean): void
  /** Replaces the document (reload, takeover) and empties the history. */
  reset(project: Project): void
  /** Called after every state change; returns the unsubscribe function. */
  subscribe(listener: DispatcherListener): () => void
}

export interface DispatcherOptions {
  readonly readOnly?: boolean
  /**
   * Receives an error thrown by a listener; the other listeners still run and the Command stays
   * committed. Defaults to rethrowing asynchronously so it surfaces as an unhandled error.
   */
  readonly onListenerError?: (error: unknown) => void
  /** Undo entries kept; the oldest is dropped beyond it. Defaults to UNDO_DEPTH. */
  readonly depth?: number
}

export function createDispatcher(initial: Project, options: DispatcherOptions = {}): Dispatcher {
  const depth = options.depth ?? UNDO_DEPTH
  if (!Number.isInteger(depth) || depth < 1) throw new Error(`Invalid undo depth: ${depth}`)
  /** Each entry is the Command that reverts (undo stack) or reapplies (redo stack) one gesture. */
  let undoStack: Command[] = []
  let redoStack: Command[] = []
  let project = initial
  let readOnly = options.readOnly ?? false
  let state = snapshot()
  const listeners = new Set<DispatcherListener>()
  const onListenerError = options.onListenerError ?? rethrowAsync

  function snapshot(): DispatcherState {
    return { project, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0, readOnly }
  }

  function publish(): void {
    state = snapshot()
    // Capture the snapshot and copy the set first: a listener may dispatch, subscribe or
    // unsubscribe while being notified, and every listener of this round sees the same state.
    const current = state
    for (const listener of Array.from(listeners)) {
      try {
        listener(current)
      } catch (error) {
        onListenerError(error)
      }
    }
  }

  function pushUndo(command: Command): void {
    undoStack = [...undoStack, command].slice(-depth)
  }

  function dispatch(command: Command): Result<Project> {
    if (readOnly) return err('read_only')
    const result = apply(project, command)
    if (!result.ok) return result
    if (!result.value.changed) return ok(project)
    project = result.value.project
    pushUndo(result.value.inverse)
    redoStack = []
    publish()
    return ok(project)
  }

  /** Applies the top entry of the undo (or redo) stack and moves its inverse to the other stack. */
  function replay(kind: 'undo' | 'redo'): Result<Project> {
    if (readOnly) return err('read_only')
    const stack = kind === 'undo' ? undoStack : redoStack
    const command = stack.at(-1)
    if (command === undefined) return err(kind === 'undo' ? 'nothing_to_undo' : 'nothing_to_redo')
    const result = apply(project, command)
    // An inverse always applies to the document it was recorded on; failing here is a bug.
    if (!result.ok) throw new Error(`History entry failed to ${kind}: ${result.error.code}`)
    if (!result.value.changed) throw new Error(`History entry was a no-op on ${kind}.`)
    project = result.value.project
    if (kind === 'undo') {
      undoStack = undoStack.slice(0, -1)
      redoStack = [...redoStack, result.value.inverse]
    } else {
      redoStack = redoStack.slice(0, -1)
      pushUndo(result.value.inverse)
    }
    publish()
    return ok(project)
  }

  return {
    getState: () => state,
    dispatch,
    undo: () => replay('undo'),
    redo: () => replay('redo'),
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      if (undoStack.length === 0 && redoStack.length === 0) return
      undoStack = []
      redoStack = []
      publish()
    },
    setReadOnly(next) {
      if (next === readOnly) return
      readOnly = next
      publish()
    },
    reset(next) {
      project = next
      undoStack = []
      redoStack = []
      publish()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function rethrowAsync(error: unknown): void {
  void Promise.reject(error)
}
