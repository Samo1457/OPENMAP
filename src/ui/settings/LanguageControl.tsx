import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { setLanguage, type Language } from '@/i18n'
import { SegmentedControl, type SegmentedOption } from '@/ui/components/SegmentedControl'

/** "Langue": Français · English, switched without reload. Story 1.6 moves it into the Settings dialog. */
export function LanguageControl() {
  const { t, i18n } = useTranslation()
  const labelId = useId()
  const options: SegmentedOption<Language>[] = [
    { value: 'fr', label: t('settings.language.fr'), lang: 'fr' },
    { value: 'en', label: t('settings.language.en'), lang: 'en' },
  ]
  const current: Language = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'

  return (
    <div className="flex items-center justify-between gap-4">
      <span id={labelId} className="type-label-caps text-om-text-secondary">
        {t('settings.language.label')}
      </span>
      <SegmentedControl
        labelledBy={labelId}
        options={options}
        value={current}
        onChange={(language) => void setLanguage(language)}
      />
    </div>
  )
}
