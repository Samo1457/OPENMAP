import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { blankProject } from '@/core/testing/fixtures'
import { type FakeBrowser, installFakeBrowser } from '@/testing/fake-web-locks'
import type { EditSessionState } from '@/ui/editor/edit-session'

type Persistence = typeof import('@/persistence')
type Actions = typeof import('./project-actions')
let persistence: Persistence
let actions: Actions
let browser: FakeBrowser

beforeEach(async () => {
  browser = installFakeBrowser()
  vi.resetModules()
  persistence = await import('@/persistence')
  actions = await import('./project-actions')
})

afterEach(async () => {
  persistence.setVersionChangeHandler(() => undefined)
  await Dexie.delete('openmap')
  browser.uninstall()
})

async function store() {
  const project = blankProject({ prefix: 'h', name: 'Home Project' })
  expect(await persistence.createProject(project)).toEqual({ ok: true })
  return project
}

describe('Home changes under the edit lock (AD-15)', () => {
  it('rename and duplicate go through while nobody edits, and leave no lock behind', async () => {
    const project = await store()
    expect(await actions.renameStored(project.id, 'Renamed')).toBe('done')
    expect(await actions.duplicateStored(project.id, (name) => `${name} (copy)`)).toBe('done')
    expect((await persistence.listProjects()).map((summary) => summary.name).sort()).toEqual(['Renamed', 'Renamed (copy)'])
    expect(browser.heldNames()).toEqual([])
  })

  it('rename, duplicate and delete are refused at call time while another tab holds the lock, whatever the UI showed', async () => {
    const project = await store()
    const editor = await persistence.acquireProjectLock(project.id)
    expect(editor.kind).toBe('held')

    expect(await actions.renameStored(project.id, 'Renamed')).toBe('locked')
    expect(await actions.duplicateStored(project.id, (name) => `${name} (copy)`)).toBe('locked')
    expect(await persistence.tombstoneProject(project.id)).toBe('locked')
    expect((await persistence.listProjects()).map((summary) => summary.name)).toEqual(['Home Project'])

    if (editor.kind === 'held') await editor.lock.release()
    expect(await actions.renameStored(project.id, 'Renamed')).toBe('done')
    expect(await persistence.tombstoneProject(project.id)).toBe('done')
    expect(await persistence.listProjects()).toEqual([])
  })

  it('a rename that cannot be saved reports failed, not locked', async () => {
    expect(await actions.renameStored('missingProjectIdAAAAA', 'Renamed')).toBe('failed')
  })

  it('an Editor opening while a Home change is under way is read-only, sees the change once it is saved, and one opened after is editable with the next epoch and the new name', async () => {
    const project = await store()
    // The Editor of another tab: its own modules, the shared locks, channels and IndexedDB.
    async function editorTab() {
      const tab = browser.newTab()
      vi.stubGlobal('navigator', { locks: tab.locks })
      vi.resetModules()
      const tabPersistence = await import('@/persistence')
      const tabSessions = await import('@/ui/editor/edit-session')
      vi.stubGlobal('navigator', { locks: browser.mainTab.locks })
      const states: EditSessionState[] = []
      const session = tabSessions.startEditSession({
        projectId: project.id,
        onState: (next) => states.push(next),
        onNotice: () => undefined,
        onAnnounce: () => undefined,
        onSaveFailure: () => undefined,
      })
      return { session, states, persistence: tabPersistence, state: () => states.at(-1) }
    }

    let finish: () => void = () => undefined
    const gate = new Promise<void>((resolve) => (finish = resolve))
    const homeChange = persistence.changeUnlockedProject(project.id, async () => {
      await gate
      const loaded = await persistence.loadProjectForView(project.id)
      if (loaded?.kind !== 'editable') return false
      return (await persistence.saveProject({ ...loaded.project, name: 'Renamed by Home', revision: loaded.project.revision + 1 }, loaded.lockEpoch)).ok
    })
    await vi.waitFor(() => expect(browser.heldNames()).toEqual([`openmap:project:${project.id}`]))

    const during = await editorTab()
    await vi.waitFor(() => expect(during.state()?.kind).toBe('readOnly'))
    const shown = during.state()
    expect(shown?.kind === 'readOnly' && shown.dispatcher.getState().project.name).toBe('Home Project')

    finish()
    expect(await homeChange).toBe('done')
    // It refreshed to the renamed document, and says the other side is gone; nothing was taken by itself.
    await vi.waitFor(() => expect(shown?.kind === 'readOnly' && shown.dispatcher.getState().project.name).toBe('Renamed by Home'))
    await vi.waitFor(() => expect(during.state()).toMatchObject({ kind: 'readOnly', reason: 'holder_closed' }))
    expect(browser.heldNames()).toEqual([])
    during.session.dispose()

    const after = await editorTab()
    await vi.waitFor(() => expect(after.state()?.kind).toBe('editable'))
    const editing = after.state()
    expect(editing?.kind === 'editable' && editing.dispatcher.getState().project.name).toBe('Renamed by Home')
    const stored = await persistence.loadProjectForView(project.id)
    expect(stored?.kind === 'editable' && stored.lockEpoch).toBe(1)
    after.session.dispose()
  })
})
