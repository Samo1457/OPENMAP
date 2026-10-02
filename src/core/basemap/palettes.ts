// The Basemap palettes (DESIGN.md « Carte — Fonds de carte », UX-DR3): the single source of the Map
// colours, read by the evaluator (AD-1, AD-6) and the pipeline styles. Plain data with no import, so
// Node can load it directly. `src/ui/theme/tokens.ts` re-exports it.

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
