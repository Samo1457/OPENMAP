// The `projects` and `media` tables (AD-8, AD-9): whole-document snapshots, tombstones, lockEpoch
// checks and media garbage collection. Reached only through ./index.ts.

import { loadProject, MAP_LOCALES, type MapLocale, migrate, OUTPUT_FORMATS, type OutputFormat, type Project } from '@/core'
import type { OpenmapDatabase, PendingSaveRow, ProjectRow } from './db'

/** How a stored document reads with this app version (AD-9). */
export type StoredProjectState = 'ok' | 'too_new' | 'unreadable'

/** One Home card: the listing fields of a non-deleted row. */
export interface ProjectSummary {
  readonly id: string
  readonly name: string
  readonly outputFormat: string
  readonly updatedAt: number
  readonly state: StoredProjectState
}

export type LoadedProject =
  /**
   * A valid document after migration; `lockEpoch` is the epoch this caller writes with and
   * `updatedAt` the stored revision (the row's last save time) the document was read at.
   */
  | { readonly kind: 'editable'; readonly project: Project; readonly lockEpoch: number; readonly updatedAt: number }
  /**
   * Written by a newer app: opens read-only and is never written (AD-9). The Output Format and Map
   * language are shown when the stored values are ones this app knows.
   */
  | { readonly kind: 'too_new'; readonly name: string; readonly outputFormat?: OutputFormat; readonly mapLocale?: MapLocale }
  | { readonly kind: 'unreadable' }
  /** No row, or a tombstone. */
  | { readonly kind: 'not_found' }

export type SaveFailure =
  /** A tab with a newer `lockEpoch` has opened the Project (AD-8, AD-15). */
  | 'stale_epoch'
  /** The stored document is newer than this app and must not be overwritten (AD-9). */
  | 'read_only'
  | 'not_found'
  /** `createProject` with an id that is already stored. */
  | 'exists'
  /** IndexedDB failed or is unavailable. */
  | 'storage'

export type SaveOutcome = { readonly ok: true } | { readonly ok: false; readonly reason: SaveFailure }

/** A save that succeeded also says the `updatedAt` it stored: the revision other tabs refresh to (AD-15). */
export type SavedOutcome = { readonly ok: true; readonly updatedAt: number } | { readonly ok: false; readonly reason: SaveFailure }

type Classified = { state: 'ok'; project: Project } | { state: 'too_new' } | { state: 'unreadable' }

/** Every load path runs migrate, then validate (AD-9). */
function classify(document: unknown): Classified {
  try {
    const loaded = loadProject(document)
    if (loaded.ok) return { state: 'ok', project: loaded.value }
    return loaded.error.code === 'schema_too_new' ? { state: 'too_new' } : { state: 'unreadable' }
  } catch {
    // A missing migration is a programmer error; the stored document is still unusable here.
    return { state: 'unreadable' }
  }
}

function isNewerThanApp(document: unknown): boolean {
  const migrated = migrate(document)
  return !migrated.ok && migrated.error.code === 'schema_too_new'
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined => values.find((known) => known === value)
const field = (document: unknown, key: string): unknown =>
  typeof document === 'object' && document !== null ? (document as Record<string, unknown>)[key] : undefined

function tooNew(row: ProjectRow): LoadedProject {
  const outputFormat = oneOf(OUTPUT_FORMATS, row.outputFormat)
  const mapLocale = oneOf(MAP_LOCALES, field(row.document, 'mapLocale'))
  return { kind: 'too_new', name: text(row.name), ...(outputFormat && { outputFormat }), ...(mapLocale && { mapLocale }) }
}

function rowFor(project: Project, updatedAt: number, lockEpoch: number, deletedAt?: number): ProjectRow {
  const row: ProjectRow = { id: project.id, document: project, name: project.name, outputFormat: project.outputFormat, updatedAt, lockEpoch }
  if (deletedAt !== undefined) row.deletedAt = deletedAt
  return row
}

/** Non-deleted Projects, most recently modified first. Rejects when IndexedDB fails. */
export async function listProjects(db: OpenmapDatabase): Promise<ProjectSummary[]> {
  await applyPendingSaves(db)
  const rows = await db.projects.orderBy('updatedAt').reverse().toArray()
  return rows
    .filter((row) => row.deletedAt === undefined)
    .map((row) => {
      const classified = classify(row.document)
      if (classified.state === 'ok') {
        const { project } = classified
        return { id: row.id, name: project.name, outputFormat: project.outputFormat, updatedAt: row.updatedAt, state: 'ok' }
      }
      return { id: row.id, name: text(row.name), outputFormat: text(row.outputFormat), updatedAt: row.updatedAt, state: classified.state }
    })
}

function loaded(row: ProjectRow | undefined, lockEpoch: (row: ProjectRow) => number): LoadedProject {
  if (!row || row.deletedAt !== undefined) return { kind: 'not_found' }
  const classified = classify(row.document)
  if (classified.state === 'ok') return { kind: 'editable', project: classified.project, lockEpoch: lockEpoch(row), updatedAt: row.updatedAt }
  if (classified.state === 'too_new') return tooNew(row)
  return { kind: 'unreadable' }
}

/**
 * Reads a Project without taking an epoch (a read-only tab, a one-off Home edit): the epoch it
 * returns is the stored one, which this caller must not write with unless it holds the edit lock.
 */
export async function loadForView(db: OpenmapDatabase, id: string): Promise<LoadedProject> {
  await applyPendingSaves(db)
  return loaded(await db.projects.get(id), (row) => row.lockEpoch)
}

/**
 * Opens a Project for editing: takes the next `lockEpoch`, so writes from a tab that opened it
 * earlier are refused from now on (AD-8). Called only once the tab holds the edit lock (AD-15,
 * `project-lock.ts`): the increment and the read are one transaction. A Project that is not
 * editable (newer, unreadable, missing) takes no epoch.
 */
export async function loadForEdit(db: OpenmapDatabase, id: string): Promise<LoadedProject> {
  await applyPendingSaves(db)
  return db.transaction('rw', db.projects, async () => {
    const row = await db.projects.get(id)
    const result = loaded(row, (current) => current.lockEpoch + 1)
    if (row && result.kind === 'editable') await db.projects.update(id, { lockEpoch: result.lockEpoch })
    return result
  })
}

async function guarded<T extends SaveOutcome>(write: () => Promise<T>): Promise<T | { ok: false; reason: 'storage' }> {
  try {
    return await write()
  } catch {
    return { ok: false, reason: 'storage' }
  }
}

/** Stores a new Project (create, duplicate). Never rejects. */
export function createProject(db: OpenmapDatabase, now: () => number, project: Project): Promise<SaveOutcome> {
  return guarded(() =>
    db.transaction('rw', db.projects, async (): Promise<SaveOutcome> => {
      if (await db.projects.get(project.id)) return { ok: false, reason: 'exists' }
      await db.projects.add(rowFor(project, now(), 0))
      return { ok: true }
    }),
  )
}

/**
 * Saves a whole-document snapshot (AD-8). Refused when a newer epoch has opened the Project,
 * when the stored document is newer than this app (AD-9), or when the row is gone or deleted.
 * Never rejects.
 */
export function saveProject(db: OpenmapDatabase, now: () => number, project: Project, lockEpoch: number): Promise<SavedOutcome> {
  return guarded(() =>
    db.transaction('rw', db.projects, db.pendingSaves, async (): Promise<SavedOutcome> => {
      const row = await db.projects.get(project.id)
      // A deleted Project (tombstone) is not written back.
      if (!row || row.deletedAt !== undefined) return { ok: false, reason: 'not_found' }
      if (row.lockEpoch > lockEpoch) return { ok: false, reason: 'stale_epoch' }
      if (isNewerThanApp(row.document)) return { ok: false, reason: 'read_only' }
      const epoch = Math.max(row.lockEpoch, lockEpoch)
      // Strictly increasing, so a refreshing tab can tell a newer save from the one it shows.
      const updatedAt = Math.max(now(), row.updatedAt + 1)
      await db.projects.put(rowFor(project, updatedAt, epoch))
      // Page-hide snapshots this save supersedes (older epoch, or not newer) are dropped.
      const superseded = (await db.pendingSaves.where('projectId').equals(project.id).toArray()).filter(
        (entry) => entry.lockEpoch < epoch || revisionOf(entry.document) <= project.revision,
      )
      await db.pendingSaves.bulkDelete(superseded.map((entry) => entry.key))
      return { ok: true, updatedAt }
    }),
  )
}

const revisionOf = (document: unknown): number => {
  const revision = (document as { revision?: unknown } | null)?.revision
  return typeof revision === 'number' ? revision : -1
}

/**
 * The page-hide save (AD-8): on `pagehide` only a write issued synchronously and committed at once
 * survives the page, so this puts the snapshot into `pendingSaves` without reading anything first.
 * Returns false when the database is not open. `applyPendingSaves` checks it later.
 */
export function writePendingSaveNow(db: OpenmapDatabase, now: () => number, project: Project, lockEpoch: number): boolean {
  if (!db.isOpen()) return false
  try {
    const entry: PendingSaveRow = { key: `${project.id}#${lockEpoch}`, projectId: project.id, document: project, lockEpoch, savedAt: now() }
    const transaction = db.backendDB().transaction('pendingSaves', 'readwrite')
    transaction.objectStore('pendingSaves').put(entry)
    transaction.commit()
    return true
  } catch {
    return false
  }
}

/**
 * Folds page-hide snapshots into `projects`, with the checks a normal save has: the row exists,
 * is not newer than the app (AD-9), no newer epoch has opened it (AD-8), and the snapshot is newer
 * than what is stored. Every entry is then removed. Runs before each read of the Projects.
 */
export async function applyPendingSaves(db: OpenmapDatabase): Promise<void> {
  if ((await db.pendingSaves.count()) === 0) return
  await db.transaction('rw', db.projects, db.pendingSaves, async () => {
    const entries = await db.pendingSaves.toArray()
    for (const projectId of new Set(entries.map((entry) => entry.projectId))) {
      const row = await db.projects.get(projectId)
      if (!row || isNewerThanApp(row.document)) continue
      let best: { entry: PendingSaveRow; project: Project } | undefined
      for (const entry of entries) {
        if (entry.projectId !== projectId || entry.lockEpoch < row.lockEpoch) continue
        if (revisionOf(entry.document) <= revisionOf(row.document)) continue
        const classified = classify(entry.document)
        if (classified.state !== 'ok' || classified.project.id !== projectId) continue
        const newer =
          !best ||
          entry.lockEpoch > best.entry.lockEpoch ||
          (entry.lockEpoch === best.entry.lockEpoch && classified.project.revision > best.project.revision)
        if (newer) best = { entry, project: classified.project }
      }
      if (best) await db.projects.put(rowFor(best.project, best.entry.savedAt, Math.max(row.lockEpoch, best.entry.lockEpoch), row.deletedAt))
    }
    await db.pendingSaves.bulkDelete(entries.map((entry) => entry.key))
  })
}

/** Hides a Project at once (delete); `restoreProject` undoes it, `purgeProject` makes it final. */
export async function tombstoneProject(db: OpenmapDatabase, now: () => number, id: string): Promise<boolean> {
  return db.transaction('rw', db.projects, async () => {
    const row = await db.projects.get(id)
    if (!row || row.deletedAt !== undefined) return false
    await db.projects.update(id, { deletedAt: now() })
    return true
  })
}

export async function restoreProject(db: OpenmapDatabase, id: string): Promise<boolean> {
  return db.transaction('rw', db.projects, async () => {
    const row = await db.projects.get(id)
    if (!row || row.deletedAt === undefined) return false
    // Dexie removes a property updated to undefined.
    await db.projects.update(id, { deletedAt: undefined })
    return true
  })
}

/** Removes a tombstoned row for good, then collects unreferenced media. A live row is kept. */
export async function purgeProject(db: OpenmapDatabase, id: string): Promise<boolean> {
  const purged = await db.transaction('rw', db.projects, async () => {
    const row = await db.projects.get(id)
    if (!row || row.deletedAt === undefined) return false
    await db.projects.delete(id)
    return true
  })
  if (purged) await gcMedia(db)
  return purged
}

/**
 * Purges tombstones older than `graceMs` (a tab closed before its undo toast expired), then
 * collects unreferenced media. Run once at start-up.
 */
export async function purgeExpiredTombstones(db: OpenmapDatabase, now: () => number, graceMs: number): Promise<number> {
  const limit = now() - graceMs
  const purged = await db.transaction('rw', db.projects, async () => {
    const expired = (await db.projects.toArray()).filter((row) => row.deletedAt !== undefined && row.deletedAt <= limit)
    await db.projects.bulkDelete(expired.map((row) => row.id))
    return expired.length
  })
  if (purged > 0) await gcMedia(db)
  return purged
}

/**
 * The media hashes a Project references. v1 documents hold no media yet: image import (Epic 5)
 * adds media references to the document and lists them here.
 */
export function collectMediaReferences(project: Project): readonly string[] {
  void project
  return []
}

/**
 * Deletes media no Project (tombstones and page-hide snapshots included) references (AD-8). Personal Kits
 * join the reference set when they exist. When a stored document cannot be read (newer or
 * invalid), its references are unknown, so nothing is collected.
 */
export async function gcMedia(db: OpenmapDatabase, collect: (project: Project) => readonly string[] = collectMediaReferences): Promise<number> {
  return db.transaction('rw', db.projects, db.pendingSaves, db.media, async () => {
    const referenced = new Set<string>()
    const documents = [...(await db.projects.toArray()), ...(await db.pendingSaves.toArray())].map((row) => row.document)
    for (const document of documents) {
      const classified = classify(document)
      if (classified.state !== 'ok') return 0
      for (const hash of collect(classified.project)) referenced.add(hash)
    }
    const unreferenced = (await db.media.toCollection().primaryKeys()).filter((hash) => !referenced.has(hash))
    await db.media.bulkDelete(unreferenced)
    return unreferenced.length
  })
}

const PERSIST_REQUESTED_KEY = 'storagePersistRequested'

/**
 * Requests persistent storage once, on the first Project creation (AD-8). A refusal is ignored
 * here; Story 1.15 reads the state for the storage banner. Never rejects.
 */
export async function requestPersistOnce(db: OpenmapDatabase, storage: Pick<StorageManager, 'persist'> | undefined): Promise<void> {
  try {
    const row = await db.preferences.get(PERSIST_REQUESTED_KEY)
    if (row?.value === true) return
    await db.preferences.put({ key: PERSIST_REQUESTED_KEY, value: true })
    await storage?.persist()
  } catch {
    // Unavailable storage or a refusal: nothing to do until the storage banner (Story 1.15).
  }
}
