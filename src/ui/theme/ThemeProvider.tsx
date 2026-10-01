import { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { setPreference as storePreference } from '@/persistence'
import { applyTheme, DARK_SCHEME_QUERY, resolveTheme, ThemeContext, type ThemePreference } from './theme'

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches
}

function subscribeToSystemScheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Resolves System · Light · Dark, toggles `.dark` on <html> and follows OS
 * changes while the preference is `system`. `initialPreference` is the value
 * read from the preferences table before the first render.
 */
export function ThemeProvider({
  initialPreference = 'system',
  children,
}: {
  initialPreference?: ThemePreference
  children: ReactNode
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference)
  const systemDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark)
  const resolved = resolveTheme(preference, systemDark)

  // Layout effect: the class changes before the browser paints the new theme.
  useLayoutEffect(() => {
    applyTheme(document.documentElement, resolved)
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    void storePreference('theme', next)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext value={value}>{children}</ThemeContext>
}
