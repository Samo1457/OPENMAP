import '@fontsource-variable/libre-baskerville'
import '@fontsource-variable/source-sans-3'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18next, initI18n, readStoredLanguage } from '@/i18n'
import { flushPendingSaves, getPreference, type ThemePreference } from '@/persistence'
import App from '@/ui/App'
import { installChunkReload } from '@/ui/chunk-reload'
import { ThemeProvider } from '@/ui/theme/ThemeProvider'
import './index.css'

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

function render(theme?: ThemePreference) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider initialPreference={theme}>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}

async function start() {
  const [theme, language] = await Promise.all([
    withTimeout(getPreference('theme'), 1000),
    withTimeout(readStoredLanguage(), 1000),
  ])
  await initI18n(language)
  render(theme)
}

start().catch(async (error: unknown) => {
  // Development-only logging (no remote logging). Fall back to the defaults:
  // system theme and the detected language.
  if (import.meta.env.DEV) console.warn('[boot] start failed, rendering with defaults', error)
  try {
    if (!i18next.isInitialized) await initI18n()
    render()
  } catch (fallbackError) {
    if (import.meta.env.DEV) console.warn('[boot] fallback render failed', fallbackError)
  }
})
