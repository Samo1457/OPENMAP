---
title: 'Story 1.2: Visual identity, themes and languages'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_commit: '5ee9652f93b52e1e9330b00f37364ba0fa839dbc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-OPENMAP-2026-09-29/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app still wears the default shadcn look, has no fonts, no theme and no languages, so every later screen would be built on the wrong foundation.

**Approach:** Implement the DESIGN.md design-system layer (chrome tokens with light/dark values, mono tokens, type, spacing, radius, elevation, hit-area, focus ring), self-host the fonts, add a System · Light · Dark theme persisted in a Dexie `preferences` table, and add i18next `fr`/`en` with instant switching and a CI check for missing keys. Epics.md Story 1.2 ACs (UX-DR1–28, 102, 150, 151, 153) are binding.

## Boundaries & Constraints

**Always:** Token values copied from DESIGN.md frontmatter (`:17-265`) and the resolution rule at `:294`; shadcn variables mapped per `DESIGN.md:326`; every UI string is an i18next key present in both `fr` and `en`; fonts served from the app origin (AD-16); preferences only through `src/persistence/index.ts` (AD-8, no localStorage); Map colours never come from CSS tokens (AD-6).

**Never:** No Settings dialog, Home or Editor shell (Stories 1.4–1.6). No Project data in Dexie yet (Story 1.4). No `mapLocale` logic (Story 1.3). No CDN or Google Fonts request. Never use `accent` in a `map-*`/`canvas-*` value.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch, OS dark | no stored theme, `prefers-color-scheme: dark` | dark tokens applied before first paint of content | N/A |
| User picks Light | stored `system`, OS dark | light tokens at once, stored `light`, survives reload | N/A |
| `system` and OS changes | stored `system`, OS switches | theme follows without reload | N/A |
| Switch fr → en | UI in French | every visible string in English at once, `<html lang>` updated, choice persisted | N/A |
| Missing key | key in `fr` not in `en` (or reverse) | `npm run test` fails naming the key | N/A |
| IndexedDB unavailable | Dexie open fails | app still renders with system theme and default language | choice not persisted; no crash |
| Contrast | every DESIGN.md text/control pair | ≥ 4.5:1 text, ≥ 3:1 border-input, focus-ring, act-rule, in both themes | test fails naming the pair |

**Decisions:**
- Theme and language controls: build "Apparence" (Système · Clair · Sombre / System · Light · Dark) and "Langue" (Français · English) as reusable components now, shown on a temporary placeholder screen (brand title "OPENMAP" plus the two controls, chrome styled with the tokens); Story 1.6 moves them into the "Réglages" dialog. Labels use the EXPERIENCE.md microcopy.
- First-launch language: French if `navigator.language` starts with `fr`, otherwise English; the stored choice wins afterwards.
- Full spec kept (~1,800 tokens).

</frozen-after-approval>

## Code Map

- `src/index.css` -- today shadcn neutral oklch defaults, `--radius .625rem`, `@custom-variant dark (&:is(.dark *))`; replace with OPENMAP tokens, keep the `.dark` class mechanism (mockups use it).
- `components.json` -- radix-nova, cssVariables, lucide, aliases `@/ui/...`; keep.
- `src/persistence/index.ts` -- only `flushPendingSaves()`; add the single Dexie database here so Story 1.4 extends it via version bumps.
- `src/i18n/` -- README only; resources go here.
- `src/main.tsx`, `src/ui/App.tsx` (returns null) -- mount providers.
- `index.html` -- `lang="en"` hard-coded; must follow the active language.
- `.dependency-cruiser.cjs` -- UI reaches persistence only via `index.ts`; core must not import i18n.
- `tests/e2e/smoke.spec.ts` -- asserts empty body text; update if a visible screen is added.
- Packages verified on npm: `@fontsource-variable/libre-baskerville` 5.3 (OFL, wght axis gives 600), `@fontsource-variable/source-sans-3` 5.3 (OFL), `dexie` 4.4.6 (Apache-2.0), `i18next` 26.4.2, `react-i18next` 17.0.15 (MIT), `lucide-react` 1.49 (ISC).

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/theme/tokens.css` (imported by `src/index.css`) -- all chrome tokens (`:root` light, `.dark` dark), mono tokens, type, spacing, radius, elevation, hit-area, focus ring; shadcn variables mapped per `DESIGN.md:326` (unmapped ones: foregrounds → text-primary, secondary/muted → surface); no shadcn default left
- [x] `src/ui/theme/tokens.ts` -- the same values as typed data for tests (single source: CSS generated or asserted equal)
- [x] fonts -- add the two Fontsource variable packages, import in `src/main.tsx`, font stacks from DESIGN.md; `label-caps`, tabular-nums utilities
- [x] `src/persistence/db.ts` + `index.ts` -- `Dexie('openmap')` v1 with `preferences` (`&key`); typed `getPreference`/`setPreference` for `theme` and `language`; errors never throw to UI
- [x] `src/ui/theme/ThemeProvider.tsx` -- resolves system/light/dark, toggles `.dark` on `<html>`, listens to `matchMedia`; inline script in `index.html` sets `.dark` before paint from `matchMedia`
- [x] `src/i18n/index.ts`, `src/i18n/locales/{fr,en}.json` -- i18next init, `setLanguage` updates `<html lang>` and persists; French strings use U+202F before `: ; ? !` and « » quotes
- [x] `tests/guardrails/i18n-keys.test.ts` -- fails on a key in one locale only (with a violating fixture)
- [x] `src/ui/theme/contrast.test.ts` -- WCAG ratios for every DESIGN.md pair in both themes, forbidden pair asserted below 4.5
- [x] `src/ui/settings/AppearanceControl.tsx`, `LanguageControl.tsx`, `src/ui/App.tsx` placeholder screen + `tests/e2e/smoke.spec.ts` update (body no longer empty) + e2e: theme follows emulated dark scheme, choice persists across reload, language switch changes text without reload
- [x] `licence-overrides.json`, `README.md` -- only if needed

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then all existing guardrails plus the new i18n and contrast tests pass and no request leaves the app origin.
- Given keyboard focus on any control, when it is focused via keyboard, then the 2px focus ring with 2px offset is visible; it does not appear on mouse click.

## Verification

**Commands:**
- `npm run check` -- expected: all green
- `npx vitest run src/ui/theme tests/guardrails/i18n-keys.test.ts` -- expected: contrast and key-parity tests pass

## Implementation Notes

- Pre-paint theme script is `public/theme-boot.js`, a blocking classic `<script src>` in `index.html` rather than inline, so the AD-29 CSP can forbid inline scripts. It applies the OS scheme and a provisional `lang`; a stored explicit theme is read from Dexie before React renders (capped at 1 s), so with a stored choice that differs from the OS, the empty body can show the OS theme for a moment.
- `map-*` colours live only in `tokens.ts` (typed data for the renderer/pipeline), never as CSS variables (AD-6); `tokens.test.ts` asserts no accent value in `map-*`/`canvas-*` and no Map colour in CSS.
- Tailwind theme reset: default colour palette, fonts, shadows and radii removed; only OPENMAP tokens (`*-om-*` utilities, shadcn names, `type-*`, `hit-area`, `control-disabled`, `numeric-tabular`, `icon-stroke`). Tailwind scans `src/` only.
- Tests: `tokens.test.ts` checks DESIGN.md frontmatter = `tokens.ts` = `tokens.css` (Vitest `css.include` lets `?raw` return the stylesheet text); `contrast.test.ts`; persistence tests with `fake-indexeddb` (dev, Apache-2.0) and without IndexedDB; e2e specs typed through a new `tsconfig.e2e.json` (DOM lib).
- `lucide-react` not added yet: no icon is drawn on the placeholder screen. UX-DR19's automatic `label-caps-tight` switch for rail labels waits for the tool rail (Story 1.5).

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge, blind | `start()` has no catch: any boot failure leaves a blank page | medium | `void start()` with no handler; i18next init or render throw → empty body. patch |
| 2 | edge, blind | SegmentedControl swallows Alt/Ctrl/Meta/Shift + arrows/Home/End | medium | `preventDefault` on any matching key; Alt+Left (Back) changes selection. patch |
| 3 | blind | Language option names lack `lang` (WCAG 3.1.2 AA) | medium | "English" read with French voice on a French page; UX-DR153 requires AA. patch |
| 4 | gap, blind | Keyboard wrap, Home, End untested | medium | Pre-verified: only one ArrowLeft press is tested. patch |
| 5 | blind | Scrim/opacity tokens exist only in TS, not CSS; not asserted against DESIGN.md | medium | UX-DR10 AC; `opacities` has no CSS variable or equality test. patch |
| 6 | edge | No tabbable radio when value matches no option | low | Direct fix (fallback index 0). patch |
| 7 | edge | `initI18n` re-run stacks `languageChanged` listeners | low | Direct fix (off before on). patch |
| 8 | edge | e2e helper leaks raw IndexedDB connections | low | Direct fix (`db.close()`). patch |
| 9 | gap, blind | French branch of the boot script untested | low | Cheap fr-FR variant of the boot test. patch |
| 10 | blind | Stale `initI18n` comment ("then switches") | low | Direct comment fix. patch |
| 11 | edge | theme-boot comment cites AD-29 for CSP | low | AD-29 is Library assets; direct comment fix. patch |
| 12 | blind | No `<meta name="color-scheme">` | low | Direct one-line fix. patch |
| 13 | blind | Persistence tests share state, order-dependent | low | Direct fix (clear table in `beforeEach`). patch |
| 14 | edge, blind | 1 s timeout silently drops a slow stored preference for the session | medium | Real on blocked/slow IndexedDB opens; fix adds late-apply logic. defer (with untested timeout, gap) |
| 15 | blind | Contrast pairs hand-listed; status/border-input on selection and playhead on lanes missing | medium | DESIGN.md does not list these pairs; adding them may expose design changes. defer |
| 16 | blind | Global focus ring can be overridden by shadcn `ring` utilities | maybe-false | No shadcn primitive installed yet; check when Story 1.6 adds one. defer (medium, unverified) |
| 17 | blind | UX-DR8 disabled pattern partial (no `text-disabled`, no disabled SegmentedControl) | low | No disabled control exists yet. defer |
| 18 | edge | ThemeProvider calls matchMedia unguarded | low | All AD-19 target browsers have matchMedia; rejected |
| 19 | edge | Home/End no-op writes | low | Negligible IndexedDB write; rejected |
| 20 | edge, blind | i18n check false positives (plurals, `?!`, URLs), null values | low | No such strings exist yet; loud failure; rejected |
| 21 | edge | tokens.test crashes instead of naming a missing token | low | Loud failure; rejected |
| 22 | edge | Optional catch binding in theme-boot.js | false | Supported by every AD-19 target browser |
| 23 | edge | Spec says inline script; code uses external file | false | Deliberate, recorded in Implementation Notes |
| 24 | blind | sprint-status vs spec status; 1.1 moved to done | false | Sprint sync happens at present step; 1.1 accepted by the owner |
| 25 | blind | theme-boot.js not content-hashed | false | Cloudflare Pages serves non-hashed files with `max-age=0, must-revalidate` |
| 26 | blind | Spec Change Log empty for lucide / label-caps-tight | false | Icon tokens exist; label-caps-tight auto-switch needs the rail (Story 1.5), noted |
| 27 | blind | Decimal comma rule not enforced | low | No numeric strings yet; rejected |
| 28 | blind | Tabs do not sync preferences | low | Not required by any AC; rejected |
| 29 | blind | package-lock missing from reviewed diff | false | Excluded for size; licence gate covers it |
