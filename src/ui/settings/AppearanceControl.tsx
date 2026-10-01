import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { useTheme, type ThemePreference } from '@/ui/theme/theme'

/** "Apparence": System · Light · Dark (UX-DR28). Story 1.6 moves it into the Settings dialog. */
export function AppearanceControl() {
  const { t } = useTranslation()
  const { preference, setPreference } = useTheme()
  const labelId = useId()
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('settings.appearance.system') },
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'dark', label: t('settings.appearance.dark') },
  ]

  return (
    <div className="flex items-center justify-between gap-4">
      <span id={labelId} className="type-label-caps text-om-text-secondary">
        {t('settings.appearance.label')}
      </span>
      <SegmentedControl labelledBy={labelId} options={options} value={preference} onChange={setPreference} />
    </div>
  )
}
