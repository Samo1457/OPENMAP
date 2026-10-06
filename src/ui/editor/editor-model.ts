import type { Basemap, Command, Credit, DataDate, HistoricalDate, MapLocale, OutputFormat, SourceEntry } from '@/core'
import type { GeoStatus } from './use-geodata'

/** What the Editor shell shows of the open Project. */
export interface EditorModel {
  /** The Project is still loading: skeletons, « Ouverture… », tools off (UX-DR128). */
  readonly loading: boolean
  readonly name?: string
  readonly outputFormat?: OutputFormat
  readonly mapLocale?: MapLocale
  readonly basemap?: Basemap
  readonly referenceDate?: HistoricalDate
  /** The year of the data on the Map and whether it is the Reference Date's own (nearest-data chip). */
  readonly dataDate?: DataDate
  /** Whether the historical data is loading, shown or could not be loaded. */
  readonly geo?: GeoStatus
  /** Where and how loudly the Map credit shows (Story 1.13). */
  readonly credit?: Credit
  /** The credit line on the Map, when a source drawn requires one (its own wording); shown locked. */
  readonly creditText?: string
  /** Every source whose metadata is loaded, with licence and attribution (« Sources et licences »). */
  readonly sources?: readonly SourceEntry[]
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
