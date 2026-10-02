import { describe, expect, it } from 'vitest'
import { type BrowserEnvironment, type EnvironmentSource, gateVerdict, isFirefox, isSmallWindow, readEnvironment } from './capabilities'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0'

const SEAMONKEY = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0 SeaMonkey/2.53.20'

const desktop: BrowserEnvironment = { webgl2: true, indexedDB: true, webLocks: true, storage: true, coarsePointer: false, viewportWidth: 1366, viewportHeight: 648, userAgent: CHROME }

describe('gateVerdict (AD-19, UX-DR135)', () => {
  it('opens the app on a capable desktop browser', () => {
    expect(gateVerdict(desktop)).toEqual({ kind: 'open' })
  })

  it('shows the designed-for-computer page for a coarse pointer under 1024 px', () => {
    expect(gateVerdict({ ...desktop, coarsePointer: true, viewportWidth: 390 })).toEqual({ kind: 'desktopOnly' })
    expect(gateVerdict({ ...desktop, coarsePointer: true, viewportWidth: 1023 })).toEqual({ kind: 'desktopOnly' })
  })

  it('opens the app for a coarse pointer at 1024 px or more, and for a fine pointer in a narrow window', () => {
    expect(gateVerdict({ ...desktop, coarsePointer: true, viewportWidth: 1024 })).toEqual({ kind: 'open' })
    expect(gateVerdict({ ...desktop, coarsePointer: false, viewportWidth: 600 })).toEqual({ kind: 'open' })
  })

  it('lists every missing capability', () => {
    expect(gateVerdict({ ...desktop, webgl2: false })).toEqual({ kind: 'unsupported', missing: ['webgl2'] })
    expect(gateVerdict({ ...desktop, indexedDB: false })).toEqual({ kind: 'unsupported', missing: ['indexedDB'] })
    expect(gateVerdict({ ...desktop, webLocks: false })).toEqual({ kind: 'unsupported', missing: ['webLocks'] })
    expect(gateVerdict({ ...desktop, webgl2: false, indexedDB: false, webLocks: false })).toEqual({ kind: 'unsupported', missing: ['webgl2', 'indexedDB', 'webLocks'] })
  })

  it('prefers the designed-for-computer page on a phone that also lacks a capability', () => {
    expect(gateVerdict({ ...desktop, coarsePointer: true, viewportWidth: 390, webLocks: false })).toEqual({ kind: 'desktopOnly' })
  })

  it('opens the app without navigator.storage (not blocking: Settings says it is unavailable)', () => {
    expect(gateVerdict({ ...desktop, storage: false })).toEqual({ kind: 'open' })
  })

  it('opens Firefox when it has every capability', () => {
    expect(gateVerdict({ ...desktop, userAgent: FIREFOX })).toEqual({ kind: 'open' })
  })
})

describe('isFirefox and isSmallWindow (UX-DR148)', () => {
  it('recognises Firefox only, whatever the case; SeaMonkey is not Firefox', () => {
    expect(isFirefox(FIREFOX)).toBe(true)
    expect(isFirefox(FIREFOX.replace('Firefox/', 'firefox/'))).toBe(true)
    expect(isFirefox(CHROME)).toBe(false)
    expect(isFirefox(`${CHROME} Edg/141.0.0.0`)).toBe(false)
    expect(isFirefox(SEAMONKEY)).toBe(false)
    expect(isFirefox(SEAMONKEY.replace('SeaMonkey/', 'seamonkey/'))).toBe(false)
  })

  it('flags a window under 1366 px wide or under the 648 px viewport of a 1366 × 768 screen', () => {
    expect(isSmallWindow(1365, 768)).toBe(true)
    expect(isSmallWindow(1366, 647)).toBe(true)
    expect(isSmallWindow(1920, 600)).toBe(true)
    expect(isSmallWindow(1366, 648)).toBe(false)
  })
})

describe('readEnvironment', () => {
  function source(overrides: Partial<EnvironmentSource> & { context?: unknown; canvasThrows?: boolean } = {}): EnvironmentSource {
    const { context = { getExtension: () => ({ loseContext: () => undefined }) }, canvasThrows = false, ...rest } = overrides
    return {
      innerWidth: 1366,
      innerHeight: 648,
      navigator: { userAgent: CHROME, locks: {}, storage: {} },
      indexedDB: {},
      matchMedia: () => ({ matches: false }),
      document: {
        createElement: () => ({
          getContext: () => {
            if (canvasThrows) throw new Error('no GPU')
            return context
          },
        }),
      },
      ...rest,
    }
  }

  it('reads a capable desktop browser', () => {
    expect(readEnvironment(source())).toEqual(desktop)
  })

  it('reports each missing capability and fails closed', () => {
    expect(readEnvironment(source({ context: null })).webgl2).toBe(false)
    expect(readEnvironment(source({ canvasThrows: true })).webgl2).toBe(false)
    expect(readEnvironment(source({ indexedDB: undefined })).indexedDB).toBe(false)
    expect(readEnvironment(source({ navigator: { userAgent: CHROME } })).webLocks).toBe(false)
    expect(readEnvironment(source({ navigator: { userAgent: CHROME, locks: {} } })).storage).toBe(false)
  })

  it('never throws: a throwing property reads as missing', () => {
    const throwing = (name: string) => () => {
      throw new Error(`${name} blocked`)
    }
    const navigator = Object.defineProperties({}, { locks: { get: throwing('locks') }, storage: { get: throwing('storage') }, userAgent: { get: throwing('userAgent') } }) as EnvironmentSource['navigator']
    const hostile = Object.defineProperties(source({ navigator }), { innerWidth: { get: throwing('innerWidth') }, innerHeight: { get: throwing('innerHeight') }, indexedDB: { get: throwing('indexedDB') } })
    expect(readEnvironment(hostile)).toEqual({ ...desktop, indexedDB: false, webLocks: false, storage: false, viewportWidth: 0, viewportHeight: 0, userAgent: '' })
    expect(readEnvironment(source({ matchMedia: throwing('matchMedia') })).coarsePointer).toBe(false)
  })

  it('reads a coarse pointer, and none without matchMedia', () => {
    expect(readEnvironment(source({ matchMedia: () => ({ matches: true }) })).coarsePointer).toBe(true)
    expect(readEnvironment(source({ matchMedia: undefined })).coarsePointer).toBe(false)
  })
})
