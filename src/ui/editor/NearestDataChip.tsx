import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type DataDate, formatYear, type MapLocale } from '@/core'
import { iconProps } from '@/ui/components/button'

/**
 * « Données les plus proches : 1454 » (DESIGN.md `nearest-data-chip`, UX-DR59, FR-6): shown only
 * when the Reference Date has no data and the Map shows another year's. The year is written in the
 * Map language. The chip is not a live region: the Editor announces it through the shared announcer.
 */
export function NearestDataChip({ dataDate, mapLocale }: { dataDate?: DataDate; mapLocale: MapLocale }) {
  const { t } = useTranslation()
  if (!dataDate || dataDate.exact) return null
  return (
    <span
      data-testid="nearest-data-chip"
      className="inline-flex h-6 items-center gap-1.5 self-start rounded-sm border border-om-border bg-om-surface-raised px-2 type-caption whitespace-nowrap text-om-text-secondary"
    >
      <Info {...iconProps} />
      {t('editor.referenceDate.nearest', { date: formatYear(dataDate.year, mapLocale) })}
    </span>
  )
}
