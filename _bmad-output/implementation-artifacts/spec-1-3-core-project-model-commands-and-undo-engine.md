---
title: 'Story 1.3: Core Project model, Commands and undo engine'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_commit: 'bfe5dd6da8312e8dd4d3c11f75f4bd4c884fcd61'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No Project document or Command system exists, so no screen can create or edit a Project safely, undoably and deterministically.

**Approach:** Build in pure `src/core` the v1 Project model (Zod schema + committed JSON Schema snapshot + migration registry), the Command system (`apply` returning the new Immer document and its inverse), a history engine (multi-level undo/redo, `clear()`), and a dispatcher with a read-only mode, plus the first Project-level Commands. Epics.md Story 1.3 ACs (AD-2, 3, 4, 9, 12, 13, 24, 25) are binding.

## Boundaries & Constraints

**Always:** Core stays pure: no I/O, no clock, no ambient randomness (AD-2); ids and seed are generated outside `apply` and passed in, so apply and redo are deterministic. Every Command has an inverse and a unit test. Commands are `{type: SCREAMING_SNAKE, payload}`. Expected failures return `Result<T, DomainError{code, params}>`; only programmer errors throw. Domain names follow the spine glossary. `revision` increases on apply, undo and redo and never decreases. Dependencies pinned exactly: zod 4.6.x, immer 11.1.x, nanoid 6.0.x.

**Never:** No UI, persistence, i18n import or autosave (Stories 1.4/1.5). No Territories, Factions, Steps editing or Timeline Commands (later epics). No speculative fields beyond the AC list: later fields arrive through a new schemaVersion and migration (AD-9).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Blank Project | `{id, seed, name, mapLocale}` | v1 doc: schemaVersion 1, revision 0, referenceDate `{year:1900}`, basemap parchment with no adjustment overrides, outputFormat `16:9`, one Step, five Layers in order territories/arrows/tokens/texts/images, empty factions and members; validates against the schema | N/A |
| Apply → undo | any Command | undo restores a deep-equal doc except `revision`; revision went up twice | N/A |
| Redo after new Command | undo, then dispatch another Command | redo stack empty, `canRedo` false | N/A |
| Compound | `BATCH` of N Commands | one undo entry reverts all N | any invalid member → whole batch rejected, doc unchanged |
| Read-only | dispatcher read-only, dispatch/undo/redo | `DomainError{code:'read_only'}`, doc and history unchanged | N/A |
| Invalid payload | e.g. outputFormat `4:3`, month 13 | `DomainError{code:'invalid_payload'}`, doc unchanged | N/A |
| No-op Command | value equal to current | no history entry, revision unchanged | N/A |
| Schema drift | schema edited without new version + snapshot | `npm run test` fails with instructions | N/A |
| Newer document | `schemaVersion` > current | `migrate` returns `DomainError{code:'schema_too_new'}` | caller opens read-only (Story 1.4) |

**Decisions:**
- Default name: "Projet sans titre" / "Untitled project" in the UI language at creation; the UI passes it to `createBlankProject` (core has no i18n).
- Name rules: trimmed, 1–120 characters; an empty (after trim) or longer name is refused with `invalid_payload` and the previous name is kept.
- Reference-date year range: −10000 to 2100 inclusive, astronomical years (year 0 = 1 BCE).
- Undo depth: 100 entries; the oldest entry is dropped beyond that.
- Full spec kept (~1,700 tokens).

</frozen-after-approval>

## Code Map

- `src/core/index.ts` -- `export {}` today; becomes the public core API.
- `.dependency-cruiser.cjs:4,33-41` -- already allows immer, zod, nanoid, `@turf/*` in core; `tsconfig.core.json` -- ES2023, no DOM.
- `.oxlintrc.json` -- bans Date/performance/crypto/Math.random in `src/core/**`; nanoid internals are not flagged.
- `schemas/README.md` -- only file; snapshot goes here.
- `src/persistence/index.ts:14` -- `LanguagePreference 'fr'|'en'`; core must define its own `MapLocale` (cannot import adapters).
- `tests/guardrails/` -- add a violating fixture for the snapshot check (AGENTS.md rule).
- Not installed: zod 4 / immer / nanoid 6 as direct deps (only transitive zod 3, nanoid 3).
- Basemap ids `parchment | sombre | clair | relief`; adjustments (DESIGN.md:356-363): brightness −50..+50, saturation −100..+50, tint `#RRGGBB` + intensity 0..60; each stored as an optional override (absent = Basemap default).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add zod, immer, nanoid pinned; `schema:snapshot` script
- [x] `src/core/ids.ts` -- branded ids (`ProjectId`, `StepId`, `LayerId`…), `newId()` (nanoid) for the shell, deterministic id factory for tests
- [x] `src/core/result.ts` -- `Result`, `DomainError`, error codes
- [x] `src/core/dates/historical-date.ts` -- `HistoricalDate {year, month?, day?}` + validation (day-in-month, year −10000..2100)
- [x] `src/core/model/` -- types, Zod schema v1, `createBlankProject({id, seed, name, mapLocale, stepId, layerIds})`, `duplicateProject(project, newId)` (keeps seed)
- [x] `src/core/schema/` -- `CURRENT_SCHEMA_VERSION`, `migrate(doc)` registry (v1 identity), `validate`, `schemas/project-v1.schema.json` via `z.toJSONSchema`
- [x] `src/core/commands/` -- `apply(project, command)` → `Result<{project, inverse}>`; `SET_PROJECT_NAME`, `SET_OUTPUT_FORMAT`, `SET_MAP_LOCALE`, `SET_BASEMAP`, `SET_BASEMAP_ADJUSTMENTS`, `SET_REFERENCE_DATE`, `BATCH`
- [x] `src/core/history/` -- dispatcher: `dispatch`, `undo`, `redo`, `canUndo`, `canRedo`, `clear()`, `setReadOnly`, `reset(project)`, `subscribe(listener)`, `getState()`; depth 100
- [x] tests -- one unit test file per Command (apply + inverse), history matrix rows, determinism (same inputs → deep-equal output), snapshot test + migration test + violating fixture in `tests/guardrails/`

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then typecheck (core without DOM), lint (AD-2 bans), depcruise (core imports only pure libs), licences and all tests pass.
- Given `src/core`, when grepped, then it imports nothing from React, i18n, DOM or adapters, and calls no clock or ambient randomness.

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npx vitest run src/core tests/guardrails` -- expected: Command, history, schema snapshot and migration tests pass

## Implementation Notes

- Deps pinned: zod 4.6.5, immer 11.1.18, nanoid 6.0.1 (all MIT).
- Document shape v1: `{schemaVersion, id, seed, revision, name, mapLocale, outputFormat, referenceDate, map: {basemap: {id, adjustments}, members: {}}, steps: [{id}], layers: [{id, kind, hidden, locked}], factions: []}`. Adjustment overrides are `brightness`, `saturation`, `tintColor` (stored `#RRGGBB` upper-case), `tintIntensity`. Ids and the seed are 21-character nanoid strings.
- `apply` validates the Command with Zod, returns `{changed: true, project, inverse}` or `{changed: false, project}` (no-op), and bumps `revision` once per applied Command (a BATCH counts once). Undo/redo go through `apply`, so they bump it too.
- `SET_BASEMAP_ADJUSTMENTS` replaces the whole override set (`{}` = reset to the Basemap defaults); `SET_BASEMAP` keeps the overrides.
- `duplicateProject` keeps seed and inner ids, takes the new id and restarts at revision 0; renaming the copy is left to Story 1.4.
- Schema drift: `tests/guardrails/schema-snapshot.test.ts` compares `schemas/project-v<N>.schema.json` with the generated JSON Schema and checks a snapshot + migration exists for every older version. `npm run schema:snapshot` (vite `ssrLoadModule`) writes the current version's file only if absent and never overwrites a committed one. Zod refinements (day-in-month, unique Step/Layer ids, trimmed name via regex) are not all representable in JSON Schema, so a change to refinement logic alone is not caught by the snapshot.
- Review fixes: the random `newId` (nanoid) lives in `src/ui/ids.ts`; core only has branded ids, parsers and the deterministic id source. Names are 1–120 code points with no control character. BATCH nesting is capped at 16 (`invalid_payload` beyond), and a BATCH whose members cancel out is a no-op. Listener errors are isolated (`onListenerError`, default async rethrow). Snapshots are compared as parsed JSON; `src/core/testing/` may be imported only by tests (depcruise `core-testing-only-from-tests`).
- Undo/redo errors: `nothing_to_undo` / `nothing_to_redo` added to `DomainErrorCode` besides `invalid_payload`, `read_only`, `schema_too_new`, `invalid_document`.

## Spec Change Log

- Review row 7: `newId()` moves out of `src/core` to the shell (AD-2: no ambient randomness in core); core keeps branded id types, parsers and the deterministic test factory.

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge | Date with day and month 0/13 makes `daysInMonth` throw from apply/validate | high | Verified by reviewer; breaks Result contract (matrix row "month 13"). patch |
| 2 | edge | BATCH whose members cancel out records an entry and bumps revision | medium | Matrix: no-op adds no entry. patch |
| 3 | edge, blind | Listener that throws or re-dispatches breaks notification order / throws after commit | medium | `publish` iterates live set without isolation. patch |
| 4 | blind | Project names accept newlines and control characters | medium | Regex checks only ends; breaks cards and file names. patch |
| 5 | blind, edge | 120-character rule counts UTF-16 units (61 emoji accepted, wrong comment) | low | Direct fix: count code points. patch |
| 6 | edge, blind | Unbounded BATCH nesting → stack overflow instead of invalid_payload | low | Direct fix: depth cap. patch |
| 7 | blind | `newId()` (nanoid → crypto) lives in `src/core` | medium | AD-2 forbids ambient randomness in core; move to the shell. patch (spec task wording superseded, logged) |
| 8 | gap | `loadProject` with v2 / invalid v1 untested | medium | Pre-verified. patch |
| 9 | gap | Duplicate Step id rule untested | medium | Pre-verified. patch |
| 10 | gap, blind | Drifted/missing-migration fixtures do not drive their tests | low | Test injects its own text. patch |
| 11 | edge, blind | Snapshot compared as raw text (CRLF, Zod formatting) | low | Direct fix: structural JSON compare. patch |
| 12 | blind | `src/core/testing/fixtures.ts` importable by app code | low | Direct depcruise rule. patch |
| 13 | blind | `HistoricalDate` type not derived from its schema; handler rebuilds fields | low | Direct fix (`z.infer`, use parsed value). patch |
| 14 | blind | Refinement-only changes escape the snapshot check | medium | Real; needs a validation corpus. defer |
| 15 | blind | Invalid payload `params.path` empty for leaf Commands | low | UI maps `code` only; rejected |
| 16 | blind | `params.type` differs between schema and rule failures in BATCH | low | Cosmetic; rejected |
| 17 | edge | Revision overflow at MAX_SAFE_INTEGER | low | Unreachable in practice; rejected |
| 18 | edge | Missing snapshot directory throws | low | Loud failure; rejected |
| 19 | edge | Deterministic id counter overflow | low | Test-only helper; rejected |
| 20 | edge | Same listener subscribed twice is deduped | low | Not a supported use; rejected |
| 21 | blind | Status mismatch, 1.2 flipped to done, decisions in frozen block | false | Workflow sync at present step; owner accepted 1.2; decisions belong in frozen block |
| 22 | blind | Assorted coverage gaps (reset read-only, property test…) | low | No named harm beyond rows 8–9; rejected |
