// The edit session of one open Project (AD-15, AD-3, AD-8): which tab may edit it. It takes the Web
// Locks lock before the document is read, opens read-only when another tab holds it, runs the
// takeover handshake, follows the holder's saves and releases the lock when the Editor closes. No
// React here: the EditorShell renders the states it emits.

import { createDispatcher, type Dispatcher, type MapLocale, type OutputFormat } from '@/core'
import {
  acquireProjectLock,
  type Autosave,
  createAutosave,
  type HeldLock,
  isProjectClaimed,
  loadProjectForEdit,
  loadProjectForView,
  type LoadedProject,
  openProjectChannel,
  requestTakeover,
  serveTakeover,
  type TakeoverRequest,
  type LockWatch,
  watchProjectLock,
} from '@/persistence'
import { createSaveIndicator, type SaveIndicatorStore } from './save-status'

/** Why a tab shows the Project read-only while it is still editable by another tab. */
export type ReadOnlyReason = 'other_tab' | 'taken_over' | 'holder_closed'

/** A takeover that did not happen, told with a toast; the banner and its action stay. */
export type TakeoverNotice = 'refused' | 'unresponsive'

/** What is announced to screen readers when the state changes. */
export type LockStateAnnouncement = ReadOnlyReason | 'editing' | 'taking'

export type EditSessionState =
  | { kind: 'loading' }
  | { kind: 'editable'; dispatcher: Dispatcher; autosave: Autosave; saveStatus: SaveIndicatorStore }
  /** `taking`: « Reprendre ici » was pressed and the takeover is under way (the action shows it and ignores more clicks). */
  | { kind: 'readOnly'; dispatcher: Dispatcher; reason: ReadOnlyReason; taking: boolean }
  | { kind: 'too_new'; name: string; outputFormat?: OutputFormat; mapLocale?: MapLocale }
  | { kind: 'unreadable' }
  | { kind: 'not_found' }
  | { kind: 'error' }

export interface EditSessionOptions {
  readonly projectId: string
  onState(state: EditSessionState): void
  onNotice(notice: TakeoverNotice): void
  onAnnounce(announcement: LockStateAnnouncement): void
  /** A save failed or was refused (shown once per failure). */
  onSaveFailure(): void
  /** Commits what a field of the panel still holds as an uncommitted draft; called before the holder's last save on a takeover. */
  commitPendingEdits?(): void
  /** Handshake timeout, in ms (the default is 5 s). */
  readonly takeoverTimeoutMs?: number
}

export interface EditSession {
  /** « Reprendre ici »: takes the lock, after the holder's last save. Ignored unless read-only, or while one is under way. */
  takeOver(): void
  /** Writes what is pending, then releases the lock and everything the session holds. */
  dispose(): void
}

function unopenable(loaded: Exclude<LoadedProject, { kind: 'editable' }>): EditSessionState {
  return loaded.kind === 'too_new' ? { ...loaded } : { kind: loaded.kind }
}

export function startEditSession(options: EditSessionOptions): EditSession {
  const { projectId } = options
  const channel = openProjectChannel(projectId)
  let disposed = false
  let state: EditSessionState = { kind: 'loading' }
  let dispatcher: Dispatcher | undefined
  /** The lock, while this tab is the editor. */
  let held: HeldLock | undefined
  let autosave: Autosave | undefined
  let saveStatus: SaveIndicatorStore | undefined
  let stopServing: (() => void) | undefined
  let watching: LockWatch | undefined
  let takeover: { request: TakeoverRequest; supersededByOther: boolean } | undefined
  /** The `updatedAt` of the stored document the dispatcher shows. */
  let shown = 0
  /** The `lockEpoch` of the tab that holds the lock, as far as this tab knows: what a takeover request is addressed to. */
  let knownEpoch = 0
  let refreshing: Promise<void> = Promise.resolve()
  let taking = false
  /** The holder epoch the pending takeover request is addressed to. */
  let requestedEpoch = 0

  const emit = (next: EditSessionState) => {
    state = next
    options.onState(next)
  }

  const readOnlyAs = (reason: ReadOnlyReason) => {
    if (dispatcher) emit({ kind: 'readOnly', dispatcher, reason, taking })
  }

  /** Reloads the stored document into the read-only dispatcher when it is newer than the one shown. */
  function refresh(): Promise<void> {
    refreshing = refreshing.then(async () => {
      if (disposed || held || !dispatcher) return
      const loaded = await loadProjectForView(projectId)
      // Not editable any more (deleted, replaced by a newer app): keep what is shown; « Reprendre ici »
      // then reports it.
      if (disposed || held || !dispatcher || loaded?.kind !== 'editable') return
      knownEpoch = Math.max(knownEpoch, loaded.lockEpoch)
      if (loaded.updatedAt <= shown) return
      shown = loaded.updatedAt
      dispatcher.reset(loaded.project)
    })
    return refreshing
  }

  function armWatch(): void {
    watching?.cancel()
    const current = watchProjectLock(projectId)
    watching = current
    void current.gone.then(async (gone) => {
      if (!gone || disposed || watching !== current || held) return
      watching = undefined
      // Taking over: the holder leaving is what this tab asked for, not news.
      if (taking) return
      // The holder may have written on page hide: fold that in before showing the document.
      await refresh()
      // The lock may have passed straight to a tab that asked for it: then nobody « closed ».
      const handedOver = await isProjectClaimed(projectId)
      if (disposed || held || taking || state.kind !== 'readOnly') return
      if (handedOver) return armWatch()
      readOnlyAs('holder_closed')
      options.onAnnounce('holder_closed')
    })
  }

  /** Holds the lock: reads the document with the next epoch and becomes the editor. */
  async function becomeEditor(lock: HeldLock, viaTakeover: boolean): Promise<void> {
    const loaded = await loadProjectForEdit(projectId)
    if (disposed) {
      void lock.release()
      return
    }
    if (loaded?.kind !== 'editable') {
      // Nothing to edit (deleted, newer than the app, unreadable, storage down): no lock is kept.
      void lock.release()
      watching?.cancel()
      watching = undefined
      emit(loaded ? unopenable(loaded) : { kind: 'error' })
      return
    }
    watching?.cancel()
    watching = undefined
    held = lock
    shown = loaded.updatedAt
    if (dispatcher) {
      dispatcher.reset(loaded.project)
      dispatcher.setReadOnly(false)
    } else {
      dispatcher = createDispatcher(loaded.project)
    }
    const source = dispatcher
    const saves = createAutosave({
      source,
      lockEpoch: loaded.lockEpoch,
      onSaved: (updatedAt) => {
        shown = updatedAt
        channel.post({ type: 'saved', revision: updatedAt })
      },
    })
    const indicator = createSaveIndicator(saves, options.onSaveFailure)
    autosave = saves
    saveStatus = indicator
    stopServing = serveTakeover(channel, loaded.lockEpoch, {
      // Only this tab's own pending save; a failed one keeps the lock (the requester stays read-only).
      flush: async () => {
        // A name typed but not yet committed is part of the holder's work: commit it, then write.
        options.commitPendingEdits?.()
        await saves.flush()
        return saves.getStatus() !== 'error'
      },
      yield: () => yieldLock(source, saves, indicator),
    })
    lock.announce()
    channel.post({ type: 'took', epoch: loaded.lockEpoch })
    emit({ kind: 'editable', dispatcher: source, autosave: saves, saveStatus: indicator })
    if (viaTakeover) options.onAnnounce('editing')
  }

  /** The holder's side of a takeover, once its save is written and `ready` is posted. */
  function yieldLock(source: Dispatcher, saves: Autosave, indicator: SaveIndicatorStore): void {
    const lock = held
    held = undefined
    source.clear()
    source.setReadOnly(true)
    autosave = undefined
    saveStatus = undefined
    stopServing = undefined
    if (lock) void lock.release(saves.close())
    indicator.dispose()
    readOnlyAs('taken_over')
    options.onAnnounce('taken_over')
    armWatch()
  }

  async function open(): Promise<void> {
    const attempt = await acquireProjectLock(projectId)
    if (disposed) {
      if (attempt.kind === 'held') void attempt.lock.release()
      return
    }
    if (attempt.kind === 'error') return emit({ kind: 'error' })
    if (attempt.kind === 'held') return becomeEditor(attempt.lock, false)
    // Another tab holds the lock: show the stored document read-only (no epoch is taken).
    const loaded = await loadProjectForView(projectId)
    if (disposed) return
    if (loaded?.kind !== 'editable') return emit(loaded ? unopenable(loaded) : { kind: 'error' })
    shown = loaded.updatedAt
    knownEpoch = Math.max(knownEpoch, loaded.lockEpoch)
    dispatcher = createDispatcher(loaded.project, { readOnly: true })
    readOnlyAs('other_tab')
    options.onAnnounce('other_tab')
    armWatch()
    // A save announced between the read and now is picked up.
    void refresh()
  }

  channel.subscribe((message) => {
    if (disposed || held) return
    if (message.type === 'saved') {
      if (message.revision > shown) void refresh()
    } else if (message.type === 'took') {
      // Always remembered, whatever this tab is doing (it may still be loading): requests are addressed to it.
      knownEpoch = Math.max(knownEpoch, message.epoch)
      if (state.kind !== 'readOnly') return
      // Another tab became the editor: a tab waiting to take over from an older holder gives way (the
      // holder it asked is gone, and the new one never heard the request), a tab told that the holder
      // closed learns that someone holds it again.
      if (takeover && message.epoch > requestedEpoch) {
        takeover.supersededByOther = true
        takeover.request.cancel()
      } else if (state.reason === 'holder_closed') {
        readOnlyAs('other_tab')
        options.onAnnounce('other_tab')
        armWatch()
      }
    }
  })

  async function takeOver(): Promise<void> {
    if (disposed || state.kind !== 'readOnly' || taking) return
    taking = true
    readOnlyAs(state.reason)
    options.onAnnounce('taking')
    try {
      // Nobody holds it (closed or crashed holder): taken directly, no handshake.
      const direct = await acquireProjectLock(projectId)
      if (disposed) {
        if (direct.kind === 'held') void direct.lock.release()
        return
      }
      if (direct.kind === 'error') return emit({ kind: 'error' })
      if (direct.kind === 'held') return await becomeEditor(direct.lock, true)
      // Address the request to the real holder: its epoch is stored before it announces itself.
      const fresh = await loadProjectForView(projectId)
      if (fresh?.kind === 'editable') knownEpoch = Math.max(knownEpoch, fresh.lockEpoch)
      if (disposed) return
      requestedEpoch = knownEpoch
      const request = requestTakeover(projectId, channel, requestedEpoch, options.takeoverTimeoutMs)
      takeover = { request, supersededByOther: false }
      const outcome = await request.outcome
      const superseded = takeover.supersededByOther
      takeover = undefined
      if (disposed) {
        if (outcome.kind === 'held') void outcome.lock.release()
        return
      }
      if (outcome.kind === 'held') return await becomeEditor(outcome.lock, true)
      if (outcome.kind === 'refused') options.onNotice('refused')
      else if (outcome.kind === 'timeout') options.onNotice('unresponsive')
      else if (superseded && state.kind === 'readOnly') {
        readOnlyAs('taken_over')
        options.onAnnounce('taken_over')
      }
    } finally {
      taking = false
      if (!disposed && !held && state.kind === 'readOnly') {
        readOnlyAs(state.reason)
        // Still read-only and the watch fired meanwhile: look again, so the banner tells the truth.
        if (!watching) armWatch()
      }
    }
  }

  void open()

  return {
    takeOver: () => void takeOver(),
    dispose() {
      if (disposed) return
      disposed = true
      watching?.cancel()
      takeover?.request.cancel()
      stopServing?.()
      channel.close()
      if (held) {
        // The pending save is written before the lock is released.
        const closing = autosave?.close()
        saveStatus?.dispose()
        void held.release(closing)
        held = undefined
      }
    },
  }
}
