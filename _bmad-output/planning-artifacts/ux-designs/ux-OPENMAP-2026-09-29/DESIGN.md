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
  track-arrows-dark: '#3A3A48'
  track-tokens-dark: '#2E4038'
  track-text-dark: '#2A3A4C'
  track-ink-dark: '#E6E4DC'
  playhead-dark: '#8EB6D8'
  act-rule-dark: '#687786'
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
  # Piles système de la variation 02. UI = sans ; titres, dates, Carte = serif ; minutage = sans en tabular-nums.
  title-xl: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '28px', fontWeight: '600', lineHeight: '1.15', letterSpacing: '-0.01em' }
  title-lg: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '20px', fontWeight: '600', lineHeight: '1.2', letterSpacing: '-0.005em' }
  title-md: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '16px', fontWeight: '600', lineHeight: '1.25' }
  date-display: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '22px', fontWeight: '600', lineHeight: '1.05', letterSpacing: '-0.01em' }
  body: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: '400', lineHeight: '1.35' }
  body-strong: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: '600', lineHeight: '1.35' }
  label: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '12px', fontWeight: '500', lineHeight: '1.3' }
  caption: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '11.5px', fontWeight: '400', lineHeight: '1.35' }
  label-caps: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '11px', fontWeight: '600', lineHeight: '1', letterSpacing: '0.04em' }
  timecode: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '12px', fontWeight: '500', lineHeight: '1' }
  timecode-strong: { fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Frutiger, 'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: '600', lineHeight: '1' }
  map-label-faction: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '17px', fontWeight: '600', letterSpacing: '0.16em' }
  map-label-place: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '16px', fontWeight: '400' }
  map-label-sea: { fontFamily: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif", fontSize: '16px', fontWeight: '400', letterSpacing: '0.08em' }
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
  timeline-height: 280px
  timeline-collapsed-height: 44px
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
  tool-rail-item: { foreground: '{colors.text-secondary}', label: '{typography.label-caps}', height: '{spacing.rail-item-height}', radius: '{rounded.sm}', hover-background: '{colors.selection}' }
  tool-rail-item-active: { background: '{colors.selection}', foreground: '{colors.accent}', foreground-dark: '{colors.text-primary-dark}', indicator: '3px bar, left edge, {colors.accent}' }
  tool-options-bar: { foreground: '{colors.text-muted}', etape-label: '{typography.title-md}', typography: '{typography.label}' }
  properties-panel: { background: '{colors.surface}', border-left: '1px solid {colors.border}', width: '{spacing.panel-width}', title: '{typography.title-lg}', section-heading: '{typography.label-caps}', padding-x: '{spacing.panel-padding-x}' }
  field-inherited: { value-color: '{colors.text-secondary}', caption: '{typography.caption}', caption-color: '{colors.text-muted}' }
  field-overridden: { value-color: '{colors.text-primary}', marker: '2px bar, left edge, {colors.text-primary}', reset-link: '{colors.accent}' }
  more-options-row: { typography: '{typography.body-strong}', summary-color: '{colors.text-muted}', border-top: '1px solid {colors.border}' }
  library-drawer: { background: '{colors.surface}', border-right: '1px solid {colors.border}', width: '{spacing.drawer-width}', shadow: '0 12px 28px -18px rgba(0,0,0,.35)' }
  timeline: { background: '{colors.surface}', border-top: '1px solid {colors.border}', height: '{spacing.timeline-height}', collapsed-height: '{spacing.timeline-collapsed-height}', title: '{typography.title-md}', timecode: '{typography.timecode}' }
  timeline-play-button: { background: '{colors.accent}', foreground: '{colors.on-accent}', radius: '{rounded.sm}' }
  timeline-ruler: { tick-color: '{colors.border}', label: '{typography.timecode}', label-color: '{colors.text-muted}' }
  act-bracket: { rule: '1px {colors.act-rule}', label: '{typography.label-caps}', label-color: '{colors.text-secondary}' }
  etape-thumbnail: { radius: '{rounded.none}', border: 'inset 1px {colors.border}', chip-background: '{colors.surface-raised}', date: '{typography.date-display}', title: '{typography.caption}' }
  etape-thumbnail-current: { outline: 'inset 2px {colors.accent}' }
  transition-hatch: { pattern: 'repeating-linear-gradient(135deg, {colors.border} 0 2px, {colors.surface} 2px 6px)', label: '{typography.timecode}' }
  track-clip-arrows: { background: '{colors.track-arrows}', foreground: '{colors.track-ink}' }
  track-clip-tokens: { background: '{colors.track-tokens}', foreground: '{colors.track-ink}' }
  track-clip-text: { background: '{colors.track-text}', foreground: '{colors.track-ink}' }
  track-clip-selected: { outline: 'inset 1.5px {colors.accent}' }
  playhead: { line: '1.5px {colors.playhead}', handle: '12px pentagon, {colors.playhead}' }
  toast: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', shadow: '0 6px 16px -10px rgba(0,0,0,.45)' }
  dialog: { background: '{colors.surface-raised}', border: '1px solid {colors.border}', radius: '{rounded.md}', title: '{typography.title-lg}' }
  banner-warning: { background: '{colors.surface-raised}', icon-and-text: '{colors.warning}', border-left: '3px solid {colors.warning}' }
  focus-ring: { ring: '0 0 0 2px {colors.surface}, 0 0 0 4px {colors.focus-ring}' }
  faction-swatch: { radius: '{rounded.none}', ring: '0 0 0 1px {colors.surface}, 0 0 0 2px {colors.text-primary}' }
  canvas-selection: { halo: '4.5px {colors.canvas-halo}', stroke: '1.6px dashed {colors.canvas-ink}' }
  canvas-handle: { fill: '{colors.canvas-ink}', stroke: '1.5px {colors.canvas-halo}' }
  canvas-brush-cursor: { outer: '4.5px {colors.canvas-halo}', inner: '1.6px dashed {colors.canvas-ink}' }
  export-frame-mask: { color: '{colors.canvas-mask}', opacity: '0.55' }
  date-cartouche: { fill: '{colors.map-label-halo}', rule: '1.4px {colors.map-label}', year: '{typography.date-display}' }
---

# OPENMAP — Design Spine

Références visuelles : `.working/color-themes-1.html` (palette retenue : variation **02 « Bleu de Prusse & ivoire »**) et `.working/directions-1.html` (hybride **01 Atelier du cartographe** + Timeline de **03 Banc de montage**). Rendus de Carte visés : `imports/ref-guerre-froide-alliances.png` (UJ-3), `imports/ref-normandie-1944-vintage.webp` (UJ-4), `imports/ref-waterloo-baz-battles.jpg` (flèches blanches, portraits), `imports/ref-waterloo-1815-plan.jpg` (cartouche d'époque ; échelle tactique hors v1). En cas de conflit entre ce fichier et une planche ou une image, **ce spine l'emporte**. Deux écarts voulus avec les planches : pas de cadre gravé ni de bordure graduée d'atlas autour de la Carte, et pas de toggle FR/EN dans la barre haute.

## Brand & Style

OPENMAP est un atlas d'archives relié qu'on aurait posé sur un banc de montage. Côté chrome, on y retrouve l'encre bleu-noir sur ivoire, des angles francs, des libellés d'outils en petites capitales et une serif réservée aux titres, aux dates et aux libellés de Carte. La Timeline, elle, vient du montage vidéo : règle graduée, tête de lecture, vignettes d'Étape, transitions hachurées et pistes. Les vidéastes lisent déjà ce langage.

Le ton visuel reste **sérieux, précis, digne de confiance**. Il doit aussi être simple à prendre en main, comme dans Canva ou CapCut : une densité moyenne, aérée, et l'impression qu'on ne peut rien casser. La v1 est sobre et efficace. L'habillage façon RTS viendra plus tard, en v2 (PRD §10.4) ; en v1, l'esprit RTS n'existe que *sur la Carte*, à travers les Jetons d'unité et la conquête visible.

Le principe qui décide de tout : **la Carte domine et porte toute la couleur**. L'interface reste en demi-teintes. Son unique accent se lit toujours comme de l'interface, jamais comme une Faction.

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
| `track-arrows` | `#E3D6D2` | `#3A3A48` | 11,3 / 8,8:1 (avec `track-ink`) | Clips de la piste Flèches |
| `track-tokens` | `#D6E0D5` | `#2E4038` | 11,9 / 8,7:1 | Clips de la piste Jetons |
| `track-text` | `#D5DEE8` | `#2A3A4C` | 11,8 / 9,1:1 | Clips de la piste Texte |
| `track-ink` | `#18222D` | `#E6E4DC` | — | Texte posé sur une piste |
| `playhead` | `#1D4163` | `#8EB6D8` | 10,0 / 7,7:1 (≥ 3:1) | Tête de lecture |
| `act-rule` | `#7A8590` | `#687786` | 3,3 / 4,0:1 (≥ 3:1) | Filets des Actes. Ce token vient de `--map-frame` sur la planche ; comme le cadre de Carte est supprimé, il est réaffecté ici |

**Accent bleu de Prusse.** Il est très sombre en clair et très pâle en sombre. Il se distingue du bleu d'une Faction comme « Royaume de Hongrie » par la **valeur**, pas par la teinte. Il reste dans le chrome : bouton Exporter, bouton de lecture, outil actif, Étape courante, tête de lecture, liens d'action, clip sélectionné.

**Correspondance shadcn.** `primary` ← `{colors.accent}` · `primary-foreground` ← `{colors.on-accent}` · `background` ← `{colors.background}` · `card` ← `{colors.surface}` · `popover` ← `{colors.surface-raised}` · `foreground` ← `{colors.text-primary}` · `muted-foreground` ← `{colors.text-muted}` · `border` / `input` ← `{colors.border}` · `ring` ← `{colors.focus-ring}` · `destructive` ← `{colors.danger}` · `accent` (le fond de survol chez shadcn) ← `{colors.selection}`. Attention au faux ami : l'`accent` de shadcn est un fond de survol, alors que l'`accent` d'OPENMAP est la couleur d'action.

**Bordures.** `{colors.border}` passe sous 3:1. Il est décoratif et ne porte jamais seul une information. Un état se signale toujours par une couleur de texte, une icône ou un fond `{colors.selection}`.

**États.** `success`, `warning` et `danger` s'affichent toujours avec leur icône et un libellé. La couleur seule n'est jamais le signal.

### Canevas — surimpressions d'édition (identiques dans les deux modes)

Sur la Carte, l'interface ne s'exprime qu'en **encre et halo** : `{colors.canvas-ink}` `#18222D` doublé d'un halo `{colors.canvas-halo}` `#F7F3EA`. Cela vaut pour le contour de sélection, les poignées, le curseur de pinceau en double anneau pointillé, les points d'une Zone dessinée et le point d'origine d'une propagation. Le couple encre + halo se lit sur tous les Fonds, parchemin comme satellite ou sombre. L'accent UI n'apparaît **jamais** sur la Carte. Hors du cadre d'export, la Carte est assombrie par `{colors.canvas-mask}` `#11161C` à 55 % `[ASSUMPTION: teinte et opacité du masque, non chiffrées dans les planches]`.

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

Trois voix, toutes en piles système reprises telles quelles de la planche 02.

- **Serif** (Baskerville → Baskerville Old Face → Hoefler Text → Garamond → Times New Roman) : réservée aux **titres** (nom du Projet `title-md`, titre de panneau `title-lg`, titre d'écran de l'Assistant `title-xl`), aux **dates** (`date-display` pour la Date d'Étape sur les vignettes et dans la barre d'options, avec chiffres alignés) et aux **libellés de Carte** par défaut (`map-label-*`).
- **Sans** (Avenir Next → Avenir → Segoe UI → Frutiger → Helvetica Neue → Arial) : toute l'interface. `body` en 13 px est la taille de base.
- **Minutage** : la sans en chiffres tabulaires (`font-variant-numeric: tabular-nums lining-nums`) pour `timecode` et `timecode-strong`. On écrit `00:08,4`, `1,5 s`.

Règles :
- `label-caps` s'écrit en capitales (text-transform) avec un interlettrage de 0,04em. Il sert aux libellés du rail d'outils, aux titres de section du panneau et aux Actes. C'est la « petite capitale d'atlas » de la variation 02. `[ASSUMPTION: les titres de section du panneau passent en label-caps sans serif, et non en serif italique comme sur la planche 01, pour réserver la serif aux titres et aux dates.]`
- La serif n'apparaît jamais dans un bouton, un champ, une infobulle ou un toast.
- Un seul poids gras par voix : 600.
- `[NOTE FOR UX]` Sur un PC Windows standard, Avenir Next est absent : l'UI tombera sur Segoe UI. Sans Office, Baskerville Old Face manque aussi, et la serif tombera sur Times New Roman. Pour garantir la voix « atlas » sur la cible Chrome/Edge PC, il faudrait décider d'auto-héberger une serif sous licence libre, par exemple une Baskerville OFL.

## Layout & Spacing

Échelle de 4 : 4 · 8 · 12 · 16 · 20 · 24 · 32 px (`{spacing.1}` à `{spacing.8}`). Densité moyenne et aérée, celle de la planche 01.

Écran Éditeur (grille à 3 colonnes sur 3 rangées) :

| Zone | Dimension | Notes |
|---|---|---|
| Barre haute | `{spacing.top-bar-height}` 48 px, pleine largeur | `[ASSUMPTION: réduite des 56 px de la planche 01 pour tenir NFR-8]` |
| Rail d'outils | `{spacing.rail-width}` 76 px, pleine hauteur sous la barre | Items de `{spacing.rail-item-height}` 56 px : icône 20 px + libellé |
| Tiroir Bibliothèque | `{spacing.drawer-width}` 320 px, contre le rail | Recouvre la scène sans décaler la Carte `[ASSUMPTION]` |
| Scène (Carte) | Espace restant | Barre d'options de l'outil en haut, zoom en bas à gauche, toasts en bas à droite |
| Panneau de propriétés | `{spacing.panel-width}` 300 px, pleine hauteur sous la barre | Marge interne `{spacing.panel-padding-x}` |
| Timeline | `{spacing.timeline-height}` 280 px par défaut, entre rail et panneau | Repliée : `{spacing.timeline-collapsed-height}` 44 px, en-tête seul |

À 1366 × 768 (NFR-8), la scène fait 990 px de large. Une fenêtre Chrome maximisée laisse environ 650 px de hauteur utile ; une fois la Timeline à 280 px et la barre haute retirées, il reste environ 320 px pour la Carte. `[NOTE FOR UX: vérifier sur maquette que 280 px par défaut laisse une Carte exploitable à 1366 × 768 ; sinon, prévoir une hauteur par défaut plus basse sous 800 px de hauteur utile.]`

Le cadre d'export est centré dans la scène, au ratio du Format de sortie (16:9, 9:16 ou 1:1), avec au moins `{spacing.6}` de marge. Le libellé du format (« 16:9 · 1920 × 1080 ») se place hors du cadre, en `caption` `{colors.text-muted}`.

## Elevation & Depth

Tout est plat. La hiérarchie vient du **ton**, dans l'ordre `background` < `surface` < `surface-raised`, et des filets `{colors.border}`. Les ombres sont réservées aux couches flottantes :

- Toast : `0 6px 16px -10px rgba(0,0,0,.45)`.
- Tiroir, popover, menu, dialogue : `0 12px 28px -18px rgba(0,0,0,.35)`.
- Rien d'autre. Pas d'ombre sur les cartes, les boutons ou les vignettes d'Étape, et aucune lueur (glow).

Le masque hors cadre (`export-frame-mask`) est le seul effet de profondeur sur la Carte.

## Shapes

Angles **francs** : ceux d'un atlas relié, pas d'une app grand public.

- `{rounded.none}` 0 : vignettes d'Étape, pastilles de Faction, clips de piste, Carte.
- `{rounded.sm}` 2 px : boutons, champs, items du rail, bouton de lecture, segments.
- `{rounded.md}` 4 px : toasts, popovers, dialogues, tiroir. `[ASSUMPTION: la planche fixe 2 px partout ; 4 px ici seulement pour les couches flottantes]`
- `{rounded.full}` : réservé aux curseurs de slider, aux points de statut et à l'anneau de pinceau. **Jamais** pour un bouton, un badge ou un champ : pas de pilule.

Icônes : trait de 1,5 px, 20 px dans le rail, 16 px dans les contrôles. `[ASSUMPTION: Lucide (défaut shadcn) passé en trait de 1,5, avec des icônes dessinées sur mesure pour Territoire, Conquête et Jeton, comme sur la planche.]`

## Components

Composants shadcn restylés par les tokens (Button, Dialog, Popover, DropdownMenu, Tabs, Tooltip, Slider, Select, Toggle, Sheet, Toast via Sonner) : pas de rayon shadcn par défaut, pas de police Geist, pas d'ombre shadcn. Spécifiques à OPENMAP :

- **Barre haute** (`top-bar`) : logotype, fil « Projets / {nom du Projet} » (nom en `title-md`), statut de sauvegarde (`caption` avec icône `{colors.success}`), Format de sortie, annuler/rétablir, recherche de lieu, Mode présentation (`button-secondary`), **Exporter** (`button-primary`, seul bouton primaire de l'écran).
- **Rail d'outils** (`tool-rail`, `tool-rail-item`) : icône au-dessus d'un libellé `label-caps`. L'outil actif (`tool-rail-item-active`) prend un fond `{colors.selection}`, un libellé `{colors.accent}` en clair ou `{colors.text-primary-dark}` en sombre, et une barre de 3 px `{colors.accent}` au bord gauche. Au survol, fond `{colors.selection}` ; l'infobulle donne le nom complet et le raccourci.
- **Barre d'options de l'outil** (`tool-options-bar`) : bande en haut de la scène. Elle montre « Étape 1463 · Conquête de la Bosnie » (date en `title-md`), puis les options de l'outil actif, par exemple la pastille de la Faction attaquante et « Pinceau 24 px ».
- **Panneau de propriétés** : titre `title-lg` avec Emblème ou icône, surtitre `caption` (« Copie propre au Projet »), sections à titre `label-caps` séparées par des filets, rangées de 34 px minimum. Hex en `timecode`.
- **Champ hérité / surchargé** : un champ hérité (`field-inherited`) affiche sa valeur en `{colors.text-secondary}` avec la légende « Hérité de … ». Un champ surchargé (`field-overridden`) affiche sa valeur en `{colors.text-primary}`, une barre de 2 px au bord gauche et un lien « Rétablir » en `{colors.accent}`. Ce motif sert aux Sous-factions (Kit parent) comme aux Étapes (Étape précédente) ; seule la légende change.
- **Rangée « Plus d'options »** (`more-options-row`) : en bas de section ou de panneau. Libellé `body-strong`, résumé du contenu en `{colors.text-muted}` (« Frontière, Flèche, Jeton ») et chevron.
- **Tiroir Bibliothèque** (`library-drawer`) : onglets Templates · Kits · Emblèmes · Icônes d'événement, recherche, filtres en `Select`, grille de vignettes carrées à angles vifs.
- **Timeline** : en-tête (« Timeline » en `title-md`, bouton de lecture `timeline-play-button` à angles de 2 px, Étape précédente/suivante, minutage `timecode-strong` / `timecode`, vitesse, zoom, repli). Corps : colonne de libellés (Actes, Étapes, Flèches, Jetons, Texte), règle graduée en secondes (`timeline-ruler`), Actes soulignés par un filet `{colors.act-rule}` à talons (`act-bracket`), vignettes d'Étape (`etape-thumbnail`). Chaque vignette est un aperçu de la Carte avec une pastille `surface-raised` qui porte la date `date-display` et le titre `caption`. Les transitions sont des blocs hachurés (`transition-hatch`) avec leur durée (« 1,5 s »). Les pistes portent des clips à teinte par piste (`track-clip-*`) avec un liseré gauche en `track-ink` à 45 %. La tête de lecture est un trait `{colors.playhead}` avec une poignée pentagonale.
- **Étape courante** : `etape-thumbnail-current`, contour intérieur de 2 px en `{colors.accent}`.
- **Toast** : icône d'état cerclée, titre `body-strong` et sous-ligne `caption` (« Projet sauvegardé · Sur cet appareil · à l'instant »).
- **Bandeau** (`banner-warning`) : pleine largeur sous la barre haute, liseré gauche `{colors.warning}`, icône triangle et une action en lien.
- **Dialogue** (modale Export, Assistant, Réglages, confirmations) : `surface-raised`, titre `title-lg`, actions alignées à droite, le primaire à droite.
- **Pastille de Faction** (`faction-swatch`) : carré plein de la couleur du Kit, entouré d'un anneau surface + encre. Toujours accompagnée du nom.
- **Surimpressions de canevas** (`canvas-selection`, `canvas-handle`, `canvas-brush-cursor`) : encre + halo exclusivement.
- **Masque de cadre d'export** (`export-frame-mask`) : aucune bordure, aucun filet, aucun ornement. Seul l'assombrissement marque la limite.
- **Cartouche de date** (`date-cartouche`) : style par défaut de l'Horodatage **sur la Carte**. Encadré halo, double filet d'encre, surtitre en capitales espacées, année en serif. C'est du contenu : il suit les tokens `map-*`, jamais les tokens UI. `[ASSUMPTION: le cartouche de la planche 01 devient le style d'Horodatage proposé par défaut par les Templates]`
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

## Open Questions & Assumptions

- `[ASSUMPTION]` shadcn/ui est retenu comme UI system (le log le dit « envisagé, ouvert à d'autres »).
- `[ASSUMPTION]` Masque hors cadre : `{colors.canvas-mask}` à 55 %.
- `[ASSUMPTION]` Les tokens `map-*` de la planche 02 deviennent le style par défaut du Fond parchemin ; les Fonds sombre, clair et relief restent à spécifier.
- `[ASSUMPTION]` Garde-fou Faction : alerte sous ΔE 10 face à l'accent de l'un ou l'autre mode ; rien entre 10 et 20.
- `[ASSUMPTION]` Titres de section du panneau en `label-caps` sans serif (et non en serif italique comme sur la planche 01).
- `[ASSUMPTION]` Barre haute à 48 px au lieu de 56.
- `[ASSUMPTION]` Tiroir de 320 px qui recouvre la scène.
- `[ASSUMPTION]` `{rounded.md}` à 4 px pour les couches flottantes.
- `[ASSUMPTION]` Lucide restylé en trait de 1,5, avec des icônes sur mesure pour les outils de Carte.
- `[ASSUMPTION]` Le cartouche de date devient le style d'Horodatage par défaut des Templates.
- `[NOTE FOR UX]` Auto-héberger une serif (et éventuellement la sans) sous licence libre, pour que le rendu soit le même sur un PC Windows sans Avenir ni Baskerville.
- `[NOTE FOR UX]` La hauteur de Timeline par défaut (280 px) laisse-t-elle une Carte assez grande à 1366 × 768 ?
- Ouvert : mode par défaut au premier lancement (voir EXPERIENCE.md, Foundation).
- Ouvert : palettes des Fonds sombre, clair, relief et satellite (réglages de luminosité, saturation et teinte de FR-5).
