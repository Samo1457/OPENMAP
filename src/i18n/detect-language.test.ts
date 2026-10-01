import { describe, expect, it } from 'vitest'
import { detectLanguage } from './index'

describe('detectLanguage', () => {
  it.each([
    ['fr', 'fr'],
    ['fr-FR', 'fr'],
    ['FR-ca', 'fr'],
    ['en-US', 'en'],
    ['de-DE', 'en'],
    ['', 'en'],
    [undefined, 'en'],
  ])('%s gives %s', (browserLanguage, expected) => {
    expect(detectLanguage(browserLanguage)).toBe(expected)
  })
})
