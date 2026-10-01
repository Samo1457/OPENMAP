import { describe, expect, it } from 'vitest'
import { PROJECT_NAME_MAX_LENGTH, projectNameSchema } from '@/core'
import { copyName } from './copy-name'

const fr = (name: string) => `${name} (copie)`

describe('copyName (duplicate)', () => {
  it('appends the suffix', () => {
    expect(copyName('Siège de Marioupol', fr)).toBe('Siège de Marioupol (copie)')
    expect(copyName('Siege', (name) => `${name} (copy)`)).toBe('Siege (copy)')
  })

  it('shortens a long name to fit 120 code points and stays a valid name', () => {
    const long = `${'a'.repeat(110)} ${'😀'.repeat(9)}`
    const result = copyName(long, fr)
    expect(Array.from(result)).toHaveLength(PROJECT_NAME_MAX_LENGTH)
    expect(result.endsWith(' (copie)')).toBe(true)
    expect(projectNameSchema.safeParse(result).success).toBe(true)
  })

  it('does not leave a trailing space before the suffix', () => {
    const name = `${'a'.repeat(111)} bbbbbbbb`
    expect(copyName(name, fr)).toBe(`${'a'.repeat(111)} (copie)`)
  })
})
