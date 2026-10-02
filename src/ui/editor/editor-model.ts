import type { Basemap, Command, MapLocale, OutputFormat } from '@/core'

/** What the Editor shell shows of the open Project. */
export interface EditorModel {
  /** The Project is still loading: skeletons, « Ouverture… », tools off (UX-DR128). */
  readonly loading: boolean
  readonly name?: string
  readonly outputFormat?: OutputFormat
  readonly mapLocale?: MapLocale
  readonly basemap?: Basemap
  /** Editing is off: loading, a document newer than the app (AD-9), or a read-only dispatcher. */
  readonly readOnly: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
}

/** Every Project change goes through the dispatcher as a Command (AD-3). */
export interface EditorActions {
  /** Dispatches one Command (one undo entry); false when it was refused. */
  dispatch(command: Command): boolean
  undo(): void
  redo(): void
  /** Writes the pending change synchronously, as on `pagehide` (AD-8). */
  saveOnPageHide(): void
}
