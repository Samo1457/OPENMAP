// Autosave (AD-8, NFR-5, FR-53): watches a dispatcher and writes whole-document snapshots 1 s after
// the last change and never later than 5 s after the first unsaved one. `flush()` writes now; it
// runs when the page is hidden (see installPageLifecycleFlush) and, from Story 1.5, on Ctrl+S.

import type { DispatcherState, Project } from '@/core'
import type { SaveOutcome } from './projects'

export type SaveStatus = 'saving' | 'saved' | 'error'

export const AUTOSAVE_DEBOUNCE_MS = 1000
export const AUTOSAVE_MAX_WAIT_MS = 5000

export interface AutosaveClock {
  now(): number
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

const systemClock: AutosaveClock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
}

export interface AutosaveSource {
  getState(): DispatcherState
  subscribe(listener: (state: DispatcherState) => void): () => void
}

export interface AutosaveOptions {
  readonly source: AutosaveSource
  /** Writes one snapshot; a rejection counts as a failed write. */
  readonly save: (project: Project) => Promise<SaveOutcome>
  /**
   * Writes one snapshot synchronously (issued and committed before returning), for `pagehide`,
   * where an asynchronous write does not survive the page. Returns false if it could not.
   */
  readonly saveNow?: (project: Project) => boolean
  readonly clock?: AutosaveClock
  readonly debounceMs?: number
  readonly maxWaitMs?: number
}

export interface Autosave {
  /** Writes the pending change now and resolves once nothing is pending or a write failed. */
  flush(): Promise<void>
  /**
   * On `pagehide`: writes the latest unconfirmed snapshot synchronously through `saveNow`, then
   * starts a normal flush (which completes if the page stays, e.g. in the back/forward cache).
   */
  flushOnPageHide(): void
  getStatus(): SaveStatus
  /** Called on every status change; returns the unsubscribe function. */
  subscribe(listener: (status: SaveStatus) => void): () => void
  /** Stops watching, flushes, then releases the timer. */
  close(): Promise<void>
}

export function createAutosave(options: AutosaveOptions): Autosave {
  const clock = options.clock ?? systemClock
  const debounceMs = options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS
  const maxWaitMs = options.maxWaitMs ?? AUTOSAVE_MAX_WAIT_MS
  const listeners = new Set<(status: SaveStatus) => void>()

  /** The document last seen from the dispatcher; the initial one is already stored. */
  let seen = options.source.getState().project
  /** The latest document not yet written, if any. */
  let pending: Project | undefined
  /** When the oldest unsaved change happened: bounds the debounce (max wait). */
  let firstUnsavedAt: number | undefined
  let timer: unknown
  let inFlight: Promise<boolean> | undefined
  /** The snapshot being written by `inFlight`, until the write is confirmed. */
  let writing: Project | undefined
  let status: SaveStatus = 'saved'

  function setStatus(next: SaveStatus): void {
    if (next === status) return
    status = next
    for (const listener of Array.from(listeners)) listener(next)
  }

  function clearTimer(): void {
    if (timer === undefined) return
    clock.clearTimeout(timer)
    timer = undefined
  }

  function schedule(): void {
    clearTimer()
    const now = clock.now()
    firstUnsavedAt ??= now
    const due = Math.min(now + debounceMs, firstUnsavedAt + maxWaitMs)
    timer = clock.setTimeout(() => {
      timer = undefined
      void flush()
    }, Math.max(0, due - now))
  }

  function onState(state: DispatcherState): void {
    // A read-only document (newer than the app, or locked elsewhere) is never written (AD-9, AD-15):
    // a change still waiting is dropped with its timer.
    if (state.readOnly) {
      seen = state.project
      clearTimer()
      firstUnsavedAt = undefined
      if (pending !== undefined) {
        pending = undefined
        if (!inFlight) setStatus('saved')
      }
      return
    }
    if (state.project === seen) return
    seen = state.project
    pending = state.project
    setStatus('saving')
    schedule()
  }

  async function write(project: Project): Promise<boolean> {
    setStatus('saving')
    let outcome: SaveOutcome
    try {
      outcome = await options.save(project)
    } catch {
      outcome = { ok: false, reason: 'storage' }
    }
    if (outcome.ok) {
      if (pending === undefined) setStatus('saved')
      return true
    }
    // Keep the snapshot for a retry: the next change or the next flush writes it (or a newer one).
    pending ??= project
    setStatus('error')
    return false
  }

  async function flush(): Promise<void> {
    clearTimer()
    for (;;) {
      if (inFlight) {
        await inFlight
        continue
      }
      const project = pending
      if (project === undefined) return
      pending = undefined
      firstUnsavedAt = undefined
      writing = project
      const current = write(project)
      inFlight = current
      const ok = await current.finally(() => {
        if (inFlight === current) inFlight = undefined
        if (writing === project) writing = undefined
      })
      if (!ok) return
    }
  }

  const unsubscribe = options.source.subscribe(onState)

  function flushOnPageHide(): void {
    const latest = pending ?? writing
    if (latest !== undefined) options.saveNow?.(latest)
    void flush()
  }

  return {
    flush,
    flushOnPageHide,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async close() {
      unsubscribe()
      try {
        await flush()
      } finally {
        clearTimer()
      }
    },
  }
}

export interface PageLifecycleTargets {
  /** Receives `pagehide` (the window). */
  readonly window: EventTarget
  /** Receives `visibilitychange` (the document). */
  readonly document: EventTarget & { readonly visibilityState: string }
}

/**
 * AD-8: on `pagehide`, `onPageHide` (a synchronous write, then a flush); on `visibilitychange` to
 * hidden, `flush`. Returns the uninstaller.
 */
export function installPageLifecycleFlush(targets: PageLifecycleTargets, handlers: { flush: () => Promise<void>; onPageHide: () => void }): () => void {
  const onPageHide = () => handlers.onPageHide()
  const onVisibilityChange = () => {
    if (targets.document.visibilityState === 'hidden') void handlers.flush()
  }
  targets.window.addEventListener('pagehide', onPageHide)
  targets.document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    targets.window.removeEventListener('pagehide', onPageHide)
    targets.document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
