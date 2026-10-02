import '@fontsource-variable/libre-baskerville'
import '@fontsource-variable/source-sans-3'
import { type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18next, initI18n, readStoredLanguage } from '@/i18n'
import {
  flushPendingSaves,
  getPreference,
  installPageLifecycleFlush,
  purgeExpiredTombstones,
  setVersionChangeHandler,
  type ThemePreference,
} from '@/persistence'
import App from '@/ui/App'
import { installChunkReload } from '@/ui/chunk-reload'
import { type GateVerdict, gateVerdict, readEnvironment } from '@/ui/gate/capabilities'
import { GatePage } from '@/ui/gate/GatePage'
import { ThemeProvider } from '@/ui/theme/ThemeProvider'
import './index.css'

/** Start-up purge of deleted Projects: only tombstones older than this (AD-8). */
const TOMBSTONE_PURGE_GRACE_MS = 10 * 60 * 1000

installChunkReload({
  target: window,
  storage: () => window.sessionStorage,
  now: () => Date.now(),
  flush: flushPendingSaves,
  reload: () => window.location.reload(),
})

/** Never let a stuck IndexedDB open delay the first render for long. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))])
}

function mount(theme: ThemePreference | undefined, content: ReactNode) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider initialPreference={theme}>{content}</ThemeProvider>
    </StrictMode>,
  )
}

/** AD-19: feature-test the browser once, before anything renders. */
function checkBrowser(): GateVerdict {
  return gateVerdict(readEnvironment(window))
}

/** Set before the first render or hook install, so the start-up fallback never renders or installs twice. */
let started = false

/**
 * Renders the gate page when the device or browser cannot run OPENMAP (AD-19, NFR-4), else the app.
 * Only the app installs the page-lifecycle flush and the schema-upgrade reload. Returns whether the
 * app was rendered.
 */
function render(verdict: GateVerdict, theme?: ThemePreference): boolean {
  started = true
  if (verdict.kind !== 'open') {
    mount(theme, <GatePage reason={verdict.kind} missing={verdict.kind === 'unsupported' ? verdict.missing : undefined} />)
    return false
  }
  // AD-8: pending saves are written when the page is hidden or closed.
  installPageLifecycleFlush({ window, document })
  // AD-9: a schema upgrade in another tab flushes, closes the database, then reloads this tab once.
  setVersionChangeHandler(() => window.location.reload())
  mount(theme, <App />)
  return true
}

async function start() {
  const verdict = checkBrowser()
  const [theme, language] = await Promise.all([
    withTimeout(getPreference('theme'), 1000),
    withTimeout(readStoredLanguage(), 1000),
  ])
  await initI18n(language)
  if (!render(verdict, theme)) return
  // A tab closed before a delete toast expired leaves a tombstone: purge it now (AD-8). The grace
  // is far longer than the 8 s toast, whose timer pauses on hover and focus, so a delete whose
  // Undo toast is still shown in another tab is never purged from under it.
  void purgeExpiredTombstones(TOMBSTONE_PURGE_GRACE_MS)
}

start().catch(async (error: unknown) => {
  // Development-only logging (no remote logging). Fall back to the defaults:
  // system theme and the detected language.
  if (import.meta.env.DEV) console.warn('[boot] start failed, rendering with defaults', error)
  if (started) return
  try {
    if (!i18next.isInitialized) await initI18n()
    render(checkBrowser())
  } catch (fallbackError) {
    if (import.meta.env.DEV) console.warn('[boot] fallback render failed', fallbackError)
  }
})
