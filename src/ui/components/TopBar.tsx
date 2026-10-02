import { Map as MapIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { regionProps } from '@/ui/keyboard/regions'
import { AppMenu } from '@/ui/settings/AppMenu'

/**
 * The 48px top bar shared by Home and the Editor (DESIGN.md `top-bar`): logotype, content, then the
 * end slot: by default the « ⋯ » menu with Settings (UX-DR134). In the Editor (`region`) it is the
 * first jump target of Alt+1..6.
 */
export function TopBar({ children, end = <AppMenu />, label, region = false }: { children?: ReactNode; end?: ReactNode; label?: string; region?: boolean }) {
  const { t } = useTranslation()
  return (
    <header aria-label={label} {...(region ? regionProps('top') : {})} className="flex h-top-bar-height min-w-0 shrink-0 items-center gap-3 border-b border-om-border bg-om-surface px-4">
      <span className="flex shrink-0 items-center gap-2 type-title-md tracking-[0.04em] text-om-text-primary">
        <MapIcon size={20} aria-hidden className="icon-stroke shrink-0" />
        {t('app.name')}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {end}
    </header>
  )
}
