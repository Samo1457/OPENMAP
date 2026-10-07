// The edit lock of a Project across tabs (AD-15): one Web Locks lock `openmap:project:<id>` held by
// the one tab that edits it, a BroadcastChannel `openmap:project:<id>` for the takeover handshake and
// `saved(revision)`, and a global channel `openmap:locks` that tells Home which Projects are locked.
// Nothing here touches IndexedDB or the document: the epoch (AD-8) is taken by the caller, after the
// grant, in the same transaction as the read (`loadForEdit`). Reached only through ./index.ts.

/** Name of the Web Locks lock and of the BroadcastChannel of one Project. */
export const projectLockName = (projectId: string): string => `openmap:project:${projectId}`
const LOCK_PREFIX = 'openmap:project:'
/** Global channel: lock holders post `acquired(id)` and `released(id)` so Home follows the locks live. */
export const LOCKS_CHANNEL_NAME = 'openmap:locks'
/** How long a requesting tab waits for the holder's answer before it stays read-only. */
export const TAKEOVER_TIMEOUT_MS = 5000

/** Captured once, when the module loads: a tab's lock manager does not change (tests give each simulated tab its own). */
const manager: LockManager | undefined = globalThis.navigator?.locks

function lockManager(): LockManager | undefined {
  return manager
}

const resolved = Promise.resolve()
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

// ---------------------------------------------------------------- Global lock announcements

export type LockAnnouncement = { readonly type: 'acquired' | 'released'; readonly id: string }

let announcer: BroadcastChannel | undefined

function announceLock(type: LockAnnouncement['type'], id: string): void {
  try {
    if (typeof BroadcastChannel === 'undefined') return
    announcer ??= new BroadcastChannel(LOCKS_CHANNEL_NAME)
    announcer.postMessage({ type, id } satisfies LockAnnouncement)
  } catch {
    // Home then relies on its query on mount and on visibility.
  }
}

function parseAnnouncement(data: unknown): LockAnnouncement | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const { type, id } = data as { type?: unknown; id?: unknown }
  return (type === 'acquired' || type === 'released') && typeof id === 'string' ? { type, id } : undefined
}

/** Calls `listener` for every lock another part of the app (or another tab) acquires or releases. Returns the stop function. */
export function watchLockAnnouncements(listener: (announcement: LockAnnouncement) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  const channel = new BroadcastChannel(LOCKS_CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent) => {
    const announcement = parseAnnouncement(event.data)
    if (announcement) listener(announcement)
  }
  return () => channel.close()
}

/** The ids of the Projects whose edit lock is held right now, by any tab. Rejects when the query fails. */
export async function lockedProjectIds(): Promise<Set<string>> {
  const snapshot = await lockManager()?.query()
  const ids = new Set<string>()
  for (const lock of snapshot?.held ?? []) {
    if (lock.mode === 'exclusive' && lock.name?.startsWith(LOCK_PREFIX)) ids.add(lock.name.slice(LOCK_PREFIX.length))
  }
  return ids
}

// ---------------------------------------------------------------- Holding the lock

/** A lock this tab holds. */
export interface HeldLock {
  /** Tells Home (`acquired`) that this Project is edited here; the matching `released` follows `release()`. */
  announce(): void
  /**
   * Releases the lock, after `after` settles when given (the pending save is written first). Resolves
   * once the lock is free. Calling it again returns the same promise.
   */
  release(after?: Promise<unknown>): Promise<void>
}

interface Hold {
  readonly id: string
  readonly end: () => void
  /** Settles when the platform has freed the lock. */
  readonly ended: Promise<void>
  announced: boolean
  releasing?: Promise<void>
}

/** The locks this tab holds, from the grant until they are freed. */
const holds = new Map<string, Hold>()
/** Counts every grant and every release of this tab: a « busy » answer that crossed one of them is out of date. */
let ownChanges = 0

function newHold(id: string, end: () => void, ended: Promise<void>): Hold {
  const hold: Hold = { id, end, ended, announced: false }
  holds.set(id, hold)
  ownChanges += 1
  return hold
}

function toHeld(hold: Hold): HeldLock {
  return {
    announce() {
      if (hold.announced || hold.releasing) return
      hold.announced = true
      announceLock('acquired', hold.id)
    },
    release(after) {
      hold.releasing ??= (async () => {
        try {
          await after
        } catch {
          // The caller reports a failed save itself; the lock is released all the same.
        }
        hold.end()
        await hold.ended
        if (holds.get(hold.id) === hold) holds.delete(hold.id)
        ownChanges += 1
        if (hold.announced) announceLock('released', hold.id)
      })()
      return hold.releasing
    },
  }
}

const noLock: HeldLock = { announce: () => undefined, release: () => resolved }

/**
 * Requests the exclusive lock; resolves with the hold once granted, `undefined` when `ifAvailable`
 * found it taken or `signal` aborted, `'error'` when the lock manager itself failed (SecurityError…).
 */
function request(id: string, options: { ifAvailable?: boolean; signal?: AbortSignal }): Promise<Hold | undefined | 'error'> {
  const manager = lockManager()!
  return new Promise<Hold | undefined | 'error'>((resolve) => {
    let finished: () => void = () => undefined
    const ended = new Promise<void>((done) => {
      finished = done
    })
    manager
      .request(projectLockName(id), { mode: 'exclusive', ...options }, (lock) => {
        if (!lock) {
          resolve(undefined)
          return undefined
        }
        return new Promise<void>((end) => resolve(newHold(id, end, ended)))
      })
      .then(
        () => finished(),
        (error: unknown) => {
          // Aborted while queued: nothing was granted. Anything else: the lock manager failed.
          resolve((error as { name?: string } | null)?.name === 'AbortError' ? undefined : 'error')
          finished()
        },
      )
  })
}

export type LockAttempt =
  | { readonly kind: 'held'; readonly lock: HeldLock }
  | { readonly kind: 'busy' }
  /** The lock manager failed: not the same as another tab holding the Project. */
  | { readonly kind: 'error' }

/**
 * Takes the exclusive edit lock of a Project if nobody holds it (`ifAvailable`). It never waits for
 * another tab. A lock this tab itself holds only until it finishes releasing it (the Editor of the
 * same Project was just closed or remounted) is waited for, so reopening a Project here never finds
 * it « busy ».
 */
export async function acquire(projectId: string): Promise<LockAttempt> {
  if (!lockManager()) return { kind: 'held', lock: noLock }
  for (let attempt = 0; ; attempt += 1) {
    const seen = ownChanges
    const hold = await request(projectId, { ifAvailable: true })
    if (hold === 'error') return { kind: 'error' }
    if (hold) return { kind: 'held', lock: toHeld(hold) }
    const own = holds.get(projectId)
    if (own) {
      // This tab holds it: give a release that is just starting the chance to register, then wait for it.
      if (!own.releasing) await nextTask()
      if (!own.releasing) return { kind: 'busy' }
      await own.releasing
      continue
    }
    // The answer was decided before a lock of this tab was granted or freed (a remount): look again.
    if (ownChanges !== seen && attempt < 5) continue
    // Only a transient shared grant (a watcher of another tab, released at once) is in the way: look again.
    if (attempt < 5 && !(await isExclusivelyHeld(projectId))) {
      await nextTask()
      continue
    }
    return { kind: 'busy' }
  }
}

/** Whether any tab holds the exclusive lock; a failed query counts as held (the caller then answers busy). */
async function isExclusivelyHeld(projectId: string): Promise<boolean> {
  try {
    return (await lockedProjectIds()).has(projectId)
  } catch {
    return true
  }
}

/** Whether another holder (this tab included) has the lock now. Never rejects. */
export async function isProjectLocked(projectId: string): Promise<boolean> {
  try {
    return (await lockedProjectIds()).has(projectId)
  } catch {
    return false
  }
}

/**
 * Runs `run` while holding the lock, for a change made outside the Editor (Home rename, duplicate,
 * delete). `'locked'` when another tab edits the Project: checked at call time by really taking the
 * lock, so an Editor opening meanwhile cannot interleave. Nothing is announced.
 */
export async function withProjectUnlocked<T>(projectId: string, run: () => Promise<T>): Promise<T | 'locked'> {
  const attempt = await acquire(projectId)
  if (attempt.kind === 'error') throw new Error('The lock manager failed.')
  if (attempt.kind === 'busy') return 'locked'
  try {
    return await run()
  } finally {
    await attempt.lock.release()
  }
}

/**
 * Whether a tab holds the lock or is already queued for it (a takeover request). Right after a holder
 * releases, a watcher can be granted and answer before the next holder's grant shows in `held`: the
 * queued request still tells that the lock is passing on, not that nobody is left. Never rejects.
 */
export async function isProjectClaimed(projectId: string): Promise<boolean> {
  try {
    const snapshot = await lockManager()?.query()
    const name = projectLockName(projectId)
    return [...(snapshot?.held ?? []), ...(snapshot?.pending ?? [])].some((lock) => lock.name === name && lock.mode === 'exclusive')
  } catch {
    return true
  }
}

// ---------------------------------------------------------------- Watching a lock

export interface LockWatch {
  /** Resolves true when the holder is gone (closed, crashed or released), false when cancelled. */
  readonly gone: Promise<boolean>
  cancel(): void
}

/**
 * Queues a shared request on the lock: it is granted once the holder is gone, and released at once,
 * so it never blocks an exclusive request.
 */
export function watch(projectId: string): LockWatch {
  const manager = lockManager()
  const controller = new AbortController()
  if (!manager) return { gone: Promise.resolve(false), cancel: () => undefined }
  const gone = manager.request(projectLockName(projectId), { mode: 'shared', signal: controller.signal }, () => true).then(
    () => true,
    () => false,
  )
  return { gone, cancel: () => controller.abort() }
}

// ---------------------------------------------------------------- The Project channel

export type ProjectMessage =
  /** `epoch` is the `lockEpoch` of the holder the requester believes it is asking: any other holder ignores the request. */
  | { readonly type: 'takeover'; readonly requestId: string; readonly epoch: number }
  | { readonly type: 'ready'; readonly requestId: string }
  /** The requester gave up (timeout, refusal, closed): the holder must not yield for it. */
  | { readonly type: 'cancel'; readonly requestId: string }
  | { readonly type: 'refused'; readonly requestId: string }
  /** A tab became the holder, with this `lockEpoch`: tabs waiting to take over from an older holder give up. */
  | { readonly type: 'took'; readonly epoch: number }
  /** The holder saved: `revision` is the saved row's `updatedAt`. */
  | { readonly type: 'saved'; readonly revision: number }

export interface ProjectChannel {
  post(message: ProjectMessage): void
  /** Calls `listener` for every message another channel object posts; returns the unsubscribe function. */
  subscribe(listener: (message: ProjectMessage) => void): () => void
  close(): void
}

function parseMessage(data: unknown): ProjectMessage | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const { type, requestId, revision, epoch } = data as { type?: unknown; requestId?: unknown; revision?: unknown; epoch?: unknown }
  if (type === 'takeover' && typeof requestId === 'string' && typeof epoch === 'number' && Number.isFinite(epoch)) return { type, requestId, epoch }
  if ((type === 'ready' || type === 'refused' || type === 'cancel') && typeof requestId === 'string') return { type, requestId }
  if (type === 'took' && typeof epoch === 'number' && Number.isFinite(epoch)) return { type, epoch }
  if (type === 'saved' && typeof revision === 'number' && Number.isFinite(revision)) return { type, revision }
  return undefined
}

/** One channel object per open Editor: a BroadcastChannel never delivers a message to the object that posted it. */
export function openProjectChannel(projectId: string): ProjectChannel {
  if (typeof BroadcastChannel === 'undefined') return { post: () => undefined, subscribe: () => () => undefined, close: () => undefined }
  const channel = new BroadcastChannel(projectLockName(projectId))
  const listeners = new Set<(message: ProjectMessage) => void>()
  channel.onmessage = (event: MessageEvent) => {
    const message = parseMessage(event.data)
    if (message) for (const listener of Array.from(listeners)) listener(message)
  }
  return {
    post(message) {
      try {
        channel.postMessage(message)
      } catch {
        // A closed channel: the tab is being torn down.
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    close() {
      listeners.clear()
      channel.close()
    },
  }
}

// ---------------------------------------------------------------- Takeover handshake

export interface TakeoverHandlers {
  /** Writes this tab's own pending save; true only when it succeeded. */
  flush(): Promise<boolean>
  /**
   * Called synchronously right after `ready` is posted: the holder clears its undo stack, turns
   * read-only and releases the lock. Not called when the flush failed.
   */
  yield(): void
}

/**
 * The holder's side (its `lockEpoch` is `epoch`): answers `takeover` by flushing its own save. A
 * failed flush answers `refused` and keeps the lock; otherwise `ready` is posted, then `yield()`
 * runs. Requests that arrive while flushing get the same answer. A request addressed to another
 * epoch (made to a holder that has since given way) is ignored. Returns the stop function.
 */
export function serveTakeover(channel: ProjectChannel, epoch: number, handlers: TakeoverHandlers): () => void {
  let waiting: string[] | undefined
  let stopped = false
  const unsubscribe = channel.subscribe((message) => {
    if (stopped) return
    if (message.type === 'cancel') {
      // A requester that gave up while the flush runs: it is no longer answered.
      if (waiting) waiting = waiting.filter((requestId) => requestId !== message.requestId)
      return
    }
    if (message.type !== 'takeover' || message.epoch !== epoch) return
    if (waiting) {
      waiting.push(message.requestId)
      return
    }
    waiting = [message.requestId]
    void (async () => {
      let flushed = false
      try {
        flushed = await handlers.flush()
      } catch {
        flushed = false
      }
      const requests = waiting ?? []
      waiting = undefined
      if (stopped) return
      // Every requester withdrew meanwhile: the holder keeps the lock and says nothing.
      if (requests.length === 0) return
      if (!flushed) {
        for (const requestId of requests) channel.post({ type: 'refused', requestId })
        return
      }
      for (const requestId of requests) channel.post({ type: 'ready', requestId })
      stopped = true
      unsubscribe()
      handlers.yield()
    })()
  })
  return () => {
    stopped = true
    unsubscribe()
  }
}

export type TakeoverOutcome =
  | { readonly kind: 'held'; readonly lock: HeldLock }
  /** The holder could not save, so it kept the lock. */
  | { readonly kind: 'refused' }
  /** Nobody answered in time while the lock is held. */
  | { readonly kind: 'timeout' }
  | { readonly kind: 'cancelled' }

export interface TakeoverRequest {
  readonly outcome: Promise<TakeoverOutcome>
  /** Gives up: the queued lock request is withdrawn, so the lock is never taken later by surprise. */
  cancel(): void
}

let requestCounter = 0

/**
 * The requesting tab's side: queues an exclusive lock request and posts `takeover` to the holder
 * whose `lockEpoch` is `epoch`. The holder answers `ready` (then releases: the request is granted),
 * or `refused` when it could not save. With no answer within `timeoutMs` the request is withdrawn.
 */
export function requestTakeover(projectId: string, channel: ProjectChannel, epoch: number, timeoutMs: number = TAKEOVER_TIMEOUT_MS): TakeoverRequest {
  const requestId = `${Date.now().toString(36)}-${(requestCounter += 1)}-${Math.random().toString(36).slice(2, 8)}`
  const controller = new AbortController()
  let settle: (outcome: TakeoverOutcome) => void = () => undefined
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: () => void = () => undefined
  const outcome = new Promise<TakeoverOutcome>((resolve) => {
    settle = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe()
      resolve(value)
    }
  })
  unsubscribe = channel.subscribe((message) => {
    // The holder is handing the lock over to another requester: it is alive, so this request is not
    // « unanswered », it is waiting for the new holder (whose `took` ends it). Give it the full time again.
    if (message.type === 'ready' && message.requestId !== requestId && !settled) {
      clearTimeout(timer)
      timer = setTimeout(() => withdraw('timeout'), timeoutMs)
      return
    }
    if (!('requestId' in message) || message.requestId !== requestId) return
    if (message.type === 'ready') {
      // The holder is yielding: wait for the lock itself, with no further timeout.
      clearTimeout(timer)
    } else if (message.type === 'refused') {
      controller.abort()
      channel.post({ type: 'cancel', requestId })
      settle({ kind: 'refused' })
    }
  })
  const withdraw = (kind: 'timeout' | 'cancelled') => {
    if (settled) return
    controller.abort()
    // Tells the holder not to yield for a requester that is gone.
    channel.post({ type: 'cancel', requestId })
    settle({ kind })
  }
  timer = setTimeout(() => withdraw('timeout'), timeoutMs)
  // A tab closed mid-request withdraws it too.
  const onPageHide = () => withdraw('cancelled')
  globalThis.addEventListener?.('pagehide', onPageHide)
  void outcome.then(() => globalThis.removeEventListener?.('pagehide', onPageHide))

  void request(projectId, { signal: controller.signal }).then((hold) => {
    if (!hold || hold === 'error') {
      // The lock manager failed: the request cannot succeed.
      if (hold === 'error') withdraw('cancelled')
      return
    }
    const lock = toHeld(hold)
    if (settled) void lock.release()
    else settle({ kind: 'held', lock })
  })
  channel.post({ type: 'takeover', requestId, epoch })
  return { outcome, cancel: () => withdraw('cancelled') }
}
