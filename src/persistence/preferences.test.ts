import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { OpenmapDatabase } from './db'
import { getPreference, setPreference } from './index'

describe('preferences (AD-8)', () => {
  beforeEach(async () => {
    const db = new OpenmapDatabase()
    await db.preferences.clear()
    db.close()
  })

  it('returns undefined when nothing is stored', async () => {
    expect(await getPreference('theme')).toBeUndefined()
  })

  it('stores and reads the theme and the language', async () => {
    expect(await setPreference('theme', 'dark')).toBe(true)
    expect(await setPreference('language', 'en')).toBe(true)
    expect(await getPreference('theme')).toBe('dark')
    expect(await getPreference('language')).toBe('en')
    expect(await setPreference('theme', 'light')).toBe(true)
    expect(await getPreference('theme')).toBe('light')
  })

  it('ignores an invalid stored value', async () => {
    const other = new OpenmapDatabase()
    await other.preferences.put({ key: 'language', value: 'de' })
    other.close()
    expect(await getPreference('language')).toBeUndefined()
  })

  it('declares the single openmap database with a preferences table keyed by key (projects, media and pendingSaves from v2, libraryCache from v3)', () => {
    const db = new OpenmapDatabase()
    expect(db.name).toBe('openmap')
    expect(db.tables.map((table) => table.name)).toEqual(['preferences', 'projects', 'media', 'pendingSaves', 'libraryCache'])
    expect(db.preferences.schema.primKey.keyPath).toBe('key')
    db.close()
  })
})
