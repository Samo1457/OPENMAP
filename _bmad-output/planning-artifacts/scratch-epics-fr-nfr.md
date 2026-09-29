# OPENMAP — Requirements Inventory (scratch, for epics & stories)

Source: `prds/prd-OPENMAP-2026-09-25/prd.md` (authoritative), `prds/prd-OPENMAP-2026-09-25/addendum.md`, `briefs/brief-OPENMAP-2026-09-24/addendum.md` (secondary; PRD prevails). Items marked `[HYP]` are PRD hypotheses (§14). Priority tiers per PRD §10: P0 = validation slice, P1 = public launch, P2 = post-launch.

### Functional Requirements

**Step state model (§4.0)**

- FR-0 [P0]: Step state model rules common to all animated features `[HYP: default model, to confirm in UX]`: (a) Forward inheritance — a new Step starts from the previous Step's state; each element property (Territory ownership, DrawnZone points, UnitToken position, Counter value, ...) takes the value set at the most recent Step that defines one, at or before the current Step; (b) Edit scope — changing a property at Step N fixes its value at N, later Steps without their own value inherit it, earlier Steps are unchanged; user may alternatively apply a change "to all Steps"; (c) Existence — an element exists from the Step where it is created and persists afterwards unless limited to a Step range (FR-45); (d) Ownership — a GeoEntity belongs to exactly one Territory per Step; a DrawnZone laid over a GeoEntity wins where they overlap.

**4.1 Onboarding and Templates**

- FR-1 [P0]: User can create a Project from a Template or a blank Map, with no account; the Project is created and opened in the editor without sign-up/login, and appears in the Project list (FR-52).
- FR-2 [P0]: User can follow a start wizard: Template -> reference date -> Region -> Factions to feature. Max 5 screens; each screen skippable (Template values kept). On exit the Map has >= 2 Steps with >= 1 Territory change, Kits applied and the Legend visible, so playing the Timeline yields an animation with no further action. Each chosen Faction gets a copy of its Library Kit if one exists, otherwise a default Kit whose color is distinct from the Project's other Factions.
- FR-3 [P0]: User can filter Templates by Era, by type (one-off battle, campaign, long-term expansion, current geopolitics) and by text search; each Template shows a thumbnail (or animated preview), its Region and its reference date.
- FR-4 [P0]: Every Template-sourced element can be edited, moved or deleted; no element of a Template-based Project is read-only, including suggested Arrows and pre-filled Steps.

**4.2 Basemaps and geography**

- FR-5 [P0]: User can choose a stylized Basemap (parchment default, dark, light, relief) or satellite, and switch at any time. Switching modifies/deletes no Project element. Basemap brightness, saturation and a tint are adjustable (so semi-transparent Territories stay readable on satellite). Satellite = EOX Sentinel-2 cloudless mosaic, 2016 vintage (CC BY 4.0), hosted by OPENMAP; imagery predates later events (e.g. 2022 destruction). If satellite cannot be served, tool falls back to the dark Basemap and tells the user. Stylized Basemaps built from Natural Earth (public domain): coasts, rivers, lakes, relief, no modern roads.
- FR-6 [P0]: User sets the Project reference date (in wizard or later); the Map shows GeoEntities valid at that date. Accepts BCE dates, year precision. If data has no exact state at that date, the nearest valid state is used and the actual data date is displayed. Changing the reference date mid-Project requires confirmation; Territories built on GeoEntities that no longer exist at the new date are converted to DrawnZones.
- FR-7 [P1]: User can select subdivisions (provinces) where data contains them `[HYP: in v1 mostly Contemporary Era; elsewhere conquest via political entities, free paint FR-21 or split FR-11]`. When no subdivision exists for the Region + reference date, the tool says so and offers free paint or splitting.
- FR-8 [P0]: User can search a country, city or GeoEntity by name; the edit camera centers on it.
- FR-9 [P1]: User can show/hide cities, rivers and place names, and rename any label within the Project. A Territory can auto-display its Faction name, placed inside its area and re-centered when the area changes. Map labels display in the source-data language (mostly English), renamable per Project, and do not change with UI language. Generated map texts (DateDisplay dates, Counter numbers, automatic Legend entries) follow the Project's "map language" setting (French or English; defaults to UI language at creation). Place-name translation: post-v1.
- FR-10 [P0]: Tool shows the source and license of data used by the Project and includes the credit in exports where the license requires it. Every displayed Basemap, border dataset and Library item (Emblem, EventIcon, Template) has a viewable attribution. License-required credits (e.g. satellite: "Sentinel-2 cloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)") are locked in the export: user only picks corner and prominence (Discreet / Readable), with a short explanation. Optional credits can be hidden.
- FR-11 [P1]: User can redraw, split or merge a GeoEntity within the Project. The correction applies only to the Project, never to the Library; a corrected GeoEntity is flagged as such in the editor.

**4.3 FactionKits**

- FR-12 [P0]: User can create/edit a FactionKit: name, Era, colors (fill, outline, selection), Emblem and its reduced variant, font, border style (thickness, wobble intensity), Arrow style (thickness, head shape), UnitToken shape, Organic Signature settings (FR-42). Every field change applies immediately to all of the Faction's elements on all Steps of the Project.
- FR-13 [P0]: User can assign a Faction to a Territory, Arrow or UnitToken in one click; the element takes the Kit's style. Applying a Library Kit or a Personal Kit creates a copy in the Project. A later Library update never modifies any existing Project.
- FR-14 [P0]: User can create a SubFaction whose Kit inherits from a parent Kit of the Project. Non-overridden fields follow the parent when it changes; overridden fields keep their value. Editor shows which fields are inherited vs overridden and allows reverting to the inherited value. By default a SubFaction and its parent are allied (FR-22).
- FR-15 [P0]: User can search official Kits by name, Era or world region and apply them. Library Kits are never modified by the user; only the Project copy is edited.
- FR-16 [P1]: User can save a Project Kit to Personal Kits, apply Personal Kits in other Projects, and export/import them as a file. Editing a Personal Kit does not change Projects where it was already applied; pushing the update into a Project is an explicit action from that Project.
- FR-17 [P1]: User can fill a Territory with its Faction's Emblem (flag fill) with adjustable opacity. A conquered GeoEntity takes its new Faction's fill, flag included, during the transition.

**4.4 Territories, Relations and FrontLines**

- FR-18 [P0]: User can form a Territory by selecting one or more GeoEntities.
- FR-19 [P0]: User can draw a DrawnZone freehand or point by point, and edit its points at any Step. Between two Steps where its points differ, the DrawnZone morphs continuously during the transition.
- FR-20 [P0]: At a Step, user can designate an attacking Faction then brush-paint the GeoEntities it takes. Painted GeoEntities change Faction at that Step; the transition animates per FR-39. The number of selected GeoEntities is shown before validation.
- FR-21 [P0]: In conquest mode, user can free-paint an area independent of GeoEntities; it is added to the attacking Faction's Territory as a DrawnZone.
- FR-22 [P0]: User can set the Relation between two Factions: in conflict, allied, or unrelated. Defaults: two non-neutral Factions with no parent/child link are in conflict; a SubFaction and its parent are allied; a neutral Territory is never in conflict. A Template can set other Relations (e.g. "Alliances": no Factions in conflict).
- FR-23 [P0]: Tool displays a FrontLine between Territories of two Factions in conflict, with adjustable style. Recomputed automatically on every Territory change, with no manual drawing. User can hide it for the whole Project or for a Faction pair.
- FR-24 [P1]: User can mark a Territory as a Pocket (distinct style). Its area evolves between Steps per FR-19; the Pocket disappears when the user deletes it at a Step (it shrinks away during the transition) or when its area becomes zero.
- FR-25 [P0]: User can fill a Territory solid, semi-transparent, hatched, or with the Emblem (FR-17). A neutral Territory has a default style distinct from any Faction.
- FR-26 [P2]: User can draw an AnnotationZone (free color, no Faction) and give it a Legend entry.
- FR-27 [P2]: User can keep a past Step's FrontLine visible in later Steps as a FrontTrace labeled with its date.

**4.5 Arrows, UnitTokens and EventIcons**

- FR-28 [P0]: User can draw a curved Arrow by points; it draws itself along its path during the Step transition. By default the Arrow takes its Faction's style; thickness is adjustable, including very wide for breakthroughs.
- FR-29 [P2]: User can create ArrowCategories (name, color, style) independent of Factions and assign them to Arrows; each used ArrowCategory appears in the Legend.
- FR-30 [P0]: User can place UnitTokens with an optional label, and move and rotate them between Steps. Shapes: simplified NATO-type symbol, two-tone square, round flag badge, mini-flag. A Token moved/rotated between two Steps slides and pivots during the transition. Label can be boxed (e.g. "7 C.", "Gal Bradley").
- FR-31 [P1]: User can create a TokenSeries attached to a FrontLine or a Territory outline, on a chosen side, with adjustable spacing and number of rows. When the FrontLine/outline changes at a Step, the series redistributes along the new path during the transition. [P2 sub-item] Row count can be linked to a Counter (more strength, more rows).
- FR-32 [P1]: User can place Library EventIcons (explosion, plane, parachute, smoke, battle, siege) or an imported image (e.g. commander portrait). Each icon has appear/disappear animations (default: appear with slight overshoot, disappear with fade). A plane can follow a path during a transition.
- FR-33 [P2]: User can circle a group of elements with a highlight ellipse or outline, and place numbered step markers.

**4.6 Texts, Legend, Counters and DateDisplay**

- FR-34 [P0]: User can add titles, labels and annotations with free font, size, outline, frame and position. By default a text appears with a kinetic typography animation (per character or per word) timed to its Step transition. [P2 sub-item] Curved text along a path (rivers, regions).
- FR-35 [P1] (with P0 minimal part): P0 = a minimal non-editable Legend (Factions present and their colors), required by FR-2. P1 = tool auto-generates a Legend from Factions, fill patterns, ArrowCategories, AnnotationZones and UnitToken types present; user can hide it, move it, rename entries and add lines. Adding a Faction to the Project adds it to the Legend with no manual action.
- FR-36 [P1]: User can place a Counter with a per-Step value, free orientation and a Faction; the value animates between Steps. A Counter can be anchored to a Territory, staying at the center of its area as it changes.
- FR-37 [P1]: User can show a DateDisplay that scrolls continuously between two step dates at the chosen granularity (day, month or year). Formats: YYYY-MM-DD, DD month YYYY, year only, or a free per-Step label (e.g. "Summer 1944") which replaces scrolling. BCE dates render in the chosen format (e.g. "52 BC" / "52 av. J.-C.").
- FR-38 [P2]: User can display a graphic scale bar (km/miles) and a compass rose.

**4.7 Timeline and animation**

- FR-39 [P0]: User can choose, per Step, the Territory transition: propagation, fade or sweep; default propagation. Propagation starts from the adjacent FrontLine; with no adjacent FrontLine (landing, island, new zone) it starts from a user-placeable point, else from the area's center.
- FR-40 [P0]: User can add, duplicate, reorder and delete Steps; each Step has a step date, a transition duration and a hold duration. A new Step starts from the previous Step's state (FR-0). Deleting a Step does not wipe values inherited by later Steps: they take the value from the preceding Step.
- FR-41 [P0]: User can play, pause, seek to any instant and set playback speed. Seeking to an instant shows exactly the frame that will be exported at that instant (NFR-1).
- FR-42 [P0]: Organic Signature applies by default to all animations, with three levels (off, light, strong) set at Project level and overridable per FactionKit `[HYP on bounds, calibrate in UX]`. Overshoot: at "light", motions and appearances overshoot final position by 5-15% of amplitude before settling; no animation is linear. Wobble: Territory borders deviate from their path by at most 0.3% of image width (~6 px at 1080p). Pulse: a Territory changing Faction pulses for 250-400 ms before switching. Determinism: the same Project produces exactly the same animation on every playback and on export. At "off": no overshoot, wobble or pulse.
- FR-43 [P1]: User can group Steps into named Acts; Templates propose "before / during / after" by default.
- FR-44 [P2]: User can enable RTS-style AmbientEffects: fog of war covering the Map and progressively lifting over revealed areas from Step to Step; conquest progress bar showing the share of territory controlled by each Faction.
- FR-45 [P0]: User can limit an element to a Step range; by default it persists to the end of the Timeline.

**4.8 Camera**

- FR-46 [P0]: User can choose a CameraPreset per Step; default auto-framing. Presets: Top-down (fixed camera, frame unchanged); Fly-to (continuous pan+zoom from previous frame to new frame); Orbit (slow rotation around frame center); Sweep (lateral sweep along the Region); Bounce (zoom out then zoom in to new frame, like a jump); Auto-framing (frame contains elements changing at this Step — Territories, Arrows, Tokens — with 10% margin; if nothing changes, keep previous frame). Camera move spans the Step's transition duration. [P2 sub-item] Optional motion blur on fast transitions.
- FR-47 [P0]: User can manually set camera position, zoom and rotation for a Step, replacing the Preset.

**4.9 Visual import**

- FR-48 [P0]: User can import images (PNG, JPG, SVG) via file picker or drag-and-drop, as positionable elements, as an Emblem, or as an EventIcon.
- FR-49 [P1]: User can import a map image and align it manually (position, scale, rotation, opacity), over or instead of the Basemap `[HYP: manual alignment only in v1, no automatic georeferencing]`.

**4.10 Export**

- FR-50 [P0]: User can export the Timeline, or a Step range, as MP4 in the Project's OutputFormat, 1080p at 30 or 60 fps `[HYP: 1080p max in v1, 4K later; no audio track]`. Export shows progress and is cancellable. No watermark `[HYP]`. OutputFormat is changed at Project level (16:9, 9:16, 1:1): texts, Legend and DateDisplay stay anchored to the same frame edge, and camera framings are recomputed to contain the same elements.
- FR-51 [P1]: User can export PNG or JPG of the Map state at any Timeline instant, with a transparent-background option for PNG.

**4.11 Projects, organization and telemetry**

- FR-52 [P0]: User finds their Projects on opening OPENMAP and can rename, duplicate or delete them.
- FR-53 [P0]: Project is saved locally continuously with no user action, within the NFR-5 delay. After tab close or crash, reopening restores the Project in its last saved state. Tool requests persistent browser storage; if refused, or if available space nears its limit, it warns and invites exporting a Project File.
- FR-54 [P0]: User can export a Project as a Project File (Kits and imported media included) and import it on another machine; a reimported Project File restores an identical Project, animation included.
- FR-55 [P0]: User can undo and redo actions over multiple levels.
- FR-56 [P1]: User can hide, lock and reorder Layers.
- FR-57 [P0]: User can toggle between Edit mode (free camera) and Presentation mode (Timeline camera, rendering identical to export).
- FR-58 [P0]: On first launch the user accepts or refuses anonymous usage statistics and can change their mind at any time. Without consent, no usage data is sent and no stats request is emitted. With consent, only usage events are sent (Project creation, export, feature usage) — never Project content or imported media. Stats go to a server operated by OPENMAP (self-hosted Umami), never a third-party service. Withdrawing consent erases the anonymous identifier from the browser.

### NonFunctional Requirements

- NFR-1 Fidelity: Export reproduces Presentation mode exactly — same elements, positions, durations, same Organic Signature (FR-42 determinism).
- NFR-2 Smoothness: Preview runs at >= 30 fps on the reference machine for a typical project (200 Territories and 50 UnitTokens visible). Reference machine: 4-core CPU, 16 GB RAM, 2022 integrated GPU (Intel Iris Xe class). `[HYP]`
- NFR-3 Export time: A 60 s 1080p/30 video exports in <= 3 minutes on the reference machine. `[HYP]`
- NFR-4 Browsers: Recent desktop Chrome and Edge supported; Firefox best-effort. On mobile/tablet, a message explains the tool is designed for desktop. `[HYP, tied to browser video-encoding APIs]`
- NFR-5 Persistence: Any change is persisted locally within <= 5 seconds. `[HYP]`
- NFR-6 Privacy: No Project content or imported media leaves the user's machine. Downloads only: map tiles and Library data, from OPENMAP servers only. Uploads only: anonymous usage stats if consented (FR-58). No third-party service (fonts, maps, error tracking) is contacted during use.
- NFR-7 Time to first animation: Via the wizard, the FR-2 Map is obtained in < 2 minutes `[HYP]`. Nested time targets: 2 min first animation (NFR-7), 15 min first export (SM-2), 20 min finished Short (UJ-1).
- NFR-8 Screen: From 1366x768 upward, no essential panel is hidden and no horizontal scrolling is required. `[HYP]`
- NFR-9 Progressive disclosure: By default each panel shows only essential settings; advanced settings sit behind a "more options" action (addresses R1, SM-C1).
- NFR-C1 Licensing (§5): Code is closed-source for now (Q1). Only permissively licensed data (public domain, CC0, CC BY, MIT, Copernicus terms) enters the Library and Basemaps. NC and copyleft (GPL, ODbL, CC BY-SA) data are excluded from v1: no OpenStreetMap tiles, no CC BY-SA Copernicus mosaics. Retained sources: Cliopatria (CC BY 4.0) for historical borders, Natural Earth (public domain) for stylized Basemaps and current borders, EOX Sentinel-2 cloudless 2016 (CC BY 4.0) for satellite. Only permissive building blocks, to keep both open/closed paths possible.
- NFR-C2 Attribution: Every Library item carries its source and license (FR-10); license-required credits are locked into exports.
- NFR-C3 Emblem licensing: No Emblem (flag/coat of arms) enters the Library without a verified license; the three brainstorm-identified flag sites are unverified and unusable as-is.
- NFR-C4 No false precision: Historical borders are approximate; the tool displays the actual data date (FR-6) and lets the user correct data per Project (FR-11).
- NFR-C5 Neutrality: For disputed territories (current events included), the Library follows its source without taking sides; users remain free to depict the situation as they wish in their Project.
- NFR-C6 Content production: Official Templates and Kits are produced with the OPENMAP editor itself. Launch minimum: 2 Templates per Era plus the Kits of their Factions; target ~5 Templates and 10 Kits per Era `[HYP]`. Likely the largest v1 workload for a solo developer — estimate before fixing a launch date (Q5).
- NFR-C7 No watermark / free v1 (§8): v1 is free and watermark-free `[HYP]`; no monetization in v1.
- NFR-C8 Monetization constraint & cost cap (§8): Build nothing (data, licenses, providers) that would forbid future commercial use; no uncapped recurring cost. Hosting cap: 20 EUR/month beyond the server already paid by the project owner (current extra cost: 0 EUR); raisable only by explicit decision on success (topology: architecture AD-18).
- NFR-C9 No backend accounts (§4.11, §9): No accounts, cloud save, collaboration or online sharing in v1; everything lives in the browser, the Project File is the backup/transfer mechanism.
- NFR-C10 Platform & i18n (§7): Desktop web app only (no mobile/desktop app). UI in French and English from v1. Default aesthetic: Organic Signature + parchment Basemap; UI chrome stays sober in v1 (RTS UI skin is v2).
- NFR-C11 Validation plan (§12): Once the P0 slice is ready, have 3-5 geopolitical content creators use it on a real topic of their choice, observing blockers and customizations. Go criterion: >= 2 state they would use it for a real video instead of their current method; otherwise revisit differentiation (R2) before starting P1 `[HYP on threshold]`.
- NFR-C12 Success metrics (§11) — SM-1 measured by manual monitoring; SM-2..SM-8 measured by anonymous telemetry (FR-58) over consenting users only; "user" = a browser `[HYP on all numeric targets]`. Telemetry events must therefore support computing:
  - SM-1 Spontaneous adoption: >= 10 distinct creators publishing OPENMAP-made content and mentioning it unsolicited within 6 months of public launch (manual).
  - SM-2 Time to first export: median first-open -> first-export < 15 min (validates FR-2, FR-50).
  - SM-3 Completion rate: >= 40% of created Projects reach at least one export.
  - SM-4 Return: >= 25% of users export at least twice on different days within 30 days.
  - SM-5 Kit reuse: >= 20% of exported Projects use a Personal Kit already used in another Project (validates FR-16).
  - SM-6 Template customization: >= 60% of Template-based exports where the user modified >= 1 Kit or added >= 1 Step (validates R1).
  - SM-7 Organic Signature kept: >= 70% of exports with Organic Signature active (validates FR-42).
  - SM-8 Data signal: share of Projects using data correction (FR-11); tracked, no target.
  - Counter-metrics (do not optimize): SM-C1 settings exposed by default (contain, NFR-9); SM-C2 raw visits/Projects created (vanity); SM-C3 average session length.
- NFR-C13 Satellite fallback (R4): If retrieval/hosting of the EOX 2016 mosaic is not confirmed, the P0 slice ships without satellite, using the dark Basemap.

### Brief addendum notes

- FactionKit colors include a hover/selection state; Kit metadata distinguishes official (Library) vs personal, with search tags for name / period / region (supports FR-12, FR-15, FR-16).
- SubFaction inheritance example for AC: parent "Allies" defines base style; children "France"/"UK"/"USA" override color/Emblem; changing the parent propagates except explicitly customized fields (FR-14).
- Default element animations: Territory pulses "heartbeat-like" before switching color (never a hard pop/disappear); Arrow draws live like a pen stroke; UnitTokens appear with slight overshoot; captions use kinetic typography timed to the narrative (FR-28, FR-30, FR-34, FR-42).
- DateDisplay time granularity (day/month/year) is set manually by the user — no automatic detection, whether from a Template or from scratch (FR-37).
- Templates carry a predefined starting scale/zoom, pre-positioned key dates, a pre-filled 3-act structure ("mad-lib" style), blank Territories ready to assign to a Kit, suggested Arrows and placeholder labels — all editable, never locked (FR-2, FR-4, FR-43).
- Template library categorization = Era + content type (one-off battle / military campaign / long-term expansion / current geopolitics) + search tags (FR-3).
- Nothing in a Template is locked: adding/removing Territories, changing Basemap, or fully replacing it with an imported personal map are all allowed (FR-4, FR-5, FR-49).
- Edit mode is a free canvas with Figma-like zoom/pan; Presentation mode is driven by the automatic camera (FR-57).
- Layers organize Territories / Arrows / texts / icons separately (FR-56).
- Export supports a selectable Timeline range for video and a frozen image at any Timeline point; SVG export and multi-resolution (4K) listed in the brief are out of v1 per PRD (FR-50, FR-51).
