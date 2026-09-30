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
