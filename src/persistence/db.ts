import Dexie, { type EntityTable } from 'dexie'

/** One row of the `preferences` table: a UI preference such as the theme or the language. */
export interface PreferenceRow {
  key: string
  value: unknown
}

/**
 * One row of the `projects` table (AD-8): a whole-document snapshot plus the listing fields.
 * Timestamps live here, never in the document (AD-2). `document` is stored as written and read
 * back through `loadProject` (migrate, then validate; AD-9), so it is `unknown` on this side.
 */
export interface ProjectRow {
  id: string
  document: unknown
  /** Copied from the document at each save so Home can list a newer or unreadable document. */
  name: string
  outputFormat: string
  /** Last save, ms since the epoch; Home sorts on it. */
  updatedAt: number
  /** Set by delete (tombstone); the row is purged when the undo toast expires (AD-8, FR-52). */
  deletedAt?: number
  /** Increased by each tab that opens the Project for editing; older epochs may not write (AD-8, AD-15). */
  lockEpoch: number
}

/**
 * One row of the `pendingSaves` table: a snapshot written on `pagehide`, where only a write issued
 * synchronously and committed at once survives the page (no read, so no epoch check there).
 * `applyPendingSaves` folds it into `projects` with the epoch and revision checks on the next read.
 */
export interface PendingSaveRow {
  /** `<projectId>#<lockEpoch>`: two tabs never overwrite each other's entry. */
  key: string
  projectId: string
  document: unknown
  lockEpoch: number
  savedAt: number
}

/** One row of the `media` table: a blob keyed by its SHA-256 (AD-8); filled from Epic 5. */
export interface MediaRow {
  sha256: string
  blob: Blob
  licence?: unknown
}

export const DATABASE_NAME = 'openmap'

/**
 * The single OPENMAP IndexedDB database (AD-8). Later stories add tables
 * (Personal Kits, Library cache) through new `version()` declarations.
 */
export class OpenmapDatabase extends Dexie {
  preferences!: EntityTable<PreferenceRow, 'key'>
  projects!: EntityTable<ProjectRow, 'id'>
  media!: EntityTable<MediaRow, 'sha256'>
  pendingSaves!: EntityTable<PendingSaveRow, 'key'>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({ preferences: '&key' })
    this.version(2).stores({ preferences: '&key', projects: '&id, updatedAt', media: '&sha256', pendingSaves: '&key, projectId' })
  }
}
