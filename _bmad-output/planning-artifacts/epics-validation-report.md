# Epics & Stories Validation Report — OPENMAP

- **Document validated:** `_bmad-output/planning-artifacts/epics.md` (Epics 1–7 P0, 53 stories; Epics 8–11 coarse by design)
- **Architecture reference:** `architecture/architecture-OPENMAP-2026-09-29/ARCHITECTURE-SPINE.md` (AD-1..AD-29)
- **Date:** 2026-09-30
- **Mode:** report only (epics.md not modified)

## Verdict

**PASS WITH CONCERNS.** No P0 FR is left without a story, all 29 ADs are cited, and Story 1.1 correctly starts from the starter template. There are no blocking gaps, but these need fixing before sprint planning:

- 7 P0 FRs are only partly covered.
- 9 UX-DRs that matter for P0 are missing from every story. The biggest gaps are the tool options bar and the Map typography/scaling tokens.
- 4 story ACs contradict the UX spec.
- 3 hard forward dependencies exist: Story 1.9 → Epic 2, Stories 6.3/6.4 → Story 6.5, and Story 5.4 → a Layers model that is never delivered.

### Counts

| Check | Result |
| --- | --- |
| P0 FRs (incl. P0 parts of FR-1, FR-5, FR-35, FR-37) | 40 total · 33 fully covered · 7 partial · 0 uncovered |
| UX-DR1..163 | 139 referenced by stories · 24 unreferenced: 11 explicitly P1/P2 (OK), 4 reasonably covered by ACs, **9 real P0 gaps** · 4 AC-vs-UX contradictions · 7 referenced but thinly covered |
| ARCH-1..21 | 0 uncovered (all traced through AD ids) · 5 partial (ARCH-10, 13, 14, 15, 19) |
| Forward dependencies | 3 hard · 3 soft |
| Oversized stories | 5 flagged (1.5, 1.7, 2.4, 3.4, 5.1); borderline: 1.2, 3.9 |
| Starter check | PASS (minor additions suggested) |

---

## 1. P0 FR coverage

| FR | Stories | Status / missing sub-requirement |
| --- | --- | --- |
| FR-0 | 3.1, 3.2, 2.4 (a single owner per member), 2.5 (DrawnZone wins) | Covered |
| FR-1 (blank + template) | 1.4 (blank), 6.4 (from Template; wizard with "Projet vierge") | Covered |
| FR-2 | 6.3 (screen 1), 6.5, 6.6 | **Partial.** The "≥ 2 Steps with ≥ 1 Territory change" exit rule is only defined for the Template path. No AC says what the wizard generates when the user picks "Carte vierge"/"Projet vierge" and goes through screens 2–4 (UX-DR123), e.g. auto-creating Step 1 in which the chosen Factions take the Region's GeoEntities. The Blank Map path could therefore exit with no animation. Fix: add an AC to 6.6. |
| FR-3 | 6.3 | Covered |
| FR-4 | 6.4 | Covered |
| FR-5 (stylized) | 1.7, 1.8 | Covered |
| FR-6 | 1.9, 6.5 | Covered. The DrawnZone-conversion AC sits in the wrong story; see §4. |
| FR-8 | 1.10, 6.5 | Covered |
| FR-10 | 1.11, 4.1 | **Partial.** FR-10 says that *every* Library item (Emblem, Template) has a viewable attribution. The Sources list in 1.11 covers only "Basemap and datasets". 2.1 and 6.2 store licence records but never show them. Fix: add ACs to 2.1 (Kit/Emblem card shows source + licence) and 6.3 (Template attribution), and have the 1.11 Sources list include the licence records of copied media. |
| FR-12 | 2.1 (default Kit), 2.2 | Covered |
| FR-13 | 2.1, 2.4, 5.1, 5.2 | Covered |
| FR-14 | 2.3 | Covered |
| FR-15 | 2.1 | **Partial.** "Apply" a Library Kit to an *existing* Faction is missing. Only "Ajouter comme nouvelle Faction" is specified; UX-DR60 also requires "Appliquer à {Faction sélectionnée}". |
| FR-18 | 2.4 | Covered |
| FR-19 | 2.5, 3.2, 3.4 | Covered |
| FR-20 | 2.6, 3.4 | Covered |
| FR-21 | 2.6 | Covered |
| FR-22 | 2.3, 2.7 | Covered |
| FR-23 | 2.7, 3.4 | Covered |
| FR-25 | 2.8 | Covered (Emblem fill is P1, marked as coming later) |
| FR-28 | 5.1 | Covered |
| FR-30 | 5.2 | Covered |
| FR-34 | 5.3 | Covered |
| FR-35 (P0 minimal) | 2.9, 6.6 | Covered. Minor: Legend-generated text such as a title should follow `project.mapLocale` (AD-25), which is not stated. |
| FR-37 (P0 simple) | 3.8 | Covered |
| FR-39 | 3.4 | **Partial (minor).** "From a point the user can place" has no UI AC. UX-DR37/UX-DR48 put the propagation origin point in the Territory and Step panels, and it is drawn with `canvas-handle`. |
| FR-40 | 3.1 | Covered |
| FR-41 | 3.3 | Covered |
| FR-42 | 3.5, 4.5 | Covered |
| FR-45 | 3.2, 5.1–5.4 | Covered |
| FR-46 | 3.6, 5.1 | **Partial.** Automatic framing must include UnitTokens. 3.6 says "later also Arrows and Tokens", but only 5.1 adds the Arrows AC; 5.2 has no auto-framing AC. |
| FR-47 | 3.7 | Covered |
| FR-48 | 5.4 | **Partial.** "…or as an EventIcon" is not covered. EventIcons are P1 (FR-32, Epic 9), so state explicitly that "Use as Event Icon" is deferred to Epic 9 and hidden or marked "coming later" in the Image panel (UX-DR47). |
| FR-50 | 4.1, 4.2, 4.4, 2.9, 3.6, 3.7 | **Partial.** "Texts and DateDisplay stay anchored to the same frame edge on Output Format change" is explicit only for the Legend (2.9) and framings (3.6/3.7). 3.8 and 5.3 lack a format-change AC. The "Framings recalculated for 9:16 · Undo" toast (UX-DR63) is also missing. |
| FR-52 | 1.4 | Covered |
| FR-53 | 1.4, 1.13, 7.1 | Covered |
| FR-54 | 6.1, 7.1 | Covered |
| FR-55 | 1.3, 1.5 | Covered |
| FR-57 | 3.9 | Covered (for UX thinness see §2) |
| FR-58 | 7.4 | Covered. Minor: consent and `installId` should be stored in Dexie (AD-8), which is not stated. |

---

## 2. UX-DR coverage (P0 scope)

**Explicitly P1/P2, correctly not in P0 stories:** UX-DR42, 44, 45, 46, 61, 75, 94, 96, 97 (its P0 part is covered by 2.9), 140, 149.

**Unreferenced but reasonably covered by existing ACs:** UX-DR68 (skeletons in 1.4/1.5), UX-DR87 (single owner track in 2.4), UX-DR104 (3.3, 3.9, 4.5), UX-DR14 (weakly, via UX-DR12 and the swatches in 2.1; see the chrome group below).

### 2a. Real P0 gaps: unreferenced and not covered

| Theme | UX-DR | What is missing | Target story |
| --- | --- | --- | --- |
| **Editor chrome** | **UX-DR32** tool options bar | 36 px bar above the Map with the current Step reminder, active-tool options, contextual links ("Appliquer à toutes les Étapes", "Valider la conquête") and the read-only format label. Story 2.6 already says "in the options bar", but no story builds the bar. | 1.5 (shell); extend in 2.4/2.6/3.1 |
| Editor chrome | UX-DR29 buttons (primary/secondary/ghost, one primary per screen) | Component variants | 1.2 |
| Editor chrome | UX-DR52 input, checkbox and slider base components (slider + numeric input, keyboard steps, one drag = one undo) | Base components used by 1.8, 2.2 and 3.1 | 1.2 (component), 1.8 (first slider use) |
| Editor chrome | UX-DR65 toast component, UX-DR66 banner component | Components are used from 1.4/1.12/1.13 on, but their visual spec is never an AC. The rules (UX-DR115) are cited. | 1.4 (toast), 1.12 or 1.13 (banner) |
| Editor chrome | UX-DR14 Faction colours as content (faction-swatch with neutral ring + name, never reused in chrome) | Not stated anywhere | 2.1 / 2.4 (faction-picker) |
| **Map rendering** | **UX-DR21** Map typography tokens in export px, scaled by `frameShortSide/1080` on screen | This is the scaling contract for every Map text (labels, Legend, DateDisplay, Token labels, Texts, credit). AD-23 gives the principle, but no story implements the tokens. | 1.8 (scale rule + label tokens); cite in 1.11, 2.9, 3.8, 5.2, 5.3 |
| **Format** | UX-DR63 Output Format change toast "Cadrages recalculés pour 9:16 · Annuler" | Toast and undo on format change | 3.6 |
| **Layout** | UX-DR160 below 1366 px: Map shrinks first, panel 260 px under 1280 px, Timeline collapses on low height | 1.5 cites UX-DR33 and UX-DR148 but not the shrink/collapse behaviour | 1.5 / 3.1 |
| **Brand** | UX-DR163 Do/Don't review checklist | Not in any Definition of Done | 1.2 (and add to the DoD rule of 1.6) |

### 2b. Referenced but thinly covered (the cited UX-DR has sub-requirements that are absent from the ACs)

| UX-DR | Missing part | Target story |
| --- | --- | --- |
| UX-DR126 | Wizard "Création de la Carte…" progress, frozen screen, failure "Impossible de créer la Carte." + "Réessayer" | 6.6 |
| UX-DR129 | Presentation controls bar (640×48, fade after 2 s, Space, end state "Rejouer", no loop) | 3.9 |
| UX-DR144 | Export **failed** state ("L'export a échoué." + cause + "Réessayer" + advice). Only cancel is covered. | 4.2 |
| UX-DR146 | Empty Timeline message ("Ajoutez une Étape…") and the no-Faction empty state in Project settings / Territory / Conquest tools | 3.1, 2.1/2.4 |
| UX-DR136 | Library/Wizard load failure "Impossible de charger la Bibliothèque." + "Réessayer" | 2.1, 6.3 |
| UX-DR141 | Global offline banner in Home and Editor. 7.5 only cites it as a fallback, and no story builds the banner. | 1.13 (banner infrastructure) or 7.5 |
| UX-DR110 | Element-level Delete, Ctrl+D (duplicate element) and arrow nudge are not in any element story (5.1–5.4, 2.5) | 1.6 registry + each element story |

### 2c. ACs that contradict the UX spec (fix the story or the UX spec)

1. **Story 1.6 vs UX-DR113/UX-DR154:** the story maps Alt+1..6 to top bar, rail, **Map, panel, Timeline, drawer**. UX maps them to top bar, rail, **options bar, Map, panel, Timeline**, with no drawer.
2. **Story 1.11 vs UX-DR131:** the default credit corner is bottom-**right** in the story and bottom-**left** in UX.
3. **Story 2.2 vs UX-DR15:** the story checks the colour guardrail against "another Faction's colour or the Basemap land colour". UX-DR15 specifies CIEDE2000 < 10 against `accent`/`accent-dark`. Also, the "distinct from other Factions" rule in 2.1 is a different rule (FR-2) and has no metric.
4. **Story 3.2 vs UX-DR85:** the story puts "Appliquer à toutes les Étapes" in the change toast. UX puts it as a link under the modified field (and in the options bar), with the toast "Appliqué aux 5 Étapes · Annuler" only as confirmation.

Minor: Settings → Storage is specified twice (1.5 AC5 and 1.13 AC2). Keep it in one story.

---

## 3. ARCH-1..21 coverage

Stories cite AD ids rather than ARCH ids. Mapped through those AD ids, every ARCH item is touched by at least one story. The partial ones:

| ARCH | Missing part | Suggested story |
| --- | --- | --- |
| ARCH-10 (AD-24) | **`project.layers` model and fixed `z` bands.** "Every element belongs to one Layer" is never created. 1.3's blank Project has no layers, yet 5.4 assumes "it belongs to a Layer". The Layers panel is P1, but the document model and Scene z-bands are needed in P0. | 1.3 (default Layers per element nature), 1.8 (z bands in the Scene) |
| ARCH-14 (AD-8) | Media garbage collection (unreferenced media removed only when no Project/Kit references them) is absent. Storing consent/installId in Dexie is not stated. Flush on `visibilitychange: hidden` and before lock handover is only partly stated. | 1.4 or 5.4 (GC), 7.4 (consent storage) |
| ARCH-15 (AD-9) | Migrations running on the **IndexedDB load path**, the per-migration fixture test rule, and Dexie `versionchange` → flush + reload | 1.3 / 1.4 |
| ARCH-13 (AD-19) | "Failed dynamic import after redeploy → one reload after flushing" | 1.5 or 7.5 |
| ARCH-19 | Weekly off-VPS backup of the **source data** (only Umami is covered in 7.3) | 7.3 |
| AD-27 (via ARCH-16) | "Referenced data unavailable" banner when a Project's Library data can't be fetched | 1.9 |
| Spine environments | Telemetry disabled on `preview` deployments | 7.4 |

All other ARCH items (1–9, 11, 12, 16–18, 20, 21) are covered: 1.1, 1.3, 1.4, 1.7, 1.8, 1.9, 1.11, 1.12, 2.x, 3.x, 4.x, 6.1, 7.2–7.5. The EOX satellite part of ARCH-17 is P1/Epic 8 and is correctly out of scope.

---

## 4. Forward dependencies

### Hard (an AC cannot be implemented or tested when the story is done)

1. **Story 1.9 → Epic 2 (Stories 2.4/2.5).** Quote: *"Given a Project with Territories built on GeoEntities (from Epic 2 on) When the user changes the reference date Then a confirmation explains the consequence, and GeoEntities that no longer exist are converted into DrawnZones in the same undoable Command (FR-6)"*. Neither members nor DrawnZones exist in Epic 1. **Fix:** move this AC to Story 2.5 (or a new 2.x story) and keep only "confirmation on date change" in 1.9.
2. **Stories 6.3 and 6.4 → Story 6.5 (the wizard shell).** Quotes: 6.3 *"the gallery shows (wizard screen 1 and the Library drawer Templates tab)"*; 6.4 *"When the user chooses 'Nouveau Projet' Then the wizard opens (replacing the direct blank creation of Story 1.4), with 'Projet vierge' still available on its first screen"*. The wizard shell (screens, progress, Back/Next/Skip) is only defined in 6.5. **Fix:** move the "wizard shell" AC from 6.5 into a story placed before 6.3 (e.g. make 6.3 "Wizard shell + Template screen"), or reorder to 6.5 → 6.3 → 6.4.
3. **Story 5.4 → a Layers model that no story delivers (AD-24).** Quote: *"it belongs to a Layer and existence range like any element (UX-DR47, AD-24, FR-45)"*. **Fix:** add the `project.layers` default model to 1.3 and the z bands to 1.8.

### Soft (the story works, but part of its AC is untestable until later)

4. **Story 1.6 → 2.1 / 3.1 / 3.9.** Alt+5 (Timeline) and Alt+6 (drawer), the Escape step "close the drawer", and "in Presentation mode it returns to the Editor" target UI that does not exist yet. **Fix:** say that the registry reserves these, and add the bindings in 2.1, 3.1 and 3.9.
5. **Story 2.2 → 3.5 and Epic 5.** The Kit editor exposes Arrow style, UnitToken shape and Organic Signature level, whose effects only exist later. **Fix:** say that the fields are stored and applied once the consumer exists, or add them in 3.5/5.1/5.2.
6. **Epic 6 intro / Sequencing notes vs 6.2.** Templates are said to be authored "as soon as Epic 3 is done", but 6.2 renders thumbnails and animated previews "through the export pipeline" (Epic 4). **Fix:** say "after Epic 4", or render thumbnails via the 3.9 thumbnail pipeline.

Also ambiguous: Story 2.6 AC3, *"Given a Region with no subdivisions available"*. Subdivisions are P1 (FR-7), so in P0 this condition is always true. Clarify the trigger or drop it to Epic 10.

---

## 5. Stories too large for one dev-agent session (top 5)

| Story | Why it is too large | Split suggestion |
| --- | --- | --- |
| **1.7** Local data pipeline | Natural Earth tileset, 4 MapLibre styles, glyph generation, Cliopatria GeoEntities with a format decision, licence gate and local serving. It also implicitly feeds the 1.10 search index. | 1.7a Basemap tileset + 4 styles + glyphs + local serving; 1.7b Cliopatria GeoEntities (format decision, validity ranges, licence metadata, search index) |
| **1.5** Editor shell | Top bar, rail, panel, Project settings, undo UI, save status, Settings dialog and capability/mobile gate. The options bar (UX-DR32) must also be added. | 1.5a layout shell + Project settings + undo/save status; 1.5b Settings dialog + capability gate + unsupported-browser page |
| **2.4** Assign GeoEntities | Members model, `derive.coverage`, deck.gl Territory rendering, Select tool with marquee, entity/territory panels, faction-picker, context menu, Territory tool Entities mode, toast and 30 fps perf check | 2.4a coverage derivation + rendering + Select/panel assignment; 2.4b context menu + Territory tool Entities mode + Territory panel + perf measurement |
| **3.4** Territory transitions | Propagation from FrontLine or origin point (algorithmically hard), fade, sweep, DrawnZone morph, moving FrontLine | 3.4a fade + sweep + DrawnZone morph + FrontLine per `t`; 3.4b propagation (FrontLine origin, user-placed origin point UI, centre fallback) |
| **5.1** Movement Arrows | Arrow tool, self-drawing animation, panel, **and** the first implementation of Timeline tracks/clips/sub-rows shared by 5.2–5.4 | Extract "Timeline tracks, clips and automatic sub-rows" (UX-DR79/80/13) into its own story before 5.1 |

Borderline: **1.2** (all tokens + fonts + theming + i18n + contrast tests; could split i18n out) and **3.9** (the `render.ready` barrier + thumbnails + Presentation UI; could split the barrier and thumbnails into their own story).

---

## 6. Starter template check

**PASS.** Story 1.1 scaffolds from the official Vite `react-ts` template with the spine versions (TypeScript 6.0, Vite 8.3, React 19.3, Tailwind 4.3, shadcn/ui CLI 4.21). It creates every layer directory with its `index.ts` (ARCH-1), and wires CI (typecheck, oxlint AD-1/AD-2 bans, dependency-cruiser, licence check, Vitest, Playwright smoke) plus the Cloudflare Pages deploy and previews (ARCH-2).

Minor suggestions:
- Make "`shadcn init` with Tailwind 4 (theme mapped later in 1.2)" an explicit AC.
- Pin Node.js 24 LTS (spine Stack) in `.nvmrc`/`engines` and CI.
- Note that the ARCH-2 JSON Schema snapshot check is added in 1.3 and the production tile-URL check in 7.2, so CI is not expected to have them in 1.1.

---

## Top fixes (prioritised)

1. Move the DrawnZone-conversion AC from 1.9 to 2.5 (forward dependency).
2. Move the wizard shell ahead of 6.3/6.4, or merge it into 6.3 (forward dependency).
3. Add the `project.layers` default model to 1.3 and the z bands to 1.8 (AD-24; unblocks 5.4).
4. Add the tool options bar (UX-DR32) to 1.5, and align the Alt+1..6 zones in 1.6 with UX-DR113.
5. Add the Map typography tokens and the frame-scale rule (UX-DR21) to 1.8, and cite them in the Map-text stories.
6. Resolve the 4 AC/UX contradictions: credit corner (1.11), colour guardrail metric (2.2), placement of "Apply to all Steps" (3.2), zone-jump map (1.6).
7. FR partials:
   - 6.6: define what the Blank Map wizard path produces.
   - 5.2: add Tokens to auto-framing.
   - 2.1: add "Appliquer à {Faction}" and Library-item attribution.
   - 5.4: defer EventIcon use explicitly.
   - 3.8/5.3: add format-change anchoring ACs.
   - 3.6: add the UX-DR63 toast.
8. Add the missing states: export failed (4.2), wizard create progress/failure (6.6), Presentation controls bar (3.9), Library load failure (2.1), empty Timeline / no-Faction empty states (3.1/2.4), global offline banner.
9. Split 1.7, 1.5, 2.4, 3.4 and 5.1 as suggested in §5.
10. Close the ARCH partials: media GC, migrate on IndexedDB load + `versionchange`, dynamic-import reload, source-data backup, "referenced data unavailable" banner, telemetry off on previews.
