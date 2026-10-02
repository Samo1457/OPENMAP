import { Download } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStorageStatus, type StorageStatus } from '@/persistence'
import { buttonLook, iconProps } from '@/ui/components/button'
import { scaleBytes } from './format-bytes'

/**
 * Settings → Storage (UX-DR134, AD-8): space used, whether the browser may evict the Projects, and
 * the reminder to export Project Files. Each fact reads « Information indisponible » when the
 * browser does not report it. The export button waits for Story 7.1.
 */
export function StorageTab() {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState<StorageStatus | undefined>()
  const comingSoonId = useId()

  useEffect(() => {
    let cancelled = false
    void getStorageStatus().then((read) => {
      if (!cancelled) setStatus(read)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 })
  const size = (bytes: number) => {
    const { value, unit } = scaleBytes(bytes)
    return t(`settings.storage.units.${unit}`, { value: number.format(value) })
  }

  const space = !status ? undefined : status.space === 'unavailable' ? t('settings.storage.unavailable') : t('settings.storage.usage', { used: size(status.space.usage), quota: size(status.space.quota) })
  const protection = !status ? undefined : t(`settings.storage.protection.${status.protection}`)

  return (
    <div className="flex flex-col gap-5" aria-busy={status === undefined}>
      <dl className="flex flex-col gap-4">
        <Fact label={t('settings.storage.spaceLabel')} value={space} testId="storage-space" />
        <Fact label={t('settings.storage.protectionLabel')} value={protection} testId="storage-protection" />
      </dl>
      <div className="flex flex-col items-start gap-3 border-t border-om-border pt-4">
        <p className="type-body text-om-text-primary">{t('settings.storage.reminder')}</p>
        <span id={comingSoonId} hidden>
          {t('common.comingSoon')}
        </span>
        <button type="button" aria-disabled title={t('common.comingSoon')} aria-describedby={comingSoonId} className={buttonLook('secondary', true)}>
          <Download {...iconProps} />
          {t('settings.storage.export')}
        </button>
      </div>
    </div>
  )
}

function Fact({ label, value, testId }: { label: string; value?: string; testId: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-label-caps text-om-text-secondary">{label}</dt>
      <dd data-testid={testId} className="type-body text-om-text-primary">
        {value ?? <span aria-hidden className="om-skeleton block h-4 w-48" />}
      </dd>
    </div>
  )
}
