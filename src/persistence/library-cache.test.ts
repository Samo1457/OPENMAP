import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { blankProject } from '@/core/testing/fixtures'
import { DATABASE_NAME } from './db'

type Persistence = typeof import('./index')
let persistence: Persistence

beforeEach(async () => {
  const { vi } = await import('vitest')
  vi.resetModules()
  persistence = await import('./index')
})

afterEach(async () => {
  persistence.setVersionChangeHandler(() => undefined)
  await Dexie.delete(DATABASE_NAME)
})

describe('Library cache (AD-27)', () => {
  it('reads back what was stored, only for the keys asked', async () => {
    expect(await persistence.writeLibraryCache('cliopatria@0.2.0/index', { entities: [] })).toBe(true)
    expect(await persistence.writeLibraryCache('cliopatria@0.2.0/rome/1000', { type: 'Feature' })).toBe(true)
    const found = await persistence.readLibraryCache(['cliopatria@0.2.0/index', 'cliopatria@0.2.0/gaul/1000'])
    expect([...found]).toEqual([['cliopatria@0.2.0/index', { entities: [] }]])
  })

  it('reads nothing for an empty list and overwrites a key', async () => {
    expect((await persistence.readLibraryCache([])).size).toBe(0)
    await persistence.writeLibraryCache('k', 1)
    await persistence.writeLibraryCache('k', 2)
    expect(await persistence.readLibraryCache(['k'])).toEqual(new Map([['k', 2]]))
  })

  it('sits beside the Projects in the one database without touching them', async () => {
    const project = blankProject()
    expect(await persistence.createProject(project)).toEqual({ ok: true })
    await persistence.writeLibraryCache('k', 'v')
    expect((await persistence.listProjects()).map((summary) => summary.id)).toEqual([project.id])
  })
})
