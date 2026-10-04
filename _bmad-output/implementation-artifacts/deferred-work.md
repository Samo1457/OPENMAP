- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-and-quality-guardrails.md`
  summary: Align the AGENTS.md MPL-2.0 policy line with the lightningcss override (build-time dependency of Tailwind 4 and Vite 8) or pick an alternative.
  evidence: AGENTS.md allows MPL-2.0 only for Mediabunny; licence-overrides.json adds lightningcss/lightningcss-* (MPL-2.0, unmodified, build-time only) required by the spine Stack.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-and-quality-guardrails.md`
  summary: Add guardrails for the rest of AD-1 (deck.gl `transitions` prop, CSS transitions/animations on Map content).
  evidence: Only MapLibre camera methods are banned by oxlint; AD-1 also forbids deck.gl transitions and CSS animation of Map content.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-and-quality-guardrails.md`
  summary: Add an e2e check that the app wires `installChunkReload` to window/sessionStorage once the first lazy chunk or autosave exists.
  evidence: No test fails if the `installChunkReload` call in src/main.tsx is removed.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-and-quality-guardrails.md`
  summary: Pin wrangler as a devDependency so the deploy tool sits under the lockfile and the licence gate.
  evidence: ci.yml runs `npx --yes wrangler@4.144.0`, whose transitive deps are neither locked nor licence-checked.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-and-quality-guardrails.md`
  summary: Mark the sandbox-only paths in AGENTS.md "Running and verifying" as such (or move them out).
  evidence: AGENTS.md hardcodes /opt/nvm/versions/node/v24.21.0/bin and /opt/pw-browsers/chromium, valid only in the cloud sandbox.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-visual-identity-themes-and-languages.md`
  summary: Apply a stored theme/language that arrives after the 1 s boot cap, and test the cap with an IndexedDB open that never settles.
  evidence: src/main.tsx withTimeout resolves undefined on a slow open; the stored choice is then ignored for the session; no test reaches the timeout branch.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-visual-identity-themes-and-languages.md`
  summary: Decide with UX whether status colours and border-input on `selection`, and playhead/act-rule on track lanes, need contrast guarantees, then add them to contrast.test.ts.
  evidence: contrast pairs are hand-listed from the DESIGN.md table, which does not cover these combinations.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-visual-identity-themes-and-languages.md`
  summary: When the first shadcn primitive lands (Story 1.6), make sure its focus-visible ring utilities do not override the UX-DR27 focus ring.
  evidence: The global ring is a base-layer box-shadow; stock shadcn components ship focus-visible:ring utilities (unverified until a primitive is installed).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-visual-identity-themes-and-languages.md`
  summary: Complete the UX-DR8 disabled pattern (text-disabled colour, disabled SegmentedControl, DOM test) with the first disabled control.
  evidence: control-disabled sets opacity and cursor only; no disabled control exists yet.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-core-project-model-commands-and-undo-engine.md`
  summary: Add a committed corpus of valid and invalid Project documents run through `validate`, so refinement-only schema changes (day-in-month, unique ids, name rules) also fail CI.
  evidence: The JSON Schema snapshot cannot express Zod refinements, so AD-9's drift check misses them.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-home-create-and-manage-my-projects-locally.md`
  summary: Prevent a Home rename/duplicate from being overwritten by an Editor tab open on the same Project (Story 1.14 lock, or a revision check in saveProject).
  evidence: Home edits save with the row's current lockEpoch, the same as the open Editor, and saveProject does not compare revisions.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-home-create-and-manage-my-projects-locally.md`
  summary: List Home cards from the row summary fields instead of loading and validating every whole document; index deletedAt for the start-up purge.
  evidence: listProjects runs migrate+validate on every document per Home load; cost grows with Map content.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-editor-shell-with-undo-redo.md`
  summary: Switch the Editor shell to read-only with a banner when another tab takes the Project (wire Dispatcher.setReadOnly to the lock), instead of letting edits fail as « Non enregistré ».
  evidence: Nothing calls setReadOnly for a live Project; Story 1.14 owns the lock and takeover banner.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-editor-shell-with-undo-redo.md`
  summary: Show « Projet sauvegardé » on the first save of a new Project, as EXPERIENCE.md's toast table says.
  evidence: Only Ctrl+S shows the toast today; no story AC carries the first-save rule yet.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-settings-dialog-and-browser-gate.md`
  summary: Add an e2e test that a schema upgrade from a second page makes the open app tab flush and reload (AD-9), covering the handler registration in main.tsx.
  evidence: Only the persistence unit test covers versionchange with its own handler; nothing loads main.tsx's registration.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-10-display-the-stylized-basemap-and-the-output-frame.md`
  summary: Epic 3 must reconcile ←/→ (previous/next Step, EXPERIENCE.md context 4) with the Map panning that the owner chose for the arrow keys in Story 1.10, and Epic 2 with arrow nudging of a selection.
  evidence: Story 1.10 owner decision: with the Map focused, arrows and ZQSD pan the edit camera; EXPERIENCE.md reserves ←/→ on the Map for Steps and arrows for nudging a selection.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-10-display-the-stylized-basemap-and-the-output-frame.md`
  summary: With a rotated edit camera (Shift+wheel) the minimum zoom and the vertical clamp ignore the rotated frame, so a blank band or a repeated Earth can show inside the frame.
  evidence: Edge-case and verification-gap reviewers; `minEditZoom(frame)` takes no bearing and `clampCenterLat` only keeps the centre inside the world. Rotation is rare today; fix before camera presets and Step framing (Epic 3) rely on rotated frames.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-12-search-for-a-place.md`
  summary: The search index in the Library cache is never revalidated: a corrected index published at the same `/library/v1/search/index.json` path is not picked up by browsers that cached the old one. Add a cache key or version bump (or a dataset version in the key) when the index is rebuilt for a new Natural Earth release.
  evidence: `src/library/search.ts` reads the cache first and never refetches (spec: « reads it from there ever after »); the cache key is the immutable path `library/v1/search/index`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-12-search-for-a-place.md`
  summary: The selection outline (`selection-halo`, `selection-ink` deck.gl layers and `MapView.setSelection`) is an edit overlay: Story 4.5's export path must not draw it into export frames, and the preview-vs-export golden test should cover a selected entity.
  evidence: The layers are added by `drawTerritories` in `src/render/map-view.ts` from UI state, not from the Scene; an export renderer that reuses that function would burn the outline into the video.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-12-search-for-a-place.md`
  summary: A Cliopatria entity whose main landmass crosses the antimeridian fits the whole world (its extent spans from near -180 to 180) when picked in the search.
  evidence: `mainLandmassBounds` takes the plain bounding box of the largest polygon; Cliopatria 0.2.0 polygons stay within ±180 but one that straddles the 180° meridian would need wrapped bounds (centre and span across the seam).
