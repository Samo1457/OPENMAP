import { describe, expect, it } from 'vitest'
import { foldName } from './fold'

describe('foldName', () => {
  it.each([
    ['Londres', 'londres'],
    ['ALLEMAGNE', 'allemagne'],
    ['Côte d’Ivoire', 'cote d ivoire'],
    ["cote d'ivoire", 'cote d ivoire'],
    ['Saint-Pétersbourg', 'saint petersbourg'],
    ['  Åre ', 'are'],
    ['Œuvre', 'oeuvre'],
    ['Straße', 'strasse'],
    ['Łódź', 'lodz'],
    ['Århus', 'arhus'],
    ['(Roman Empire)', 'roman empire'],
    ['St. Louis', 'st louis'],
    ['New   York', 'new york'],
    ['İstanbul', 'istanbul'],
    ['', ''],
    ['--', ''],
  ])('%s becomes %s', (text, folded) => {
    expect(foldName(text)).toBe(folded)
  })

  it('keeps letters of other scripts and digits', () => {
    expect(foldName('Москва 2')).toBe('москва 2')
  })

  it('is idempotent', () => {
    for (const text of ["Côte d'Ivoire", 'Œuvre', '(X-Y)']) expect(foldName(foldName(text))).toBe(foldName(text))
  })
})
