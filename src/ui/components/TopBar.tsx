import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsPopover } from '@/ui/settings/SettingsPopover'

/** The 48px top bar shared by Home and the Editor (DESIGN.md `top-bar`): logotype, content, Settings. */
export function TopBar({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <header className="flex h-top-bar-height shrink-0 items-center gap-4 border-b border-om-border bg-om-surface px-4">
      <span className="type-title-md tracking-[0.04em] text-om-text-primary">{t('app.name')}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <SettingsPopover />
    </header>
  )
}
