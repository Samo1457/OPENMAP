import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { duplicateProject, loadProject, type Project, toProjectId } from '@/core'
import { blankProject } from '@/core/testing/fixtures'
import { OpenmapDatabase } from './db'
import {
  createProject,
  gcMedia,
  listProjects,
  loadForView,
  loadForEdit,
  purgeExpiredTombstones,
  purgeProject,
  requestPersistOnce,
  restoreProject,
  saveProject,
  tombstoneProject,
  writePendingSaveNow,
} from './projects'

vi.mock('@/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core')>()
  return { ...actual, loadProject: vi.fn<typeof actual.loadProject>(actual.loadProject) }
})

let db: OpenmapDatabase
let clock = 1_000
const now = () => clock
let dbCount = 0

beforeEach(() => {
  dbCount += 1
  db = new OpenmapDatabase(`openmap-test-${dbCount}`)
  clock = 1_000
})

afterEach(async () => {
  db.close()
  await db.delete()
})

const project = (prefix: string, name = `Project ${prefix}`) => blankProject({ prefix, name })

async function store(p: Project, at: number): Promise<void> {
  clock = at
  expect(await createProject(db, now, p)).toEqual({ ok: true })
}

describe('database schema (AD-8)', () => {
  it('declares the projects, media, pendingSaves and libraryCache tables in version 3 of the single database', () => {
    expect(db.verno).toBe(3)
    expect(db.tables.map((table) => table.name).sort()).toEqual(['libraryCache', 'media', 'pendingSaves', 'preferences', 'projects'])
    expect(db.libraryCache.schema.primKey.keyPath).toBe('key')
    expect(db.projects.schema.primKey.keyPath).toBe('id')
    expect(db.projects.schema.indexes.map((index) => index.keyPath)).toEqual(['updatedAt'])
    expect(db.media.schema.primKey.keyPath).toBe('sha256')
  })

  it('upgrades a version 1 database and keeps its preferences', async () => {
    const name = `openmap-upgrade-${dbCount}`
    const { default: Dexie } = await import('dexie')
    const v1 = new Dexie(name)
    v1.version(1).stores({ preferences: '&key' })
    await v1.table('preferences').put({ key: 'theme', value: 'dark' })
    v1.close()
    const v2 = new OpenmapDatabase(name)
    expect(await v2.preferences.get('theme')).toEqual({ key: 'theme', value: 'dark' })
    expect(await v2.projects.count()).toBe(0)
    v2.close()
    await v2.delete()
  })
})

describe('list and load (AD-9)', () => {
  it('lists non-deleted Projects from most to least recently modified', async () => {
    await store(project('a'), 1_000)
    await store(project('b'), 3_000)
    await store(project('c'), 2_000)
    expect(await tombstoneProject(db, now, project('c').id)).toBe(true)
    const listed = await listProjects(db)
    expect(listed.map((summary) => summary.name)).toEqual(['Project b', 'Project a'])
    expect(listed[0]).toEqual({ id: project('b').id, name: 'Project b', outputFormat: '16:9', updatedAt: 3_000, state: 'ok' })
  })

  it('runs migrate then validate on every stored document it reads', async () => {
    const p = project('a')
    await store(p, 1_000)
    vi.mocked(loadProject).mockClear()
    await listProjects(db)
    const loaded = await loadForView(db, p.id)
    expect(loaded).toEqual({ kind: 'editable', project: p, lockEpoch: 0, updatedAt: 1_000 })
    expect(vi.mocked(loadProject).mock.calls.length).toBe(2)
    expect(vi.mocked(loadProject).mock.calls[1][0]).toEqual(p)
  })

  it('marks a newer document too_new and an invalid one unreadable', async () => {
    await db.projects.add({ id: 'newer', document: { schemaVersion: 4, name: 'Future' }, name: 'Future', outputFormat: '9:16', updatedAt: 5, lockEpoch: 0 })
    await db.projects.add({ id: 'broken', document: { schemaVersion: 1, name: 42 }, name: 'Broken', outputFormat: '16:9', updatedAt: 4, lockEpoch: 0 })
    await db.projects.add({ id: 'garbage', document: 'not a document', name: 7 as unknown as string, outputFormat: '', updatedAt: 3, lockEpoch: 0 })
    expect((await listProjects(db)).map(({ id, name, state }) => ({ id, name, state }))).toEqual([
      { id: 'newer', name: 'Future', state: 'too_new' },
      { id: 'broken', name: 'Broken', state: 'unreadable' },
      { id: 'garbage', name: '', state: 'unreadable' },
    ])
    expect(await loadForView(db, 'newer')).toEqual({ kind: 'too_new', name: 'Future', outputFormat: '9:16' })
    expect(await loadForEdit(db, 'broken')).toEqual({ kind: 'unreadable' })
    expect(await loadForEdit(db, 'missing')).toEqual({ kind: 'not_found' })
  })

  it('keeps the known Output Format and Map language of a newer document, and drops unknown ones', async () => {
    await db.projects.add({ id: 'known', document: { schemaVersion: 4, mapLocale: 'en' }, name: 'Known', outputFormat: '1:1', updatedAt: 5, lockEpoch: 0 })
    await db.projects.add({ id: 'unknown', document: { schemaVersion: 4, mapLocale: 'de' }, name: 'Unknown', outputFormat: '4:3', updatedAt: 4, lockEpoch: 0 })
    expect(await loadForEdit(db, 'known')).toEqual({ kind: 'too_new', name: 'Known', outputFormat: '1:1', mapLocale: 'en' })
    expect(await loadForEdit(db, 'unknown')).toEqual({ kind: 'too_new', name: 'Unknown' })
  })

  it('never writes a newer document, even with a current epoch', async () => {
    const p = project('a')
    const document = { ...p, schemaVersion: 4 }
    await db.projects.add({ id: p.id, document, name: p.name, outputFormat: '16:9', updatedAt: 5, lockEpoch: 0 })
    expect(await saveProject(db, now, p, 99)).toEqual({ ok: false, reason: 'read_only' })
    expect((await db.projects.get(p.id))?.document).toEqual(document)
  })
})

describe('save and lockEpoch (AD-8)', () => {
  it('saves a whole-document snapshot with its listing fields and time', async () => {
    const p = project('a')
    await store(p, 1_000)
    const renamed = { ...p, name: 'Renamed', outputFormat: '1:1' as const, revision: 1 }
    clock = 9_000
    expect(await saveProject(db, now, renamed, 0)).toEqual({ ok: true, updatedAt: expect.any(Number) })
    expect(await db.projects.get(p.id)).toEqual({ id: p.id, document: renamed, name: 'Renamed', outputFormat: '1:1', updatedAt: 9_000, lockEpoch: 0 })
  })

  it('gives each opening tab a newer epoch and refuses writes from an older one', async () => {
    const p = project('a')
    await store(p, 1_000)
    const first = await loadForEdit(db, p.id)
    const second = await loadForEdit(db, p.id)
    expect(first).toMatchObject({ kind: 'editable', lockEpoch: 1 })
    expect(second).toMatchObject({ kind: 'editable', lockEpoch: 2 })
    const stale = { ...p, name: 'From the older tab', revision: 1 }
    expect(await saveProject(db, now, stale, 1)).toEqual({ ok: false, reason: 'stale_epoch' })
    expect((await db.projects.get(p.id))?.name).toBe(p.name)
    expect(await saveProject(db, now, { ...p, name: 'From the newer tab', revision: 1 }, 2)).toEqual({ ok: true, updatedAt: expect.any(Number) })
    expect((await db.projects.get(p.id))?.name).toBe('From the newer tab')
  })

  it('a view read takes no epoch, an edit read takes the next one, and a document that cannot be edited takes none', async () => {
    const p = project('a')
    await store(p, 1_000)
    expect(await loadForView(db, p.id)).toMatchObject({ kind: 'editable', lockEpoch: 0, updatedAt: 1_000 })
    expect(await loadForView(db, p.id)).toMatchObject({ lockEpoch: 0 })
    expect(await loadForEdit(db, p.id)).toMatchObject({ kind: 'editable', lockEpoch: 1 })
    expect(await loadForView(db, p.id)).toMatchObject({ lockEpoch: 1 })
    await db.projects.update(p.id, { document: { ...p, schemaVersion: 4 } })
    expect(await loadForEdit(db, p.id)).toMatchObject({ kind: 'too_new' })
    expect((await db.projects.get(p.id))?.lockEpoch).toBe(1)
    expect(await loadForEdit(db, 'missing')).toEqual({ kind: 'not_found' })
  })

  it('reports the stored updatedAt of a save, strictly newer than the previous one even within one millisecond', async () => {
    const p = project('a')
    await store(p, 1_000)
    clock = 5_000
    const first = await saveProject(db, now, { ...p, revision: 1 }, 0)
    const second = await saveProject(db, now, { ...p, revision: 2 }, 0)
    expect(first).toEqual({ ok: true, updatedAt: 5_000 })
    expect(second).toEqual({ ok: true, updatedAt: 5_001 })
    expect((await db.projects.get(p.id))?.updatedAt).toBe(5_001)
    expect(await loadForView(db, p.id)).toMatchObject({ updatedAt: 5_001 })
  })

  it('refuses to create over an existing id and to save a missing Project', async () => {
    const p = project('a')
    await store(p, 1_000)
    expect(await createProject(db, now, p)).toEqual({ ok: false, reason: 'exists' })
    expect(await saveProject(db, now, project('z'), 0)).toEqual({ ok: false, reason: 'not_found' })
  })

  it('reports storage failures instead of rejecting', async () => {
    db.close()
    expect(await saveProject(db, now, project('a'), 0)).toEqual({ ok: false, reason: 'storage' })
    expect(await createProject(db, now, project('a'))).toEqual({ ok: false, reason: 'storage' })
    await db.open()
  })

  it('stores a duplicate under its own id with the same seed', async () => {
    const p = project('a')
    await store(p, 1_000)
    const copy = duplicateProject(p, toProjectId('copy'.padEnd(21, '0')))
    await store(copy, 2_000)
    const listed = await listProjects(db)
    expect(listed.map((summary) => summary.id)).toEqual([copy.id, p.id])
    const loaded = await loadForView(db, copy.id)
    expect(loaded.kind === 'editable' && loaded.project.seed).toBe(p.seed)
  })
})

describe('page-hide snapshots (AD-8)', () => {
  const renamed = (p: Project, name: string, revision: number): Project => ({ ...p, name, revision })

  it('are written without a read and applied on the next read', async () => {
    const p = project('a')
    await store(p, 1_000)
    await db.open()
    clock = 4_000
    expect(writePendingSaveNow(db, now, renamed(p, 'After page hide', 3), 0)).toBe(true)
    await expect.poll(() => db.pendingSaves.count()).toBe(1)
    expect((await listProjects(db))[0]).toMatchObject({ name: 'After page hide', updatedAt: 4_000 })
    expect(await db.pendingSaves.count()).toBe(0)
  })

  it('are dropped when a newer epoch opened the Project, when not newer, or when the document is newer than the app', async () => {
    const p = project('a')
    await store(p, 1_000)
    await db.open()
    const second = await loadForEdit(db, p.id)
    expect(second).toMatchObject({ lockEpoch: 1 })
    writePendingSaveNow(db, now, renamed(p, 'Stale tab', 5), 0)
    writePendingSaveNow(db, now, renamed(p, 'Not newer', 0), 1)
    await expect.poll(() => db.pendingSaves.count()).toBe(2)
    await loadForView(db, p.id)
    expect((await db.projects.get(p.id))?.name).toBe(p.name)
    expect(await db.pendingSaves.count()).toBe(0)

    const document = { ...p, schemaVersion: 4 }
    await db.projects.update(p.id, { document })
    writePendingSaveNow(db, now, renamed(p, 'Over a newer document', 9), 1)
    await expect.poll(() => db.pendingSaves.count()).toBe(1)
    await listProjects(db)
    expect((await db.projects.get(p.id))?.document).toEqual(document)
  })

  it('a normal save drops the snapshots it supersedes and keeps a newer one', async () => {
    const p = project('a')
    await store(p, 1_000)
    await db.open()
    writePendingSaveNow(db, now, renamed(p, 'Older snapshot', 1), 0)
    await expect.poll(() => db.pendingSaves.count()).toBe(1)
    expect(await saveProject(db, now, renamed(p, 'Saved', 2), 0)).toEqual({ ok: true, updatedAt: expect.any(Number) })
    expect(await db.pendingSaves.count()).toBe(0)

    writePendingSaveNow(db, now, renamed(p, 'Newer snapshot', 4), 0)
    await expect.poll(() => db.pendingSaves.count()).toBe(1)
    expect(await saveProject(db, now, renamed(p, 'Older save', 3), 0)).toEqual({ ok: true, updatedAt: expect.any(Number) })
    expect((await listProjects(db))[0].name).toBe('Newer snapshot')
  })

  it('is refused while the database is closed', () => {
    db.close()
    expect(writePendingSaveNow(db, now, project('a'), 0)).toBe(false)
  })
})

describe('delete: tombstone, restore, purge (AD-8, FR-52)', () => {
  it('hides a tombstone, restores it, and purges only tombstones', async () => {
    const p = project('a')
    await store(p, 1_000)
    clock = 2_000
    expect(await tombstoneProject(db, now, p.id)).toBe(true)
    expect(await listProjects(db)).toEqual([])
    expect(await loadForView(db, p.id)).toEqual({ kind: 'not_found' })
    expect((await db.projects.get(p.id))?.deletedAt).toBe(2_000)

    expect(await restoreProject(db, p.id)).toBe(true)
    expect((await db.projects.get(p.id))?.deletedAt).toBeUndefined()
    expect(await listProjects(db)).toHaveLength(1)
    expect(await purgeProject(db, p.id)).toBe(false)
    expect(await db.projects.count()).toBe(1)

    await tombstoneProject(db, now, p.id)
    expect(await saveProject(db, now, { ...p, name: 'Written after delete', revision: 1 }, 0)).toEqual({ ok: false, reason: 'not_found' })
    expect((await db.projects.get(p.id))?.name).toBe(p.name)
    expect(await purgeProject(db, p.id)).toBe(true)
    expect(await db.projects.count()).toBe(0)
    expect(await restoreProject(db, p.id)).toBe(false)
  })

  it('purges at start-up only the tombstones whose undo window has passed', async () => {
    await store(project('a'), 1_000)
    await store(project('b'), 1_000)
    await store(project('c'), 1_000)
    clock = 10_000
    await tombstoneProject(db, now, project('a').id)
    clock = 17_000
    await tombstoneProject(db, now, project('b').id)
    clock = 18_000
    expect(await purgeExpiredTombstones(db, now, 8_000)).toBe(1)
    expect((await db.projects.toCollection().primaryKeys()).sort()).toEqual([project('b').id, project('c').id].sort())
  })

  it('garbage-collects media no Project references when a Project is purged', async () => {
    const p = project('a')
    await store(p, 1_000)
    await db.media.bulkAdd([
      { sha256: 'unused', blob: new Blob(['x']) },
      { sha256: 'used', blob: new Blob(['y']) },
    ])
    expect(await gcMedia(db, () => ['used'])).toBe(1)
    expect(await db.media.toCollection().primaryKeys()).toEqual(['used'])

    await tombstoneProject(db, now, p.id)
    expect(await purgeProject(db, p.id)).toBe(true)
    expect(await db.media.count()).toBe(0)
  })

  it('keeps every media when a stored document cannot be read', async () => {
    await db.projects.add({ id: 'newer', document: { schemaVersion: 4 }, name: 'Future', outputFormat: '16:9', updatedAt: 5, lockEpoch: 0 })
    await db.media.add({ sha256: 'maybe-used', blob: new Blob(['x']) })
    expect(await gcMedia(db)).toBe(0)
    expect(await db.media.count()).toBe(1)
  })
})

describe('requestPersistOnce (AD-8)', () => {
  it('requests persistent storage on the first call only and ignores a refusal', async () => {
    const persist = vi.fn<() => Promise<boolean>>(async () => false)
    await requestPersistOnce(db, { persist })
    await requestPersistOnce(db, { persist })
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('never rejects when the request throws or storage is missing', async () => {
    await expect(requestPersistOnce(db, { persist: () => Promise.reject(new Error('denied')) })).resolves.toBeUndefined()
    await expect(requestPersistOnce(db, undefined)).resolves.toBeUndefined()
  })
})
