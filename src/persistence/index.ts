// Public API of the persistence adapter. Other layers import this file only (spine Design Paradigm).

import { OpenmapDatabase } from './db'

/**
 * Writes every pending Project save to IndexedDB right now (AD-8 `flush()`).
 * No-op until autosave lands in Story 1.4; callers already await it so the
 * contract does not change then.
 */
export async function flushPendingSaves(): Promise<void> {}

export type ThemePreference = 'system' | 'light' | 'dark'
export type LanguagePreference = 'fr' | 'en'

/** UI preferences stored in the `preferences` table (AD-8: never localStorage). */
export interface Preferences {
  theme: ThemePreference
  language: LanguagePreference
}

const validators: { [K in keyof Preferences]: (value: unknown) => value is Preferences[K] } = {
  theme: (value): value is ThemePreference => value === 'system' || value === 'light' || value === 'dark',
  language: (value): value is LanguagePreference => value === 'fr' || value === 'en',
}

let database: OpenmapDatabase | undefined

function db(): OpenmapDatabase {
  database ??= new OpenmapDatabase()
  return database
}

function report(action: string, error: unknown): void {
  // Development-only logging; no remote logging (spine Consistency Conventions).
  if (import.meta.env.DEV) console.warn(`[persistence] ${action} failed`, error)
}

/**
 * Reads a stored preference. Resolves to `undefined` when nothing valid is
 * stored or IndexedDB is unavailable; it never rejects.
 */
export async function getPreference<K extends keyof Preferences>(key: K): Promise<Preferences[K] | undefined> {
  try {
    const row = await db().preferences.get(key)
    return row && validators[key](row.value) ? row.value : undefined
  } catch (error) {
    report(`reading preference "${key}"`, error)
    return undefined
  }
}

/**
 * Stores a preference. Resolves to `false` when it could not be persisted
 * (IndexedDB unavailable); it never rejects, so the UI keeps the choice for the session.
 */
export async function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): Promise<boolean> {
  try {
    await db().preferences.put({ key, value })
    return true
  } catch (error) {
    report(`writing preference "${key}"`, error)
    return false
  }
}
