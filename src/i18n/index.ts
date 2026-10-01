// UI strings (AD-20): every interface string is an i18next key present in `fr` and `en`.
// Map text never goes through here; it is formatted by src/core with project.mapLocale (AD-25).

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getPreference, setPreference, type LanguagePreference } from '@/persistence'
import en from './locales/en.json'
import fr from './locales/fr.json'

export type Language = LanguagePreference
export const LANGUAGES: readonly Language[] = ['fr', 'en']

/** First-launch language: French when the browser language is French, English otherwise. */
export function detectLanguage(browserLanguage: string | undefined): Language {
  return browserLanguage?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language
}

/**
 * Initialises i18next synchronously in `stored` when given (the caller reads
 * it first with readStoredLanguage), otherwise in the language detected from the browser.
 */
export async function initI18n(stored?: Language): Promise<void> {
  const language = stored ?? detectLanguage(navigator.language)
  i18next.off('languageChanged', applyDocumentLanguage)
  i18next.on('languageChanged', applyDocumentLanguage)
  await i18next.use(initReactI18next).init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    lng: language,
    fallbackLng: false,
    supportedLngs: LANGUAGES,
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  applyDocumentLanguage(language)
}

/** Reads the stored language; `undefined` when none is stored or storage is unavailable. */
export function readStoredLanguage(): Promise<Language | undefined> {
  return getPreference('language')
}

/** Switches the UI language at once (no reload), updates `<html lang>` and persists the choice. */
export async function setLanguage(language: Language): Promise<void> {
  await i18next.changeLanguage(language)
  await setPreference('language', language)
}

export { i18next }
