import { useTranslation } from 'react-i18next'
import { Dialog } from '@/ui/components/Dialog'
import { Tabs } from '@/ui/components/Tabs'
import { AppearanceControl } from './AppearanceControl'
import { LanguageControl } from './LanguageControl'
import { closeSettings, selectSettingsTab, type SettingsTab, useSettingsState } from './settings-store'
import { StorageTab } from './StorageTab'

/**
 * The Settings dialog (UX-DR134, UX-DR67), 560 px wide: Appearance, Language and Storage tabs.
 * Changes apply at once and are not undoable (they are preferences, not Project Commands).
 * Mounted once by App; opened with `openSettings(tab?)`.
 */
export function SettingsDialog() {
  const { t } = useTranslation()
  const state = useSettingsState()
  if (!state.open) return null

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'appearance', label: t('settings.appearance.label') },
    { id: 'language', label: t('settings.language.label') },
    { id: 'storage', label: t('settings.storage.label') },
  ]

  return (
    <Dialog title={t('settings.title')} closeLabel={t('dialog.close')} onClose={closeSettings} returnFocus={state.returnFocus} fallbackFocus={state.trigger} className="h-90 w-export-dialog-width">
      <Tabs label={t('settings.title')} tabs={tabs} value={state.tab} onChange={selectSettingsTab} autoFocus>
        {state.tab === 'appearance' && <AppearanceControl />}
        {state.tab === 'language' && <LanguageControl />}
        {state.tab === 'storage' && <StorageTab />}
      </Tabs>
    </Dialog>
  )
}
