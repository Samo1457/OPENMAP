// Public API of the persistence adapter. Other layers import this file only (spine Design Paradigm).

import type { Project } from '@/core'
import {
  type Autosave,
  type AutosaveOptions,
  createAutosave as createAutosaveWith,
  installPageLifecycleFlush as installPageLifecycleFlushWith,
  type PageLifecycleTargets,
} from './autosave'
import { OpenmapDatabase } from './db'
import * as projects from './projects'

export { AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_MAX_WAIT_MS, type Autosave, type AutosaveClock, type SaveStatus } from './autosave'
export type { LoadedProject, ProjectSummary, SaveFailure, SaveOutcome, StoredProjectState } from './projects'

let database: OpenmapDatabase | undefined
let onVersionChange: (() => void) | undefined
let versionChangeHandled = false

function db(): OpenmapDatabase {
  if (!database) {
    const opened = new OpenmapDatabase()
    // AD-9: another tab upgrades the schema. Flush, close so the upgrade can proceed, then reload
    // (once). Returning false stops Dexie's default immediate close until the flush is done.
    opened.on('versionchange', () => {
      if (versionChangeHandled) return false
      versionChangeHandled = true
      void flushPendingSaves()
        .catch(() => undefined)
        .finally(() => {
          opened.close({ disableAutoOpen: true })
          onVersionChange?.()
        })
      return false
    })
    database = opened
  }
  return database
}

/** What to do once a schema upgrade elsewhere has closed this tab's database (main.tsx reloads). */
export function setVersionChangeHandler(handler: () => void): void {
  onVersionChange = handler
}

const now = () => Date.now()

function report(action: string, error: unknown): void {
  // Development-only logging; no remote logging (spine Consistency Conventions).
  if (import.meta.env.DEV) console.warn(`[persistence] ${action} failed`, error)
}

// ---------------------------------------------------------------- Autosave and flush (AD-8)

const autosaves = new Set<Autosave>()

/**
 * Autosave of one open Project, writing with `lockEpoch` (AD-8), registered so `flushPendingSaves`
 * and the page-hide save reach it until closed.
 */
export function createAutosave(options: { source: AutosaveOptions['source']; lockEpoch: number; clock?: AutosaveOptions['clock'] }): Autosave {
  const autosave = createAutosaveWith({
    source: options.source,
    clock: options.clock,
    save: (project) => saveProject(project, options.lockEpoch),
    saveNow: (project) => (database ? projects.writePendingSaveNow(database, now, project, options.lockEpoch) : false),
  })
  autosaves.add(autosave)
  return {
    ...autosave,
    async close() {
      try {
        await autosave.close()
      } finally {
        autosaves.delete(autosave)
      }
    },
  }
}

/**
 * Writes every pending Project save to IndexedDB right now (AD-8 `flush()`): on page hide,
 * before a reload (chunk reload, schema upgrade elsewhere) and, from Story 1.5, on Ctrl+S.
 */
export async function flushPendingSaves(): Promise<void> {
  await Promise.all(Array.from(autosaves, (autosave) => autosave.flush()))
}

/** Saves on `pagehide` and `visibilitychange: hidden` (AD-8). Call once at start-up. */
export function installPageLifecycleFlush(targets: PageLifecycleTargets): () => void {
  return installPageLifecycleFlushWith(targets, {
    flush: flushPendingSaves,
    onPageHide: () => {
      for (const autosave of autosaves) autosave.flushOnPageHide()
    },
  })
}

// ---------------------------------------------------------------- Projects (AD-8, AD-9)

/** Non-deleted Projects, most recently modified first. Rejects when local storage fails. */
export function listProjects(): Promise<projects.ProjectSummary[]> {
  return projects.listProjects(db())
}

/** Reads a Project with the current epoch, for a one-off edit from Home. */
export async function loadStoredProject(id: string): Promise<projects.LoadedProject | undefined> {
  try {
    return await projects.loadStoredProject(db(), id)
  } catch (error) {
    report('loading a Project', error)
    return undefined
  }
}

/** Opens a Project for editing in this tab: takes a new `lockEpoch`. `undefined` when storage fails. */
export async function openStoredProject(id: string): Promise<projects.LoadedProject | undefined> {
  try {
    return await projects.openStoredProject(db(), id)
  } catch (error) {
    report('opening a Project', error)
    return undefined
  }
}

export function createProject(project: Project): Promise<projects.SaveOutcome> {
  return projects.createProject(db(), now, project)
}

export function saveProject(project: Project, lockEpoch: number): Promise<projects.SaveOutcome> {
  return projects.saveProject(db(), now, project, lockEpoch)
}

async function quietly(action: string, run: () => Promise<boolean>): Promise<boolean> {
  try {
    return await run()
  } catch (error) {
    report(action, error)
    return false
  }
}

/** Delete: the Project is hidden at once and purged when its undo toast expires (AD-8, FR-52). */
export function tombstoneProject(id: string): Promise<boolean> {
  return quietly('deleting a Project', () => projects.tombstoneProject(db(), now, id))
}

export function restoreProject(id: string): Promise<boolean> {
  return quietly('restoring a Project', () => projects.restoreProject(db(), id))
}

/** Final removal once the undo toast has expired, followed by media garbage collection. */
export function purgeProject(id: string): Promise<boolean> {
  return quietly('purging a Project', () => projects.purgeProject(db(), id))
}

/** Start-up: purges tombstones whose undo window has passed (a tab closed before expiry). */
export async function purgeExpiredTombstones(graceMs: number): Promise<number> {
  try {
    return await projects.purgeExpiredTombstones(db(), now, graceMs)
  } catch (error) {
    report('purging deleted Projects', error)
    return 0
  }
}

/** Requests `navigator.storage.persist()` once, on the first Project creation (AD-8). */
export function requestPersistOnce(): Promise<void> {
  return projects.requestPersistOnce(db(), globalThis.navigator?.storage)
}

// ---------------------------------------------------------------- Preferences

export type ThemePreference = 'system' | 'light' | 'dark'
export type LanguagePreference = 'fr' | 'en'

/** UI preferences stored in the `preferences` table (AD-8: never localStorage). */
export interface Preferences {
  theme: ThemePreference
  language: LanguagePreference
}

const validators: { [K in keyof Preferences]: (value: unknown) => value is Preferences[K] } = {
  theme: (value): value is ThemePreference => value === 'system' || value === 'light' || value === 'dark',
  language: (value): value is LanguagePreference => value === 'fr' || value === 'en',
}

/**
 * Reads a stored preference. Resolves to `undefined` when nothing valid is
 * stored or IndexedDB is unavailable; it never rejects.
 */
export async function getPreference<K extends keyof Preferences>(key: K): Promise<Preferences[K] | undefined> {
  try {
    const row = await db().preferences.get(key)
    return row && validators[key](row.value) ? row.value : undefined
  } catch (error) {
    report(`reading preference "${key}"`, error)
    return undefined
  }
}

/**
 * Stores a preference. Resolves to `false` when it could not be persisted
 * (IndexedDB unavailable); it never rejects, so the UI keeps the choice for the session.
 */
export async function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): Promise<boolean> {
  try {
    await db().preferences.put({ key, value })
    return true
  } catch (error) {
    report(`writing preference "${key}"`, error)
    return false
  }
}
