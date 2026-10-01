// No fake-indexeddb here: Node has no IndexedDB, like a browser where it is blocked.
import { describe, expect, it } from 'vitest'
import { getPreference, setPreference } from './index'

describe('preferences without IndexedDB', () => {
  it('never rejects: reads give undefined and writes report false', async () => {
    expect(globalThis.indexedDB).toBeUndefined()
    await expect(getPreference('theme')).resolves.toBeUndefined()
    await expect(setPreference('language', 'fr')).resolves.toBe(false)
  })
})
