import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme (UX-DR28)', () => {
  it('follows the OS for system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('keeps an explicit choice whatever the OS says', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
