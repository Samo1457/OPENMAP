import 'i18next'
import type fr from './locales/fr.json'

// Typed keys: t('settings.appearance.label') is checked against the French resources.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof fr }
  }
}
