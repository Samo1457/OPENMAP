// UX-DR153: WCAG 2.2 AA over every DESIGN.md text and control pair, in both themes.
import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import { chromeColors, type ChromeColorName, type ThemeName } from './tokens'

type Pair = [foreground: ChromeColorName, background: ChromeColorName]

const SURFACES: ChromeColorName[] = ['background', 'surface', 'surface-raised']
const onAllSurfaces = (foreground: ChromeColorName): Pair[] => SURFACES.map((surface) => [foreground, surface])

/** Running text and icons that carry meaning: at least 4.5:1 (DESIGN.md Colors). */
const TEXT_PAIRS: Pair[] = [
  ...onAllSurfaces('text-primary'),
  ...onAllSurfaces('text-secondary'),
  ...onAllSurfaces('text-muted'),
  ...onAllSurfaces('accent'),
  ...onAllSurfaces('accent-hover'),
  ...onAllSurfaces('success'),
  ...onAllSurfaces('warning'),
  ...onAllSurfaces('danger'),
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['text-primary', 'selection'],
  ['text-secondary', 'selection'],
  ['accent', 'selection'],
  ['background', 'text-primary'], // tooltip: inverted background
  ['track-ink', 'track-arrows'],
  ['track-ink', 'track-tokens'],
  ['track-ink', 'track-text'],
]

/** Non-text boundaries and indicators that carry information: at least 3:1 (WCAG 1.4.11). */
const NON_TEXT_PAIRS: Pair[] = [
  ...onAllSurfaces('border-input'),
  ...onAllSurfaces('focus-ring'),
  ['focus-ring', 'selection'],
  ['playhead', 'surface'],
  ['act-rule', 'surface'],
  ['progress-fill', 'progress-track'],
  ['progress-fill', 'surface-raised'],
  ['accent', 'selection'], // selected-segment indicator
]

/** Pairs DESIGN.md forbids because they fall under AA. */
const FORBIDDEN_PAIRS: Pair[] = [['text-muted', 'selection']]

const THEMES: ThemeName[] = ['light', 'dark']
const cases = (pairs: Pair[]) =>
  THEMES.flatMap((theme) => pairs.map(([fg, bg]) => ({ name: `${fg} on ${bg} (${theme})`, theme, fg, bg })))
const ratio = (theme: ThemeName, fg: ChromeColorName, bg: ChromeColorName) =>
  contrastRatio(chromeColors[theme][fg], chromeColors[theme][bg])

describe('contrast helper', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
    // DESIGN.md: text-primary on background is 14.0:1 (light).
    expect(contrastRatio('#18222D', '#F3EFE4')).toBeCloseTo(14.0, 1)
  })
})

describe('WCAG 2.2 AA in both themes (UX-DR153)', () => {
  it.each(cases(TEXT_PAIRS))('text: $name is at least 4.5:1', ({ theme, fg, bg }) => {
    expect(ratio(theme, fg, bg), `${fg} on ${bg} (${theme})`).toBeGreaterThanOrEqual(4.5)
  })

  it.each(cases(NON_TEXT_PAIRS))('non-text: $name is at least 3:1', ({ theme, fg, bg }) => {
    expect(ratio(theme, fg, bg), `${fg} on ${bg} (${theme})`).toBeGreaterThanOrEqual(3)
  })

  it.each(cases(FORBIDDEN_PAIRS))('forbidden: $name stays below 4.5:1, so it must never be used', ({ theme, fg, bg }) => {
    expect(ratio(theme, fg, bg), `${fg} on ${bg} (${theme})`).toBeLessThan(4.5)
  })
})
