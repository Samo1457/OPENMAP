---
title: OPENMAP — DESIGN
status: draft
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
  # Chrome (UI). Base = mode clair ; suffixe -dark = mode sombre. Source : .working/color-themes-1.html, variation 02.
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
  # Voile derrière un dialogue modal : identique dans les deux modes (opacité dans components.dialog-scrim).
  scrim: '#11161C'
  # Canevas : surimpressions d'édition posées sur la Carte. Identiques dans les deux modes, par règle.
  canvas-ink: '#18222D'
  canvas-halo: '#F7F3EA'
  canvas-mask: '#11161C'
  # Carte : style par défaut du Fond parchemin (contenu exporté). Identiques dans les deux modes, par règle.
  map-sea: '#D0DBE0'
  map-land-neutral: '#EEE8D7'
  map-coast: '#7A8590'
  map-label: '#18222D'
  map-label-halo: '#F7F3EA'
  map-sea-label: '#4A5D6C'
  map-front: '#18222D'
  map-arrow: '#7A2716'
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
  drawer-width: 320px
  tool-options-bar-height: 36px
  timeline-height: 200px
  timeline-min-height: 180px
  timeline-collapsed-height: 44px
  timeline-header-height: 40px
  timeline-ruler-height: 20px
  etape-thumbnail-height: 72px
  track-lane-height: 26px
  track-clip-height: 20px
  map-credit-margin: 24px
  control-height: 32px
  control-height-sm: 28px
  panel-padding-x: 18px
  focus-ring-offset: 2px
  focus-ring-width: 2px
components:
  button-primary: { background: '{colors.accent}', foreground: '{colors.on-accent}', hover-background: '{colors.accent-hover}', radius: '{rounded.sm}', height: '{spacing.control-height}', typography: '{typography.body-strong}' }
  button-secondary: { background: '{colors.surface-raised}', foreground: '{colors.text-primary}', border: '1px solid {colors.border}', radius: '{rounded.sm}', height: '{spacing.control-height}' }
  button-ghost: { background: 'transparent', foreground: '{colors.text-secondary}', hover-background: '{colors.selection}', radius: '{rounded.sm}' }
  top-bar: { background: '{colors.surface}', border-bottom: '1px solid {colors.border}', height: '{spacing.top-bar-height}', project-name: '{typography.title-md}' }
  tool-rail: { background: '{colors.surface}', border-right: '1px solid {colors.border}', width: '{spacing.rail-width}' }
  tool-rail-item: { foreground: '{colors.text-secondary}', label: '{typography.label-caps}', label-long: '{typography.label-caps-tight}', height: '{spacing.rail-item-height}', radius: '{rounded.sm}', hover-background: '{colors.selection}' }
  tool-rail-item-active: { background: '{colors.selection}', foreground: '{colors.accent}', foreground-dark: '{colors.text-primary-dark}', indicator: '3px bar, left edge, {colors.accent}' }
  tool-options-bar: { height: '{spacing.tool-options-bar-height}', background: '{colors.background}', foreground: '{colors.text-muted}', etape-label: '{typography.title-md}', typography: '{typography.label}', format-label: '{typography.caption}', format-label-color: '{colors.text-muted}' }
  properties-panel: { background: '{colors.surface}', border-left: '1px solid {colors.border}', width: '{spacing.panel-width}', title: '{typography.title-lg}', section-heading: '{typography.label-caps}', padding-x: '{spacing.panel-padding-x}' }
  field-inherited: { value-color: '{colors.text-secondary}', caption: '{typography.caption}', caption-color: '{colors.text-muted}' }
  field-overridden: { value-color: '{colors.text-primary}', marker: '2px bar, left edge, {colors.text-primary}', reset-link: '{colors.accent}' }
  subfaction-row: { name: '{typography.body}', summary: '{typography.caption}', summary-color: '{colors.text-muted}', swatch: 'faction-swatch 16px', chevron: '16px {colors.text-secondary}' }
  more-options-row: { typography: '{typography.body-strong}', summary-color: '{colors.text-muted}', border-top: '1px solid {colors.border}' }
  library-drawer: { background: '{colors.surface}', border-right: '1px solid {colors.border}', width: '{spacing.drawer-width}', top: '{spacing.top-bar-height}', radius: '0 {rounded.md} {rounded.md} 0', shadow: '0 12px 28px -18px rgba(0,0,0,.35)' }
  timeline: { background: '{colors.surface}', border-top: '1px solid {colors.border}', height: '{spacing.timeline-height}', min-height: '{spacing.timeline-min-height}', collapsed-height: '{spacing.timeline-collapsed-height}', header-height: '{spacing.timeline-header-height}', title: '{typography.title-md}', timecode: '{typography.timecode}' }
  timeline-play-button: { background: '{colors.accent}', foreground: '{colors.on-accent}', radius: '{rounded.sm}' }
  timeline-ruler: { height: '{spacing.timeline-ruler-height}', tick-color: '{colors.border}', label: '{typography.timecode}', label-color: '{colors.text-muted}' }
  act-bracket: { rule: '1px {colors.act-rule}', label: '{typography.label-caps}', label-color: '{colors.text-secondary}' }
  etape-thumbnail: { height: '{spacing.etape-thumbnail-height}', radius: '{rounded.none}', border: 'inset 1px {colors.border}', chip-background: '{colors.surface-raised}', date: '{typography.date-display}', date-compact: '{typography.date-compact}', title: '{typography.caption}' }
  etape-thumbnail-current: { outline: 'inset 2px {colors.accent}' }
  transition-hatch: { pattern: 'repeating-linear-gradient(135deg, {colors.border} 0 2px, {colors.surface} 2px 6px)', label: '{typography.timecode}' }
  track-lane: { height: '{spacing.track-lane-height}', clip-height: '{spacing.track-clip-height}', label: '{typography.label}', label-color: '{colors.text-secondary}' }
  track-clip-arrows: { background: '{colors.track-arrows}', foreground: '{colors.track-ink}' }
  track-clip-tokens: { background: '{colors.track-tokens}', foreground: '{colors.track-ink}' }
  track-clip-text: { background: '{colors.track-text}', foreground: '{colors.track-ink}' }
  track-clip-selected: { outline: 'inset 1.5px {colors.accent}' }
  playhead: { line: '1.5px {colors.playhead}', handle: '12px pentagon, {colors.playhead}' }
  toast: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', shadow: '0 6px 16px -10px rgba(0,0,0,.45)' }
  dialog: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', title: '{typography.title-lg}' }
  dialog-scrim: { color: '{colors.scrim}', opacity: '0.62' }
  input-field: { background: '{colors.surface-raised}', border: '1px solid {colors.border-input}', radius: '{rounded.sm}', height: '{spacing.control-height}', typography: '{typography.body}', placeholder: '{colors.text-muted}' }
  checkbox: { size: '16px', border: '1px solid {colors.border-input}', radius: '{rounded.sm}', checked-background: '{colors.accent}', checked-foreground: '{colors.on-accent}' }
  segmented-control: { background: '{colors.surface-raised}', border: '1px solid {colors.border-input}', divider: '1px solid {colors.border}', radius: '{rounded.sm}', height: '{spacing.control-height}', typography: '{typography.label}', foreground: '{colors.text-secondary}', selected-background: '{colors.selection}', selected-foreground: '{colors.text-primary}', selected-indicator: 'inset 0 -2px 0 {colors.accent}' }
  control-disabled: { opacity: '0.55', foreground: '{colors.text-disabled}', cursor: 'not-allowed' }
  progress-bar: { track: '{colors.progress-track}', fill: '{colors.progress-fill}', height: '6px', radius: '{rounded.none}', percent: '{typography.timecode-strong}' }
  export-credit-locked: { background: '{colors.background}', border: '1px solid {colors.border}', radius: '{rounded.sm}', height: '{spacing.control-height}', icon: 'cadenas 16px {colors.text-secondary}', text: '{typography.body}', explanation: '{typography.caption}', explanation-color: '{colors.text-muted}' }
  export-done: { background: '{colors.background}', border: '1px solid {colors.border}', border-left: '3px solid {colors.success}', title: '{typography.body-strong}', details: '{typography.caption}', details-color: '{colors.text-secondary}' }
  banner-warning: { background: '{colors.surface-raised}', icon-and-text: '{colors.warning}', border-left: '3px solid {colors.warning}' }
  focus-ring: { ring: '0 0 0 2px {colors.surface}, 0 0 0 4px {colors.focus-ring}' }
  faction-swatch: { radius: '{rounded.none}', ring: '0 0 0 1px {colors.surface}, 0 0 0 2px {colors.text-primary}' }
  canvas-selection: { halo: '4.5px {colors.canvas-halo}', stroke: '1.6px dashed {colors.canvas-ink}' }
  canvas-handle: { fill: '{colors.canvas-ink}', stroke: '1.5px {colors.canvas-halo}' }
  canvas-brush-cursor: { outer: '4.5px {colors.canvas-halo}', inner: '1.6px dashed {colors.canvas-ink}' }
  export-frame-mask: { color: '{colors.canvas-mask}', opacity: '0.55' }
  date-cartouche: { fill: '{colors.map-label-halo}', rule: '1.4px {colors.map-label}', year: '{typography.map-cartouche-year}', kicker: '{typography.map-cartouche-kicker}' }
  map-credit: { discreet: '{typography.map-credit-discreet}', legible: '{typography.map-credit-legible}', color: '{colors.map-label}', halo: '{colors.map-label-halo}', margin: '{spacing.map-credit-margin}' }
---

# OPENMAP — Design Spine

**Ce spine l'emporte** en cas de conflit avec les maquettes de `mockups/`, les planches de `.working/` ou les images de `imports/`. Maquettes clés (1366 × 768, polices embarquées) : [`mockups/editeur.html`](mockups/editeur.html), [`mockups/assistant.html`](mockups/assistant.html), [`mockups/export.html`](mockups/export.html). Planches d'exploration : `.working/color-themes-1.html` (palette retenue : variation **02 « Bleu de Prusse & ivoire »**) et `.working/directions-1.html` (hybride **01 Atelier du cartographe** + Timeline de **03 Banc de montage**). Écarts voulus avec les maquettes et les planches : pas de cadre gravé ni de bordure graduée d'atlas autour de la Carte ; pas de toggle FR/EN dans la barre haute ; pas de case à cocher pour un crédit obligatoire ; pas de bouton « Ouvrir le dossier » en fin d'export (voir Components).

## Brand & Style

OPENMAP est un atlas d'archives relié qu'on aurait posé sur un banc de montage. Côté chrome, on y retrouve l'encre bleu-noir sur ivoire, des angles francs, des libellés d'outils en petites capitales et une serif réservée aux titres, aux dates et aux libellés de Carte. La Timeline, elle, vient du montage vidéo : règle graduée, tête de lecture, vignettes d'Étape, transitions hachurées et pistes. Les vidéastes lisent déjà ce langage.

Le ton visuel reste **sérieux, précis, digne de confiance**. Il doit aussi être simple à prendre en main, comme dans Canva ou CapCut : une densité moyenne, aérée, et l'impression qu'on ne peut rien casser. La v1 est sobre et efficace. L'habillage façon RTS viendra plus tard, en v2 (PRD §10.4) ; en v1, l'esprit RTS n'existe que *sur la Carte*, à travers les Jetons d'unité et la conquête visible.

Le principe qui décide de tout : **la Carte domine et porte toute la couleur**. L'interface reste en demi-teintes. Son unique accent se lit toujours comme de l'interface, jamais comme une Faction.

Registre du **rendu de Carte** (le contenu exporté, pas l'interface) — références fournies par l'utilisateur :
- [`imports/ref-guerre-froide-alliances.png`](imports/ref-guerre-froide-alliances.png) : carte d'alliances plate et lisible façon manuel scolaire (UJ-3).
- [`imports/ref-normandie-1944-vintage.webp`](imports/ref-normandie-1944-vintage.webp) : carte de campagne vintage sur papier, fronts datés, badges d'unités (UJ-4).
- [`imports/ref-waterloo-1815-plan.jpg`](imports/ref-waterloo-1815-plan.jpg) : plan d'époque avec cartouche ; son échelle tactique est hors v1.
- [`imports/ref-waterloo-baz-battles.jpg`](imports/ref-waterloo-baz-battles.jpg) : style d'animation Baz Battles, portraits, ellipses et flèches blanches.

Aucune de ces images ne règle le chrome : elles disent ce que la Carte doit savoir produire.

UI system : **shadcn/ui, fortement personnalisé** `[ASSUMPTION: shadcn/ui est retenu ; le log le dit « envisagé, ouvert à d'autres »]`. Tout composant shadcn est restylé par les tokens ci-dessus : couleurs, rayons, typographie, ombres. Livrer un composant shadcn avec son look par défaut est une faute, pas un raccourci.

## Colors

### Chrome — deux modes

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
| `progress-track` | `#D8D1C1` | `#324050` | — | Rail de la barre de progression |
| `progress-fill` | `#1D4163` | `#8EB6D8` | 6,9 / 5,0:1 sur `progress-track` (≥ 3:1) | Remplissage de la barre de progression (export) |
| `scrim` | `#11161C` | `#11161C` | — | Voile derrière un dialogue modal, à 62 % (`dialog-scrim`), identique dans les deux modes |
| `track-arrows` | `#E3D6D2` | `#3A3A48` | 11,3 / 8,8:1 (avec `track-ink`) | Clips de la piste Flèches |
| `track-tokens` | `#D6E0D5` | `#2E4038` | 11,9 / 8,7:1 | Clips de la piste Jetons |
| `track-text` | `#D5DEE8` | `#2A3A4C` | 11,8 / 9,1:1 | Clips de la piste Texte |
| `track-ink` | `#18222D` | `#E6E4DC` | — | Texte posé sur une piste |
| `playhead` | `#1D4163` | `#8EB6D8` | 10,0 / 7,7:1 (≥ 3:1) | Tête de lecture |
| `act-rule` | `#7A8590` | `#687786` | 3,3 / 4,0:1 (≥ 3:1) | Filets des Actes. Ce token vient de `--map-frame` sur la planche ; comme le cadre de Carte est supprimé, il est réaffecté ici |

**Accent bleu de Prusse.** Il est très sombre en clair et très pâle en sombre. Il se distingue du bleu d'une Faction comme « Royaume de Hongrie » par la **valeur**, pas par la teinte. Il reste dans le chrome : bouton Exporter, bouton de lecture, outil actif, Étape courante, tête de lecture, liens d'action, clip sélectionné.

**Correspondance shadcn.** `primary` ← `{colors.accent}` · `primary-foreground` ← `{colors.on-accent}` · `background` ← `{colors.background}` · `card` ← `{colors.surface}` · `popover` ← `{colors.surface-raised}` · `foreground` ← `{colors.text-primary}` · `muted-foreground` ← `{colors.text-muted}` · `border` ← `{colors.border}` · `input` ← `{colors.border-input}` · `ring` ← `{colors.focus-ring}` · `destructive` ← `{colors.danger}` · `accent` (le fond de survol chez shadcn) ← `{colors.selection}`. Attention au faux ami : l'`accent` de shadcn est un fond de survol, alors que l'`accent` d'OPENMAP est la couleur d'action.

**Bordures.** `{colors.border}` passe sous 3:1. Il est décoratif et ne porte jamais seul une information. Un état se signale toujours par une couleur de texte, une icône ou un fond `{colors.selection}`. La limite d'un **champ de saisie** est une information (WCAG 1.4.11) : champs, sélecteurs, cases à cocher et contrôles segmentés prennent `{colors.border-input}`, à 3:1 au moins sur tous les fonds, dans les deux modes. Les boutons secondaires gardent `{colors.border}`, car leur libellé suffit à les identifier.

**Désactivé.** Un contrôle désactivé passe à 55 % d'opacité (`control-disabled`, texte équivalent `{colors.text-disabled}`) et garde sa place. Il ne sert jamais à signaler un réglage imposé : un crédit obligatoire se montre verrouillé, avec un cadenas et une explication (`export-credit-locked`).

**États.** `success`, `warning` et `danger` s'affichent toujours avec leur icône et un libellé. La couleur seule n'est jamais le signal.

### Canevas — surimpressions d'édition (identiques dans les deux modes)

Sur la Carte, l'interface ne s'exprime qu'en **encre et halo** : `{colors.canvas-ink}` `#18222D` doublé d'un halo `{colors.canvas-halo}` `#F7F3EA`. Cela vaut pour le contour de sélection, les poignées, le curseur de pinceau en double anneau pointillé, les points d'une Zone dessinée et le point d'origine d'une propagation. Le couple encre + halo se lit sur tous les Fonds, parchemin comme satellite ou sombre. L'accent UI n'apparaît **jamais** sur la Carte. Hors du cadre d'export, la Carte est assombrie par `{colors.canvas-mask}` `#11161C` à 55 % (rendu : [`mockups/editeur.html`](mockups/editeur.html)) `[ASSUMPTION: teinte et opacité rendues sur maquette, pas validées explicitement]`.

### Carte — Fond parchemin par défaut (contenu exporté, identique dans les deux modes)

| Token | Valeur | Rôle |
|---|---|---|
| `map-sea` | `#D0DBE0` | Mer |
| `map-land-neutral` | `#EEE8D7` | Terres et Territoire **neutre** (FR-25 : style distinct de toute Faction) |
| `map-coast` | `#7A8590` | Côtes, frontières d'Entités non attribuées |
| `map-label` | `#18222D` | Libellés de lieux et de Factions |
| `map-label-halo` | `#F7F3EA` | Halo des libellés : contraste de 10:1 et plus sur n'importe quel remplissage |
| `map-sea-label` | `#4A5D6C` | Libellés de mer posés directement sur la mer (4,5 à 4,9:1) |
| `map-front` | `#18222D` | Ligne de front par défaut, tiret-point, avec halo |
| `map-arrow` | `#7A2716` | Flèche sans Faction ni Catégorie de flèche |

`[ASSUMPTION: ces valeurs deviennent le style par défaut du Fond parchemin ; les Fonds sombre, clair et relief ne sont pas encore spécifiés.]`

### Couleurs de Faction : du contenu, pas des tokens

Les couleurs de Faction appartiennent à l'utilisateur, via son Kit de Faction, ou à la Bibliothèque. Ce ne sont **pas** des tokens UI. Elles ne changent jamais avec le mode, et le chrome ne les emprunte jamais pour lui-même. Seule exception : les pastilles `faction-swatch`, qui *montrent* une Faction, toujours entourées d'un anneau neutre. Jeu de test de la planche (valeurs d'exemple, pas des tokens) : Empire ottoman `#B3342B`, Royaume de Hongrie `#3C6AA0`, Venise `#D2A03A`, Valachie `#E0A99C`.

**Garde-fou.** L'écart ΔE 2000 entre une couleur de Faction (remplissage ou contour) et l'accent UI des **deux** modes se lit ainsi : ≥ 20 distinct, 10 à 20 voisin, < 10 risque. Quand une couleur de Kit passe **sous ΔE 10** face à `{colors.accent}` ou à `{colors.accent-dark}`, l'éditeur de Kit affiche un avertissement non bloquant (`{colors.warning}`, avec icône). `[ASSUMPTION: seuil d'alerte fixé à < 10 ; la zone « voisin » ne déclenche rien, parce que la règle « pas d'accent sur la Carte » la neutralise. Référence : Hongrie vs accent clair = ΔE 14,7.]`

## Typography

Trois voix, servies par deux **polices libres (OFL) embarquées et auto-hébergées** avec l'application, pour un rendu identique sur tous les PC. Les piles système qui les suivent dans les tokens ne servent que de repli, si le fichier de police ne charge pas.

- **Serif — Libre Baskerville** (400, 600) : réservée aux **titres** (nom du Projet `title-md`, titre de panneau `title-lg`, titre d'écran de l'Assistant `title-xl`), aux **dates** (`date-display` et `date-compact` pour la Date d'Étape sur les vignettes et dans la barre d'options, avec chiffres alignés) et aux **libellés de Carte** par défaut (`map-label-*`, `map-cartouche-*`). Repli : Baskerville → Baskerville Old Face → Georgia → Times New Roman.
- **Sans — Source Sans 3** (400, 500, 600) : toute l'interface. `[ASSUMPTION: Source Sans 3 reste provisoire ; elle est validée sur les maquettes clés mais peut encore changer pour une autre sans humaniste OFL à chiffres tabulaires.]` Repli : Segoe UI → Frutiger → Helvetica Neue → Arial.
- **Minutage** : la sans en chiffres tabulaires (`font-variant-numeric: tabular-nums lining-nums`) pour `timecode` et `timecode-strong`. On écrit `00:08,4`, `1,5 s`.

Échelle de l'interface :

| Token | Taille / graisse | Usage |
|---|---|---|
| `title-xl` · `title-lg` · `title-md` | 28 · 20 · 16 px, 600, serif | Titre d'écran de l'Assistant · titre de panneau et de dialogue · nom du Projet, Étape dans la barre d'options |
| `date-display` | 22 px, 600, serif | Date d'Étape courte (année seule) sur les vignettes |
| `date-compact` | 15 px, 600, serif | Date d'Étape avec jour ou mois, quand `date-display` ne tient pas |
| `body` · `body-strong` | **14 px**, 400 · 600 | Texte courant, champs, boutons, rangées du panneau |
| `label` | 13 px, 500 | Barre haute, barre d'options, onglets, segments, noms de piste |
| `caption` | 12 px, 400 | Légendes, aides, sous-lignes de toast, libellé de format |
| `label-caps` · `label-caps-tight` | 11 px, 600, capitales | Rail d'outils, titres de section, Actes |
| `timecode` · `timecode-strong` | 12 · 13 px, 500 · 600, tabulaires | Règle, durées, minutage, pourcentage |

Le texte courant passe de 13 à **14 px** : Source Sans 3 a un œil plus petit que Segoe UI ou Avenir Next, et à 13 px les maquettes paraissaient d'un cran trop petites. Les rangées de 34 px et les contrôles de 32 px absorbent ce changement sans modifier la grille.

Règles :
- `label-caps` s'écrit en capitales (text-transform) avec un interlettrage de 0,04em. Il sert aux libellés du rail d'outils, aux titres de section du panneau et aux Actes. C'est la « petite capitale d'atlas » de la variation 02. `[ASSUMPTION: les titres de section du panneau passent en label-caps sans serif, et non en serif italique comme sur la planche 01, pour réserver la serif aux titres et aux dates.]`
- **Largeur des libellés du rail.** Un libellé du rail dispose de 72 px. S'il dépasse cette largeur avec l'interlettrage de 0,04em, il passe en `label-caps-tight` (interlettrage nul), sans changer de corps. En français, seul « BIBLIOTHÈQUE » est concerné (77 px → 72 px, mesuré en Source Sans 3). Un libellé ne se tronque jamais et ne passe jamais sur deux lignes : une traduction qui dépasse encore 72 px doit être raccourcie.
- **Dates sur les vignettes d'Étape.** La pastille de la vignette essaie dans l'ordre : `date-display` (« 1463 ») ; `date-compact` (« 16 mars », « 6 juin 1944 ») ; `date-compact` sans l'année quand elle est identique à celle de l'Étape précédente (« 12 juin »). `[ASSUMPTION: omission de l'année répétée]` La date complète reste dans l'infobulle, le nom accessible et le panneau de l'Étape. Une date ne s'ellipse jamais ; le titre `caption`, lui, peut s'ellipser.
- **Libellés de Carte en px d'export.** Les tokens `map-*` sont exprimés en pixels d'export pour un cadre dont le **côté court** fait 1080 px (valeurs relevées sur [`mockups/editeur.html`](mockups/editeur.html) : 46, 34 et 28 px dans un cadre de 1600 × 900, multipliées par 1,2), ce qui couvre 1920 × 1080 (16:9), 1080 × 1920 (9:16) et 1080 × 1080 (1:1). À l'écran, tout ce qui est dessiné sur la Carte (libellés, halos, cartouche, crédit) suit l'échelle du cadre : taille affichée = token × (côté court du cadre à l'écran ÷ 1080). Exemple : cadre 16:9 de 562 × 316 px → facteur 0,29 → libellé de Faction de 56 px affiché à environ 16 px. Le chrome, lui, ne se met jamais à l'échelle.
- La serif n'apparaît jamais dans un bouton, un champ, une infobulle ou un toast.
- Un seul poids gras par voix : 600.

## Layout & Spacing

Échelle de 4 : 4 · 8 · 12 · 16 · 20 · 24 · 32 px (`{spacing.1}` à `{spacing.8}`). Densité moyenne et aérée, celle de la planche 01.

Écran Éditeur (grille à 3 colonnes sur 3 rangées), rendu dans [`mockups/editeur.html`](mockups/editeur.html) : état (a) sombre, (b) clair, (c) tiroir Bibliothèque ouvert, **(d) hauteur de Timeline par défaut retenue (200 px)**. L'état (a) montre l'ancienne hauteur de 280 px, **rejetée**.

| Zone | Dimension | Notes |
|---|---|---|
| Barre haute | `{spacing.top-bar-height}` 48 px, pleine largeur | `[ASSUMPTION: réduite des 56 px de la planche 01 pour tenir NFR-8]` |
| Rail d'outils | `{spacing.rail-width}` 76 px, pleine hauteur sous la barre | Items de 72 × `{spacing.rail-item-height}` 56 px : icône 20 px + libellé |
| Tiroir Bibliothèque | `{spacing.drawer-width}` 320 px, contre le rail, **pleine hauteur** sous la barre haute | Recouvre la gauche de la scène **et la gauche de la Timeline**, sans recadrer la Carte ni décaler la Timeline |
| Barre d'options de l'outil | `{spacing.tool-options-bar-height}` 36 px, pleine largeur de la scène, au-dessus de la Carte | À gauche : Étape courante puis options de l'outil. **À droite : libellé du Format de sortie** (« 16:9 · 1920 × 1080 »), en `caption` `{colors.text-muted}` |
| Carte | Reste de la scène sous la barre d'options | Zoom en bas à gauche, toasts en bas à droite |
| Panneau de propriétés | `{spacing.panel-width}` 300 px, pleine hauteur sous la barre | Marge interne `{spacing.panel-padding-x}` |
| Timeline | `{spacing.timeline-height}` **200 px par défaut**, entre rail et panneau | Voir ci-dessous |

**Timeline à 200 px.** En-tête de `{spacing.timeline-header-height}` 40 px, puis règle de `{spacing.timeline-ruler-height}` 20 px, Actes, rangée des Étapes (vignettes de `{spacing.etape-thumbnail-height}` 72 px) et **une piste visible** (Flèches, `{spacing.track-lane-height}` 26 px par piste, clips de `{spacing.track-clip-height}` 20 px). Les autres pistes (Jetons, Texte) défilent verticalement sous la rangée des Étapes, qui reste fixe avec l'en-tête, la règle et les Actes. Une poignée sur le bord haut agrandit la Timeline de `{spacing.timeline-min-height}` 180 px jusqu'à 50 % de la hauteur de la fenêtre ; « Replier » la réduit à `{spacing.timeline-collapsed-height}` 44 px (en-tête seul).

Mesure à 1366 × 768 (NFR-8 ; Chrome maximisé, barre des tâches Windows visible, viewport 1366 × 648) : la scène fait 990 × 400 px, la Carte visible 990 × 364 px, et le cadre d'export 16:9 562 × 316 px. À 280 px, la Carte tombait à 990 × 284 px et le cadre à 420 × 236 px : la hauteur retenue donne 79 % de surface de cadre en plus ([état (a)](mockups/editeur.html#etat-a) contre [état (d)](mockups/editeur.html#etat-d)).

Le cadre d'export est centré sur la Carte, au ratio du Format de sortie (16:9, 9:16 ou 1:1), avec au moins `{spacing.6}` de marge. Son libellé de format vit dans la barre d'options, jamais sur la Carte.

## Elevation & Depth

Tout est plat. La hiérarchie vient du **ton**, dans l'ordre `background` < `surface` < `surface-raised`, et des filets `{colors.border}`. Les ombres sont réservées aux couches flottantes :

- Toast : `0 6px 16px -10px rgba(0,0,0,.45)`.
- Tiroir, popover, menu, dialogue : `0 12px 28px -18px rgba(0,0,0,.35)`.
- Derrière un dialogue modal (Export, confirmations), l'Éditeur est voilé par `dialog-scrim` : `{colors.scrim}` à 62 %. L'Assistant, en plein cadre, n'a pas de voile.
- Rien d'autre. Pas d'ombre sur les cartes, les boutons ou les vignettes d'Étape, et aucune lueur (glow).

Le masque hors cadre (`export-frame-mask`) est le seul effet de profondeur sur la Carte.

## Shapes

Angles **francs** : ceux d'un atlas relié, pas d'une app grand public.

- `{rounded.none}` 0 : vignettes d'Étape, pastilles de Faction, clips de piste, Carte.
- `{rounded.sm}` 2 px : boutons, champs, items du rail, bouton de lecture, segments.
- `{rounded.md}` 4 px : toasts, popovers, dialogues, tiroir (côté droit seulement, le côté gauche touche le rail). `[ASSUMPTION: la planche fixe 2 px partout ; 4 px ici seulement pour les couches flottantes]`
- `{rounded.full}` : réservé aux curseurs de slider, aux points de statut et à l'anneau de pinceau. **Jamais** pour un bouton, un badge ou un champ : pas de pilule.

Icônes : trait de 1,5 px, 20 px dans le rail, 16 px dans les contrôles. `[ASSUMPTION: Lucide (défaut shadcn) passé en trait de 1,5, avec des icônes dessinées sur mesure pour Territoire, Conquête et Jeton, comme sur la planche.]`

## Components

Composants shadcn restylés par les tokens (Button, Dialog, Popover, DropdownMenu, Tabs, Tooltip, Slider, Select, Toggle, ToggleGroup, Checkbox, Progress, Sheet, Toast via Sonner) : pas de rayon shadcn par défaut, pas de police Geist, pas d'ombre shadcn. Rendus de référence : Éditeur dans [`mockups/editeur.html`](mockups/editeur.html) (barre haute, rail, barre d'options, panneau de Kit, tiroir en état c, Timeline en état d), Assistant dans [`mockups/assistant.html`](mockups/assistant.html), modale Export dans [`mockups/export.html`](mockups/export.html). Spécifiques à OPENMAP :

- **Barre haute** (`top-bar`) : logotype, fil « Projets / {nom du Projet} » (nom en `title-md`), statut de sauvegarde (`caption` avec icône `{colors.success}`), Format de sortie, annuler/rétablir, recherche de lieu, Mode présentation (`button-secondary`), **Exporter** (`button-primary`, seul bouton primaire de l'écran).
- **Rail d'outils** (`tool-rail`, `tool-rail-item`) : icône au-dessus d'un libellé `label-caps` (`label-caps-tight` pour un libellé trop long, voir Typography). L'outil actif (`tool-rail-item-active`) prend un fond `{colors.selection}`, un libellé `{colors.accent}` en clair ou `{colors.text-primary-dark}` en sombre, et une barre de 3 px `{colors.accent}` au bord gauche. Au survol, fond `{colors.selection}` ; l'infobulle donne le nom complet et le raccourci.
- **Barre d'options de l'outil** (`tool-options-bar`) : bande de 36 px au-dessus de la Carte, sur `{colors.background}`, sans filet. À gauche, « Étape 1463 · Conquête de la Bosnie » (date en `title-md`), puis les options de l'outil actif, par exemple la pastille de la Faction attaquante et « Pinceau 24 px ». À droite, le libellé du Format de sortie (« 16:9 · 1920 × 1080 ») en `caption` `{colors.text-muted}`.
- **Panneau de propriétés** : titre `title-lg` avec Emblème ou icône, surtitre `caption` (« Copie propre au Projet »), sections à titre `label-caps` séparées par des filets, rangées de 34 px minimum. Hex en `timecode`.
- **Champ hérité / surchargé** : un champ hérité (`field-inherited`) affiche sa valeur en `{colors.text-secondary}` avec la légende « Hérité de … ». Un champ surchargé (`field-overridden`) affiche sa valeur en `{colors.text-primary}`, une barre de 2 px au bord gauche et un lien « Rétablir » en `{colors.accent}`. Ce motif sert aux Sous-factions (Kit parent) comme aux Étapes (Étape précédente) ; seule la légende change. Pour une Sous-faction, l'affichage champ par champ vit **dans son propre panneau**.
- **Rangée de Sous-faction** (`subfaction-row`) : dans le panneau du Kit parent, une rangée par Sous-faction, avec pastille, nom en `body`, résumé en `caption` `{colors.text-muted}` (« Hérite · couleur surchargée ») et chevron. Un clic ouvre le panneau de la Sous-faction.
- **Rangée « Plus d'options »** (`more-options-row`) : en bas de section ou de panneau. Libellé `body-strong`, résumé du contenu en `{colors.text-muted}` (« Frontière, Flèche, Jeton ») et chevron.
- **Champ de saisie** (`input-field`) et **case à cocher** (`checkbox`) : contour `{colors.border-input}` à 3:1 minimum. Case cochée : fond `{colors.accent}`, coche `{colors.on-accent}`.
- **Contrôle segmenté** (`segmented-control`) : **tout choix exclusif de 2 à 4 options** (30 / 60 images/s, Toute la Timeline / Étapes, Discrète / Lisible, Apparence, Signature organique…). Pas de boutons radio ronds. Segment choisi : fond `{colors.selection}`, texte `{colors.text-primary}` en 600 et filet bas de 2 px `{colors.accent}`. `[ASSUMPTION: filet bas ajouté pour que l'état choisi atteigne 3:1 (WCAG 1.4.11) ; le fond seul fait 1,3:1.]` Au-delà de 4 options : `Select`.
- **Désactivé** (`control-disabled`) : 55 % d'opacité, curseur interdit, place conservée.
- **Tiroir Bibliothèque** (`library-drawer`) : pleine hauteur sous la barre haute, contre le rail, au-dessus de la scène et de la gauche de la Timeline ; angles de 4 px côté droit seulement. Onglets Templates · Kits · Emblèmes · Icônes d'événement, recherche, filtres en `Select`, grille de vignettes carrées à angles vifs.
- **Timeline** : en-tête de 40 px (« Timeline » en `title-md`, bouton de lecture `timeline-play-button` à angles de 2 px, Étape précédente/suivante, minutage `timecode-strong` / `timecode`, vitesse, zoom, repli), poignée de redimensionnement centrée sur le bord haut. Corps : colonne de libellés (Actes, Étapes, Flèches, Jetons, Texte), règle graduée en secondes (`timeline-ruler`), Actes soulignés par un filet `{colors.act-rule}` à talons (`act-bracket`), vignettes d'Étape (`etape-thumbnail`, 72 px de haut par défaut). Chaque vignette est un aperçu de la Carte avec une pastille `surface-raised` qui porte la date (`date-display` ou `date-compact`, voir Typography) et le titre `caption`. Les transitions sont des blocs hachurés (`transition-hatch`) avec leur durée (« 1,5 s »). Chaque piste (`track-lane`, 26 px) porte une seule rangée de clips à teinte par piste (`track-clip-*`, 20 px) avec un liseré gauche en `track-ink` à 45 %. La barre de défilement des pistes, fine (6 px, `{colors.border}`), ne court que sous la rangée des Étapes. La tête de lecture est un trait `{colors.playhead}` avec une poignée pentagonale.
- **Étape courante** : `etape-thumbnail-current`, contour intérieur de 2 px en `{colors.accent}`.
- **Toast** : icône d'état cerclée, titre `body-strong` et sous-ligne `caption` (« Projet sauvegardé · Sur cet appareil · à l'instant »).
- **Bandeau** (`banner-warning`) : pleine largeur sous la barre haute, liseré gauche `{colors.warning}`, icône triangle et une action en lien.
- **Dialogue** (modale Export, Réglages, confirmations) : `surface-raised`, titre `title-lg`, actions alignées à droite, le primaire à droite, voile `dialog-scrim` derrière. L'**Assistant** est un dialogue plein cadre : en-tête de 56 px, étapes numérotées de 64 px (étape courante en `{colors.accent}` avec filet bas), colonne principale et colonne « Dans ce Projet » de 400 px en `surface` ([rendu](mockups/assistant.html)).
- **Modale Export** ([rendu](mockups/export.html)) : dialogue de 560 px, onglets Vidéo / Image, grille libellé (148 px, `label` `{colors.text-secondary}`) / valeur. Pendant le rendu, les réglages passent en `control-disabled`, et le pied porte « Rendu en cours… », le pourcentage en `timecode-strong`, la `progress-bar` (6 px, fond `{colors.progress-track}`, remplissage `{colors.progress-fill}`), le temps restant en `caption` et « Annuler » (`button-secondary`). **Crédit obligatoire** (`export-credit-locked`) : une rangée verrouillée sur `{colors.background}`, avec le texte du crédit et une icône cadenas, **sans case à cocher** ; dessous, l'explication en `caption` `{colors.text-muted}`, puis un `Select` « Position » et un contrôle segmenté « Discrète / Lisible ». **Export terminé** (`export-done`) : encadré sur `{colors.background}` avec liseré gauche `{colors.success}` et icône, titre « Export terminé » en `body-strong`, nom du fichier en `body`, détails en `caption` ; actions « Exporter à nouveau » (`button-secondary`) et « Afficher le téléchargement » (`button-primary`, à droite). La maquette montre encore une case cochée et « Ouvrir le dossier » : ce spine l'emporte.
- **Crédit sur la Carte** (`map-credit`) : contenu exporté, dans un coin du cadre au choix, à `{spacing.map-credit-margin}` du bord (px d'export à 1080). « Discrète » : `map-credit-discreet` (18 px) en `{colors.map-label}` avec halo. « Lisible » : `map-credit-legible` (24 px) sur un bandeau `{colors.map-label-halo}`. `[ASSUMPTION: corps, graisse et bandeau des deux niveaux ; la licence impose la présence du crédit, pas sa taille.]`
- **Pastille de Faction** (`faction-swatch`) : carré plein de la couleur du Kit, entouré d'un anneau surface + encre. Toujours accompagnée du nom.
- **Surimpressions de canevas** (`canvas-selection`, `canvas-handle`, `canvas-brush-cursor`) : encre + halo exclusivement.
- **Masque de cadre d'export** (`export-frame-mask`) : aucune bordure, aucun filet, aucun ornement. Seul l'assombrissement marque la limite.
- **Cartouche de date** (`date-cartouche`) : style par défaut de l'Horodatage **sur la Carte**. Encadré halo, double filet d'encre, surtitre `map-cartouche-kicker` en capitales espacées, année en `map-cartouche-year`. C'est du contenu : il suit les tokens `map-*` et l'échelle du cadre, jamais les tokens UI. `[ASSUMPTION: le cartouche de la planche 01 devient le style d'Horodatage proposé par défaut par les Templates]`
- **Avertissement de garde-fou Faction** : ligne en `caption` sous le champ couleur du Kit, icône triangle `{colors.warning}`.

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
| La Carte identique en mode clair et en mode sombre | Assombrir ou réteinter la Carte, ses Fonds ou ses Factions selon le mode |
| Surimpressions du canevas en encre + halo | Accent UI sur la Carte : sélection, poignées, pinceau, cadre |
| Limite d'export marquée par l'assombrissement hors cadre | Cadre gravé, bordure graduée, filet ornemental autour de la Carte |
| Couleurs de Faction traitées comme contenu, avec le garde-fou ΔE | Couleur de Faction réutilisée dans le chrome, ou accent proposé comme couleur de Faction |
| États signalés par une icône et un libellé | Information portée par la seule couleur, ou par une `{colors.border}` seule |
| Densité moyenne, réglages avancés derrière « Plus d'options » | Tout exposer d'emblée, façon After Effects |
| Choix exclusifs en contrôle segmenté à angles de 2 px | Boutons radio ronds |
| Champs, cases et segments bordés de `{colors.border-input}` (≥ 3:1) | Champ délimité par la seule `{colors.border}` décorative |
| Crédit obligatoire verrouillé, avec cadenas et explication ; position et discrétion réglables | Crédit obligatoire décochable, masqué, ou présenté comme une case grisée sans explication |
| Polices OFL embarquées, identiques sur tous les PC | Dépendre des polices installées sur le poste |

## Open Questions & Assumptions

- `[ASSUMPTION]` shadcn/ui est retenu comme UI system (le log le dit « envisagé, ouvert à d'autres »).
- `[ASSUMPTION]` Source Sans 3 reste provisoire pour l'UI (Libre Baskerville est retenue pour la serif).
- `[ASSUMPTION]` Masque hors cadre : `{colors.canvas-mask}` à 55 % (rendu sur maquette, non validé explicitement).
- `[ASSUMPTION]` Les tokens `map-*` de la planche 02 deviennent le style par défaut du Fond parchemin ; les Fonds sombre, clair et relief restent à spécifier.
- `[ASSUMPTION]` Garde-fou Faction : alerte sous ΔE 10 face à l'accent de l'un ou l'autre mode ; rien entre 10 et 20.
- `[ASSUMPTION]` Titres de section du panneau en `label-caps` sans serif (et non en serif italique comme sur la planche 01).
- `[ASSUMPTION]` Barre haute à 48 px au lieu de 56.
- `[ASSUMPTION]` `{rounded.md}` à 4 px pour les couches flottantes.
- `[ASSUMPTION]` Lucide restylé en trait de 1,5, avec des icônes sur mesure pour les outils de Carte.
- `[ASSUMPTION]` Le cartouche de date devient le style d'Horodatage par défaut des Templates.
- `[ASSUMPTION]` Vignettes d'Étape : l'année répétée est omise quand même `date-compact` ne tient pas.
- `[ASSUMPTION]` Contrôle segmenté : filet bas de 2 px en accent sur le segment choisi, pour atteindre 3:1.
- `[ASSUMPTION]` Crédit sur la Carte : corps et bandeau des niveaux « Discrète » et « Lisible ».
- Ouvert : mode par défaut au premier lancement (voir EXPERIENCE.md, Foundation).
- Ouvert : palettes des Fonds sombre, clair, relief et satellite (réglages de luminosité, saturation et teinte de FR-5).
