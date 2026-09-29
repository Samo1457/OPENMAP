---
type: review
lens: reconcile-ux
target: ../ARCHITECTURE-SPINE.md
against:
  - ../../../ux-designs/ux-OPENMAP-2026-09-29/EXPERIENCE.md
  - ../../../ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md
  - ../../../ux-designs/ux-OPENMAP-2026-09-29/.memlog.md
date: 2026-09-29
verdict: revise
---

# Review: reconciling the Architecture Spine with the UX spines

## Verdict

**Revise before epics. The paradigm is sound and nothing needs to be rethought.** On most UX rules the spine already agrees: the Map is independent of the theme (AD-6), the accent never appears on the Map (AD-6), undo lives in memory and is never persisted (AD-3), the single-writer lock is read-only elsewhere with "Take over here" and no auto-takeover (AD-15), export waits for tiles and pauses after 20 s (AD-7), the credit is locked with only corner and prominence adjustable (AD-17), fonts are self-hosted (AD-16) and interface strings are separate from Map labels (AD-20).

What is missing is mostly one level lower: the mechanisms that make those rules hold when separate teams build the units. The biggest gap is **what "the frame shows the export" means in pixels and camera zoom**. The next biggest is the **offline claim, which contradicts where GeoEntity geometry lives**. Third is **what takeover must do to the in-memory document and the undo stack**.

The deferred items the UX log hands to architecture are: (1) the multi-tab edit lock, which is covered by AD-15 but incomplete (F3); (2) keeping the export file in memory for "Télécharger de nouveau", which is not covered (F10); (3) export tile wait, 20 s pause and encoder detection, which are covered by AD-7 and AD-19 with gaps (F4, F10).

Severity scale: **High** means independently built units will visibly diverge, or a UX promise cannot be kept. **Medium** means a likely divergence or rework. **Low** means worth pinning down but cheap to fix later.

## Findings

### F1 — High — "Frame = export" has no pixel or camera contract

- **UX:** EXPERIENCE "Carte vs chrome" rule 4, plus Mode présentation ("rendu identique à l'export"), plus Scrub (FR-41, NFR-1). DESIGN Typography says Map sizes are export px for a frame whose **short side** is 1080. Displayed size = token × (on-screen frame short side ÷ 1080). At 562×316 the factor is 0.29.
- **Spine:** Map sizes are "export px @1080p" (Conventions). Overlays use "offset in export px @1080" (AD-14). Export renders "at the output size (1080p for the Output Format)" (AD-7). Camera is `{center, zoom, bearing, pitch}` with no reference size (AD-1).
- **Divergence:**
  - A MapLibre/deck.gl `zoom` shows a different geographic extent at 562 px than at 1920 px. The editor frame, Presentation (screen size) and export (1920) will not frame the same area unless zoom is normalised to a reference frame.
  - Raster/vector tile zoom levels chosen, basemap label collision/density and line widths also differ with viewport pixel size. So even with a matching extent, the basemap will not look like the export.
  - "1080p" is ambiguous for 9:16 (1080×1920, short side 1080, vs height 1080).
  - Presentation letterboxing of a 9:16 frame on a 16:9 screen is unspecified.
  - The golden test (Presentation frame vs export frame) has no defined resolution to compare at.
- **Fix (new AD or extend AD-1/AD-14):**
  - **Canonical output frames:** 16:9 = 1920×1080, 9:16 = 1080×1920, 1:1 = 1080×1080. The short side is always 1080.
  - Scene camera zoom is defined **for the canonical frame**. Every renderer applies `zoom + log2(s)` where `s = frameShortSidePx / 1080`, and scales every Scene pixel quantity (labels, halos, strokes, token size, credit, Legend, offsets) by `s`. MapLibre basemap text and line sizes get the same factor, or the frame is drawn at canonical logical size and scaled with `pixelRatio`, which is preferred because it keeps collision and tile choice identical.
  - Presentation letterboxes the canonical frame into the screen.
  - The golden test compares at the canonical size.

### F2 — High — Offline and data-origin outage contradict where Project content lives

- **UX:** Offline banner: "Vos modifications sont enregistrées sur cet appareil ; les fonds de carte et la Bibliothèque non encore chargés ne s'afficheront pas. L'édition continue." Also "Ouverture d'un Projet": the Editor shows at once and tiles follow.
- **Spine:** "If the VPS is down, the app still opens and edits Projects offline" (Operations). But GeoEntities are references `{dataset, datasetVersion, entityId}` resolved from the data origin (AD-12). Territories therefore have **no geometry** without the data origin. Emblems and Library Kit assets are the same. MapLibre glyphs/sprites for Map labels presumably are too. The Project File (AD-10) does not embed them either. Nothing covers a true offline start of the app shell (no service worker is mentioned). Lazy chunks also 404 after a Pages redeploy for tabs that are already open.
- **Divergence:** persistence, library and render teams will each assume someone else caches this data. The result is Territories that silently vanish offline, and exports of incomplete Maps.
- **Fix:**
  - `src/library` caches every versioned Library resource a Project references (GeoEntity geometry chunks, emblems, glyph PBFs, basemap style JSON). The cache is keyed by immutable versioned path, in a dedicated Dexie table or Cache Storage, and populated on first use. This is non-user data, so state that AD-8's "single DB" allows it.
  - Define the state "referenced data unavailable": Territory drawn with a neutral placeholder plus a banner, and export blocked or warned in the same way as missing tiles.
  - Decide explicitly whether a service worker caches the app shell. If none, make the offline claim "while already open" only. Also handle chunk-load failure after a deploy with a reload prompt.

### F3 — High — Multi-tab takeover is under-specified (UX deferred item #1)

- **UX:** State Patterns → "Projet ouvert dans un autre onglet":
  - Takeover happens "après la dernière sauvegarde de l'autre onglet".
  - The former holder switches to read-only with "maintenant modifié dans un autre onglet".
  - When the holder closes, the banner says so and keeps "Reprendre ici" with no automatic takeover.
  - The Accueil card shows "Ouvert dans un autre onglet".
  - In read-only, the tools, panel fields and edit menus are disabled.
- **Spine AD-15** covers the Web Lock, BroadcastChannel and holder flush. It does not say:
  1. The taking-over tab must **reload the document from IndexedDB** after acquiring the lock. Its in-memory copy is stale.
  2. The taking-over tab must **clear its undo/redo stack**. Inverses computed against the old document are invalid. The same applies to the tab that loses the lock.
  3. Read-only is enforced at the **Command dispatcher**, which rejects when the tab is not the holder, and not only by disabled UI.
  4. How a read-only tab learns that the holder **closed or crashed** without taking the lock. Suggestion: hold a pending `mode: 'shared'` request on the same lock name. It is granted only when the exclusive holder releases. Then show the banner and release at once.
  5. Whether a read-only tab refreshes its view when the holder saves. Recommend: yes, on a BroadcastChannel `saved {revision}` message.
  6. The Accueil lock indicator uses `navigator.locks.query()`. Delete, Rename and Duplicate from the Accueil on a Project locked elsewhere must be refused, or must take the lock.
- **Fix:** add these six clauses to AD-15.

### F4 — High — Export readiness waits for tiles only; the pause contract is incomplete

- **UX:** Every frame waits for its tiles. After 20 s without a new tile, rendering pauses with the message naming the affected Steps ("Étapes 3 à 5"). "Continuer" goes on, and the zones keep the basemap's plain background. When offline, the same warning appears **at launch**. The progress label reads "Chargement des tuiles…".
- **Spine AD-7:** "waits until the map reports all tiles loaded … pausing per EXPERIENCE after 20 s". The spine does not address:
  - **Other per-frame resources.** Font faces and deck.gl font atlases, MapLibre glyphs, emblem, icon and media textures all load asynchronously. A frame captured before they load shows fallback fonts or missing icons, and the editor preview may have them cached, so preview ≠ export.
  - **How a missing tile is recorded.** An errored or 404 tile is different from a pending one. Failures must be tracked per frame and mapped to Step ids so the message can name the Steps.
  - **What "Continuer" means.** Stop waiting for failed tiles for the rest of the render, and render the fallback background: `map-land-neutral` of the active Basemap, the same colour as the editor.
  - **The offline preflight.**
- **Fix:** replace "tiles loaded" with a **frame-readiness barrier** owned by `src/render`: `await renderer.ready(scene)` covers tiles, glyphs, `document.fonts`, texture atlases and media. The barrier reports `{pending, failed[]}`. Export owns the 20 s no-progress timer, the step-range aggregation and the "continue with fallbacks" flag. The fallback background colour comes from the Basemap style, identical in edit and export.

### F5 — Medium — Credit and Basemap fallback: where the state lives

- **UX:**
  - When a licence requires it, the credit is locked and only Position (4 corners, bottom-left by default) and Discrétion (Discrète/Lisible) change.
  - Otherwise the credit is **optional and unchecked by default**, with the same settings.
  - Map credit tokens are 18/24 px at 1080.
  - The frame shows the export, which implies the credit is visible in preview and Presentation.
  - If the satellite is unavailable, the app falls back automatically to the dark Basemap and "aucun élément du Projet n'est touché".
- **Spine AD-17:** the evaluator always emits a required credit, and the user changes only corner and prominence. The spine does not say:
  - Where corner, prominence and the optional-credit toggle are stored. They must be **Project data** (undoable Commands), not export-dialog state, because `evaluate(project, t)` would otherwise not know them and preview ≠ export.
  - How the credit text is composed when several sources require credit (satellite + OSM-derived basemap + CC BY dataset).
  - Whether the satellite fallback is a render-only substitution. If it is, the credit is still satellite's while the pixels are the dark Basemap. The export behaviour when the satellite is still unavailable is also undefined.
- **Fix:**
  - `project.credit = {corner, prominence, optionalShown}`.
  - The evaluator derives the credit text from every active source whose metadata has `creditRequired`, deduplicated.
  - The Basemap fallback is renderer state only (the Project keeps `satellite`), and the credit follows the **rendered** source.
  - Export with an unavailable required Basemap uses the same pause/warning flow as F4.

### F6 — Medium — Map text formatting uses an unspecified locale (AD-13 vs AD-20)

- **UX:**
  - The Horodatage shows "JJ mois AAAA" and scrolls month names.
  - The Counter shows "12 000 hommes" (locale grouping).
  - The Legend adds entries automatically (Factions, patterns, Token types).
  - The Map must not change with UI language (Map vs chrome, and AD-20).
- **Spine:** AD-13 gives "locale formatting (52 av. J.-C. / 52 BC)" without saying which locale. AD-20 says Map labels are data, but generated Map text (dates, numbers, auto Legend entries such as "Hachures") is not data typed by the user.
- **Divergence:** the evaluator or render may call i18next or the UI locale. The exported video would then change when the user switches UI language, and the same Project would render differently on two machines.
- **Fix:** add a Project-level `mapLocale` ('fr' | 'en'), defaulting to the UI language at creation. All Map-side formatting (HistoricalDate, numbers, generated Legend text) happens in `src/core` from `mapLocale` using core-owned string tables. `src/core` never imports `src/i18n`.

### F7 — Medium — Step time model is not defined in the core

- **UX:**
  - A Step is an entry transition followed by a hold.
  - The first Step has no entry transition ("sur la première Étape : pendant la première seconde du maintien").
  - Thumbnail width is proportional to hold duration.
  - A click on a thumbnail places the playhead at the start of the hold.
  - An edit made mid-transition snaps the playhead to the start of the arrival Step's hold.
  - Export range is "Étapes de … à …".
  - Progress shows "Étape 7 sur 10".
  - `Maj+←/→` moves by one image.
- **Spine:** `t` is in seconds and durations are in ms (Conventions). Nothing defines how `t` maps to Steps.
- **Divergence:** the Timeline UI, evaluator, export range, thumbnails, Presentation and aria-valuetext will each compute Step boundaries their own way. "One image" also has no fps outside export, because fps is chosen in the export modal.
- **Fix:** `src/core/timeline` owns these pure functions, and every consumer uses them:
  - `stepSpans(project) → [{stepId, transitionStart, holdStart, holdEnd}]`
  - `stepAt(t)`
  - `isInTransition(t)`
  - `rangeForSteps(a, b)`
  - Define the edit-mode frame step, for example 1/30 s or the Project's last export fps.

### F8 — Medium — Step thumbnails and Project-card thumbnails have no pipeline

- **UX:**
  - Each Step thumbnail is a Map preview.
  - Thumbnails recolour live when a Kit changes (UJ-2 climax).
  - The Accueil `project-card` shows the image of the first Step, and the Accueil loads from local storage with skeletons.
- **Spine:** AD-1 says thumbnails draw a Scene. There is no decision on:
  - which `t` a thumbnail uses (hold start? hold end?);
  - which renderer (a second WebGL context per thumbnail is not viable, since browsers cap contexts at about 16);
  - update cadence and invalidation;
  - whether the Project-card image is persisted. It must be, because the Accueil cannot evaluate and render every Project.
  
  AD-5 also memoises derived geometry by `(project.revision, stepId)`. Every Command bumps the global revision, so every Step's Territory unions are recomputed on each edit. Live thumbnails for all Steps then threaten NFR-2.
- **Fix:**
  - Thumbnails are rendered at `holdStart` (F7) by one shared offscreen renderer at a small canonical size (F1). They are queued, throttled while the user interacts, and use the frame-readiness barrier (F4) with a timeout.
  - The first-Step thumbnail is saved as a small blob with the Project snapshot in `src/persistence`.
  - Memoise derivation by input identity (Immer structural sharing of the relevant tracks) rather than the global revision.

### F9 — Medium — Gesture coalescing and the save-status contract

- **UX:**
  - A slider or colour drag is "un seul pas d'annulation", applied live.
  - The save status reads "Enregistrement…" then "Enregistré". A write failure shows "Non enregistré" in danger plus a banner.
  - There is no toast for autosave. "Projet sauvegardé" appears only after `Ctrl+S` ("confirmer la sauvegarde") or after the first save of a new Project.
  - Closing the tab during export triggers the native alert.
- **Spine:** "One user gesture = one Command" (AD-3) and debounced saves (AD-8). The spine does not say how a live drag applies many intermediate states yet produces one undo entry. Transient preview state outside the Project? `apply` with coalescing of the same `type` and target? Each team will choose differently, and the choice affects autosave (should it save mid-drag?) and `revision`-keyed memos.
  
  `src/persistence` has no status API, no `flush()` for `Ctrl+S`, and no `pagehide`/`visibilitychange` flush.
- **Fix:**
  - AD-3: live gestures use a **transaction**: `begin(gestureId)`, repeated `update`, then `commit` gives one undo entry. Intermediate states are applied to the working document but not pushed to history. Autosave is deferred until commit.
  - AD-8: persistence exposes `status: 'idle' | 'saving' | 'saved' | 'failed'`, `flush(): Promise`, flush on `pagehide`, and retry with backoff on failure.
  - The first-save and `Ctrl+S` toasts are driven by `flush()` resolving.

### F10 — Medium — Export encoder configuration and file retention (UX deferred item #2)

- **UX:**
  - 30 or 60 fps.
  - 16:9, 9:16 or 1:1 at 1080.
  - Encoder support is detected when the modal opens.
  - The file name is `{projet}-{format}-{date}.mp4`.
  - "Télécharger de nouveau" re-downloads the file already rendered, without re-rendering, "gardé en mémoire jusqu'à la fermeture de la modale" (an assumption the UX assigns to architecture). The alternative is `showSaveFilePicker`.
- **Spine:** AD-7 and AD-19 test `VideoEncoder` "for H.264 at 1080p". This is not enough. 1080×1920 at 60 fps exceeds H.264 level 4.0 (about 490 k macroblocks/s against a 245 k limit) and needs level 4.2 or higher. The support test must therefore run `VideoEncoder.isConfigSupported` with the **exact** codec string, dimensions and fps chosen, and fps is only known inside the modal. Nothing decides the Mediabunny target (in-memory buffer vs streamed) or the memory ceiling for long 60 fps exports.
- **Fix:**
  - Pin the codec strings (for example `avc1.640028` for 30 fps and `avc1.64002A` for 60 fps).
  - Re-test support when fps or format changes, and disable only the unsupported option.
  - Decide the retention policy: in-memory `Blob` held until the modal closes, released on close. Add a duration/fps threshold above which the app warns, or uses the `showSaveFilePicker` stream target where available.
  - Own the file-name slug rule in `src/export`.

### F11 — Medium — Map and canvas tokens must not come from CSS variables

- **UX:** DESIGN "Résolution des modes": `map-*` and `canvas-*` tokens are single-mode. `map-x` resolves by the **active Basemap** (`-sombre`, `-clair`, `-relief`; satellite uses `-sombre`), never by the UI theme. Canvas overlays use ink + halo only.
- **Spine:** Styling says tokens are CSS variables and no component hard-codes colours. AD-6 states the rule "the Map looks identical in both themes" but not the mechanism.
- **Divergence:** render developers following the Styling convention will read `getComputedStyle` variables. The Map then changes with the theme, and the export (a separate instance, possibly with no DOM theme) differs from the preview. Basemap-dependent resolution of `map-label` and `map-front` could also end up in render instead of in the Scene's "resolved styles".
- **Fix:**
  - `map-*` and `canvas-*` values live in a TypeScript module: map tokens in `src/core` (resolved into the Scene by `basemapId`), canvas tokens in `src/render`.
  - Render never reads CSS variables.
  - Add a test that renders the same Scene under both themes and requires identical pixels.

### F12 — Low — Font identity on the Map

- **UX:** Libre Baskerville and Source Sans 3 are embedded. Source Sans 3 is **provisional** and may be replaced. The Text panel offers a font choice. Counter and credit use the sans.
- **Spine:** fonts are self-hosted. Nothing covers:
  - MapLibre SDF glyph PBFs for the serif basemap labels, served from the data origin and versioned;
  - storing Map fonts in the document as stable font ids from a closed, versioned list;
  - the fact that swapping the provisional UI sans must not silently change the Counter and credit in existing Projects and exports.
- **Fix:** Map fonts are content. Keep a versioned `mapFonts` registry separate from the UI font tokens, store font ids in the Project, and pre-generate glyph PBFs in `pipeline/`.

### F13 — Low — Deleting a Step that elements start on

- **UX:** deleting a Step has no dialog, shows an undo toast, and later Steps inherit (FR-40). **Spine AD-4:** deleting a Step deletes its track keys. Neither says what happens to elements whose `existence.fromStep` or `untilStep` is that Step. The delete command and the evaluator could disagree (dangling ref vs element removed). **Fix:** rebind `fromStep` to the next Step (or delete the element if none remains) and `untilStep` to the previous Step, all inside the same compound Command.

### F14 — Low — Commands that need asynchronous data

- **UX:** changing the Date de référence converts orphaned Territories to Drawn Zones (FR-6). Conquest applies to painted Entities. Upgrading data versions is a Command.
- **Spine:** `apply` is pure and synchronous (AD-3) but does not state that asynchronous data (geometry for the conversion, new dataset versions) is resolved by the shell **before** dispatch and carried in the payload. Some teams would otherwise fetch inside reducers.
- **Fix:** add one sentence to AD-3.

### F15 — Low — Where UI preferences are stored

- **UX:** Timeline height and the collapsed state are "mémorisés localement". The theme follows the system on first launch. The "Plus d'options" state is kept per session.
- **Spine AD-8:** settings live in Dexie. An async Dexie read at boot causes a theme flash, and Timeline height is not "settings".
- **Fix:** allow localStorage for non-content UI preferences (theme, Timeline height, panel state), read synchronously at boot. Consent stays in Dexie.

### F16 — Low — Deleting a Project from the Accueil with an undo toast

- **UX:** the Project is deleted for good only when the toast closes. **Spine:** silent on how this is persisted. **Fix:** a soft-delete flag in `src/persistence`, purged when the toast is dismissed or at the next startup. It is also refused while another tab holds the lock (F3).

### F17 — Low — Presentation start prefetch

- **UX:** a black screen plus "Chargement de la Carte…" until tiles for the first seconds have loaded (10 s at most). **Spine:** the Conventions line says Presentation start waits for tiles but gives no mechanism. MapLibre has no public API to prefetch a future camera path.
- **Fix:** Presentation runs the F4 readiness barrier on sampled Scenes over the first N seconds using the export-style offscreen instance to warm the HTTP cache. Stop at 10 s, then play.

## Verified as consistent (no action)

- Undo coverage: Map, Timeline, Kits and Project parameters. Export, Settings and Project File import are excluded. History does not survive a reload (AD-3).
- "Appliquer à toutes les Étapes" writes the first existing Step and clears later keys; one Command, one undo (AD-4).
- Accent never appears on the Map, editing affordances go in a separate overlay excluded from capture, and the Map is identical across themes (AD-6). The mechanism gap is F11.
- Required credit is locked, with only corner and prominence adjustable (AD-17). The storage and fallback gap is F5.
- No automatic takeover when the lock holder closes (AD-15).
- Mobile blocking message, 1366×768 minimum, Chrome/Edge primary, Firefox best effort (AD-19).
- Tiles never block editing (Conventions, "Async & loading").
- Map labels are not translated with the UI (AD-20). The generated-text gap is F6.
