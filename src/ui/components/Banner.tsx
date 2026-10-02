import { Info, TriangleAlert, X } from 'lucide-react'
import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/ui/lib/utils'
import { sessionDismissals } from './banner-dismissals'
import { buttonClass, iconProps } from './button'

export interface BannerAction {
  readonly label: string
  readonly onClick: () => void
  /** Id of the element that describes the action's result (e.g. « Lien copié. »). */
  readonly describedBy?: string
}

/**
 * A full-width banner under the top bar (DESIGN.md `banner-warning`, `banner-info`, UX-DR66):
 * surface-raised, 3 px left border, icon, `body` text, at most one action (compact secondary
 * button) and, when `onDismiss` is given, a dismiss cross. Warning: icon and text in the warning
 * colour; info: info icon in text-secondary, accent border.
 */
export function Banner({ tone, children, action, onDismiss }: { tone: 'info' | 'warning'; children: ReactNode; action?: BannerAction; onDismiss?: () => void }) {
  const { t } = useTranslation()
  const Icon = tone === 'warning' ? TriangleAlert : Info
  return (
    <div
      role="status"
      data-tone={tone}
      className={cn(
        'flex min-h-11 items-center gap-3 border-b border-l-3 border-om-border bg-om-surface-raised py-2 pr-2 pl-4',
        tone === 'warning' ? 'border-l-om-warning' : 'border-l-om-accent',
      )}
    >
      <Icon {...iconProps} className={cn('icon-stroke shrink-0', tone === 'warning' ? 'text-om-warning' : 'text-om-text-secondary')} />
      <p className={cn('min-w-0 flex-1 type-body', tone === 'warning' ? 'text-om-warning' : 'text-om-text-primary')}>{children}</p>
      {action && (
        <button type="button" onClick={action.onClick} aria-describedby={action.describedBy} className={buttonClass.secondarySmall}>
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button type="button" aria-label={t('banner.dismiss')} title={t('banner.dismiss')} onClick={onDismiss} className={buttonClass.ghostIcon}>
          <X {...iconProps} />
        </button>
      )}
    </div>
  )
}

/** Whether the banner `key` was dismissed in this session, and how to dismiss it (UX-DR66). */
export function useSessionDismissal(key: string): [dismissed: boolean, dismiss: () => void] {
  const dismissed = useSyncExternalStore(sessionDismissals.subscribe, () => sessionDismissals.isDismissed(key))
  const dismiss = useCallback(() => sessionDismissals.dismiss(key), [key])
  return [dismissed, dismiss]
}
