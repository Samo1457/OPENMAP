---
title: OPENMAP — DESIGN
status: final
created: 2026-09-29
updated: 2026-09-29
sources:
  - ../../prds/prd-OPENMAP-2026-09-25/prd.md
  - ../../prds/prd-OPENMAP-2026-09-25/addendum.md
  - ../../briefs/brief-OPENMAP-2026-09-24/brief.md
  - ../../briefs/brief-OPENMAP-2026-09-24/addendum.md
name: OPENMAP
description: >-
  Éditeur web desktop de cartes historiques et géopolitiques animées. Direction « Bleu de Prusse & ivoire » :
  un atlas d'archives relié, avec le chrome de l'Atelier du cartographe et la Timeline du Banc de montage.
  Base shadcn/ui fortement personnalisée ; ce fichier définit les surcharges.
colors:
  # Chrome (UI). Base = mode clair ; suffixe -dark = mode sombre (règle de résolution : Colors → Résolution des modes).
  background: '#F3EFE4'
  surface: '#FBF8F1'
  surface-raised: '#FFFFFF'
  border: '#D8D1C1'
  border-input: '#7D858D'
  text-primary: '#18222D'
  text-secondary: '#46525E'
  text-muted: '#626C77'
  accent: '#1D4163'
  accent-hover: '#132F4A'
  on-accent: '#F7F3EA'
  selection: '#DAE3EC'
  focus-ring: '#2C6391'
  success: '#2B6A4C'
  warning: '#8A5B0E'
  danger: '#A5312F'
  text-disabled: '#99A0A6'
  progress-track: '#D8D1C1'
  progress-fill: '#1D4163'
  track-arrows: '#E3D6D2'
  track-tokens: '#D6E0D5'
  track-text: '#D5DEE8'
  track-ink: '#18222D'
  playhead: '#1D4163'
  act-rule: '#7A8590'
  background-dark: '#11161C'
  surface-dark: '#182029'
  surface-raised-dark: '#212B35'
  border-dark: '#324050'
  border-input-dark: '#738292'
  text-primary-dark: '#ECE7DB'
  text-secondary-dark: '#B7BCBF'
  text-muted-dark: '#8E98A3'
  accent-dark: '#8EB6D8'
  accent-hover-dark: '#AACAE5'
  on-accent-dark: '#0D1A26'
  selection-dark: '#1D3448'
  focus-ring-dark: '#C4DCF0'
  success-dark: '#76B894'
  warning-dark: '#D9AC55'
  danger-dark: '#EC7B78'
  text-disabled-dark: '#747B81'
  progress-track-dark: '#324050'
  progress-fill-dark: '#8EB6D8'
  track-arrows-dark: '#3A3A48'
  track-tokens-dark: '#2E4038'
  track-text-dark: '#2A3A4C'
  track-ink-dark: '#E6E4DC'
  playhead-dark: '#8EB6D8'
  act-rule-dark: '#687786'
  scrim: '#11161C'
  # Canevas : surimpressions d'édition posées sur la Carte. Identiques dans les deux modes, par règle.
  canvas-ink: '#18222D'
  canvas-halo: '#F7F3EA'
  canvas-mask: '#11161C'
  # Carte : Fond parchemin (Fond par défaut, jeu de base). Contenu exporté, identique dans les deux modes.
  map-sea: '#D0DBE0'
  map-land-neutral: '#EEE8D7'
  map-coast: '#7A8590'
  map-label: '#18222D'
  map-label-halo: '#F7F3EA'
  map-sea-label: '#4A5D6C'
  map-front: '#18222D'
  map-arrow: '#7A2716'
  # Fonds sombre, clair et relief : même jeu, suffixé par le Fond (et non par le mode UI). Aussi mono-mode.
  map-sea-sombre: '#1B2733'
  map-land-neutral-sombre: '#2E3538'
  map-coast-sombre: '#8A96A0'
  map-label-sombre: '#ECE7DB'
  map-label-halo-sombre: '#11161C'
  map-sea-label-sombre: '#9FB3C4'
  map-front-sombre: '#ECE7DB'
  map-arrow-sombre: '#E07A5F'
  map-sea-clair: '#DCE9F2'
  map-land-neutral-clair: '#F7F6F2'
  map-coast-clair: '#848E98'
  map-label-clair: '#1E2A36'
  map-label-halo-clair: '#FFFFFF'
  map-sea-label-clair: '#3F5E78'
  map-front-clair: '#1E2A36'
  map-arrow-clair: '#9E2F1F'
  map-sea-relief: '#C9D8DF'
  map-land-neutral-relief: '#E6E1CC'
  map-coast-relief: '#6F7B85'
  map-label-relief: '#1F2A33'
  map-label-halo-relief: '#F5F1E4'
  map-sea-label-relief: '#3F5566'
  map-front-relief: '#1F2A33'
  map-arrow-relief: '#7A2716'
  map-shade-relief: '#5B5446'
  map-tint: '#11161C'
typography:
  # Polices libres (OFL) embarquées et auto-hébergées : Libre Baskerville 400/600 (serif) et Source Sans 3 400/500/600 (UI, provisoire).
  # Les piles système qui suivent ne servent que de repli. UI = sans ; titres, dates, Carte = serif ; minutage = sans en tabular-nums.
  title-xl: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '28px', fontWeight: '600', lineHeight: '1.15', letterSpacing: '-0.01em' }
  title-lg: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '20px', fontWeight: '600', lineHeight: '1.2', letterSpacing: '-0.005em' }
  title-md: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '16px', fontWeight: '600', lineHeight: '1.25' }
  date-display: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '22px', fontWeight: '600', lineHeight: '1.05', letterSpacing: '-0.01em' }
  date-compact: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '15px', fontWeight: '600', lineHeight: '1.1' }
  body: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '14px', fontWeight: '400', lineHeight: '1.4' }
  body-strong: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '14px', fontWeight: '600', lineHeight: '1.4' }
  label: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: '500', lineHeight: '1.3' }
  caption: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '12px', fontWeight: '400', lineHeight: '1.35' }
  label-caps: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '11px', fontWeight: '600', lineHeight: '1', letterSpacing: '0.04em' }
  label-caps-tight: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '11px', fontWeight: '600', lineHeight: '1', letterSpacing: '0em' }
  timecode: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '12px', fontWeight: '500', lineHeight: '1' }
  timecode-strong: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: '600', lineHeight: '1' }
  # Carte : tailles en px d'export pour un cadre dont le côté court fait 1080 px ; à l'écran, elles suivent l'échelle du cadre.
  map-label-faction: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '56px', fontWeight: '600', letterSpacing: '0.16em' }
  map-label-place: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '40px', fontWeight: '400' }
  map-label-city: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '34px', fontWeight: '400' }
  map-label-sea: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '40px', fontWeight: '400', letterSpacing: '0.08em' }
  map-cartouche-year: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '62px', fontWeight: '600', lineHeight: '1' }
  map-cartouche-kicker: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '18px', fontWeight: '400', letterSpacing: '0.3em' }
  map-text: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '44px', fontWeight: '600', lineHeight: '1.15' }
  map-token-label: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '22px', fontWeight: '600', lineHeight: '1' }
  map-counter: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '44px', fontWeight: '600', lineHeight: '1' }
  map-legend-title: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '26px', fontWeight: '600', lineHeight: '1.2' }
  map-legend-entry: { fontFamily: "'Libre Baskerville', Baskerville, 'Baskerville Old Face', Georgia, 'Times New Roman', serif", fontSize: '22px', fontWeight: '400', lineHeight: '1.3' }
  map-credit-discreet: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '18px', fontWeight: '400', lineHeight: '1.2' }
  map-credit-legible: { fontFamily: "'Source Sans 3', 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '24px', fontWeight: '500', lineHeight: '1.2' }
rounded:
  none: 0px
  sm: 2px
  md: 4px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  top-bar-height: 48px
  rail-width: 76px
  rail-item-height: 56px
  panel-width: 300px
  panel-width-compact: 260px
  panel-row-min-height: 34px
  drawer-width: 320px
  tool-options-bar-height: 36px
  timeline-height: 200px
  timeline-min-height: 180px
  timeline-collapsed-height: 44px
  timeline-header-height: 40px
  timeline-ruler-height: 20px
  act-row-height: 24px
  etape-thumbnail-height: 72px
  track-lane-height: 26px
  track-clip-height: 20px
  track-peek-height: 18px
  scrollbar-width: 6px
  progress-height: 6px
  hit-area-min: 24px
  icon-size-rail: 20px
  icon-size-control: 16px
  icon-stroke: 1.5px
  control-height: 32px
  control-height-sm: 28px
  panel-padding-x: 18px
  focus-ring-offset: 2px
  focus-ring-width: 2px
  color-swatch-size: 24px
  basemap-tile-height: 56px
  assistant-header-height: 56px
  assistant-step-height: 64px
  assistant-aside-width: 400px
  export-dialog-width: 560px
  export-label-width: 148px
  dialog-width-sm: 440px
  home-max-width: 1200px
  project-card-min-width: 240px
  presentation-bar-height: 48px
  presentation-bar-width: 640px
  map-credit-margin: 24px
  map-token-size: 56px
  map-legend-padding: 24px
components:
  button-primary: { background: '{colors.accent}', foreground: '{colors.on-accent}', hover-background: '{colors.accent-hover}', radius: '{rounded.sm}', height: '{spacing.control-height}', typography: '{typography.body-strong}' }
  button-secondary: { background: '{colors.surface-raised}', foreground: '{colors.text-primary}', border: '1px solid {colors.border}', radius: '{rounded.sm}', height: '{spacing.control-height}' }
  button-ghost: { background: 'transparent', foreground: '{colors.text-secondary}', hover-background: '{colors.selection}', radius: '{rounded.sm}' }
  top-bar: { background: '{colors.surface}', border-bottom: '1px solid {colors.border}', height: '{spacing.top-bar-height}', project-name: '{typography.title-md}' }
  tool-rail: { background: '{colors.surface}', border-right: '1px solid {colors.border}', width: '{spacing.rail-width}', icon: '{spacing.icon-size-rail}' }
  tool-rail-item: { foreground: '{colors.text-secondary}', label: '{typography.label-caps}', label-long: '{typography.label-caps-tight}', height: '{spacing.rail-item-height}', radius: '{rounded.sm}', hover-background: '{colors.selection}' }
  tool-rail-item-active: { background: '{colors.selection}', foreground: '{colors.accent}', foreground-dark: '{colors.text-primary-dark}', indicator: '3px bar, left edge, {colors.accent}' }
  tool-options-bar: { height: '{spacing.tool-options-bar-height}', background: '{colors.background}', foreground: '{colors.text-muted}', etape-label: '{typography.title-md}', typography: '{typography.label}', format-label: '{typography.caption}', format-label-color: '{colors.text-muted}' }
  properties-panel: { background: '{colors.surface}', border-left: '1px solid {colors.border}', width: '{spacing.panel-width}', width-compact: '{spacing.panel-width-compact}', row-min-height: '{spacing.panel-row-min-height}', title: '{typography.title-lg}', section-heading: '{typography.label-caps}', padding-x: '{spacing.panel-padding-x}' }
  field-inherited: { value-color: '{colors.text-secondary}', caption: '{typography.caption}', caption-color: '{colors.text-muted}' }
  field-overridden: { value-color: '{colors.text-primary}', marker: '2px bar, left edge, {colors.text-primary}', reset-link: '{colors.accent}' }
  subfaction-row: { name: '{typography.body}', summary: '{typography.caption}', summary-color: '{colors.text-muted}', summary-color-selected: '{colors.text-secondary}', swatch: 'faction-swatch 16px', chevron: '16px {colors.text-secondary}' }
  more-options-row: { typography: '{typography.body-strong}', summary-color: '{colors.text-muted}', border-top: '1px solid {colors.border}' }
  library-drawer: { background: '{colors.surface}', border-right: '1px solid {colors.border}', width: '{spacing.drawer-width}', top: '{spacing.top-bar-height}', radius: '0 {rounded.md} {rounded.md} 0', shadow: '0 12px 28px -18px rgba(0,0,0,.35)' }
  timeline: { background: '{colors.surface}', border-top: '1px solid {colors.border}', height: '{spacing.timeline-height}', min-height: '{spacing.timeline-min-height}', collapsed-height: '{spacing.timeline-collapsed-height}', header-height: '{spacing.timeline-header-height}', title: '{typography.title-md}', timecode: '{typography.timecode}', scrollbar: '{spacing.scrollbar-width} {colors.border}' }
  timeline-play-button: { background: '{colors.accent}', foreground: '{colors.on-accent}', radius: '{rounded.sm}' }
  timeline-ruler: { height: '{spacing.timeline-ruler-height}', tick-color: '{colors.border}', label: '{typography.timecode}', label-color: '{colors.text-muted}' }
  act-bracket: { row-height: '{spacing.act-row-height}', rule: '1px {colors.act-rule}', label: '{typography.label-caps}', label-color: '{colors.text-secondary}' }
  etape-thumbnail: { height: '{spacing.etape-thumbnail-height}', radius: '{rounded.none}', border: 'inset 1px {colors.border}', chip-background: '{colors.surface-raised}', date: '{typography.date-display}', date-compact: '{typography.date-compact}', title: '{typography.caption}' }
  etape-thumbnail-current: { outline: 'inset 2px {colors.accent}' }
  transition-hatch: { pattern: 'repeating-linear-gradient(135deg, {colors.border} 0 2px, {colors.surface} 2px 6px)', label: '{typography.timecode}' }
  track-lane: { height: '{spacing.track-lane-height}', clip-height: '{spacing.track-clip-height}', peek-height: '{spacing.track-peek-height}', label: '{typography.label}', label-color: '{colors.text-secondary}' }
  track-clip-arrows: { background: '{colors.track-arrows}', foreground: '{colors.track-ink}' }
  track-clip-tokens: { background: '{colors.track-tokens}', foreground: '{colors.track-ink}' }
  track-clip-text: { background: '{colors.track-text}', foreground: '{colors.track-ink}' }
  track-clip-selected: { outline: 'inset 1.5px {colors.accent}' }
  playhead: { line: '1.5px {colors.playhead}', handle: '12px pentagon, {colors.playhead}' }
  toast: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', shadow: '0 6px 16px -10px rgba(0,0,0,.45)' }
  popover: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', shadow: '0 12px 28px -18px rgba(0,0,0,.35)' }
  tooltip: { background: '{colors.text-primary}', foreground: '{colors.background}', radius: '{rounded.sm}', typography: '{typography.caption}' }
  skeleton: { background: '{colors.border}', radius: '{rounded.none}', motion: 'opacité 100 → 60 % en 1,2 s ; fixe en mouvement réduit' }
  dialog: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', title: '{typography.title-lg}', shadow: '0 12px 28px -18px rgba(0,0,0,.35)' }
  dialog-scrim: { color: '{colors.scrim}', opacity: '0.62' }
  input-field: { background: '{colors.surface-raised}', border: '1px solid {colors.border-input}', radius: '{rounded.sm}', height: '{spacing.control-height}', typography: '{typography.body}', placeholder: '{colors.text-muted}' }
  checkbox: { size: '16px', border: '1px solid {colors.border-input}', radius: '{rounded.sm}', checked-background: '{colors.accent}', checked-foreground: '{colors.on-accent}' }
  segmented-control: { background: '{colors.surface-raised}', border: '1px solid {colors.border-input}', divider: '1px solid {colors.border}', radius: '{rounded.sm}', height: '{spacing.control-height}', typography: '{typography.label}', foreground: '{colors.text-secondary}', selected-background: '{colors.selection}', selected-foreground: '{colors.text-primary}', selected-indicator: 'inset 0 -2px 0 {colors.accent}' }
  slider: { track: '2px {colors.border-input}', range: '{colors.text-secondary}', thumb: '12px {rounded.full} {colors.text-primary}', value-input: 'input-field 56px, {typography.timecode}' }
  color-field: { swatch-size: '{spacing.color-swatch-size}', swatch-radius: '{rounded.none}', hex: '{typography.timecode}', border: '1px solid {colors.border-input}', palette-heading: '{typography.label-caps}' }
  faction-picker: { chip-height: '{spacing.control-height-sm}', chip-background: '{colors.surface-raised}', chip-border: '1px solid {colors.border-input}', chip-radius: '{rounded.sm}', label: '{typography.label}', swatch: 'faction-swatch 14px', neutral-swatch: '{colors.map-land-neutral}', selected-background: '{colors.selection}', selected-indicator: 'inset 0 -2px 0 {colors.accent}' }
  basemap-picker: { tile-height: '{spacing.basemap-tile-height}', tile-radius: '{rounded.none}', label: '{typography.caption}', selected-outline: 'inset 2px {colors.accent}' }
  nearest-data-chip: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', icon: 'info 16px {colors.text-secondary}', typography: '{typography.caption}', color: '{colors.text-secondary}' }
  control-disabled: { opacity: '0.55', foreground: '{colors.text-disabled}', cursor: 'not-allowed' }
  progress-bar: { track: '{colors.progress-track}', fill: '{colors.progress-fill}', height: '{spacing.progress-height}', radius: '{rounded.none}', percent: '{typography.timecode-strong}' }
  export-dialog: { width: '{spacing.export-dialog-width}', label-width: '{spacing.export-label-width}', label: '{typography.label}', label-color: '{colors.text-secondary}' }
  export-credit-locked: { background: '{colors.background}', border: '1px solid {colors.border}', radius: '{rounded.sm}', height: '{spacing.control-height}', icon: 'cadenas 16px {colors.text-secondary}', text: '{typography.body}', explanation: '{typography.caption}', explanation-color: '{colors.text-muted}' }
  export-done: { background: '{colors.background}', border: '1px solid {colors.border}', border-left: '3px solid {colors.success}', title: '{typography.body-strong}', details: '{typography.caption}', details-color: '{colors.text-secondary}' }
  assistant: { header-height: '{spacing.assistant-header-height}', step-height: '{spacing.assistant-step-height}', aside-width: '{spacing.assistant-aside-width}', aside-background: '{colors.surface}', title: '{typography.title-xl}' }
  banner-warning: { background: '{colors.surface-raised}', icon-and-text: '{colors.warning}', border-left: '3px solid {colors.warning}', text: '{typography.body}', action: 'button-secondary {spacing.control-height-sm}' }
  banner-info: { background: '{colors.surface-raised}', icon: 'info 16px {colors.text-secondary}', text-color: '{colors.text-primary}', border-left: '3px solid {colors.accent}', text: '{typography.body}', action: 'button-secondary {spacing.control-height-sm}' }
  home-layout: { background: '{colors.background}', max-width: '{spacing.home-max-width}', padding-x: '{spacing.8}', title: '{typography.title-xl}', grid-gap: '{spacing.6}' }
  project-card: { background: '{colors.surface}', border: '1px solid {colors.border}', radius: '{rounded.none}', min-width: '{spacing.project-card-min-width}', name: '{typography.body-strong}', meta: '{typography.caption}', meta-color: '{colors.text-muted}', hover-border: '1px solid {colors.border-input}', hover-background: '{colors.surface-raised}' }
  home-empty: { title: '{typography.title-lg}', text: '{typography.body}', text-color: '{colors.text-secondary}', drop-zone: '1px dashed {colors.border-input}' }
  consent-dialog: { width: '{spacing.dialog-width-sm}', title: '{typography.title-lg}', text: '{typography.body}', buttons: 'deux button-secondary de même largeur' }
  presentation-controls: { background: '{colors.scrim}', opacity: '0.72', foreground: '{colors.canvas-halo}', height: '{spacing.presentation-bar-height}', width: '{spacing.presentation-bar-width}', radius: '{rounded.md}', timecode: '{typography.timecode-strong}', progress-fill: '{colors.canvas-halo}', focus-ring: '{colors.focus-ring-dark}' }
  focus-ring: { ring: '0 0 0 2px {colors.surface}, 0 0 0 4px {colors.focus-ring}' }
  faction-swatch: { radius: '{rounded.none}', ring: '0 0 0 1px {colors.surface}, 0 0 0 2px {colors.text-primary}' }
  canvas-selection: { halo: '4.5px {colors.canvas-halo}', stroke: '1.6px dashed {colors.canvas-ink}' }
  canvas-hover: { halo: '3px {colors.canvas-halo}', stroke: '1px {colors.canvas-ink}' }
  canvas-pending: { hatch: 'repeating-linear-gradient(45deg, {colors.canvas-ink} 0 1.5px, transparent 1.5px 7px)', halo: '3px {colors.canvas-halo}' }
  canvas-handle: { fill: '{colors.canvas-ink}', stroke: '1.5px {colors.canvas-halo}' }
  canvas-brush-cursor: { outer: '4.5px {colors.canvas-halo}', inner: '1.6px dashed {colors.canvas-ink}' }
  export-frame-mask: { color: '{colors.canvas-mask}', opacity: '0.55' }
  date-cartouche: { fill: '{colors.map-label-halo}', rule: '1.4px {colors.map-label}', year: '{typography.map-cartouche-year}', kicker: '{typography.map-cartouche-kicker}' }
  map-credit: { discreet: '{typography.map-credit-discreet}', legible: '{typography.map-credit-legible}', color: '{colors.map-label}', halo: '{colors.map-label-halo}', margin: '{spacing.map-credit-margin}' }
  map-arrow-style: { color: 'Kit de Faction, sinon {colors.map-arrow}', width-default: '14px', width-range: '4 à 120px', halo: '3px {colors.map-label-halo}' }
  unit-token: { size: '{spacing.map-token-size}', label: '{typography.map-token-label}', label-color: '{colors.map-label}', label-frame: '2px {colors.map-label} sur {colors.map-label-halo}' }
  map-text: { typography: '{typography.map-text}', color: '{colors.map-label}', halo: '{colors.map-label-halo}' }
  map-counter: { value: '{typography.map-counter}', color: '{colors.map-label}', halo: '{colors.map-label-halo}', faction-bar: '6px, left edge, couleur de la Faction' }
  map-legend: { fill: '{colors.map-label-halo}', rule: '1.4px {colors.map-label}', title: '{typography.map-legend-title}', entry: '{typography.map-legend-entry}', swatch: '28px', padding: '{spacing.map-legend-padding}', margin: '{spacing.map-credit-margin}' }
---

# OPENMAP — Design Spine

**Ce spine l'emporte** en cas de conflit avec les maquettes de `mockups/`, les planches de `.working/` ou les images de `imports/`. Maquettes clés (1366 × 768, polices embarquées) : [`mockups/editeur.html`](mockups/editeur.html), [`mockups/assistant.html`](mockups/assistant.html), [`mockups/export.html`](mockups/export.html). Planches d'exploration : `.working/color-themes-1.html` (palette retenue : variation **02 « Bleu de Prusse & ivoire »**) et `.working/directions-1.html` (hybride **01 Atelier du cartographe** + Timeline de **03 Banc de montage**). `.working/key-*.html` sont les sources d'origine des maquettes et ne font pas référence.

Écarts voulus avec les planches : pas de cadre gravé ni de bordure graduée d'atlas autour de la Carte, pas de toggle FR/EN dans la barre haute. Dans les maquettes, les états (a) à (c) de l'Éditeur et l'Éditeur derrière la modale Export gardent la hauteur de Timeline rejetée (280 px) ; seul l'état (d) montre la hauteur retenue.

## Brand & Style

OPENMAP est un atlas d'archives relié qu'on aurait posé sur un banc de montage. Côté chrome, on y retrouve l'encre bleu-noir sur ivoire, des angles francs, des libellés d'outils en petites capitales et une serif réservée aux titres, aux dates et aux libellés de Carte. La Timeline, elle, vient du montage vidéo : règle graduée, tête de lecture, vignettes d'Étape, transitions hachurées et pistes. Les vidéastes lisent déjà ce langage.

Le ton visuel reste **sérieux, précis, digne de confiance**. Il doit aussi être simple à prendre en main, comme dans Canva ou CapCut : une densité moyenne, aérée, et l'impression qu'on ne peut rien casser. La v1 est sobre et efficace. L'habillage façon RTS viendra plus tard, en v2 (PRD §10.4) ; en v1, l'esprit RTS n'existe que *sur la Carte*, à travers les Jetons d'unité et la conquête visible.

Le principe qui décide de tout : **la Carte domine et porte toute la couleur**. L'interface reste en demi-teintes. Son unique accent se lit toujours comme de l'interface, jamais comme une Faction.

Registre du **rendu de Carte** (le contenu exporté, pas l'interface ; aucune de ces images ne règle le chrome) — références fournies par l'utilisateur :
- [`imports/ref-guerre-froide-alliances.png`](imports/ref-guerre-froide-alliances.png) : carte d'alliances plate et lisible façon manuel scolaire (UJ-3).
- [`imports/ref-normandie-1944-vintage.webp`](imports/ref-normandie-1944-vintage.webp) : carte de campagne vintage sur papier, fronts datés, badges d'unités (UJ-4).
- [`imports/ref-waterloo-1815-plan.jpg`](imports/ref-waterloo-1815-plan.jpg) : plan d'époque avec cartouche ; son échelle tactique est hors v1.
- [`imports/ref-waterloo-baz-battles.jpg`](imports/ref-waterloo-baz-battles.jpg) : style d'animation Baz Battles, portraits, ellipses et flèches blanches.

UI system : **shadcn/ui, fortement personnalisé** (confirmé par l'utilisateur). Tout composant shadcn est restylé par les tokens du frontmatter : couleurs, rayons, typographie, ombres. Livrer un composant shadcn avec son look par défaut est une faute, pas un raccourci.

## Colors

### Chrome — deux modes

**Résolution des modes.** Une référence au token de couleur `x` se résout en `x` en mode clair et en `x-dark` en mode sombre, dès que `x-dark` existe. Une clé de composant suffixée `-dark` (ex. `foreground-dark` de `tool-rail-item-active`) prime sur cette règle. Les tokens sans variante `-dark` (`scrim`, `canvas-*`, `map-*`) sont mono-mode : ils ne changent jamais avec le thème.

Tous les couples de texte courant atteignent AA (4,5:1). Aucun n'est limité à AA-large. Ratios calculés sur la planche 02 : texte sur `background`, accent en tant que texte sur `surface`, états sur `surface-raised`.

| Token | Clair | Sombre | Contraste (clair / sombre) | Rôle |
|---|---|---|---|---|
| `background` | `#F3EFE4` | `#11161C` | — | Fond de l'application et de la scène autour de la Carte |
| `surface` | `#FBF8F1` | `#182029` | — | Barre haute, rail, panneau, Timeline, tiroir |
| `surface-raised` | `#FFFFFF` | `#212B35` | — | Popovers, toasts, dialogues, champs, pastilles de vignette |
| `border` | `#D8D1C1` | `#324050` | 1,4 / 1,6:1 | Filets **décoratifs** uniquement (voir règle ci-dessous) |
| `border-input` | `#7D858D` | `#738292` | 3,7 / 3,7:1 sur `surface-raised` ; au pire 3,3 / 3,7:1 sur les trois fonds (≥ 3:1 requis) | Contour des champs, cases à cocher, contrôles segmentés, sélecteurs (WCAG 1.4.11) |
| `text-primary` | `#18222D` | `#ECE7DB` | 14,0 / 14,7:1 | Texte courant, valeurs surchargées |
| `text-secondary` | `#46525E` | `#B7BCBF` | 7,0 / 9,5:1 | Libellés, valeurs héritées, outils au repos |
| `text-muted` | `#626C77` | `#8E98A3` | 4,6 / 6,2:1 | Légendes, minutage secondaire, aides. Plancher AA : ne jamais l'éclaircir |
| `accent` | `#1D4163` | `#8EB6D8` | 10,0 / 7,7:1 | Action principale, outil actif, Étape courante, lecture, liens |
| `accent-hover` | `#132F4A` | `#AACAE5` | 12,4 / 10,3:1 | Survol et pression de l'accent |
| `on-accent` | `#F7F3EA` | `#0D1A26` | 9,5 / 8,2:1 | Texte et icône posés sur l'accent |
| `selection` | `#DAE3EC` | `#1D3448` | 12,4 / 10,4:1 (texte dessus) | Fond d'élément sélectionné ou survolé dans le chrome |
| `focus-ring` | `#2C6391` | `#C4DCF0` | 5,5 / 12,8:1 (≥ 3:1 requis) | Anneau de focus clavier |
| `success` | `#2B6A4C` | `#76B894` | 6,4 / 6,2:1 | « Projet sauvegardé », export terminé |
| `warning` | `#8A5B0E` | `#D9AC55` | 5,9 / 6,8:1 | « Stockage presque plein », Fond de repli, garde-fou Faction |
| `danger` | `#A5312F` | `#EC7B78` | 6,8 / 5,2:1 | « Supprimer l'Étape », échec d'export |
| `text-disabled` | `#99A0A6` | `#747B81` | 2,7 / 3,4:1 (exempté, WCAG 1.4.3) | Texte d'un contrôle désactivé ; équivaut à `text-secondary` à 55 % |
| `progress-track` · `progress-fill` | `#D8D1C1` · `#1D4163` | `#324050` · `#8EB6D8` | remplissage 6,9 / 5,0:1 sur le rail (≥ 3:1) | Rail et remplissage de la barre de progression (export) |
| `scrim` | `#11161C` | `#11161C` | — | Voile derrière un dialogue modal, à 62 % (`dialog-scrim`), identique dans les deux modes |
| `track-arrows` · `track-tokens` · `track-text` | `#E3D6D2` · `#D6E0D5` · `#D5DEE8` | `#3A3A48` · `#2E4038` · `#2A3A4C` | 11,3 · 11,9 · 11,8 / 8,8 · 8,7 · 9,1:1 avec `track-ink` | Clips des pistes Flèches, Jetons, Texte |
| `track-ink` | `#18222D` | `#E6E4DC` | — | Texte posé sur une piste |
| `playhead` | `#1D4163` | `#8EB6D8` | 10,0 / 7,7:1 (≥ 3:1) | Tête de lecture |
| `act-rule` | `#7A8590` | `#687786` | 3,3 / 4,0:1 (≥ 3:1) | Filets des Actes |

**Accent bleu de Prusse.** Il est très sombre en mode clair et très pâle en mode sombre. Il se distingue du bleu d'une Faction comme « Royaume de Hongrie » par la **valeur**, pas par la teinte. Il reste dans le chrome : bouton Exporter, bouton de lecture, outil actif, Étape courante, tête de lecture, liens d'action, clip sélectionné.

**Correspondance shadcn.** `primary` ← `{colors.accent}` · `primary-foreground` ← `{colors.on-accent}` · `background` ← `{colors.background}` · `card` ← `{colors.surface}` · `popover` ← `{colors.surface-raised}` · `foreground` ← `{colors.text-primary}` · `muted-foreground` ← `{colors.text-muted}` · `border` ← `{colors.border}` · `input` ← `{colors.border-input}` · `ring` ← `{colors.focus-ring}` · `destructive` ← `{colors.danger}` · `accent` (le fond de survol chez shadcn) ← `{colors.selection}`. Attention au faux ami : l'`accent` de shadcn est un fond de survol, alors que l'`accent` d'OPENMAP est la couleur d'action.

**Bordures.** `{colors.border}` passe sous 3:1. Il est décoratif et ne porte jamais seul une information. Un état se signale toujours par une couleur de texte, une icône ou un fond `{colors.selection}`. La limite d'un **champ de saisie** est une information (WCAG 1.4.11) : champs, sélecteurs, cases à cocher, sliders et contrôles segmentés prennent `{colors.border-input}`, à 3:1 au moins sur tous les fonds, dans les deux modes. Les boutons secondaires gardent `{colors.border}`, car leur libellé suffit à les identifier.

**Texte sur `selection`.** `{colors.text-muted}` sur `{colors.selection}` tombe à 4,1 / 4,4:1, sous AA : ce couple est interdit. Sur une rangée survolée ou sélectionnée, légendes et résumés passent en `{colors.text-secondary}` (6,2 / 6,7:1).

**Désactivé.** Un contrôle désactivé passe à 55 % d'opacité (`control-disabled`, texte équivalent `{colors.text-disabled}`) et garde sa place. Cet état ne sert jamais à signaler un réglage imposé : un crédit obligatoire se montre verrouillé, avec un cadenas et une explication (`export-credit-locked`).

**États.** `success`, `warning` et `danger` s'affichent toujours avec leur icône et un libellé. La couleur seule n'est jamais le signal.

### Canevas — surimpressions d'édition (identiques dans les deux modes)

Sur la Carte, l'interface ne s'exprime qu'en **encre et halo** : `{colors.canvas-ink}` doublé d'un halo `{colors.canvas-halo}`. Cela vaut pour le contour de sélection (`canvas-selection`), le survol d'une Entité ou d'un tracé à attacher (`canvas-hover`), la sélection en attente hachurée de la Conquête (`canvas-pending`), les poignées, le curseur de pinceau en double anneau pointillé, les points d'une Zone dessinée et le point d'origine d'une propagation. Le couple encre + halo se lit sur tous les Fonds. L'accent UI n'apparaît **jamais** sur la Carte. Hors du cadre d'export, la Carte est assombrie par `{colors.canvas-mask}` à 55 % (rendu : [`mockups/editeur.html`](mockups/editeur.html)) `[ASSUMPTION: teinte et opacité rendues sur maquette, pas validées explicitement]`.

### Carte — Fonds de carte (contenu exporté, identique dans les deux modes)

La Carte ne suit **jamais** le thème de l'interface : un Fond sombre reste sombre en mode clair, et inversement. Le jeu `map-*` sans suffixe est celui du **Fond parchemin** (Fond par défaut). Pour les autres Fonds stylisés, une référence au token `map-x` se résout en `map-x-sombre`, `map-x-clair` ou `map-x-relief` selon le **Fond actif**, jamais selon le mode UI. `[ASSUMPTION: valeurs proposées par ce spine, à valider sur une planche des Fonds avant la story FR-5]`

| Rôle (token de base) | Parchemin | Sombre (`-sombre`) | Clair (`-clair`) | Relief (`-relief`) |
|---|---|---|---|---|
| Mer (`map-sea`) | `#D0DBE0` | `#1B2733` | `#DCE9F2` | `#C9D8DF` |
| Terres et Territoire **neutre** (`map-land-neutral`, FR-25) | `#EEE8D7` | `#2E3538` | `#F7F6F2` | `#E6E1CC` |
| Côtes, frontières d'Entités non attribuées (`map-coast`) | `#7A8590` · 3,1:1 sur terre | `#8A96A0` · 4,1:1 | `#848E98` · 3,1:1 | `#6F7B85` · 3,3:1 |
| Libellés de lieux et de Factions (`map-label`) | `#18222D` | `#ECE7DB` | `#1E2A36` | `#1F2A33` |
| Halo des libellés (`map-label-halo`) | `#F7F3EA` · 14,5:1 | `#11161C` · 14,7:1 | `#FFFFFF` · 14,6:1 | `#F5F1E4` · 12,9:1 |
| Libellés de mer, sans halo (`map-sea-label`) | `#4A5D6C` · 4,8:1 | `#9FB3C4` · 7,0:1 | `#3F5E78` · 5,5:1 | `#3F5566` · 5,3:1 |
| Ligne de front par défaut, tiret-point avec halo (`map-front`) | `#18222D` | `#ECE7DB` | `#1E2A36` | `#1F2A33` |
| Flèche sans Faction ni Catégorie (`map-arrow`) | `#7A2716` | `#E07A5F` | `#9E2F1F` | `#7A2716` |

Le **relief** ajoute un ombrage `{colors.map-shade-relief}` en mode produit (multiply) à 35 % sur les terres. Le **satellite** remplace mer et terres par l'imagerie ; libellés, halos, Ligne de front et Flèche par défaut y prennent les valeurs `-sombre`, et le **Fond de repli** du satellite est le Fond sombre (FR-5). Pendant le chargement des tuiles, le fond uni est `map-land-neutral` **du Fond actif** (`map-land-neutral-sombre` pour le satellite).

**Réglages du Fond (FR-5).** Ils s'appliquent au Fond seul, jamais aux Territoires ni aux éléments posés. « Rétablir les réglages du Fond » revient aux défauts du Fond actif ; changer de Fond conserve les réglages modifiés. `[ASSUMPTION: bornes, défauts et conservation]`

| Réglage | Plage | Défaut Fonds stylisés | Défaut satellite |
|---|---|---|---|
| Luminosité | −50 % à +50 %, pas de 1 | 0 % | −10 % |
| Saturation | −100 % à +50 %, pas de 1 | 0 % | −35 % |
| Teinte | Couleur (défaut `{colors.map-tint}`) et intensité de 0 à 60 %, pas de 1 | 0 % | 0 % |

### Couleurs de Faction : du contenu, pas des tokens

Les couleurs de Faction appartiennent à l'utilisateur, via son Kit de Faction, ou à la Bibliothèque. Ce ne sont **pas** des tokens UI. Elles ne changent jamais avec le mode, et le chrome ne les emprunte jamais pour lui-même. Seule exception : les pastilles `faction-swatch`, qui *montrent* une Faction, toujours entourées d'un anneau neutre. Jeu de test de la planche (valeurs d'exemple, pas des tokens) : Empire ottoman `#B3342B`, Royaume de Hongrie `#3C6AA0`, Venise `#D2A03A`, Valachie `#E0A99C`.

**Garde-fou couleur de Faction.** L'écart ΔE 2000 entre une couleur de Faction (remplissage ou contour) et l'accent UI des **deux** modes se lit ainsi : ≥ 20 distinct, 10 à 20 voisin, < 10 risque. Quand une couleur de Kit passe **sous ΔE 10** face à `{colors.accent}` ou à `{colors.accent-dark}`, l'éditeur de Kit affiche un avertissement non bloquant (`{colors.warning}`, avec icône). `[ASSUMPTION: seuil d'alerte fixé à < 10 ; la zone « voisin » ne déclenche rien, parce que la règle « pas d'accent sur la Carte » la neutralise. Référence : Hongrie vs accent clair = ΔE 14,7.]`

## Typography

Trois voix, servies par deux **polices libres (OFL) embarquées et auto-hébergées** avec l'application, pour un rendu identique sur tous les PC. Les piles système qui les suivent dans les tokens ne servent que de repli, si le fichier de police ne charge pas.
- **Serif — Libre Baskerville** (400, 600) : réservée aux **titres** (nom du Projet `title-md`, titre de panneau `title-lg`, titre d'écran de l'Assistant et de l'Accueil `title-xl`), aux **dates** (`date-display` et `date-compact`, avec chiffres alignés) et aux **libellés de Carte** par défaut (`map-label-*`, `map-cartouche-*`, `map-text`, `map-token-label`, `map-legend-*`). Repli : Baskerville → Baskerville Old Face → Georgia → Times New Roman.
- **Sans — Source Sans 3** (400, 500, 600) : toute l'interface, plus le Compteur (`map-counter`, chiffres tabulaires) et le crédit. `[ASSUMPTION: Source Sans 3 reste provisoire ; elle peut encore changer pour une autre sans humaniste OFL à chiffres tabulaires.]` Repli : Segoe UI → Frutiger → Helvetica Neue → Arial.
- **Minutage** : la sans en chiffres tabulaires (`font-variant-numeric: tabular-nums lining-nums`) pour `timecode`, `timecode-strong` et `map-counter`. On écrit `00:08,4`, `1,5 s`.

Échelle de l'interface :

| Token | Taille / graisse | Usage |
|---|---|---|
| `title-xl` · `title-lg` · `title-md` | 28 · 20 · 16 px, 600, serif | Titre d'écran de l'Assistant et de l'Accueil · titre de panneau et de dialogue · nom du Projet, Étape dans la barre d'options |
| `date-display` | 22 px, 600, serif | Date d'Étape courte (année seule) sur les vignettes |
| `date-compact` | 15 px, 600, serif | Date d'Étape avec jour ou mois, quand `date-display` ne tient pas |
| `body` · `body-strong` | 14 px, 400 · 600 | Texte courant, champs, boutons, rangées du panneau |
| `label` | 13 px, 500 | Barre haute, barre d'options, onglets, segments, noms de piste, pastilles de Faction |
| `caption` | 12 px, 400 | Légendes, aides, sous-lignes de toast, libellé de format, infobulles |
| `label-caps` · `label-caps-tight` | 11 px, 600, capitales | Rail d'outils, titres de section, Actes |
| `timecode` · `timecode-strong` | 12 · 13 px, 500 · 600, tabulaires | Règle, durées, minutage, pourcentage, hex |

Règles :
- `label-caps` s'écrit en capitales (text-transform) avec un interlettrage de 0,04em : rail d'outils, titres de section du panneau, Actes. `[ASSUMPTION: titres de section du panneau en label-caps sans serif, pour réserver la serif aux titres et aux dates.]`
- **Largeur des libellés du rail.** Un libellé du rail dispose de 72 px. S'il dépasse cette largeur avec l'interlettrage de 0,04em, il passe en `label-caps-tight` (interlettrage nul), sans changer de corps. En français, seul « BIBLIOTHÈQUE » est concerné (77 px → 72 px, mesuré en Source Sans 3). Un libellé ne se tronque jamais et ne passe jamais sur deux lignes : une traduction qui dépasse encore 72 px doit être raccourcie.
- **Dates sur les vignettes d'Étape.** La pastille de la vignette essaie dans l'ordre : `date-display` (« 1463 ») ; `date-compact` (« 16 mars », « 6 juin 1944 ») ; `date-compact` sans l'année quand elle est identique à celle de l'Étape précédente (« 12 juin »). `[ASSUMPTION: omission de l'année répétée]` La date complète reste dans l'infobulle, le nom accessible et le panneau de l'Étape. Une date ne s'ellipse jamais ; le titre `caption`, lui, peut s'ellipser.
- **Libellés de Carte en px d'export.** Les tokens `map-*` sont exprimés en pixels d'export pour un cadre dont le **côté court** fait 1080 px, ce qui couvre 1920 × 1080 (16:9), 1080 × 1920 (9:16) et 1080 × 1080 (1:1). À l'écran, tout ce qui est dessiné sur la Carte (libellés, halos, cartouche, Légende, Jetons, crédit) suit l'échelle du cadre : taille affichée = token × (côté court du cadre à l'écran ÷ 1080). Exemple : cadre 16:9 de 562 × 316 px → facteur 0,29 → libellé de Faction de 56 px affiché à environ 16 px. Le chrome, lui, ne se met jamais à l'échelle.
- La serif n'apparaît jamais dans un bouton, un champ, une infobulle ou un toast.
- Un seul poids gras par voix : 600.

## Layout & Spacing

Échelle de 4 : 4 · 8 · 12 · 16 · 20 · 24 · 32 px (`{spacing.1}` à `{spacing.8}`). Densité moyenne et aérée, celle de la planche 01. Rangées du panneau : `{spacing.panel-row-min-height}` minimum. Contrôles : `{spacing.control-height}`, ou `{spacing.control-height-sm}` dans les barres denses.

Écran Éditeur (grille à 3 colonnes sur 3 rangées), rendu dans [`mockups/editeur.html`](mockups/editeur.html) : état (a) sombre, (b) clair, (c) tiroir Bibliothèque ouvert, **(d) hauteur de Timeline par défaut (200 px)**.

| Zone | Dimension | Notes |
|---|---|---|
| Barre haute | `{spacing.top-bar-height}`, pleine largeur | `[ASSUMPTION: réduite des 56 px de la planche 01 pour tenir NFR-8]` |
| Rail d'outils | `{spacing.rail-width}`, pleine hauteur sous la barre | Items de 72 × `{spacing.rail-item-height}` : icône `{spacing.icon-size-rail}` + libellé |
| Tiroir Bibliothèque | `{spacing.drawer-width}`, contre le rail, **pleine hauteur** sous la barre haute | Recouvre la gauche de la scène **et la gauche de la Timeline**, sans recadrer la Carte ni décaler la Timeline |
| Barre d'options de l'outil | `{spacing.tool-options-bar-height}`, pleine largeur de la scène, au-dessus de la Carte | À gauche : Étape courante puis options de l'outil. **À droite : libellé du Format de sortie** |
| Carte | Reste de la scène sous la barre d'options | Zoom en bas à gauche, toasts en bas à droite |
| Panneau de propriétés | `{spacing.panel-width}` ; `{spacing.panel-width-compact}` sous 1280 px de large | Marge interne `{spacing.panel-padding-x}` |
| Timeline | `{spacing.timeline-height}` **par défaut**, entre rail et panneau | Budget ci-dessous |

**Budget de la Timeline à 200 px.** `{spacing.timeline-header-height}` 40 + `{spacing.timeline-ruler-height}` 20 + `{spacing.act-row-height}` 24 + `{spacing.etape-thumbnail-height}` 72 + `{spacing.track-lane-height}` 26 (piste Flèches) + `{spacing.track-peek-height}` 18 (amorce de la piste Jetons, qui signale le défilement) = **200 px**. Le filet haut de 1 px est compris dans l'en-tête. En-tête, règle, Actes et Étapes (156 px) restent fixes ; les pistes défilent dessous, avec une barre de `{spacing.scrollbar-width}` qui ne court que sous la rangée des Étapes. Sans Acte (P0, ou aucun Acte créé), la rangée des Actes disparaît et ses 24 px reviennent aux pistes. Hauteur minimale `{spacing.timeline-min-height}` = 156 px fixes + 24 px de piste. Une sous-rangée de chevauchement (voir Components → Timeline) ajoute `{spacing.track-lane-height}` dans la zone qui défile, sans toucher aux 156 px fixes. « Replier » réduit la Timeline à `{spacing.timeline-collapsed-height}` (en-tête seul) ; la poignée du bord haut l'agrandit jusqu'à 50 % de la hauteur de la fenêtre.

Mesure à 1366 × 768 (NFR-8 ; Chrome maximisé, barre des tâches Windows visible, viewport 1366 × 648) : la scène fait 990 × 400 px, la Carte visible 990 × 364 px, et le cadre d'export 16:9 562 × 316 px ([état (d)](mockups/editeur.html#etat-d)). L'[état (a)](mockups/editeur.html#etat-a) garde la hauteur rejetée (280 px) pour comparaison : la hauteur retenue donne 79 % de surface de cadre en plus. Le cadre d'export est centré sur la Carte, au ratio du Format de sortie (16:9, 9:16 ou 1:1), avec au moins `{spacing.6}` de marge. Son libellé de format vit dans la barre d'options, jamais sur la Carte.

**Accueil.** Colonne centrée de `{spacing.home-max-width}` au plus, marges `{spacing.8}`, sur `{colors.background}`. Barre haute commune (sans fil de Projet), puis en-tête « Projets » en `title-xl` avec, à droite, « Importer un Fichier projet » (`button-secondary`) et « Nouveau Projet » (`button-primary`, seul primaire de l'écran). Grille de cartes de Projet en colonnes automatiques de `{spacing.project-card-min-width}` minimum, espacées de `{spacing.6}` (4 colonnes à 1366 px). Un bandeau éventuel (stockage, navigateur) se place entre la barre haute et l'en-tête.

## Elevation & Depth

Tout est plat. La hiérarchie vient du **ton**, dans l'ordre `background` < `surface` < `surface-raised`, et des filets `{colors.border}`. Les ombres sont réservées aux couches flottantes, et portées par leur token :

- Ombre courte : `toast`. Ombre longue : `library-drawer`, `popover` (Popover, DropdownMenu, Select, menu contextuel de la Carte), `dialog`. Le `tooltip` n'a pas d'ombre : il se détache par son fond inversé.
- Derrière un dialogue modal (Export, confirmations, consentement), l'écran est voilé par `dialog-scrim`. L'Assistant, en plein cadre, n'a pas de voile.
- Rien d'autre : pas d'ombre sur les cartes de Projet, les boutons ou les vignettes d'Étape, aucune lueur (glow). Sur la Carte, seul le masque hors cadre (`export-frame-mask`) crée de la profondeur.

## Shapes

Angles **francs** : ceux d'un atlas relié, pas d'une app grand public.

- `{rounded.none}` : vignettes d'Étape, cartes de Projet, pastilles de Faction, clips de piste, tuiles de Fond, squelettes, Carte.
- `{rounded.sm}` : boutons, champs, items du rail, bouton de lecture, segments, pastilles du sélecteur de Faction, infobulles.
- `{rounded.md}` : toasts, popovers, dialogues, tiroir (côté droit seulement), barre du Mode présentation. `[ASSUMPTION: la planche fixe 2 px partout ; 4 px ici seulement pour les couches flottantes]`
- `{rounded.full}` : réservé aux curseurs de slider, aux points de statut et à l'anneau de pinceau. **Jamais** pour un bouton, un badge ou un champ : pas de pilule.

Icônes : trait de `{spacing.icon-stroke}`, `{spacing.icon-size-rail}` dans le rail, `{spacing.icon-size-control}` dans les contrôles. `[ASSUMPTION: Lucide (défaut shadcn) passé en trait de 1,5, avec des icônes dessinées sur mesure pour Territoire, Conquête et Jeton, comme sur la planche.]`

**Zone de frappe.** Toute cible interactive offre au moins `{spacing.hit-area-min}` × `{spacing.hit-area-min}` de zone active, quelle que soit sa taille visuelle : un clip de 20 px se saisit sur toute la hauteur de sa piste (26 px) ; la poignée de 12 px de la tête de lecture a une zone de 24 × 24 px ; une case à cocher de 16 px est cliquable sur toute sa rangée, libellé compris ; une `canvas-handle` a une zone de 24 px. Les bords de clip et de transition gardent une bande de saisie de 8 px de large sur toute la hauteur de leur rangée : ils relèvent de l'exception « équivalent » de WCAG 2.5.8, car les mêmes durées se règlent dans le panneau.

## Components

Composants shadcn restylés par les tokens (Button, Dialog, Popover, DropdownMenu, ContextMenu, Tabs, Tooltip, Slider, Select, Toggle, ToggleGroup, Checkbox, Progress, Sheet, Skeleton, Toast via Sonner) : pas de rayon shadcn par défaut, pas de police Geist, pas d'ombre shadcn. Rendus de référence : Éditeur dans [`mockups/editeur.html`](mockups/editeur.html), Assistant dans [`mockups/assistant.html`](mockups/assistant.html), modale Export dans [`mockups/export.html`](mockups/export.html).

Composants propres à OPENMAP (valeurs dans le frontmatter, anatomie ici) :

**Chrome de l'Éditeur**
- **Barre haute** (`top-bar`) : logotype, fil « Projets / {nom du Projet} » (nom en `title-md`), statut de sauvegarde (`caption` avec icône `{colors.success}`), Format de sortie, annuler/rétablir, recherche de lieu, Présentation (`button-secondary`), **Exporter** (`button-primary`). Un seul `button-primary` par écran ; `button-ghost` pour les actions d'icône et « Replier ».
- **Rail d'outils** (`tool-rail`, `tool-rail-item`, `tool-rail-item-active`) : icône au-dessus d'un libellé en petites capitales. Actif : fond de sélection, libellé accent (clair) ou `{colors.text-primary-dark}` (sombre), barre de 3 px au bord gauche. Infobulle : nom complet et raccourci.
- **Barre d'options de l'outil** (`tool-options-bar`) : sans filet. À gauche, « Étape 1463 · Conquête de la Bosnie » (date en `title-md`), puis les options de l'outil actif (pastille de Faction, segments, slider). À droite, le libellé du Format de sortie.
- **Panneau de propriétés** (`properties-panel`) : titre `title-lg` avec Emblème ou icône, surtitre `caption` (« Copie propre au Projet »), sections à titre `label-caps` séparées par des filets. Hex en `timecode`. En lecture seule (Projet ouvert dans un autre onglet), les valeurs gardent `{colors.text-primary}` mais perdent contour et curseur de saisie.
- **Champ hérité / surchargé** (`field-inherited`, `field-overridden`) : hérité, valeur en `{colors.text-secondary}` et légende « Hérité de … » ; surchargé, valeur en `{colors.text-primary}`, barre de 2 px au bord gauche et lien « Rétablir ». Même motif pour les Sous-factions (Kit parent) et les Étapes (Étape précédente). **Rangée de Sous-faction** (`subfaction-row`) : pastille, nom, résumé et chevron ; survolée, le résumé passe en `summary-color-selected`. **Rangée « Plus d'options »** (`more-options-row`) : libellé, résumé du contenu (« Frontière, Flèche, Jeton ») et chevron.
- **Champ de saisie**, **case à cocher**, **slider** (`input-field`, `checkbox`, `slider`) : contour `{colors.border-input}` ; le slider a toujours un champ numérique à droite, avec son unité. **Contrôle segmenté** (`segmented-control`) : **tout choix exclusif de 2 à 4 options**. Pas de boutons radio ronds. Segment choisi : fond de sélection, texte 600 et filet bas de 2 px en accent. `[ASSUMPTION: filet bas ajouté pour que l'état choisi atteigne 3:1 (WCAG 1.4.11) ; le fond seul fait 1,3:1.]` Au-delà de 4 options : `Select`.
- **Champ couleur** (`color-field`) : pastille carrée de `{spacing.color-swatch-size}` + hex en `timecode` dans un `input-field`. Clic sur la pastille : `popover` avec zone saturation / valeur, curseur de teinte, pipette (masquée si le navigateur ne la fournit pas) et un nuancier « Couleurs du Projet » (titre `label-caps`) qui liste les couleurs des Factions du Projet. Le **garde-fou couleur de Faction** s'affiche dessous, en `caption`, icône triangle `{colors.warning}`.
- **Sélecteur de Faction** (`faction-picker`) : rangée de pastilles de `{spacing.control-height-sm}` qui passe à la ligne, une par Faction du Projet (carré `faction-swatch` + nom en `label`), plus « Neutre » (carré `{colors.map-land-neutral}` hachuré) et « + Faction ». Pastille choisie : fond de sélection et filet bas en accent, comme un segment. Sélection mixte : aucune pastille choisie, légende « Plusieurs Factions ».
- **Sélecteur de Fond** (`basemap-picker`) : grille de 3 colonnes de tuiles d'aperçu (Parchemin, Sombre, Clair, Relief, Satellite), hautes de `{spacing.basemap-tile-height}`, nom en `caption` dessous. Tuile choisie : contour intérieur de 2 px en accent. Satellite indisponible : tuile en `control-disabled` (55 % d'opacité, curseur interdit, place conservée), légende « Indisponible » et lien « Réessayer ». **Pastille « Données les plus proches »** (`nearest-data-chip`) : icône info + « Données les plus proches : 1454 », dans la barre d'options et les paramètres du Projet.
- **Tiroir Bibliothèque** (`library-drawer`) : pleine hauteur sous la barre haute, contre le rail ; onglets Templates · Kits · Emblèmes · Icônes d'événement, recherche, filtres en `Select`, grille de vignettes carrées à angles vifs. Dans Kits, un segmenté « Bibliothèque · Kits personnels ».
- **Squelette** (`skeleton`) : blocs pleins à la forme exacte du contenu attendu (vignette, carte de Projet, rangée). **Infobulle** (`tooltip`), **popover** (`popover`), **toast** (`toast`) : un toast porte une icône d'état cerclée, un titre `body-strong` et une sous-ligne `caption`.
- **Bandeaux** (`banner-warning`, `banner-info`) : pleine largeur sous la barre haute, liseré gauche de 3 px, icône, texte `body`, une action au plus (`button-secondary` compact) et une croix de masquage. `banner-warning` pour le stockage (« Stockage presque plein. Exportez un Fichier projet pour ne rien perdre. » + « Exporter le Fichier projet »), le hors-ligne et le navigateur ; `banner-info` pour la lecture seule d'un Projet ouvert ailleurs (« Reprendre ici »).
- **Dialogue** (`dialog`) : titre `title-lg`, actions alignées à droite, le primaire le plus à droite, voile `dialog-scrim`. L'**Assistant** (`assistant`) est un dialogue plein cadre : en-tête de `{spacing.assistant-header-height}`, étapes numérotées de `{spacing.assistant-step-height}` (courante en accent avec filet bas), colonne « Dans ce Projet » de `{spacing.assistant-aside-width}` en `surface` ([rendu](mockups/assistant.html)).

**Timeline**
- **En-tête** (`timeline`) : « Timeline » en `title-md`, bouton de lecture `timeline-play-button`, Étape précédente/suivante, minutage `timecode-strong` / `timecode`, vitesse, zoom, « Replier » ; poignée de redimensionnement centrée sur le bord haut.
- **Corps** : colonne de libellés (Actes, Étapes, Flèches, Jetons, Texte), règle graduée en secondes (`timeline-ruler`), Actes soulignés d'un filet à talons (`act-bracket`), vignettes d'Étape (`etape-thumbnail`, `etape-thumbnail-current` pour l'Étape courante) : aperçu de la Carte avec une pastille qui porte la date et le titre. Transitions en blocs hachurés (`transition-hatch`) avec leur durée (« 1,5 s »).
- **Pistes** (`track-lane`, `track-clip-arrows`, `track-clip-tokens`, `track-clip-text`, `track-clip-selected`) : une rangée de clips par piste, clips teintés par piste avec un liseré gauche en `track-ink` à 45 %. Quand deux clips d'une même piste se chevauchent, la piste gagne une **sous-rangée automatique** de même hauteur ; elle disparaît avec le chevauchement. Tête de lecture (`playhead`) : trait et poignée pentagonale.

**Modale Export** ([rendu](mockups/export.html))
- **Réglages** (`export-dialog`) : onglets Vidéo / Image, grille libellé / valeur. Pendant le rendu, les réglages passent en `control-disabled`, et le pied porte « Rendu en cours… », le pourcentage, la `progress-bar`, le temps restant en `caption` et « Annuler » (`button-secondary`).
- **Crédit obligatoire** (`export-credit-locked`) : rangée verrouillée avec le texte du crédit et une icône cadenas, **sans case à cocher** ; dessous, l'explication en `caption`, puis un `Select` « Position » et un segmenté « Discrète / Lisible ».
- **Export terminé** (`export-done`) : encadré à liseré `{colors.success}` et icône, titre « Export terminé », nom du fichier en `body`, détails en `caption` ; actions « Exporter à nouveau » (`button-secondary`) et « Télécharger de nouveau » (`button-primary`, à droite). **Export indisponible** : `banner-warning` en tête de la modale, « Exporter » en `control-disabled`.

**Accueil, consentement et Mode présentation** (surfaces sans maquette : ce spine suffit à les construire)
- **Carte de Projet** (`project-card`, dans `home-layout`, voir Layout & Spacing) : vignette 16:9 pleine largeur (image de la première Étape, angles vifs), puis nom en `body-strong` (une ligne, ellipse) et méta en `caption` `{colors.text-muted}` : « Modifié il y a 2 h · 9:16 ». Bouton de menu `button-ghost` en haut à droite de la vignette, visible au survol et au focus. Survol : fond `surface-raised` et contour `{colors.border-input}`. Projet ouvert dans un autre onglet : méta « Ouvert dans un autre onglet ».
- **Accueil vide** (`home-empty`) : centré dans la grille, titre `title-lg` « Aucun Projet pour l'instant. », texte `body` `{colors.text-secondary}`, « Nouveau Projet » (`button-primary`) et « Importer un Fichier projet » (`button-secondary`) ; toute la zone est une cible de dépôt, marquée par un contour pointillé `{colors.border-input}` pendant le glisser. Pas d'illustration.
- **Dialogue de consentement télémétrie** (`consent-dialog`) : dialogue de `{spacing.dialog-width-sm}`, sur voile, sans croix. Titre « Statistiques d'usage anonymes », texte en `body`, puis deux `button-secondary` **de même largeur et de même style**, « Refuser » à gauche et « Accepter » à droite ; aucun n'a le focus initial (le focus va au titre). Lien « Ce qui est envoyé » vers le détail, en `caption`.
- **Contrôles du Mode présentation** (`presentation-controls`) : barre flottante centrée à `{spacing.6}` du bas, de `{spacing.presentation-bar-width}` × `{spacing.presentation-bar-height}`. C'est du chrome posé sur le contenu : fond `{colors.scrim}` à 72 %, icônes et minutage en `{colors.canvas-halo}`, **aucun accent**. Contenu : lecture/pause, minutage `timecode-strong`, barre de progression fine (remplissage `{colors.canvas-halo}` sur halo à 30 %), « Quitter la présentation ». Focus en `{colors.focus-ring-dark}`.

**Sur la Carte** (contenu exporté : tokens `map-*` du Fond actif et échelle du cadre, jamais de token UI)
- **Surimpressions de canevas** (`canvas-selection`, `canvas-hover`, `canvas-pending`, `canvas-handle`, `canvas-brush-cursor`) : encre + halo exclusivement. Tracé en cours : trait `canvas-selection` plein et points en `canvas-handle`. **Masque de cadre d'export** (`export-frame-mask`) : aucune bordure, aucun filet, aucun ornement.
- **Flèche** (`map-arrow-style`) : couleur du Kit de la Faction, sinon `{colors.map-arrow}` ; épaisseur de 14 px par défaut, de 4 à 120 px ; tête selon le Kit.
- **Jeton d'unité** (`unit-token`) : `{spacing.map-token-size}` de côté ou de diamètre ; forme et couleurs selon le Kit (symbole OTAN simplifié, carré bicolore, badge rond à drapeau, mini-drapeau). Étiquette `map-token-label` dessous, nue avec halo ou encadrée d'un filet de 2 px sur `{colors.map-label-halo}`.
- **Texte** (`map-text`) : `map-text` en `{colors.map-label}` avec halo par défaut ; cadres proposés : aucun, filet, bandeau halo.
- **Compteur** (`map-counter`) : valeur en `map-counter` tabulaire, barre de 6 px à gauche à la couleur de la Faction, libellé en `map-legend-entry`.
- **Cartouche de date** (`date-cartouche`) : style par défaut de l'Horodatage. Encadré halo, double filet d'encre, surtitre en capitales espacées, année. `[ASSUMPTION: le cartouche de la planche 01 devient le style d'Horodatage proposé par défaut par les Templates]`
- **Légende** (`map-legend`) : encadré halo à filet d'encre, titre « Légende » en `map-legend-title`, une ligne par entrée (carré de 28 px ou échantillon de motif, de Flèche ou de Jeton, puis libellé `map-legend-entry`), coin du cadre à `{spacing.map-credit-margin}`.
- **Crédit sur la Carte** (`map-credit`) : dans un coin du cadre. « Discrète » : `map-credit-discreet` avec halo. « Lisible » : `map-credit-legible` sur un bandeau halo. `[ASSUMPTION: corps, graisse et bandeau des deux niveaux ; la licence impose la présence du crédit, pas sa taille.]`
- **Pastille de Faction** (`faction-swatch`) : carré plein de la couleur du Kit, entouré d'un anneau surface + encre. Toujours accompagnée du nom.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Un seul accent, `{colors.accent}`, pour l'action, l'outil actif, l'Étape courante et la lecture | Dégradé violet ou indigo, ou tout dégradé de surface |
| Surfaces plates, hiérarchie par le ton et les filets | Glassmorphism, flou d'arrière-plan, verre dépoli |
| Angles francs : 0 à 2 px, 4 px pour les couches flottantes | Tout en pilule, cartes très arrondies, `rounded-full` sur des boutons |
| Icônes au trait de 1,5 px, dessinées ou restylées | Emojis en guise d'icônes, dans l'UI comme dans les messages |
| Chaque composant shadcn restylé par ces tokens | Look shadcn laissé tel quel (Geist, rayons de 8 px, ombres par défaut) |
| Ombres uniquement sur les toasts, popovers, tiroirs et dialogues | Lueur (glow), néon, ombres colorées, halo autour des boutons |
| Serif pour les titres, les dates et les libellés de Carte | Serif dans les boutons, les champs et le texte courant |
| La Carte identique en mode clair et en mode sombre ; chaque Fond garde sa palette | Assombrir ou réteinter la Carte, ses Fonds ou ses Factions selon le mode UI |
| Surimpressions du canevas et contrôles de présentation en encre + halo | Accent UI sur la Carte : sélection, poignées, pinceau, cadre, barre de présentation |
| Limite d'export marquée par l'assombrissement hors cadre | Cadre gravé, bordure graduée, filet ornemental autour de la Carte |
| Couleurs de Faction traitées comme contenu, avec le garde-fou ΔE | Couleur de Faction réutilisée dans le chrome, ou accent proposé comme couleur de Faction |
| États signalés par une icône et un libellé | Information portée par la seule couleur, ou par une `{colors.border}` seule |
| Densité moyenne, réglages avancés derrière « Plus d'options » | Tout exposer d'emblée, façon After Effects |
| Choix exclusifs en contrôle segmenté à angles de 2 px | Boutons radio ronds |
| Champs, cases, sliders et segments bordés de `{colors.border-input}` (≥ 3:1) | Champ délimité par la seule `{colors.border}` décorative |
| Zone de frappe de 24 px au moins, même sous un visuel plus petit | Cible de 12 ou 16 px sans zone active élargie ni équivalent |
| Crédit obligatoire verrouillé, avec cadenas et explication ; position et discrétion réglables | Crédit obligatoire décochable, masqué, ou présenté comme une case grisée sans explication |
| Consentement : deux boutons de même poids, rien de présélectionné | « Accepter » en primaire, « Refuser » en lien discret |
| Polices OFL embarquées, identiques sur tous les PC | Dépendre des polices installées sur le poste |

## Open Questions & Assumptions

- `[ASSUMPTION]` Source Sans 3 provisoire pour l'UI ; masque hors cadre `{colors.canvas-mask}` à 55 % (rendu sur maquette, non validé).
- `[ASSUMPTION]` Palettes des Fonds sombre, clair et relief (`map-*-sombre|clair|relief`), ombrage du relief, valeurs `-sombre` sur le satellite, bornes et défauts des réglages du Fond. À valider sur une planche des Fonds avant la story FR-5.
- `[ASSUMPTION]` Garde-fou Faction : alerte sous ΔE 10 face à l'accent de l'un ou l'autre mode ; rien entre 10 et 20.
- `[ASSUMPTION]` Titres de section du panneau en `label-caps` sans serif ; barre haute à 48 px ; `{rounded.md}` à 4 px pour les couches flottantes ; Lucide restylé en trait de 1,5 avec icônes sur mesure pour les outils de Carte.
- `[ASSUMPTION]` Cartouche de date comme style d'Horodatage par défaut ; année répétée omise sur les vignettes.
- `[ASSUMPTION]` Filet bas de 2 px en accent sur le segment choisi (3:1) ; corps et bandeau du crédit « Discrète » et « Lisible ».
- `[ASSUMPTION]` Styles par défaut sur la Carte : Flèche 14 px, Jeton 56 px, Texte 44 px, Compteur 44 px, Légende (tokens `map-text`, `map-token-label`, `map-counter`, `map-legend-*`).
- `[ASSUMPTION]` Accueil, carte de Projet, dialogue de consentement et contrôles du Mode présentation, spécifiés ici sans maquette (surfaces « spine-only » du log).
- `[ASSUMPTION]` Rangée des Actes de 24 px et amorce de piste de 18 px pour boucler le budget de 200 px.
- Thème au premier lancement : préférence système (voir EXPERIENCE.md, Foundation).
- Frontmatter : les clés `title`, `status`, `created`, `updated` et `sources` sortent de la spec design.md ; elles servent la traçabilité BMad et l'outillage doit les ignorer.
