---
review: reconcile-prd
target: ../ARCHITECTURE-SPINE.md
sources:
  - _bmad-output/planning-artifacts/prds/prd-OPENMAP-2026-09-25/prd.md
  - _bmad-output/planning-artifacts/prds/prd-OPENMAP-2026-09-25/addendum.md
  - _bmad-output/planning-artifacts/briefs/brief-OPENMAP-2026-09-24/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/EXPERIENCE.md (cross-checked only)
date: 2026-09-29
---

# Reconciliation review: Architecture Spine vs PRD

## Verdict

**Sound, with gaps to close.** The spine covers the PRD well. It has one evaluator, determinism, sparse Step tracks, local-first persistence, a network boundary, licences and pinned data. Nothing in it breaks a P0 requirement outright. It says nothing on several points where two features built separately would each pick a different answer. The worst of these:

1. **Preview/export fidelity (NFR-1).** The spine does not cover the Basemap state or MapLibre's own label placement and fades, and it treats "tiles loaded" as the only sign that a frame is ready.
2. **Output Format changes (FR-50).** It does not say how manual camera frames are stored or what "px @1080" means.
3. **Telemetry.** The spine does not give the minimum data model needed to measure SM-2..SM-8.
4. **Map-content locale.** The Horodatage and Counters would change when the user switches the UI language.
5. **Cost ceiling (§8).** The PRD asked architecture to put a number on it. The spine does not.

The user's decisions (closed code, EOX 2016 satellite, Natural Earth stylized basemaps, VPS + Cloudflare, Umami) are accepted as given. Several PRD passages now need updating because of them (section D).

Severity scale: **critical** = a P0 requirement can't be met or two P0 features will surely diverge; **high** = likely divergence or an unmet PRD constraint; **medium** = plausible divergence, cheap to pin now; **low** = hygiene or PRD edits.

---

## A. Requirements the spine does not land (risk of divergence)

### A1. [high] NFR-1 fidelity: the Scene leaves out the Basemap state, and "frame ready" means tiles only
- **PRD:** NFR-1 says export reproduces Presentation mode exactly: same elements, same positions. FR-41 says scrubbing shows exactly the exported frame. FR-5 has Basemap brightness, saturation and tint. FR-9 lets the user show or hide cities, rivers and place names, and rename *any* label.
- **Spine:** AD-1 lists what the Scene contains (styles, geometries, camera, credits) but not the Basemap: which one, its adjustments, visible layers, label overrides. AD-6 has MapLibre draw the Basemap. That leaves the export instance (AD-7) and the edit/presentation instance free to configure MapLibre differently. MapLibre also has its own time and size behaviour, and AD-1's ban on MapLibre animation does not name it:
  - symbol fade-in (`fadeDuration`);
  - collision-based label placement that depends on canvas size and pixel ratio;
  - raster fade (`raster-fade-duration`).

  Presentation mode runs at viewport size and export at 1920×1080, so basemap labels will collide differently. Some place names will show in one and not the other.
- **Readiness:** AD-7 waits only for "all tiles loaded". Fonts (deck.gl glyph atlas), Emblem and imported images, and pattern textures can also still be loading when the frame is captured.
- **Fix:** add to AD-1/AD-6:
  - `Scene.basemap = {basemapId, dataVersion, adjustments, layerVisibility, labelOverrides}`. It is Project data and is applied by one `applyBasemap(map, scene.basemap)` in `src/render`.
  - MapLibre is created with `fadeDuration: 0` and raster fade 0.
  - Presentation mode renders at the Output Format's logical resolution (1080 short side), scaled to fit with CSS or pixelRatio. It never renders at viewport resolution.
  - Frame readiness is `tilesLoaded && fontsReady && imagesDecoded`.
  - The golden e2e test (Conventions → Tests) should compare basemap labels too.

### A2. [high] Output Format change (FR-50): manual camera frames and the "@1080" unit are undefined
- **PRD:** FR-50 says that on an Output Format change, texts, Legend and date display stay on the same edge, and camera frames "sont recalculés pour contenir les mêmes éléments". FR-47 stores manual position, zoom and rotation.
- **Spine:** AD-14 handles screen anchors. Auto-framing is derived (AD-5), so it recomputes. The spine does not say how a **manual** frame (FR-47) or a preset's target frame (fly-to, bounce, sweep) is stored. If it is stored as `{center, zoom}`, switching from 16:9 to 9:16 crops the sides, which violates FR-50. The camera tool may store zoom while the evaluator recomputes from bounds, and the two would diverge. "Offset in export px @1080" and "Map sizes in export px @1080p" are also ambiguous. It could mean the frame's short side (1080 in all three formats) or the height (1920 in 9:16).
- **Fix:**
  - Store manual frames as a geographic frame: `{center, extent in metres or degrees along the frame's short side, bearing, pitch}`. The evaluator turns it into zoom for the current Output Format.
  - Define "px @1080" as px relative to the output frame's **short side** = 1080.
  - Make the Output Format change a single Command (undoable, matching the EXPERIENCE toast "Annuler").

### A3. [high] Telemetry cannot measure SM-2..SM-8 as specified; the Umami tracker's defaults conflict with FR-58
- **PRD:** §11 says a "user" is a browser. SM-4 needs return visits on different days within 30 days. SM-5 needs a Personal Kit reused across Projects. SM-6 needs template-derived exports with a Kit modified or a Step added. SM-7 needs Organic Signature active at export. SM-8 needs data correction used. SM-2 needs time from first open to first export.
- **Spine:** AD-16 gives a closed allowlist of "event name + coarse enumerated properties" and forbids "ids that could re-identify content". Nothing in it produces a stable per-browser anonymous id. Umami's own session hash rotates, so it can't support SM-4 across 30 days. Nothing lists the derived flags, so each feature team will invent its own or skip them.

  The Umami tracker script also, by default:
  - loads from the telemetry origin and sends pageviews on its own (`data-auto-track`);
  - records URL, referrer, screen and language;
  - has the server derive country from the IP address.

  Loading the script before consent already contacts the endpoint, which contradicts FR-58's "sans accord, aucune donnée".
- **Fix:** add to AD-16:
  - an `installId` (random nanoid, created locally only after consent, deleted when consent is revoked, never derived from content);
  - a `firstOpenedAt` kept locally, and time deltas sent only as buckets;
  - the exact v1 event catalogue with its boolean flags: `export_completed{format, fps, duration_bucket, from_template, kit_modified, step_added, organic_level, personal_kit_reused, data_correction_used}`;
  - `src/telemetry` posts to the Umami `/api/send` endpoint directly. No Umami tracker script and no automatic pageviews. The telemetry origin is not contacted at all before consent.
  - IP geolocation off and logs not retained on the VPS.

### A4. [high] Map-content locale: the date display, BCE dates and Counter numbers follow the UI language
- **PRD:** FR-37 formats ("JJ mois AAAA", "52 av. J.-C."). NFR-1. Q4 separates UI language from Map label language.
- **Spine:** AD-20 says Map labels are data and "never change with UI language". AD-13, though, formats historical dates with locale formatting "52 av. J.-C." / "52 BC", without saying which locale. If the date display, Front Trace dates (FR-27), Legend dates and Counter separators ("12 000" vs "12,000") use the i18next UI locale, switching the UI to English changes the exported video. AD-20 exists to prevent exactly that.
- **Fix:** add `project.mapLocale` (default = UI language when the Project is created, editable in Project settings). Every string that ends up on the Map (dates, month names, numbers, units in FR-38) is formatted in `src/core` with `mapLocale`, never with the UI locale.

### A5. [high] Cost ceiling §8 / Q2 not recorded; tile caching not guaranteed; the zoom cap may break the operational scale
- **PRD:** §8 says no recurring cost without a decided ceiling, and its NOTE FOR PM says to put a number on the tile-hosting cost in architecture. Q2 asks "quel plafond mensuel ?". §4.2 says v1 covers the operational scale, "villes", and UJ-1 is a city siege (Marioupol) on satellite.
- **Spine:** AD-18 says any paid service needs an explicit decision, but it does not record:
  - the one it already made (VPS KVM 2 monthly price and bandwidth allowance, domain);
  - the monthly ceiling;
  - what happens when traffic exceeds it.

  Tiles are served as `/{tileset}/{z}/{x}/{y}` with no extension and no stated `Cache-Control` (only Library data is marked immutable). On the Cloudflare free plan, extensionless paths are **not** cached by default without a Cache Rule. Every tile request would then reach the VPS, and the cost and bandwidth model falls apart.

  Operations caps basemap disk at ≤ 70 GB "so zoom levels are capped per tileset", with no minimum. Global Sentinel-2 at city zoom (z13–z15) is far beyond 70 GB. The spine should state the max zoom it guarantees for satellite and stylized basemaps, and whether high zoom is regional. Otherwise UJ-1 (city siege, Pocket drawn by hand) may be impossible at P0.
- **Fix:** add to AD-18:
  - tile URLs carry a tileset version and a file extension (`/{tileset}@{v}/{z}/{x}/{y}.webp|.mvt`);
  - `Cache-Control: public, max-age=31536000, immutable`, plus a Cloudflare "cache everything" rule;
  - the ceiling written as a number (e.g. "fixed VPS €X/month; no usage-based charge");
  - the planned response to overload (rate-limit at the proxy; the app degrades to the existing tile-missing fallback);
  - a max-zoom table per tileset with a stated operational-scale guarantee (e.g. satellite z≤12 worldwide, z≤15 for listed Template Regions).

### A6. [medium] Satellite fallback (FR-5): it is not stated whether the fallback is render-only, or what happens to the credit and export
- **PRD / UX:** FR-5 and EXPERIENCE say that if satellite can't be served, the app switches to dark, says so, and "aucun élément du Projet n'est touché".
- **Spine:** silent. One team could implement the fallback as a Command that sets `basemap = dark`. Autosave would then persist it and the user's choice would be lost. Another team would implement it as render-time substitution. The locked credit is emitted from the *Project's* Basemap metadata (AD-17), so the export could show the Copernicus/EOX credit over a dark basemap, or the reverse.
- **Fix:** the fallback is a render-time substitution in `src/render`. `project.basemap` never changes. The Scene carries both `requestedBasemap` and `effectiveBasemap`. Credits are derived from what is actually drawn. Export refuses to start silently on a substituted basemap: it goes through the tile-missing warning.

### A7. [medium] Template instantiation, Project duplication and seeds: every user of a Template gets the same "organic" jitter
- **PRD:** §1 says the Organic Signature "rend un Template personnel sans effort". §5 says Templates and Kits are produced with the OPENMAP editor itself. FR-52 has Project duplication.
- **Spine:** AD-2 derives seeds from `element.id`. AD-10 keeps ids on reimport (correct for FR-54). The spine does not say what happens to ids when a Project is created from a Template or duplicated. If ids are copied, every Project from the same Template has identical jitter and pulses. The spine also doesn't define the Template's storage format (AD-9 names a "Library Template load" path only). The content pipeline and the wizard could invent different shapes.
- **Fix:**
  - A Template is an `openmap-project` document plus a `template` metadata block (Era, type, Region, referenceDate, thumbnail, licences), in the same container as AD-10.
  - Instantiation (and "Duplicate Project") remaps every id through one pure `remapIds(project)` in `src/core`, or adds a `project.seedSalt` generated at creation and mixed into every seed. Either works; pick one.
  - Reimport keeps ids and salt.

### A8. [medium] Licence metadata stops at "Basemap and dataset", while the PRD requires it on every Library item, and Kit copies drop it
- **PRD:** §5 says every Library item carries its source and licence. No Emblem is allowed without a verified licence. Flags come from Wikimedia Commons (PD or CC BY) and lipis/flag-icons (**MIT**).
- **Spine:** AD-17 attaches `{source, licence, attribution, creditRequired}` to Basemaps and datasets only. Its allowed-data list (PD, CC0, CC BY, Copernicus) leaves out MIT, so a strict reading refuses flag-icons. AD-11 says a Kit copy keeps provenance "never used for lookup". The Emblem's licence therefore has to travel **inside** the copy, or a CC BY Emblem's credit is lost. The spine also does not say whether Library Emblems and event icons are copied into the media store by hash or referenced by versioned URL. That choice decides whether FR-54 ("Kits et médias inclus", identical reimport) holds offline.
- **Fix:**
  - Extend licence metadata to every Library asset (Template, Kit, Emblem, EventIcon, dataset, Basemap) and add MIT to the allowed data licences.
  - When a Kit or Emblem is applied, copy the asset bytes into the media store (sha256), with its licence record, into the Project.
  - The credit derivation looks at every licensed asset visible in the exported range, not only Basemap and boundaries.

### A9. [medium] Overlap and ownership precedence is a PRD rule the spine never assigns to a single function
- **PRD:** §4.0 says a GeoEntity belongs to one Territory per Step, and a DrawnZone laid over an Entity wins where they overlap.
- **Spine:** AD-4 keeps ownership tracks and AD-5 derives outlines. Neither says where overlap is resolved: DrawnZone over GeoEntity, and two DrawnZones of different Factions. The Territory fill, Front Line (FR-23), Pocket, propagation origin (FR-39), label anchor (FR-9), Counter anchor (FR-36) and conquest bar (FR-44) each need the resolved map. If each one resolves overlap itself, they will disagree at the edges.
- **Fix:** add to AD-5 a single `resolveOwnership(project, stepId) → OwnershipMap` in `src/core/derive`. Rule: DrawnZone > GeoEntity; among DrawnZones, higher Layer order wins, then later creation. Every derived consumer reads only this map.

### A10. [medium] Step-range export contradicts the frame-time rule
- **PRD:** FR-50 allows exporting a range of Steps. FR-51 exports the image at any instant.
- **Spine:** AD-7 says "frame `i` is evaluated at `t = i/fps`", which only holds for a whole-Timeline export.
- **Fix:** `t = tStart + i/fps`, where `tStart` is the range's first Step start time from `stepTimes(project)` in core. Image export uses the playhead `t`.

### A11. [medium] Imported media: SVG safety and the network boundary
- **PRD:** FR-48 imports PNG, JPG and SVG. FR-54 imports Project Files from other machines. NFR-6.
- **Spine:** AD-16 lists the allowed origins but has no mechanism that enforces them. An imported SVG, or a shared `.openmap`, can hold scripts or external `href`s. Inlined into the DOM (thumbnails, Legend, Kit editor), it would run code or reach a third party.
- **Fix:**
  - Imported SVGs are only rendered as images (`<img>`/bitmap) or rasterized at import, never inlined.
  - Media hashes are checked on Project File import.
  - A Content-Security-Policy on Pages (`connect-src`/`img-src` limited to self, data origin, telemetry origin, `blob:`/`data:`) turns AD-16 into something the platform enforces rather than a convention.

### A12. [low] Neutrality (§5) and data-date resolution (FR-6) belong in the pipeline contract
- **PRD:** §5 says the Library follows its source for disputed territories. FR-6 says to use the nearest valid state and display the data's real date.
- **Spine:** AD-12 and AD-13 cover identity and dates. Natural Earth ships several "points of view" for disputed areas. If the pipeline picks one layer for boundaries and another for search or labels, the Map contradicts itself. "Nearest valid state" also needs one tie-break rule shared by the wizard's "Données les plus proches" and the renderer.
- **Fix:**
  - Record one default worldview per dataset in its metadata.
  - `resolveDataState(dataset, referenceDate) → {state, actualDate}` lives in `src/core` (nearest; ties → the earlier state).

### A13. [low] Third-party notices
- **PRD:** §5, §8 (keep future commercial use open). Closed-source distribution of MIT, BSD, Apache and OFL code still requires shipping their notices. MPL-2.0 (Mediabunny) requires telling users where the source is.
- **Fix:** add to AD-17: the build generates `third-party-licenses.txt`, linked from Settings → Sources et licences.

---

## B. Contradictions between the spine and the PRD

| # | Sev. | PRD | Spine | Resolution |
| --- | --- | --- | --- | --- |
| B1 | medium | §5: copyleft data including **ODbL** is excluded "until decision" | AD-17 allows OSM-derived ODbL tiles as a rendered Basemap (produced work) | This is a legitimate decision (a produced work stays commercially usable), but it is new. Record it as a decision and update PRD §5. Make sure no ODbL *database* (vector tiles holding OSM data) is ever shipped to the client; raster only. |
| B2 | low | FR-10: "l'option crédit dans l'export est activée par défaut" (implies it can be removed) | AD-17 + UX: a required credit is locked; only its corner and prominence can change | The spine and UX are stricter and correct for the licences. Update FR-10's wording. |
| B3 | low | FR-5 / FR-10 / addendum: satellite = Copernicus Sentinel-2, credit "Contains modified Copernicus Sentinel data [année]" | EOX Sentinel-2 cloudless 2016 (CC BY 4.0) | The credit must be EOX's full attribution ("Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)"). Put it in the Basemap licence record. Also update the PRD (D). |
| B4 | low | AD-17 permits "Copernicus terms" data | The chosen product is EOX CC BY | Harmless; add EOX-CC-BY explicitly so the licence check covers it by name. |

## C. PRD items checked and found landed (no action)

FR-42 determinism (AD-2). §4.0 forward inheritance (AD-4). FR-13/14/15 Kit copies and Sub-faction resolution (AD-11). FR-53/NFR-5 autosave ≤ 5 s + persistent storage (AD-8). FR-54 file format (AD-10). FR-55 undo (AD-3). FR-6 BCE dates (AD-13). NFR-4/8 browser gating (AD-19). NFR-6 base boundary (AD-16, refined in A3/A11). FR-57 Presentation mode = timeline camera (AD-1). The multi-tab issue the PRD does not raise (AD-15). Q1 (closed code), Q3 (Umami), and the Q4 UI-language half (AD-20) are answered. No-backend and no-account (§9) are respected. NFR-2 is covered by keeping a worker option open (Deferred).

Treated as product/UX, not architecture gaps: tone of voice, the NFR-9 progressive disclosure, the NFR-7 wizard timing, Template content volumes (§5/Q5), and the SM-1 manual watch.

## D. PRD updates required by the spine's (user-made) decisions

1. **FR-5, FR-10, R4, Q2, addendum "Fonds satellite"**: replace "piste Copernicus / mosaïque à produire" with EOX Sentinel-2 cloudless **2016**, CC BY 4.0, with EOX's credit. Record the consequence: imagery is from 2016, so contemporary scenes such as Marioupol 2022 (UJ-1) show the pre-war state. Also: acquisition (download vs harvest) is still open and blocks the satellite story. If it fails, P0 ships with the FR-5 dark fallback. Close Q2 with the ceiling from A5.
2. **§5 Licences + Q1**: Q1 is decided (closed code, may reopen after P0). State the resulting data policy: GPL and CC BY-SA data are still refused, and ODbL is accepted only as rendered basemap tiles (B1). Add MIT to data (flag-icons).
3. **§8**: replace the NOTE FOR PM with the figure recorded in AD-18 (fixed VPS cost, Cloudflare free, no usage-based cost).
4. **Q3**: answered (self-hosted Umami, opt-in, no tracker script; see A3).
5. **Q4**: UI in FR and EN; Map labels in the dataset's language, renamable, translation after v1 (AD-20). Add the new `mapLocale` for dates and numbers (A4).
6. **FR-10 wording**: the credit is locked (B2).
7. **Addendum "Stockage local"**: IndexedDB chosen, not OPFS (AD-8).
8. **Stylized basemaps**: say that the stylized Basemaps come from Natural Earth (plus OSM raster where allowed). Give the zoom limits that follow for the "opérationnel / villes" scale in §4.2 (A5).
