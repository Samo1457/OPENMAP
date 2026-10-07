import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDispatcher } from '@/core'
import { blankProject } from '@/core/testing/fixtures'
import { DATABASE_NAME } from './db'

// Pass-through spy, so one test can make the normal (asynchronous) save fail.
vi.mock('./projects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./projects')>()
  return { ...actual, saveProject: vi.fn<typeof actual.saveProject>(actual.saveProject) }
})

type Persistence = typeof import('./index')
let persistence: Persistence

// The adapter keeps module state (database, open autosaves): each test gets a fresh module and database.
beforeEach(async () => {
  vi.resetModules()
  persistence = await import('./index')
})

afterEach(async () => {
  // Deleting the database fires `versionchange` on the module's connection, which closes it.
  persistence.setVersionChangeHandler(() => undefined)
  await Dexie.delete(DATABASE_NAME)
})

async function openEditable(name: string, prefix: string) {
  const project = blankProject({ prefix, name })
  expect(await persistence.createProject(project)).toEqual({ ok: true })
  const opened = await persistence.loadProjectForEdit(project.id)
  if (opened?.kind !== 'editable') throw new Error('expected an editable Project')
  const dispatcher = createDispatcher(opened.project)
  const autosave = persistence.createAutosave({ source: dispatcher, lockEpoch: opened.lockEpoch })
  return { project, dispatcher, autosave }
}

const win = new EventTarget()
const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })

describe('persistence adapter (AD-8, AD-9)', () => {
  it('flushPendingSaves writes every open autosave at once', async () => {
    const { dispatcher, autosave } = await openEditable('Draft', 'f')
    dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name: 'Flushed' } })

    await persistence.flushPendingSaves()
    expect((await persistence.listProjects()).map((summary) => summary.name)).toEqual(['Flushed'])
    await autosave.close()
  })

  it('the page-hide save survives even when the normal save does not complete', async () => {
    const { project, dispatcher, autosave } = await openEditable('Before page hide', 'h')
    const uninstall = persistence.installPageLifecycleFlush({ window: win, document: doc })
    dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name: 'Saved on page hide' } })
    // The page is going away: the asynchronous save never lands.
    const { saveProject } = await import('./projects')
    vi.mocked(saveProject).mockResolvedValueOnce({ ok: false, reason: 'storage' })

    win.dispatchEvent(new Event('pagehide'))
    await vi.waitFor(() => expect(autosave.getStatus()).toBe('error'))
    expect((await persistence.listProjects()).find((summary) => summary.id === project.id)?.name).toBe('Saved on page hide')
    uninstall()
    await autosave.close()
  })

  it('on a schema upgrade elsewhere, flushes, closes and calls the reload handler once', async () => {
    const { project, dispatcher, autosave } = await openEditable('Before upgrade', 'v')
    dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name: 'Flushed before reload' } })

    const reload = vi.fn<() => void>()
    persistence.setVersionChangeHandler(reload)
    const upgraded = new Dexie(DATABASE_NAME)
    upgraded.version(4).stores({ preferences: '&key', projects: '&id, updatedAt', media: '&sha256', pendingSaves: '&key, projectId', libraryCache: '&key', extra: '&id' })
    await upgraded.open()

    expect(reload).toHaveBeenCalledTimes(1)
    const row = await upgraded.table('projects').get(project.id)
    expect(row.name).toBe('Flushed before reload')
    upgraded.close()
    await autosave.close()
  })
})
