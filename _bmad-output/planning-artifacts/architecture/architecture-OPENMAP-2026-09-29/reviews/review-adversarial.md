# Adversarial Review: ARCHITECTURE-SPINE (OPENMAP v1)

- **Reviewed:** `ARCHITECTURE-SPINE.md` (draft, 2026-09-29), checked against PRD §3 / §4.0 / §4 and EXPERIENCE.md
- **Lens:** attack the spine as an adversary. Build two units, one level down (epics), that each follow every AD to the letter and still build incompatibly. Each such pair is a hole that needs a new or tighter AD.
- **Date:** 2026-09-29

## Verdict

**Not ready to bind epics. Needs one tightening pass.**

The paradigm is strong: a pure evaluator, Commands, sparse tracks, derived geometry, one renderer split. It removes whole classes of drift (animation computed twice, stored front lines, live Kit links). But the spine fixes *mechanisms* and leaves the *shared data shapes* those mechanisms act on undefined. The weakest points are:

- how `t` maps to Steps;
- what a Territory is as an addressable thing;
- how overlapping surfaces are resolved;
- what the evaluator depends on besides `project`.

I built 14 compliant-but-incompatible pairs below. H1 to H8 are blocking: two teams would write code that cannot be merged, or the NFR-1 guarantee "preview = export" would quietly break. H9 to H14 are tightenings.

A proposed consolidated AD list comes at the end: 7 new ADs, 6 amendments.

---

## Blocking holes

### H1: Timeline clock is undefined (Timeline epic vs Camera, Territory transition, Text, Arrow, Export-range epics)

**Compliant build A (Timeline epic).** Each Step stores `transitionMs` and `holdMs`. Step *i* occupies `[hold_i, then transition out to i+1]`, so the transition belongs to the Step being left. Step 0 starts at t = 0 in its hold.

**Compliant build B (Camera epic).** Reads EXPERIENCE ("durée de transition de l'Étape", "début du maintien de l'Étape d'arrivée", Arrow "transition d'entrée"). Treats the transition as belonging to the *arriving* Step: Step *i* = `[transition_i, hold_i]`. The Fly-to for Step 3 therefore runs in the window before Step 3's hold.

**Clash.** AD-1 says only "`t` is timeline seconds". AD-4 defines state *at* a Step, not *between* Steps.

- Build A shows the Territory conquest one full transition *after* the camera arrived on the new frame. Every "calé sur la transition de son Étape" feature (Text typing FR-34, Arrow draw FR-28, Counter tween FR-36, DateDisplay scroll FR-37, Token glide FR-30, pulse FR-42) picks one of the two conventions per epic.
- Step 0 is also undefined. Does it have a transition (from what state: empty map, or its own state)? EXPERIENCE improvises "first second of the hold" for Arrows only.
- Export "plage d'Étapes 3→7" (FR-50): does it start at `start_3` (including 3's incoming transition) or at 3's hold?
- Playhead snapping ("début du maintien") and thumbnail `t` both depend on this too.

**Fix: new AD "Timeline clock".**

1. A Step owns its **incoming** transition. Step *i* occupies `[start_i, start_i + transitionMs_i + holdMs_i)`. `start_0 = 0`.
2. Step 0's transition animates from the **empty Map** (only the Basemap and elements whose existence starts at Step 0 at their creation-state), or `transitionMs_0` defaults to 0. Pick one and state it.
3. One pure function in `src/core/timeline`, `locate(project, t) → {prevStepId|null, stepId, phase: 'transition'|'hold', u ∈ [0,1], tInPhase}`, is the **only** mapping from `t` to Steps. It is used by the evaluator, the playhead UI, thumbnails and the export range. `stepStart(stepId)` is its inverse.
4. Every element animation is expressed as a sub-window of `u` inside the transition. For example, the pulse is the first `pulseMs` of the transition, then the switch. No element animation may take time from the hold, except declared hold-phase loops (Orbit, ambient effects).
5. Export range `[a..b]` = `[stepStart(a), stepEnd(b))`.

### H2: A Territory has no identity, but several features must reference it (Territory/conquest vs Pocket, Counter anchor, Token Series, auto-label epics)

**Compliant build A (Territory epic).** Follows AD-4: `owner` track on each GeoEntity/DrawnZone reference. Territory outlines are derived (AD-5), so there is no `Territory` object.

**Compliant build B (Selection epic, FR-18: "former un Territoire en sélectionnant…").** Creates `Territory {id, members[], owner track}` because the PRD says one *forms* a Territory. The ER diagram even labels `TERRITORY_MEMBER`, which implies a parent.

**Clash.**

- Pocket (FR-24) is "a Territory *marked* as Pocket": which record carries the flag?
- Counter "anchored to a Territory" (FR-36), Token Series "on the outline of a Territory" (FR-31) and the auto Faction label (FR-9) all need a stable id that survives Steps.
- Build A has only member ids and Faction ids. Build B has a `Territory.id` that disagrees with per-member owner tracks: a member conquered by another Faction is still listed in the old Territory.
- It is also unstated whether a GeoEntity with *no* member record is drawn (neutral fill) or invisible. The same question applies to "Neutre retire de tout Territoire".

**Fix: new AD "Territory identity".**

1. There is no stored Territory. `project.map.members: Record<MemberKey, Member>`, one record per GeoEntity ref (canonical key `dataset:entityId`) or DrawnZone id. Duplicates are impossible by construction.
2. The Territory of Faction F at Step S is `derive.territory(F, S)`. Its only address is `{kind:'territory', factionId}`, optionally with `componentHint: [lon,lat]` to pick one connected component.
3. Pocket is a Step track `pocket: boolean` on a **DrawnZone member** (a Pocket evolves by FR-19, so it must be a DrawnZone). It is not on a Territory.
4. A missing member ≡ `owner = null` at every Step. Whether neutral GeoEntities of the Region are drawn is a single Project setting read only by the evaluator.

### H3: Overlap precedence among surfaces is unowned (DrawnZone vs GeoEntity vs other DrawnZones vs AnnotationZone; Territory vs Front Line vs FR-44 conquest bar vs auto-framing)

**Compliant build A (Territory fill epic).** Draws GeoEntity fills, then DrawnZone fills on top. §4.0 "la Zone l'emporte" is satisfied visually by z-order.

**Compliant build B (Front Line epic).** Derives the front from each Faction's union of member geometries, per AD-5. It uses raw GeoEntity polygons, not ones clipped by DrawnZones. So the front line runs *under* a DrawnZone that a Faction painted over an enemy province (FR-21).

**Also.**

- Two DrawnZones of different Factions overlap (the attacker paints over a defender's zone). Nothing orders them.
- The conquest bar (FR-44 "part du territoire") would double-count overlaps.
- Auto-framing ("elements that change") and the Counter "centre de sa surface" each clip differently.

**Fix: new AD "Coverage partition".**

1. `derive.coverage(project, stepId, geodata)` returns a **planar partition**: disjoint polygons, each with exactly one owner or neutral. It is the *only* input from which fills, Front Lines, Pockets, Territory outlines, Counter and label anchors, the conquest bar and auto-framing are computed.
2. Precedence: DrawnZones override GeoEntities. Among DrawnZones, the later `z` wins, where `z` is a stored integer (default = creation order; free-paint strokes get `max+1`).
3. Rule for FR-21: one conquest paint gesture creates **one** new DrawnZone (one Command). It never mutates another Faction's zone.
4. AnnotationZones are outside the partition. They are overlays and never owners.

### H4: The evaluator's real inputs are not `(project, t)` (Library/geo-data epic vs Evaluator/derive memoization vs Export)

**Compliant build A (Library epic).** Fetches GeoEntity geometry asynchronously and caches it in the client (AD-12 refs are `{dataset, datasetVersion, entityId}`; the geometry is not in the Project).

**Compliant build B (derive epic).** Memoizes on `(project.revision, stepId)` exactly as AD-5 says.

**Clash.**

- `derive` runs before the geometry arrives, returns an empty Territory, and caches it under a revision that does not change when the data lands. The Territory stays empty until the next edit.
- Export waits for *tiles* (AD-7) but not for Library geometry, so the first frames are exported without Territories. That breaks NFR-1.
- A second hidden input is the output frame size. The auto-framing zoom (FR-46, "10 % margin") and screen-anchored overlays in "export px @1080" (AD-14) need the frame. Yet `evaluate(project, t)` has no frame parameter, and Presentation mode runs at window size.

**Fix: amend AD-1 and AD-5.**

1. The signature becomes `evaluate(project, t, ctx)`. Here `ctx = {geodata: GeoSnapshot, frame: {w,h} (= OutputFormat at 1080 reference)}`. `GeoSnapshot` is an immutable, versioned value built by `src/library`.
2. The memo key becomes `(revision, stepId, geodata.version, frameKey)`.
3. Export and Presentation start wait for `geodata.complete(project)` **and** tiles.
4. Presentation renders at the reference frame and scales or letterboxes the canvas. It never re-evaluates at window size, so the golden frame test is meaningful.

### H5: Undo, autosave, revision and the tab lock interact unsafely (Undo epic vs Autosave epic vs Multi-tab epic vs derive cache)

**Compliant build A (Undo epic).** AD-3 says "each applied Command increments `revision`". Undo is "not a Command", so it restores the previous document *including its revision*.

**Compliant build B (derive cache, AD-5).** Memoizes by revision.

**Clash 1.**

1. The user does Command X (rev 5 → 6).
2. Undo returns to rev 5.
3. The user does Command Y, which is different, and the revision is again 6.
4. The derive cache serves X's geometry.

**Clash 2 (AD-15 takeover).**

1. Tab A has an undo stack and is taken over by B.
2. B edits.
3. A takes back over by reloading from IndexedDB, but keeps its in-memory inverses.
4. A presses Ctrl+Z, which applies an inverse computed against a document that no longer exists. The file is corrupted.

**Clash 3 (autosave).** A debounced whole-document write that lands *after* the tab has lost the lock (release races the debounce) overwrites B's edit. AD-15 says "flush then release", but it does not say that writes are fenced.

**Fix: amend AD-3, AD-8 and AD-15.**

1. `revision` is strictly monotonic. Undo and redo apply inverse or forward Commands and **increment** it.
2. The undo stack is cleared on any lock loss, Project reload or Project File import.
3. Each IndexedDB write is a compare-and-swap on `(projectId, lockEpoch)`. `lockEpoch` is incremented by each takeover. Writes from an older epoch are dropped.

### H6: Camera framing is stored in an aspect-dependent form (Camera epic vs Output Format / export epic)

**Compliant build A (Camera epic).** FR-47 manual framing is stored as the Scene's own camera shape `{center, zoom, bearing, pitch}` (AD-1's Scene camera). All positions are in WGS84 (AD-14 satisfied).

**Compliant build B (Output Format epic).** FR-50 says a format change "recalculates framings to contain the same elements", and EXPERIENCE shows the toast "Cadrages recalculés pour 9:16 · Annuler". So it issues a compound Command that rewrites every Step's stored camera.

**Clash.**

- Auto-framing is *derived* (AD-5) and manual framing is *stored*. Build B mutates manual cameras (the user's zoom is lost, and the change is not idempotent: 16:9 → 9:16 → 16:9 ≠ the original).
- Another epic could instead re-derive the zoom at eval time. Both approaches are AD-compliant.
- Camera presets (Orbit, Sweep) also need to know whether they run in the transition or the hold (see H1).

**Fix: new AD "Camera intent".**

1. The document stores **framing intent**, never zoom: `CameraSpec = {preset, bounds?: [w,s,e,n], bearing, pitch}`. Manual framing is saved as the geographic bounds visible at the reference frame when it was set.
2. The evaluator derives `{center, zoom}` from `bounds + ctx.frame`.
3. `SET_OUTPUT_FORMAT` changes only `project.outputFormat`, and the undo toast undoes just that.
4. Presets move during the transition window and hold still during the hold, except Orbit, which is a declared hold loop.

### H7: Layers, visibility and z-order have two possible owners (Layers epic FR-56 vs Render epic AD-6 vs Export)

**Compliant build A (Layers epic).** Hidden and locked are view preferences, so they go in Zustand UI state (AD-3: "open panels … UI state"). Layer order is also UI state.

**Compliant build B (Render epic).** Renders "from the Scene only" (AD-6). The Scene has no z field, so it orders deck.gl layers by a hard-coded element-kind order.

**Clash.**

- Reordering Layers does nothing in export, or the renderer reaches into Zustand, which breaks the "Scene only" rule and the preview = export guarantee.
- A hidden Layer can be missing in Presentation but present in export, or the reverse.
- Within one Layer, the order of two Arrows is undefined. Where does the FR-49 personal map image ("par-dessus ou à la place du Fond") sit relative to Territories?
- Interleaved mode also means Basemap labels have a position (`beforeId`) that no AD fixes.

**Fix: new AD "Layer and z model".**

1. `project.layers: [{kind, visible, locked}]` is in the **document**, ordered, and changed by Commands (undoable, exported). Hidden = excluded from the Scene everywhere. Locked = honoured by UI tools only.
2. Each Scene drawable carries a `z = (layerIndex, elementZ)`. `elementZ` is a stored integer (default creation order). The renderer sorts only by it.
3. Fixed bands, top to bottom: screen overlays (Legend, date, titles, credit) → the ordered Layers → the personal map image (its own band, toggle above or below the Basemap) → Basemap labels → Basemap.
4. A locked credit (AD-17) can never be hidden by a Layer.

### H8: Existence ranges, tracks and Step operations disagree (element epics vs Timeline epic)

**Compliant build A (Arrow epic).** An Arrow created at Step 3 writes its initial points into `track[3]`. "Apply to all Steps" follows AD-4 literally: "writes the **first existing Step**", which is `steps[0]`.

**Compliant build B (Token epic).** Follows EXPERIENCE ("fixe la valeur sur l'Étape où l'élément existe en premier"), writes at `existence.fromStep` and puts initial values in the element default.

**Clash.**

- Build A writes values at a Step where the Arrow does not exist, and then it deletes later keys, including the creation key.
- Reordering Steps can put `untilStep` before `fromStep`.
- Deleting the Step that is some element's `fromStep` leaves a dangling id. AD-4 deletes *track keys* on Step delete but says nothing about *existence refs*.
- Duplicating a Step (FR-40) either copies all keys set at the source or none. Each epic will choose differently.

**Fix: amend AD-4.**

1. Creation writes initial values as the **element default**, never as a track key.
2. "Apply to all Steps" = set the default and delete all keys.
3. Existence is resolved by Timeline index: an inverted or empty range = not visible, not an error. Deleting `fromStep` moves it to the next Step. Deleting `untilStep` moves it to the previous Step. Both happen inside the same compound Command so undo restores them.
4. `DUPLICATE_STEP` inserts after the source and copies every track key set at the source, plus existence bounds that equal the source (define whether a range ending at the source extends).

---

## Tightening holes

### H9: Front Line identity and orientation (Front Line epic vs Token Series epic)

- A Token Series is "attached to a Front Line … on a chosen side" (FR-31), but Front Lines are derived with no id (AD-5), and a pair can have several disjoint fronts at one Step.
- One epic keys the Series by a `{a,b}` pair with side `left`. Another derives lines with arbitrary vertex order, so "left" flips between Steps and the Series jumps sides mid-transition.

**Fix (part of the Coverage AD).**

1. FrontLine address = `{pairKey, componentHint?}`, with `pairKey = sort(a,b).join('|')`.
2. Lines are oriented so that `pairKey`'s first Faction is on the left.
3. A Series stores `side: FactionId`, not left/right.
4. Interpolation between Steps resamples by arc length (see H10).

### H10: Who interpolates derived geometry between Steps (derive epic vs evaluate epic vs Territory transition epic)

- AD-5 memoizes derived output per Step. FR-19 zone morphing, FR-24 Pocket re-absorption, FR-31 Series redistribution, FR-36 Counter anchor drift and propagation (FR-39) all happen *between* Steps.
- Epic A morphs Front Lines in `derive`. Epic B cross-fades them in the renderer, which is forbidden by AD-1 but tempting for performance. Epic C draws a propagating fill whose edge is detached from the front line.

**Fix: amend AD-5.**

1. `derive` yields per-Step snapshots only.
2. All between-Step interpolation lives in `src/core/evaluate/interp`. It uses shared primitives: polyline arc-length resample, polygon morph with vertex-count normalisation, and point/angle easing.
3. During a propagation transition, the front line is drawn along the propagation edge (or explicitly held at the old front until `u = 1`). Pick one.

### H11: Organic Signature resolution across Factions (Kits epic vs Territory transition epic vs Arrow epic)

- The Signature is set per Project and can be overridden per Kit (FR-42). A province goes from Faction A (Signature `off`) to Faction B (`marquée`).
- The Territory epic uses the old owner's Kit (no pulse). The Front Line epic uses the pair's max. Neutral has no Kit.

**Fix: add to AD-11.**

1. The effective Signature of an element at a transition = the Kit of its owner at the **arriving** Step. For Territories, that is the new owner.
2. Neutral, and elements without a Faction, use the Project default.
3. Front Lines use the Project default.
4. Resolution is one function in `src/core`.

### H12: Kit, Faction, Legend and Relation data shapes (Kits epic vs Legend epic vs Relations epic)

**Name.**

- Faction has a name (Legend, auto label). `FactionKit` also has a "nom" (FR-12).
- Applying a Library Kit to an existing Faction ("Appliquer à {Faction}"): does it rename the Faction? Two owners of one display string.
- **Fix:** `Faction.name` is the only display name. `Kit.name` is catalogue metadata and never displayed on the Map.

**Legend overrides.**

- Legend entries are derived (AD-5), but renames and extra lines are stored. One epic keys renames by list index, another by Faction id.
- **Fix:** Legend entry key = `{kind, refId}`. Overrides are stored in `project.legend.overrides[key]` plus `extraRows[]` with ids.

**Relations.**

- One epic stores `{a,b}`, another stores `{b,a}`. It is unstated whether Relations vary per Step (alliances flip, for example Italy 1943).
- **Fix:** stored only as explicit overrides of the default rule, keyed by `pairKey` (H9). Say explicitly whether a Relation is a Step track. Recommendation: yes, a sparse track per AD-4.

**Sub-faction parent.**

- AD-11's `parentKitId` points at a Kit, but a Faction owns exactly one Kit.
- Deleting the parent Faction, or saving a Sub-faction to Personal Kits, leaves the reference dangling.
- **Fix:** the parent is referenced by `parentFactionId`. Deleting a parent, or exporting to a Personal Kit or Kit file, **flattens** the effective values into the child (a compound Command).

### H13: Media and asset references and their lifecycle (Import epic vs Personal Kits epic vs Project delete vs Project File export)

**Blob deletion.**

- Media are deduplicated by SHA-256 (AD-8), so a blob is shared by Projects and Personal Kits.
- The Project-delete epic deletes the Project's blobs, which breaks another Project that uses the same image.
- The Import epic writes the blob before the Command, then the user undoes, which leaves an orphan.

**Emblem references.**

- A Library Emblem inside a copied Kit is stored by one epic as a data-origin URL and by another as a media hash.
- A Project File is meant to be self-contained (FR-54 "médias inclus"). With the URL form, it depends on the network.

**Fix: new AD "Asset refs and media GC".**

1. `AssetRef = {kind:'media', sha256} | {kind:'library', path, version}`. Library assets use versioned, immutable paths (AD-12).
2. The Project File includes `media` blobs and, optionally, snapshots of Library assets.
3. Blobs are never deleted eagerly. A mark-and-sweep over all Projects and Personal Kits runs at startup or idle, after the undo toasts have expired.

### H14: Template instantiation, wizard and data-version pinning (Template/wizard epic vs Library-version epic vs FR-6 date-change and FR-11 correction epics)

**Wizard as Commands.**

- The wizard builds the Project as a series of Commands, so Ctrl+Z right after the wizard strips the Template's content.
- Another epic builds the document directly.
- **Fix:** `instantiateTemplate(template, choices) → Project` is a pure function. Project creation is not undoable, and the undo stack starts empty. Template element ids are **kept** (same seeds, so the preview thumbnail matches), and a new Project id is issued.

**Two sources of truth for data versions.**

- AD-12 puts `datasetVersion` on *every* ref **and** has the Project "pin" versions, so a Project can end up with mixed versions.
- A Template made months ago pins old data. Does the new Project pin the Template's versions or the latest?
- Geometry also depends on `referenceDate` inside a dataset version.
- **Fix:** refs are `{dataset, entityId}`. Pins live only in `project.dataPins[dataset]`, and the new Project inherits the Template's pins. `library.geometryOf(ref, pins, referenceDate)` is the single resolver (feeding `GeoSnapshot`, H4).

**Structural edits to GeoEntities.**

- The FR-6 date change converts vanished entities to DrawnZones. The FR-11 split and merge also change membership.
- Each epic will reinvent the conversion, and owner tracks may be lost.
- **Fix:** one core operation, `convertMemberToZones(memberKey, geometries[])`, copies the owner/pocket tracks and the existence range to the new DrawnZones and deletes the member, inside one compound Command. A geometry-only redraw is a Project override on the same key and keeps the tracks.

---

## Minor observations (no pair needed)

- The ER diagram shows `ACT }o--o{ STEP` (many-to-many). Acts are contiguous groups. Store `step.actId` (0..1) and state that Acts must be contiguous in Timeline order, or say what a non-contiguous Act means.
- Commands must carry `stepId` explicitly in their payload and never read the "current Step" from the UI. This is implied by purity; state it.
- DateDisplay: `stepDate` is optional. Define the scroll when an adjacent Step has no date (hold the previous value), and interpolation between different precisions (year vs day).
- Transparent PNG (FR-51) needs a Scene or render flag that removes the Basemap band (H7), not an ad-hoc renderer switch.
- Project delete with deferred removal ("suppression définitive à la fermeture du toast") sits outside the Command system. Name its owner (`src/persistence`) and what happens if the tab closes during the toast.

---

## Proposed AD changes (summary)

| # | Kind | Title | Closes |
| --- | --- | --- | --- |
| AD-21 | New | Timeline clock: Step owns its incoming transition; single `locate(t)`; animations are windows of `u` | H1, H6 (partly) |
| AD-22 | New | Territory identity: `members` map keyed by canonical ref; Territory address = Faction; Pocket on DrawnZone | H2 |
| AD-23 | New | Coverage partition with DrawnZone `z` precedence; sole input to fills, fronts, anchors, bars, framing; Front Line pair key and orientation | H3, H9 |
| AD-24 | New | Camera intent stored as bounds, zoom derived per frame | H6 |
| AD-25 | New | Layers and z in the document; Scene carries `z`; fixed bands | H7 |
| AD-26 | New | AssetRef union and media mark-and-sweep GC | H13 |
| AD-27 | New | Template instantiation and structural member conversion | H14 |
| AD-1 | Amend | `evaluate(project, t, ctx{geodata, frame})`; Presentation letterboxes the reference frame | H4 |
| AD-3 / 8 / 15 | Amend | Monotonic revision (undo increments); undo cleared on lock loss; write fencing by `lockEpoch` | H5 |
| AD-4 | Amend | Defaults at creation; apply-all = default; existence repair on delete and reorder; duplicate semantics | H8 |
| AD-5 | Amend | Memo key includes geodata and frame; interpolation only in `evaluate/interp` | H4, H10 |
| AD-11 | Amend | `parentFactionId`, flatten on delete or export; Signature resolution rule; `Faction.name` is the single display name | H11, H12 |
| AD-12 | Amend | Pins only at Project level; refs `{dataset, entityId}`; single `geometryOf` resolver | H14 |
