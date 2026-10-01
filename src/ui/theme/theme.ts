import { createContext, useContext } from 'react'
import type { ThemePreference } from '@/persistence'

export type { ThemePreference }
export type ResolvedTheme = 'light' | 'dark'

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/** `system` follows the OS; `light` and `dark` are explicit choices (UX-DR28). */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

/** Applies the chrome theme: `.dark` on <html> swaps every chrome token; the Map is never affected (AD-6). */
export function applyTheme(root: HTMLElement, theme: ResolvedTheme): void {
  root.classList.toggle('dark', theme === 'dark')
}

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
