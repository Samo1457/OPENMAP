// OPENMAP design tokens as typed data (DESIGN.md frontmatter, Story 1.2).
// `tokens.css` holds the same values as CSS custom properties; `tokens.test.ts`
// asserts both stay equal to each other and to DESIGN.md.

/** Chrome colour token names (UX-DR1). Each has a light and a dark value. */
export const CHROME_COLOR_NAMES = [
  'background',
  'surface',
  'surface-raised',
  'border',
  'border-input',
  'text-primary',
  'text-secondary',
  'text-muted',
  'accent',
  'accent-hover',
  'on-accent',
  'selection',
  'focus-ring',
  'success',
  'warning',
  'danger',
  'text-disabled',
  'progress-track',
  'progress-fill',
  'track-arrows',
  'track-tokens',
  'track-text',
  'track-ink',
  'playhead',
  'act-rule',
] as const

export type ChromeColorName = (typeof CHROME_COLOR_NAMES)[number]
export type ThemeName = 'light' | 'dark'

/** Chrome colours per UI theme. Resolution rule: `x` in light, `x-dark` in dark (DESIGN.md:294). */
export const chromeColors: Record<ThemeName, Record<ChromeColorName, string>> = {
  light: {
    background: '#F3EFE4',
    surface: '#FBF8F1',
    'surface-raised': '#FFFFFF',
    border: '#D8D1C1',
    'border-input': '#7D858D',
    'text-primary': '#18222D',
    'text-secondary': '#46525E',
    'text-muted': '#626C77',
    accent: '#1D4163',
    'accent-hover': '#132F4A',
    'on-accent': '#F7F3EA',
    selection: '#DAE3EC',
    'focus-ring': '#2C6391',
    success: '#2B6A4C',
    warning: '#8A5B0E',
    danger: '#A5312F',
    'text-disabled': '#99A0A6',
    'progress-track': '#D8D1C1',
    'progress-fill': '#1D4163',
    'track-arrows': '#E3D6D2',
    'track-tokens': '#D6E0D5',
    'track-text': '#D5DEE8',
    'track-ink': '#18222D',
    playhead: '#1D4163',
    'act-rule': '#7A8590',
  },
  dark: {
    background: '#11161C',
    surface: '#182029',
    'surface-raised': '#212B35',
    border: '#324050',
    'border-input': '#738292',
    'text-primary': '#ECE7DB',
    'text-secondary': '#B7BCBF',
    'text-muted': '#8E98A3',
    accent: '#8EB6D8',
    'accent-hover': '#AACAE5',
    'on-accent': '#0D1A26',
    selection: '#1D3448',
    'focus-ring': '#C4DCF0',
    success: '#76B894',
    warning: '#D9AC55',
    danger: '#EC7B78',
    'text-disabled': '#747B81',
    'progress-track': '#324050',
    'progress-fill': '#8EB6D8',
    'track-arrows': '#3A3A48',
    'track-tokens': '#2E4038',
    'track-text': '#2A3A4C',
    'track-ink': '#E6E4DC',
    playhead: '#8EB6D8',
    'act-rule': '#687786',
  },
}

/** Mono-mode chrome and canvas colours: identical in both UI themes (UX-DR2). */
export const monoColors = {
  scrim: '#11161C',
  'canvas-ink': '#18222D',
  'canvas-halo': '#F7F3EA',
  'canvas-mask': '#11161C',
} as const

export type MonoColorName = keyof typeof monoColors

/**
 * Map colours per Basemap (exported content, UX-DR3). They are resolved by the
 * active Basemap, never by the UI theme, and never exist as CSS variables:
 * renderers take Map colours from the Scene (AD-6).
 */
export const mapColors = {
  parchment: {
    'map-sea': '#D0DBE0',
    'map-land-neutral': '#EEE8D7',
    'map-coast': '#7A8590',
    'map-label': '#18222D',
    'map-label-halo': '#F7F3EA',
    'map-sea-label': '#4A5D6C',
    'map-front': '#18222D',
    'map-arrow': '#7A2716',
  },
  sombre: {
    'map-sea': '#1B2733',
    'map-land-neutral': '#2E3538',
    'map-coast': '#8A96A0',
    'map-label': '#ECE7DB',
    'map-label-halo': '#11161C',
    'map-sea-label': '#9FB3C4',
    'map-front': '#ECE7DB',
    'map-arrow': '#E07A5F',
  },
  clair: {
    'map-sea': '#DCE9F2',
    'map-land-neutral': '#F7F6F2',
    'map-coast': '#848E98',
    'map-label': '#1E2A36',
    'map-label-halo': '#FFFFFF',
    'map-sea-label': '#3F5E78',
    'map-front': '#1E2A36',
    'map-arrow': '#9E2F1F',
  },
  relief: {
    'map-sea': '#C9D8DF',
    'map-land-neutral': '#E6E1CC',
    'map-coast': '#6F7B85',
    'map-label': '#1F2A33',
    'map-label-halo': '#F5F1E4',
    'map-sea-label': '#3F5566',
    'map-front': '#1F2A33',
    'map-arrow': '#7A2716',
  },
} as const

/** Basemap-independent Map colours. */
export const mapExtraColors = {
  'map-shade-relief': '#5B5446',
  'map-tint': '#11161C',
} as const

export const SERIF_STACK =
  "'Libre Baskerville Variable', 'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif"
export const SANS_STACK =
  "'Source Sans 3 Variable', 'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif"

export interface TypeToken {
  family: 'serif' | 'sans'
  fontSize: string
  fontWeight: string
  lineHeight?: string
  letterSpacing?: string
  /** `label-caps` is written in capitals through text-transform (UX-DR19). */
  uppercase?: boolean
  /** `tabular-nums lining-nums` (UX-DR18). */
  tabular?: boolean
}

/** UI type scale (UX-DR17). Each becomes a `type-<name>` utility in tokens.css. */
export const uiTypography: Record<string, TypeToken> = {
  'title-xl': { family: 'serif', fontSize: '28px', fontWeight: '600', lineHeight: '1.15', letterSpacing: '-0.01em' },
  'title-lg': { family: 'serif', fontSize: '20px', fontWeight: '600', lineHeight: '1.2', letterSpacing: '-0.005em' },
  'title-md': { family: 'serif', fontSize: '16px', fontWeight: '600', lineHeight: '1.25' },
  'date-display': { family: 'serif', fontSize: '22px', fontWeight: '600', lineHeight: '1.05', letterSpacing: '-0.01em', tabular: true },
  'date-compact': { family: 'serif', fontSize: '15px', fontWeight: '600', lineHeight: '1.1', tabular: true },
  body: { family: 'sans', fontSize: '14px', fontWeight: '400', lineHeight: '1.4' },
  'body-strong': { family: 'sans', fontSize: '14px', fontWeight: '600', lineHeight: '1.4' },
  label: { family: 'sans', fontSize: '13px', fontWeight: '500', lineHeight: '1.3' },
  caption: { family: 'sans', fontSize: '12px', fontWeight: '400', lineHeight: '1.35' },
  'label-caps': { family: 'sans', fontSize: '11px', fontWeight: '600', lineHeight: '1', letterSpacing: '0.04em', uppercase: true },
  'label-caps-tight': { family: 'sans', fontSize: '11px', fontWeight: '600', lineHeight: '1', letterSpacing: '0em', uppercase: true },
  timecode: { family: 'sans', fontSize: '12px', fontWeight: '500', lineHeight: '1', tabular: true },
  'timecode-strong': { family: 'sans', fontSize: '13px', fontWeight: '600', lineHeight: '1', tabular: true },
}

/** Map type tokens in export px for a 1080 px short side (UX-DR21); consumed by the renderer later. */
export const mapTypography: Record<string, Omit<TypeToken, 'uppercase'>> = {
  'map-label-faction': { family: 'serif', fontSize: '56px', fontWeight: '600', letterSpacing: '0.16em' },
  'map-label-place': { family: 'serif', fontSize: '40px', fontWeight: '400' },
  'map-label-city': { family: 'serif', fontSize: '34px', fontWeight: '400' },
  'map-label-sea': { family: 'serif', fontSize: '40px', fontWeight: '400', letterSpacing: '0.08em' },
  'map-cartouche-year': { family: 'serif', fontSize: '62px', fontWeight: '600', lineHeight: '1' },
  'map-cartouche-kicker': { family: 'serif', fontSize: '18px', fontWeight: '400', letterSpacing: '0.3em' },
  'map-text': { family: 'serif', fontSize: '44px', fontWeight: '600', lineHeight: '1.15' },
  'map-token-label': { family: 'serif', fontSize: '22px', fontWeight: '600', lineHeight: '1' },
  'map-counter': { family: 'sans', fontSize: '44px', fontWeight: '600', lineHeight: '1', tabular: true },
  'map-legend-title': { family: 'serif', fontSize: '26px', fontWeight: '600', lineHeight: '1.2' },
  'map-legend-entry': { family: 'serif', fontSize: '22px', fontWeight: '400', lineHeight: '1.3' },
  'map-credit-discreet': { family: 'sans', fontSize: '18px', fontWeight: '400', lineHeight: '1.2' },
  'map-credit-legible': { family: 'sans', fontSize: '24px', fontWeight: '500', lineHeight: '1.2' },
}

/** Corner radii (UX-DR23). */
export const radii = { none: '0px', sm: '2px', md: '4px', full: '9999px' } as const

/** Spacing scale and named layout tokens (UX-DR22). */
export const spacing = {
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  'top-bar-height': '48px',
  'rail-width': '76px',
  'rail-item-height': '56px',
  'panel-width': '300px',
  'panel-width-compact': '260px',
  'panel-row-min-height': '34px',
  'drawer-width': '320px',
  'tool-options-bar-height': '36px',
  'timeline-height': '200px',
  'timeline-min-height': '180px',
  'timeline-collapsed-height': '44px',
  'timeline-header-height': '40px',
  'timeline-ruler-height': '20px',
  'act-row-height': '24px',
  'etape-thumbnail-height': '72px',
  'track-lane-height': '26px',
  'track-clip-height': '20px',
  'track-peek-height': '18px',
  'scrollbar-width': '6px',
  'progress-height': '6px',
  'hit-area-min': '24px',
  'icon-size-rail': '20px',
  'icon-size-control': '16px',
  'icon-stroke': '1.5px',
  'control-height': '32px',
  'control-height-sm': '28px',
  'panel-padding-x': '18px',
  'focus-ring-offset': '2px',
  'focus-ring-width': '2px',
  'color-swatch-size': '24px',
  'basemap-tile-height': '56px',
  'assistant-header-height': '56px',
  'assistant-step-height': '64px',
  'assistant-aside-width': '400px',
  'export-dialog-width': '560px',
  'export-label-width': '148px',
  'dialog-width-sm': '440px',
  'home-max-width': '1200px',
  'project-card-min-width': '240px',
  'presentation-bar-height': '48px',
  'presentation-bar-width': '640px',
  'map-credit-margin': '24px',
  'map-token-size': '56px',
  'map-legend-padding': '24px',
} as const

/** Shadows, only for floating layers (UX-DR24). */
export const shadows = {
  short: '0 6px 16px -10px rgba(0,0,0,.45)',
  long: '0 12px 28px -18px rgba(0,0,0,.35)',
} as const

/** Opacities from DESIGN.md components. */
export const opacities = {
  'control-disabled': '0.55',
  'dialog-scrim': '0.62',
  'export-frame-mask': '0.55',
  'presentation-controls': '0.72',
} as const
