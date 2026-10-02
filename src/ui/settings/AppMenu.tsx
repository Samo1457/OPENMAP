import { Ellipsis, Settings } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonLook, iconProps } from '@/ui/components/button'
import { Menu, type MenuPoint } from '@/ui/components/Menu'
import { openSettings } from './settings-store'

/**
 * The « ⋯ » top-bar menu of Home and the Editor (UX-DR134): « Réglages » for now (Project File
 * arrives in Epic 7). Choosing it closes the menu, which puts the focus back on this button, then
 * opens Settings with this button as its trigger, so the focus comes back to it on close.
 */
export function AppMenu() {
  const { t } = useTranslation()
  const button = useRef<HTMLButtonElement>(null)
  const [menuAt, setMenuAt] = useState<MenuPoint | undefined>()
  const closeMenu = useCallback(() => {
    setMenuAt(undefined)
    button.current?.focus()
  }, [])

  return (
    <div className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={t('appMenu.label')}
        title={t('appMenu.label')}
        aria-haspopup="menu"
        aria-expanded={menuAt !== undefined}
        onClick={() => {
          if (menuAt) return setMenuAt(undefined)
          const rect = button.current?.getBoundingClientRect()
          setMenuAt(rect ? { x: rect.left, y: rect.bottom + 4 } : { x: 0, y: 0 })
        }}
        className={buttonLook('ghostIcon')}
      >
        <Ellipsis {...iconProps} />
      </button>
      {menuAt && (
        <Menu
          label={t('appMenu.label')}
          at={menuAt}
          trigger={button}
          onClose={closeMenu}
          items={[{ id: 'settings', label: t('settings.title'), icon: <Settings {...iconProps} />, onSelect: () => openSettings('appearance', button.current) }]}
        />
      )}
    </div>
  )
}
