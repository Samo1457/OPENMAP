// Single source check: tokens.ts, tokens.css and the DESIGN.md frontmatter hold the same values.
import { describe, expect, it } from 'vitest'
import designMd from '../../../_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md?raw'
import indexCss from '../../index.css?raw'
import tokensCss from './tokens.css?raw'
import {
  CHROME_COLOR_NAMES,
  chromeColors,
  mapColors,
  mapExtraColors,
  mapTypography,
  monoColors,
  opacities,
  radii,
  SANS_STACK,
  SERIF_STACK,
  shadows,
  spacing,
  uiTypography,
} from './tokens'

const frontmatter = designMd.split(/^---$/m)[1]

/** The `key: value` lines of one top-level frontmatter section. */
function section(name: string): Record<string, string> {
  const body = frontmatter.split(new RegExp(`^${name}:$`, 'm'))[1].split(/^\S/m)[0]
  const entries: Record<string, string> = {}
  for (const match of body.matchAll(/^ {2}'?([\w-]+)'?: (.+)$/gm)) entries[match[1]] = match[2].replace(/^'(.*)'$/, '$1')
  return entries
}

/** `{ fontFamily: "…", fontSize: '28px', … }` → fields. */
function typeFields(line: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const match of line.matchAll(/(\w+): (?:"([^"]*)"|'([^']*)')/g)) fields[match[1]] = match[2] ?? match[3]
  return fields
}

/** Custom properties declared directly in the first `selector { … }` block. */
function cssBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`)
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
  const declarations: Record<string, string> = {}
  for (const match of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) declarations[match[1]] = match[2].replace(/\s+/g, ' ').trim()
  return declarations
}

const designColors = section('colors')
const root = cssBlock(tokensCss, ':root')
const dark = cssBlock(tokensCss, '.dark')

describe('tokens.ts matches DESIGN.md', () => {
  it('lists every chrome token that has a -dark variant, and only those (UX-DR1)', () => {
    const withDark = Object.keys(designColors)
      .filter((key) => key.endsWith('-dark'))
      .map((key) => key.slice(0, -'-dark'.length))
    expect([...CHROME_COLOR_NAMES].sort()).toEqual(withDark.sort())
  })

  it.each(CHROME_COLOR_NAMES)('chrome colour %s has the DESIGN.md light and dark values', (name) => {
    expect(chromeColors.light[name]).toBe(designColors[name])
    expect(chromeColors.dark[name]).toBe(designColors[`${name}-dark`])
  })

  it('has the mono-mode and Map colours of DESIGN.md (UX-DR2, UX-DR3)', () => {
    for (const [name, value] of Object.entries(monoColors)) expect(value, name).toBe(designColors[name])
    const suffix = { parchment: '', sombre: '-sombre', clair: '-clair', relief: '-relief' } as const
    for (const [basemap, palette] of Object.entries(mapColors)) {
      for (const [name, value] of Object.entries(palette)) {
        expect(value, `${name} (${basemap})`).toBe(designColors[`${name}${suffix[basemap as keyof typeof suffix]}`])
      }
    }
    for (const [name, value] of Object.entries(mapExtraColors)) expect(value, name).toBe(designColors[name])
  })

  it('never uses the UI accent in a map-* or canvas-* colour (UX-DR12, UX-DR102)', () => {
    const accents = [chromeColors.light.accent, chromeColors.dark.accent].map((c) => c.toUpperCase())
    const mapAndCanvas = [
      ...Object.values(mapColors).flatMap((palette) => Object.values(palette)),
      ...Object.values(mapExtraColors),
      monoColors['canvas-ink'],
      monoColors['canvas-halo'],
      monoColors['canvas-mask'],
    ]
    for (const value of mapAndCanvas) expect(accents).not.toContain(value.toUpperCase())
  })

  it('has the DESIGN.md type scale (UX-DR17)', () => {
    const design = section('typography')
    for (const [name, token] of Object.entries({ ...uiTypography, ...mapTypography })) {
      const fields = typeFields(design[name])
      expect(token.fontSize, name).toBe(fields.fontSize)
      expect(token.fontWeight, name).toBe(fields.fontWeight)
      expect(token.lineHeight, name).toBe(fields.lineHeight)
      expect(token.letterSpacing, name).toBe(fields.letterSpacing)
      // Our stacks put the Fontsource family first, then exactly the DESIGN.md stack.
      expect(token.family === 'serif' ? SERIF_STACK : SANS_STACK, name).toContain(fields.fontFamily)
    }
    expect(Object.keys({ ...uiTypography, ...mapTypography }).sort()).toEqual(Object.keys(design).sort())
  })

  it('has the DESIGN.md opacities and shadows (UX-DR8, UX-DR10, UX-DR24)', () => {
    const components = section('components')
    for (const [name, value] of Object.entries(opacities)) expect(value, name).toBe(typeFields(components[name]).opacity)
    expect(typeFields(components.toast).shadow).toBe(shadows.short)
    for (const name of ['popover', 'dialog', 'library-drawer']) {
      expect(typeFields(components[name]).shadow, name).toBe(shadows.long)
    }
  })

  it('has the DESIGN.md spacing and radii (UX-DR22, UX-DR23)', () => {
    expect(spacing).toEqual(section('spacing'))
    expect(radii).toEqual(section('rounded'))
  })
})

describe('tokens.css matches tokens.ts', () => {
  it.each(CHROME_COLOR_NAMES)('--om-%s has the light value on :root and the dark value on .dark', (name) => {
    expect(root[`--om-${name}`]).toBe(chromeColors.light[name])
    expect(dark[`--om-${name}`]).toBe(chromeColors.dark[name])
  })

  it('declares mono-mode colours once on :root and never in .dark (UX-DR2)', () => {
    for (const [name, value] of Object.entries(monoColors)) {
      expect(root[`--om-${name}`]).toBe(value)
      expect(dark).not.toHaveProperty(`--om-${name}`)
    }
    expect(Object.keys(dark).sort()).toEqual(CHROME_COLOR_NAMES.map((name) => `--om-${name}`).sort())
  })

  it('declares the opacities on :root, builds the dialog scrim from them, and the shadows (UX-DR10, UX-DR24)', () => {
    for (const [name, value] of Object.entries(opacities)) expect(root[`--om-opacity-${name}`], name).toBe(value)
    expect(root['--om-dialog-scrim']).toBe(
      'color-mix(in srgb, var(--om-scrim) calc(var(--om-opacity-dialog-scrim) * 100%), transparent)',
    )
    for (const [name, value] of Object.entries(shadows)) expect(tokensCss).toContain(`--shadow-${name}: ${value};`)
    expect(tokensCss).toMatch(/@utility control-disabled \{[^}]*opacity: var\(--om-opacity-control-disabled\);/)
  })

  it('has no Map colour in CSS: Map colours come from the Scene (AD-6)', () => {
    expect(tokensCss).not.toMatch(/--[\w-]*map-(sea|land|coast|label|front|arrow|shade|tint)/)
  })

  it('maps the shadcn variables to OPENMAP tokens (DESIGN.md "Correspondance shadcn", UX-DR5)', () => {
    expect(root).toMatchObject({
      '--primary': 'var(--om-accent)',
      '--primary-foreground': 'var(--om-on-accent)',
      '--background': 'var(--om-background)',
      '--card': 'var(--om-surface)',
      '--popover': 'var(--om-surface-raised)',
      '--foreground': 'var(--om-text-primary)',
      '--muted-foreground': 'var(--om-text-muted)',
      '--border': 'var(--om-border)',
      '--input': 'var(--om-border-input)',
      '--ring': 'var(--om-focus-ring)',
      '--destructive': 'var(--om-danger)',
      '--accent': 'var(--om-selection)',
      '--card-foreground': 'var(--om-text-primary)',
      '--popover-foreground': 'var(--om-text-primary)',
      '--secondary': 'var(--om-surface)',
      '--secondary-foreground': 'var(--om-text-primary)',
      '--muted': 'var(--om-surface)',
      '--accent-foreground': 'var(--om-text-primary)',
      '--radius': radii.sm,
    })
  })

  it('leaves no shadcn default: no oklch colour, chart, sidebar or Geist font', () => {
    for (const css of [tokensCss, indexCss]) {
      expect(css).not.toMatch(/oklch|--chart-|--sidebar|Geist/i)
    }
  })

  it.each(Object.entries(uiTypography))('the type-%s utility matches the token', (name, token) => {
    const match = new RegExp(`@utility type-${name} \\{([^}]*)\\}`).exec(tokensCss)
    expect(match, `@utility type-${name}`).not.toBeNull()
    const body = match![1]
    expect(body).toContain(`font-family: var(--font-${token.family});`)
    expect(body).toContain(`font-size: ${token.fontSize};`)
    expect(body).toContain(`font-weight: ${token.fontWeight};`)
    expect(/line-height: ([^;]+);/.exec(body)?.[1]).toBe(token.lineHeight)
    expect(/letter-spacing: ([^;]+);/.exec(body)?.[1]).toBe(token.letterSpacing)
    expect(body.includes('text-transform: uppercase;')).toBe(Boolean(token.uppercase))
    expect(body.includes('font-variant-numeric: tabular-nums lining-nums;')).toBe(Boolean(token.tabular))
  })

  it('declares the font stacks, the named spacing tokens and the 4px base', () => {
    expect(tokensCss).toContain(`--font-serif: ${SERIF_STACK};`)
    expect(tokensCss).toContain(`--font-sans: ${SANS_STACK};`)
    expect(tokensCss).toContain('--spacing: 4px;')
    const entries = Object.entries(spacing)
    const scale = entries.filter(([name]) => /^\d+$/.test(name))
    const named = entries.filter(([name]) => !/^\d+$/.test(name))
    expect(scale.map(([, value]) => value)).toEqual(scale.map(([name]) => `${4 * Number(name)}px`))
    for (const [name, value] of named) expect(tokensCss).toContain(`--spacing-${name}: ${value};`)
  })

  it('shows the focus ring only on :focus-visible, as a 2px surface gap then 2px focus-ring (UX-DR27)', () => {
    expect(root['--om-focus-ring-offset']).toBe('2px')
    expect(root['--om-focus-ring-width']).toBe('2px')
    expect(root['--om-focus-ring-shadow']).toBe(
      '0 0 0 var(--om-focus-ring-offset) var(--om-surface), 0 0 0 calc(var(--om-focus-ring-offset) + var(--om-focus-ring-width)) var(--om-focus-ring)',
    )
    expect(tokensCss).toMatch(/:focus-visible \{[^}]*box-shadow: var\(--om-focus-ring-shadow\);/)
    expect(tokensCss).not.toMatch(/:focus(?!-visible)[\s,{]/)
  })
})
