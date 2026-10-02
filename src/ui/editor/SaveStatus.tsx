import { CircleAlert, CircleCheck } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { iconProps } from '@/ui/components/button'
import { cn } from '@/ui/lib/utils'
import { saveIndicatorLabel, type SaveIndicatorStore } from './save-status'

/**
 * The save status in the top bar (UX-DR137): « Enregistrement… », « Enregistré » with the success
 * icon, or « Non enregistré » in danger with its icon. Never a toast for a routine save (UX-DR115).
 */
export function SaveStatus({ store }: { store: SaveIndicatorStore }) {
  const { t } = useTranslation()
  const indicator = useSyncExternalStore(store.subscribe, store.get)
  return (
    <span
      data-save-status={indicator}
      className={cn('flex shrink-0 items-center gap-1.5 type-caption whitespace-nowrap', indicator === 'error' ? 'text-om-danger' : 'text-om-text-muted')}
    >
      {indicator === 'saved' && <CircleCheck {...iconProps} className="icon-stroke shrink-0 text-om-success" />}
      {indicator === 'error' && <CircleAlert {...iconProps} />}
      {t(saveIndicatorLabel[indicator])}
    </span>
  )
}
