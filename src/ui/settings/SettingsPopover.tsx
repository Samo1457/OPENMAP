import { Settings } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonClass, iconProps } from '@/ui/components/button'
import { AppearanceControl } from './AppearanceControl'
import { LanguageControl } from './LanguageControl'

/**
 * Temporary home of Appearance and Language (Story 1.4 decision) in the top bar of Home and the
 * Editor; the Settings dialog replaces it in Story 1.6. A disclosure: the button shows or hides the
 * panel; Escape, a press outside or focus leaving it closes it.
 */
export function SettingsPopover() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={buttonClass.ghost}
      >
        <Settings {...iconProps} />
        {t('settings.title')}
      </button>
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="group"
          aria-label={t('settings.title')}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            setOpen(false)
            trigger.current?.focus()
          }}
          className="absolute top-full right-0 z-30 mt-2 flex w-max flex-col gap-4 rounded-md border border-om-border bg-om-surface-raised p-4 shadow-long"
        >
          <AppearanceControl />
          <LanguageControl />
        </div>
      )}
    </div>
  )
}
