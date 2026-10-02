import { Settings } from 'lucide-react'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonClass, iconProps } from '@/ui/components/button'
import { cn } from '@/ui/lib/utils'
import { AppearanceControl } from './AppearanceControl'
import { LanguageControl } from './LanguageControl'

/**
 * Temporary home of Appearance and Language (Story 1.4 decision): a button in the top bar of Home;
 * in the Editor, the « ⋯ » menu opens the same panel. The Settings dialog replaces both in Story 1.6.
 */
export function SettingsPopover() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative">
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
      {open && <SettingsPanel id={panelId} owner={trigger} onClose={() => setOpen(false)} />}
    </div>
  )
}

/**
 * The floating Settings panel, placed under its owner (DESIGN.md `popover`). Escape closes it and
 * returns the focus to the owner; a press outside or the focus leaving it closes it. A press or the
 * focus on the owner is left to the owner, which toggles it.
 */
export function SettingsPanel({ id, owner, onClose, className }: { id?: string; owner: RefObject<HTMLElement | null>; onClose: () => void; className?: string }) {
  const { t } = useTranslation()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!within(event.target, panel, owner)) onClose()
    }
    // Focus leaving through the owner (Shift+Tab from the panel, then on) closes the panel too.
    const onOwnerFocusOut = (event: FocusEvent) => {
      if (!within(event.relatedTarget, panel, owner)) onClose()
    }
    const ownerElement = owner.current
    document.addEventListener('pointerdown', onPointerDown, true)
    ownerElement?.addEventListener('focusout', onOwnerFocusOut)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      ownerElement?.removeEventListener('focusout', onOwnerFocusOut)
    }
  }, [onClose, owner])

  return (
    <div
      ref={panel}
      id={id}
      role="group"
      aria-label={t('settings.title')}
      onBlur={(event) => {
        if (!within(event.relatedTarget, panel, owner)) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
        owner.current?.focus()
      }}
      className={cn('absolute top-full right-0 z-30 mt-2 flex w-max flex-col gap-4 rounded-md border border-om-border bg-om-surface-raised p-4 shadow-long', className)}
    >
      <AppearanceControl />
      <LanguageControl />
    </div>
  )
}

function within(target: EventTarget | null, ...elements: RefObject<HTMLElement | null>[]): boolean {
  return target instanceof Node && elements.some((element) => element.current?.contains(target))
}
