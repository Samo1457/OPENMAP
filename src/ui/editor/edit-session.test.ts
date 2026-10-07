import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { blankProject } from '@/core/testing/fixtures'
import { type FakeBrowser, installFakeBrowser } from '@/testing/fake-web-locks'
import type { EditSessionState, LockStateAnnouncement, TakeoverNotice } from './edit-session'

const DATABASE_NAME = 'openmap'

// Each tab loads its own copy of the modules (own lock holds, database connection and autosaves), as a real tab does; the
// fake locks, channels and IndexedDB are shared, so they behave like tabs of one browser.

type Persistence = typeof import('@/persistence')
type SessionModule = typeof import('./edit-session')
let persistence: Persistence
let browser: FakeBrowser

beforeEach(async () => {
  browser = installFakeBrowser()
  // The adapter keeps module state (database, open autosaves, lock holds): a fresh module and database per test.
  vi.resetModules()
  persistence = await import('@/persistence')
})

afterEach(async () => {
  persistence.setVersionChangeHandler(() => undefined)
  await Dexie.delete(DATABASE_NAME)
  browser.uninstall()
})

interface Tab {
  readonly fake: import('@/testing/fake-web-locks').FakeTab
  /** This tab's own copy of the persistence module. */
  readonly persistence: Persistence
  readonly session: ReturnType<SessionModule['startEditSession']>
  readonly states: EditSessionState[]
  readonly notices: TakeoverNotice[]
  readonly announcements: LockStateAnnouncement[]
  readonly saveFailures: number[]
  state(): EditSessionState
}

interface OpenOptions {
  /** Replaces this tab's `navigator.locks` (a failing lock manager). */
  locks?: unknown
  takeoverTimeoutMs?: number
  commitPendingEdits?: () => void
}

async function openTab(projectId: string, options: OpenOptions = {}): Promise<Tab> {
  const fake = browser.newTab()
  // The modules capture `navigator.locks` when they load: this tab's copy gets this tab's view of the locks.
  vi.stubGlobal('navigator', { locks: options.locks ?? fake.locks })
  vi.resetModules()
  const tabPersistence = await import('@/persistence')
  const tabSessions = await import('./edit-session')
  vi.stubGlobal('navigator', { locks: browser.mainTab.locks })
  const tab: Tab = {
    fake,
    persistence: tabPersistence,
    states: [],
    notices: [],
    announcements: [],
    saveFailures: [],
    state: () => tab.states.at(-1) ?? { kind: 'loading' },
    session: tabSessions.startEditSession({
      projectId,
      takeoverTimeoutMs: options.takeoverTimeoutMs,
      commitPendingEdits: options.commitPendingEdits,
      onState: (next) => tab.states.push(next),
      onNotice: (notice) => tab.notices.push(notice),
      onAnnounce: (announcement) => tab.announcements.push(announcement),
      onSaveFailure: () => tab.saveFailures.push(1),
    }),
  }
  return tab
}

const settled = (tab: Tab, kind: EditSessionState['kind']) => waitFor(() => expect(tab.state().kind).toBe(kind))
async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(assertion, { timeout: 4000 })
}

async function storedProject(name = 'Shared Project') {
  const project = blankProject({ prefix: 's', name })
  expect(await persistence.createProject(project)).toEqual({ ok: true })
  return project
}

function editable(tab: Tab) {
  const state = tab.state()
  if (state.kind !== 'editable') throw new Error(`expected editable, got ${state.kind}`)
  return state
}

function readOnly(tab: Tab) {
  const state = tab.state()
  if (state.kind !== 'readOnly') throw new Error(`expected readOnly, got ${state.kind}`)
  return state
}

const rename = (tab: Tab, name: string) => editable(tab).dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name } })

async function epochOf(id: string): Promise<number> {
  const loaded = await persistence.loadProjectForView(id)
  if (loaded?.kind !== 'editable') throw new Error('not editable')
  return loaded.lockEpoch
}

describe('opening (AD-15)', () => {
  it('the first tab takes the lock before reading, takes epoch 1 and edits; the state is loading until then', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    expect(a.state().kind).toBe('loading')
    await settled(a, 'editable')
    expect(a.states.map((state) => state.kind)).toEqual(['editable'])
    expect(browser.heldNames()).toEqual([`openmap:project:${project.id}`])
    expect(await epochOf(project.id)).toBe(1)
    expect(a.announcements).toEqual([])
    a.session.dispose()
  })

  it('a second tab opens read-only with no editable flash, takes no epoch, and a Command is rejected by the dispatcher', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    expect(b.states.map((state) => state.kind)).toEqual(['readOnly'])
    expect(readOnly(b).reason).toBe('other_tab')
    expect(b.announcements).toEqual(['other_tab'])
    expect(await epochOf(project.id)).toBe(1)

    const { dispatcher } = readOnly(b)
    expect(dispatcher.getState().readOnly).toBe(true)
    expect(dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name: 'Changed in B' } })).toMatchObject({ ok: false, error: { code: 'read_only' } })
    expect(dispatcher.undo()).toMatchObject({ ok: false, error: { code: 'read_only' } })
    expect(dispatcher.redo()).toMatchObject({ ok: false, error: { code: 'read_only' } })
    expect(dispatcher.getState().project.name).toBe('Shared Project')
    a.session.dispose()
    b.session.dispose()
  })

  it('a newer document opens read-only with its own state and takes no lock', async () => {
    const project = await storedProject()
    const raw = new Dexie(DATABASE_NAME)
    await raw.open()
    await raw.table('projects').update(project.id, { document: { ...project, schemaVersion: 4 } })
    raw.close()
    const a = await openTab(project.id)
    await settled(a, 'too_new')
    expect(browser.heldNames()).toEqual([])
    expect(await epochOf(project.id).catch(() => 'newer')).toBe('newer')
    a.session.dispose()
  })

  it('a missing Project reports not_found and keeps no lock', async () => {
    const a = await openTab('missingProjectIdAAAAA')
    await settled(a, 'not_found')
    expect(browser.heldNames()).toEqual([])
    a.session.dispose()
  })

  it('a remount (close, then open the same Project at once) is the editor again, not read-only', async () => {
    const project = await storedProject()
    const first = await openTab(project.id)
    first.session.dispose()
    const second = await openTab(project.id)
    await settled(second, 'editable')
    expect(second.states.map((state) => state.kind)).toEqual(['editable'])
    second.session.dispose()
  })

  it('closing the Editor writes the pending change, then releases the lock', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    rename(a, 'Written on close')
    a.session.dispose()
    await waitFor(() => expect(browser.heldNames()).toEqual([]))
    const loaded = await persistence.loadProjectForView(project.id)
    expect(loaded?.kind === 'editable' && loaded.project.name).toBe('Written on close')
  })
})

describe('takeover (AD-15)', () => {
  it('A flushes, clears its undo and turns read-only; B reloads with an empty undo stack, epoch +1, and edits', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    rename(a, 'Last edit of A')
    expect(editable(a).dispatcher.canUndo()).toBe(true)

    b.session.takeOver()
    await settled(b, 'editable')
    await settled(a, 'readOnly')

    // A: read-only, taken_over, undo cleared, announced; its last save reached IndexedDB.
    expect(readOnly(a).reason).toBe('taken_over')
    expect(readOnly(a).dispatcher.canUndo()).toBe(false)
    expect(readOnly(a).dispatcher.getState().readOnly).toBe(true)
    expect(a.announcements).toEqual(['taken_over'])
    // B: reloaded from IndexedDB with A's last save, empty undo, epoch 2, announced.
    expect(editable(b).dispatcher.getState().project.name).toBe('Last edit of A')
    expect(editable(b).dispatcher.canUndo()).toBe(false)
    expect(editable(b).dispatcher.getState().readOnly).toBe(false)
    expect(b.announcements).toEqual(['other_tab', 'taking', 'editing'])
    expect(await epochOf(project.id)).toBe(2)
    expect(browser.heldNames()).toEqual([`openmap:project:${project.id}`])

    // B writes with the new epoch; A's old epoch is refused (the safety net).
    rename(b, 'Edit of B')
    await editable(b).autosave.flush()
    expect(await persistence.saveProject({ ...project, name: 'Late write of A', revision: 99 }, 1)).toMatchObject({ ok: false, reason: 'stale_epoch' })
    const loaded = await persistence.loadProjectForView(project.id)
    expect(loaded?.kind === 'editable' && loaded.project.name).toBe('Edit of B')
    a.session.dispose()
    b.session.dispose()
  })

  it('and back: the tab that gave way can take over again', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    b.session.takeOver()
    await settled(b, 'editable')
    await settled(a, 'readOnly')
    rename(b, 'Edit of B')
    a.session.takeOver()
    await waitFor(() => expect(a.state().kind).toBe('editable'))
    await waitFor(() => expect(b.state().kind).toBe('readOnly'))
    expect(editable(a).dispatcher.getState().project.name).toBe('Edit of B')
    expect(await epochOf(project.id)).toBe(3)
    a.session.dispose()
    b.session.dispose()
  })

  it('a failed flush blocks the takeover: A keeps the lock and its changes, B stays read-only with a notice', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    // A's pending change cannot be written: the Project was deleted behind its back.
    rename(a, 'Unsaved in A')
    const raw = new Dexie(DATABASE_NAME)
    await raw.open()
    await raw.table('projects').update(project.id, { deletedAt: 1 })
    raw.close()

    b.session.takeOver()
    await waitFor(() => expect(b.notices).toEqual(['refused']))
    expect(b.state().kind).toBe('readOnly')
    expect(readOnly(b).reason).toBe('other_tab')
    expect(a.state().kind).toBe('editable')
    expect(editable(a).dispatcher.getState().project.name).toBe('Unsaved in A')
    expect(editable(a).dispatcher.canUndo()).toBe(true)
    expect(browser.heldNames()).toEqual([`openmap:project:${project.id}`])
    // The action stays: nothing is queued behind A's back.
    expect(browser.waiting(`openmap:project:${project.id}`)).toBe(0)
    a.session.dispose()
    b.session.dispose()
  })

  it('with no answer in time B stays read-only, says so, and does not take the lock later', async () => {
    const project = await storedProject()
    // A holder that never answers: it holds the lock but runs no Editor.
    const unresponsive = await persistence.acquireProjectLock(project.id)
    expect(unresponsive.kind).toBe('held')
    const b = await openTab(project.id, { takeoverTimeoutMs: 30 })
    await settled(b, 'readOnly')
    b.session.takeOver()
    await waitFor(() => expect(b.notices).toEqual(['unresponsive']))
    expect(b.state().kind).toBe('readOnly')
    expect(browser.waiting(`openmap:project:${project.id}`)).toBe(0)

    // Once the other side is gone B says so and still does not take over by itself.
    if (unresponsive.kind === 'held') await unresponsive.lock.release()
    await waitFor(() => expect(readOnly(b).reason).toBe('holder_closed'))
    expect(browser.heldNames()).toEqual([])
    b.session.dispose()
  })

  it('a second click while a takeover is under way does nothing extra', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    b.session.takeOver()
    b.session.takeOver()
    await settled(b, 'editable')
    expect(await epochOf(project.id)).toBe(2)
    a.session.dispose()
    b.session.dispose()
  })

  it('a lock handed from tab to tab never says the other tab was closed to a tab that gave way earlier', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    const c = await openTab(project.id)
    await settled(b, 'readOnly')
    await settled(c, 'readOnly')

    b.session.takeOver()
    await settled(b, 'editable')
    await waitFor(() => expect(a.state().kind === 'readOnly' && readOnly(a).reason).toBe('taken_over'))
    // C asks the tab that now holds it; A's watch is granted in between, with the lock passing on at once.
    c.session.takeOver()
    await settled(c, 'editable')
    await waitFor(() => expect(b.state().kind === 'readOnly' && readOnly(b).reason).toBe('taken_over'))
    expect(readOnly(a).reason).toBe('taken_over')
    expect(a.announcements).toEqual(['taken_over'])
    expect(b.announcements).toEqual(['other_tab', 'taking', 'editing', 'taken_over'])
    expect(await epochOf(project.id)).toBe(3)
    a.session.dispose()
    b.session.dispose()
    c.session.dispose()
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('a third tab (message order seed %i): both read-only tabs can ask, one wins, the other becomes read-only with taken_over', async (seed) => {
    browser.reseed(seed)
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    const c = await openTab(project.id)
    await settled(b, 'readOnly')
    await settled(c, 'readOnly')

    b.session.takeOver()
    c.session.takeOver()
    // Whichever request is heard first, the settled state is one editor and two tabs saying it is edited
    // elsewhere (a tab that asks after the other has already won simply takes it from there).
    const reasonOf = (tab: Tab) => (tab.state().kind === 'readOnly' ? readOnly(tab).reason : tab.state().kind)
    await waitFor(() => {
      expect([reasonOf(a), reasonOf(b), reasonOf(c)].filter((state) => state === 'editable')).toHaveLength(1)
      expect([reasonOf(a), reasonOf(b), reasonOf(c)].filter((state) => state === 'taken_over')).toHaveLength(2)
    })
    const winner = b.state().kind === 'editable' ? b : c
    const loser = winner === b ? c : b
    expect(await epochOf(project.id)).toBeGreaterThanOrEqual(2)
    expect(browser.waiting(`openmap:project:${project.id}`)).toBe(0)
    // The loser did not queue a hidden takeover: closing the winner frees the lock for nobody.
    winner.session.dispose()
    await waitFor(() => expect(readOnly(loser).reason).toBe('holder_closed'))
    expect(browser.heldNames()).toEqual([])
    a.session.dispose()
    loser.session.dispose()
  })
})

describe('which holder a takeover is addressed to (AD-15)', () => {
  /** Stands for tab A: holds the lock, commits the next epoch, answers requests addressed to that epoch. */
  async function pretendHolder(projectId: string, answersEpoch?: number) {
    const foreign = await persistence.acquireProjectLock(projectId)
    if (foreign.kind !== 'held') throw new Error('expected the lock')
    return {
      async commitEpoch() {
        const loaded = await persistence.loadProjectForEdit(projectId)
        const epoch = loaded?.kind === 'editable' ? loaded.lockEpoch : -1
        const channel = persistence.openProjectChannel(projectId)
        persistence.serveTakeover(channel, answersEpoch ?? epoch, { flush: async () => true, yield: () => void foreign.lock.release() })
        return epoch
      },
    }
  }

  it('re-reads the stored epoch: a tab that read the row before the holder committed epoch +1 still reaches it', async () => {
    const project = await storedProject()
    const holder = await pretendHolder(project.id)
    // B opens and reads epoch 0; only then does the holder commit epoch 1 (and says nothing).
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    expect(await holder.commitEpoch()).toBe(1)
    b.session.takeOver()
    await settled(b, 'editable')
    expect(await epochOf(project.id)).toBe(2)
    b.session.dispose()
  })

  it('remembers every `took`, even one that arrives while the tab is still loading', async () => {
    const project = await storedProject()
    const holder = await pretendHolder(project.id, 5)
    const b = await openTab(project.id)
    // The announcement of epoch 5 reaches B before it has finished opening (the stored row still says 0).
    const channel = persistence.openProjectChannel(project.id)
    channel.post({ type: 'took', epoch: 5 })
    await settled(b, 'readOnly')
    await new Promise((resolve) => setTimeout(resolve, 30))
    await holder.commitEpoch()
    b.session.takeOver()
    await settled(b, 'editable')
    expect(b.notices).toEqual([])
    channel.close()
    b.session.dispose()
  })
})

describe('withdrawn and pending takeovers (AD-15)', () => {
  it('a tab closed right after pressing « Reprendre ici » does not make the holder give way', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    rename(a, 'Pending in A')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    b.session.takeOver()
    b.session.dispose()
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(a.state().kind).toBe('editable')
    expect(browser.heldNames()).toEqual([`openmap:project:${project.id}`])
    expect(a.announcements).toEqual([])
    a.session.dispose()
  })

  it('shows the takeover as under way (the action is busy) until it ends, and again idle after a refusal', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    expect(readOnly(b).taking).toBe(false)
    rename(a, 'Cannot be saved')
    const raw = new Dexie(DATABASE_NAME)
    await raw.open()
    await raw.table('projects').update(project.id, { deletedAt: 1 })
    raw.close()

    b.session.takeOver()
    b.session.takeOver()
    expect(readOnly(b).taking).toBe(true)
    expect(b.announcements).toEqual(['other_tab', 'taking'])
    await waitFor(() => expect(b.notices).toEqual(['refused']))
    await waitFor(() => expect(readOnly(b).taking).toBe(false))
    a.session.dispose()
    b.session.dispose()
  })

  it('a lock manager that fails opens the error state, never « open in another tab »', async () => {
    const project = await storedProject()
    const broken = { request: () => Promise.reject(new DOMException('denied', 'SecurityError')), query: () => Promise.resolve({ held: [], pending: [] }) }
    const a = await openTab(project.id, { locks: broken })
    await settled(a, 'error')
    expect(a.states.map((state) => state.kind)).toEqual(['error'])
    a.session.dispose()
  })
})

describe('what the holder has not saved yet (AD-15)', () => {
  it('a name still being typed is committed before the holder gives way, and reaches the taker', async () => {
    const project = await storedProject()
    let typing: Tab | undefined
    const a = await openTab(project.id, { commitPendingEdits: () => typing && rename(typing, 'Typed, not yet committed') })
    typing = a
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    b.session.takeOver()
    await settled(b, 'editable')
    expect(editable(b).dispatcher.getState().project.name).toBe('Typed, not yet committed')
    a.session.dispose()
    b.session.dispose()
  })

  it('a change made by the holder while the handshake runs is in the taker\'s document', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    b.session.takeOver()
    // The request is still travelling: A keeps editing, and the flush before it gives way writes that too.
    rename(a, 'Made during the handshake')
    await settled(b, 'editable')
    expect(editable(b).dispatcher.getState().project.name).toBe('Made during the handshake')
    a.session.dispose()
    b.session.dispose()
  })

  it('after giving way the former holder rejects every Command and never writes again', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    rename(a, 'Last of A')
    b.session.takeOver()
    await settled(b, 'editable')
    await waitFor(() => expect(a.state().kind).toBe('readOnly'))
    const before = await b.persistence.loadProjectForView(project.id)

    const { dispatcher } = readOnly(a)
    expect(dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name: 'Late' } })).toMatchObject({ ok: false, error: { code: 'read_only' } })
    expect(dispatcher.undo()).toMatchObject({ ok: false, error: { code: 'read_only' } })
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await a.persistence.flushPendingSaves()
    const after = await b.persistence.loadProjectForView(project.id)
    expect(after?.kind === 'editable' && after.updatedAt).toBe(before?.kind === 'editable' && before.updatedAt)
    expect(after?.kind === 'editable' && after.project.name).toBe('Last of A')
    const raw = new Dexie(DATABASE_NAME)
    await raw.open()
    expect(await raw.table('pendingSaves').count()).toBe(0)
    raw.close()
    a.session.dispose()
    b.session.dispose()
  })
})

describe('the holder saves (AD-15)', () => {
  it('read-only tabs refresh to a newer saved revision and ignore an older or equal one', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    const shownBefore = readOnly(b).dispatcher.getState()

    rename(a, 'Saved by A')
    await editable(a).autosave.flush()
    await waitFor(() => expect(readOnly(b).dispatcher.getState().project.name).toBe('Saved by A'))
    expect(readOnly(b).dispatcher.getState().readOnly).toBe(true)
    expect(readOnly(b).dispatcher.canUndo()).toBe(false)
    expect(b.states.filter((state) => state.kind === 'readOnly').length).toBe(1)

    // An older revision announced late changes nothing.
    const channel = persistence.openProjectChannel(project.id)
    const afterRefresh = readOnly(b).dispatcher.getState()
    channel.post({ type: 'saved', revision: 1 })
    // Equal to the revision shown: nothing changes either.
    const stored = await persistence.loadProjectForView(project.id)
    channel.post({ type: 'saved', revision: stored?.kind === 'editable' ? stored.updatedAt : 0 })
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(readOnly(b).dispatcher.getState()).toBe(afterRefresh)
    // A newer one refreshes the document in the same dispatcher (camera, selection and preview live outside it) and in the same state.
    const dispatcherBefore = readOnly(b).dispatcher
    rename(a, 'Newer still')
    await editable(a).autosave.flush()
    await waitFor(() => expect(readOnly(b).dispatcher.getState().project.name).toBe('Newer still'))
    expect(readOnly(b).dispatcher).toBe(dispatcherBefore)
    expect(b.states.every((state) => state.kind === 'readOnly')).toBe(true)
    expect(afterRefresh).not.toBe(shownBefore)
    channel.close()
    a.session.dispose()
    b.session.dispose()
  })

  it('does not announce a save that failed', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const channel = persistence.openProjectChannel(project.id)
    const received: unknown[] = []
    channel.subscribe((message) => received.push(message))
    const raw = new Dexie(DATABASE_NAME)
    await raw.open()
    await raw.table('projects').update(project.id, { deletedAt: 1 })
    raw.close()
    rename(a, 'Cannot be saved')
    await editable(a).autosave.flush()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(received.filter((message) => (message as { type: string }).type === 'saved')).toEqual([])
    expect(a.saveFailures.length).toBe(1)
    channel.close()
    a.session.dispose()
  })
})

describe('the holder closes or crashes (AD-15)', () => {
  it('B says so and keeps the action, taking nothing automatically; the action then takes the lock directly', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')

    a.session.dispose()
    await waitFor(() => expect(readOnly(b).reason).toBe('holder_closed'))
    expect(b.announcements).toEqual(['other_tab', 'holder_closed'])
    expect(browser.heldNames()).toEqual([])
    expect(await epochOf(project.id)).toBe(1)

    b.session.takeOver()
    await settled(b, 'editable')
    expect(await epochOf(project.id)).toBe(2)
    expect(b.notices).toEqual([])
    b.session.dispose()
  })

  it('a crash (the lock freed with no release) is detected the same way, and a write the holder made on page hide is folded in', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    rename(a, 'Written on page hide')
    editable(a).autosave.flushOnPageHide()
    browser.crash(`openmap:project:${project.id}`)
    await waitFor(() => expect(readOnly(b).reason).toBe('holder_closed'))
    await waitFor(() => expect(readOnly(b).dispatcher.getState().project.name).toBe('Written on page hide'))
    a.session.dispose()
    b.session.dispose()
  })

  it('when someone else takes the lock after the holder closed, the banner goes back to « open in another tab »', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    const c = await openTab(project.id)
    await settled(b, 'readOnly')
    await settled(c, 'readOnly')
    a.session.dispose()
    await waitFor(() => expect(readOnly(b).reason).toBe('holder_closed'))
    await waitFor(() => expect(readOnly(c).reason).toBe('holder_closed'))
    b.session.takeOver()
    await settled(b, 'editable')
    await waitFor(() => expect(readOnly(c).reason).toBe('other_tab'))
    b.session.dispose()
    c.session.dispose()
  })
})

describe('a Project deleted while a read-only tab shows it (AD-15)', () => {
  it('the tab keeps showing it; « Reprendre ici » reports not_found, keeps no lock and does not crash', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    const b = await openTab(project.id)
    await settled(b, 'readOnly')
    a.session.dispose()
    await waitFor(() => expect(readOnly(b).reason).toBe('holder_closed'))
    expect(await persistence.tombstoneProject(project.id)).toBe('done')

    b.session.takeOver()
    await settled(b, 'not_found')
    expect(browser.heldNames()).toEqual([])
    b.session.dispose()
  })
})

describe('Home changes while a tab edits (AD-15)', () => {
  it('delete is refused at call time while the lock is held and works once it is released', async () => {
    const project = await storedProject()
    const a = await openTab(project.id)
    await settled(a, 'editable')
    expect(await persistence.tombstoneProject(project.id)).toBe('locked')
    expect(await persistence.isProjectLocked(project.id)).toBe(true)
    a.session.dispose()
    await waitFor(() => expect(browser.heldNames()).toEqual([]))
    expect(await persistence.tombstoneProject(project.id)).toBe('done')
  })
})
