// Browser capability gate (AD-19, NFR-4, UX-DR135, UX-DR148): what the app needs before it renders.
// The rules are pure; `readEnvironment` is the only part that touches the browser.

/** A capability without which OPENMAP cannot run (AD-19). `navigator.storage` is not one. */
export type Capability = 'webgl2' | 'indexedDB' | 'webLocks'

export interface BrowserEnvironment {
  readonly webgl2: boolean
  readonly indexedDB: boolean
  readonly webLocks: boolean
  /** `navigator.storage` exists. Not blocking: Settings → Storage then says « Information indisponible ». */
  readonly storage: boolean
  /** The primary pointer is coarse (a finger): `(pointer: coarse)`. */
  readonly coarsePointer: boolean
  /** Viewport size in CSS px. */
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly userAgent: string
}

export type GateVerdict =
  | { readonly kind: 'desktopOnly' }
  | { readonly kind: 'unsupported'; readonly missing: readonly Capability[] }
  | { readonly kind: 'open' }

/** Below this width, a coarse pointer means a phone or tablet (UX-DR135). */
export const DESKTOP_MIN_WIDTH = 1024
/** The minimum layout width (NFR-8); a narrower window gets a warning banner (UX-DR148). */
export const LAYOUT_MIN_WIDTH = 1366
/**
 * The minimum layout height. NFR-8's 1366 × 768 is a screen: DESIGN.md (Layout & Spacing) measures
 * it as a 1366 × 648 viewport (Chrome maximised, Windows taskbar visible), so a lower viewport is short.
 */
export const LAYOUT_MIN_VIEWPORT_HEIGHT = 648

export function isPhoneOrTablet(environment: Pick<BrowserEnvironment, 'coarsePointer' | 'viewportWidth'>): boolean {
  return environment.coarsePointer && environment.viewportWidth < DESKTOP_MIN_WIDTH
}

export function missingCapabilities(environment: BrowserEnvironment): Capability[] {
  return (['webgl2', 'indexedDB', 'webLocks'] as const).filter((capability) => !environment[capability])
}

/**
 * What to show at start-up: a phone or tablet gets the "designed for a computer" page (even when a
 * capability is missing too: that page already says what to do), a browser missing a capability
 * the unsupported-browser page, anything else the app.
 */
export function gateVerdict(environment: BrowserEnvironment): GateVerdict {
  if (isPhoneOrTablet(environment)) return { kind: 'desktopOnly' }
  const missing = missingCapabilities(environment)
  return missing.length > 0 ? { kind: 'unsupported', missing } : { kind: 'open' }
}

/** Firefox is best effort (NFR-4): it opens with a warning banner on Home. SeaMonkey is not Firefox. */
export function isFirefox(userAgent: string): boolean {
  return /\bFirefox\//i.test(userAgent) && !/\bSeaMonkey\//i.test(userAgent)
}

/** The window is smaller than the minimum layout, in width or height (UX-DR148). */
export function isSmallWindow(viewportWidth: number, viewportHeight: number): boolean {
  return viewportWidth < LAYOUT_MIN_WIDTH || viewportHeight < LAYOUT_MIN_VIEWPORT_HEIGHT
}

export interface EnvironmentSource {
  readonly innerWidth: number
  readonly innerHeight: number
  readonly navigator: Pick<Navigator, 'userAgent'> & { readonly locks?: unknown; readonly storage?: unknown }
  readonly indexedDB?: unknown
  matchMedia?: (query: string) => { readonly matches: boolean }
  readonly document: { createElement: (tagName: 'canvas') => { getContext: (id: 'webgl2') => unknown } }
}

/** Runs one probe; a throwing probe gives `fallback` (fail closed). */
function probe<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    return fallback
  }
}

const present = (value: unknown) => value !== undefined && value !== null

/** Creates a throwaway WebGL2 context, then releases it so it does not count against the browser's limit. */
function hasWebgl2(source: EnvironmentSource): boolean {
  const context = source.document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null
  if (!context) return false
  probe(() => context.getExtension?.('WEBGL_lose_context')?.loseContext(), undefined)
  return true
}

/** Feature-tests the browser (AD-19). Every probe is guarded and fails closed: it never throws. */
export function readEnvironment(source: EnvironmentSource): BrowserEnvironment {
  return {
    webgl2: probe(() => hasWebgl2(source), false),
    indexedDB: probe(() => present(source.indexedDB), false),
    webLocks: probe(() => present(source.navigator.locks), false),
    storage: probe(() => present(source.navigator.storage), false),
    coarsePointer: probe(() => source.matchMedia?.('(pointer: coarse)').matches ?? false, false),
    viewportWidth: probe(() => source.innerWidth, 0),
    viewportHeight: probe(() => source.innerHeight, 0),
    userAgent: probe(() => source.navigator.userAgent, ''),
  }
}
