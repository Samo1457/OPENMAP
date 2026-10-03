// No fake-indexeddb here: Node has no IndexedDB, like a browser where it is blocked.
import { describe, expect, it } from 'vitest'
import { readLibraryCache, writeLibraryCache } from './index'

describe('Library cache without IndexedDB', () => {
  it('never rejects: reads give nothing and writes report false', async () => {
    expect(globalThis.indexedDB).toBeUndefined()
    expect((await readLibraryCache(['a'])).size).toBe(0)
    await expect(writeLibraryCache('a', 1)).resolves.toBe(false)
  })
})
