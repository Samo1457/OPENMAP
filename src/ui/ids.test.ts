import { describe, expect, it } from 'vitest'
import { createBlankProject, generateBlankProjectIds, projectIdSchema, validate } from '../core'
import { newId } from './ids'

describe('newId (shell)', () => {
  it('returns distinct 21-character nanoids that validate as ids', () => {
    const id = newId()
    expect(projectIdSchema.safeParse(id).success).toBe(true)
    expect(newId()).not.toBe(id)
  })

  it('creates a valid blank Project with real ids', () => {
    const project = createBlankProject({ ...generateBlankProjectIds(newId), name: 'Untitled project', mapLocale: 'en' })
    expect(validate(project).ok).toBe(true)
  })
})
