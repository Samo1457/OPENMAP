import Dexie, { type EntityTable } from 'dexie'

/** One row of the `preferences` table: a UI preference such as the theme or the language. */
export interface PreferenceRow {
  key: string
  value: unknown
}

/**
 * The single OPENMAP IndexedDB database (AD-8). Later stories add tables
 * (Projects, media, Library cache) through new `version()` declarations.
 */
export class OpenmapDatabase extends Dexie {
  preferences!: EntityTable<PreferenceRow, 'key'>

  constructor() {
    super('openmap')
    this.version(1).stores({ preferences: '&key' })
  }
}
