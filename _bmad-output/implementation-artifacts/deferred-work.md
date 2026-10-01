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
