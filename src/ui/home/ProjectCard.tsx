import { Copy, Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectSummary } from '@/persistence'
import { buttonClass, iconProps } from '@/ui/components/button'
import { Menu, type MenuItem, type MenuPoint } from '@/ui/components/Menu'
import { RenameField } from '@/ui/components/RenameField'
import { cn } from '@/ui/lib/utils'
import { mapColors } from '@/ui/theme/tokens'
import { relativeTime } from './relative-time'

/** Until the Map renders (Story 1.10), the thumbnail is the parchment land colour (Story 1.4 decision). */
const THUMBNAIL_COLOR = mapColors.parchment['map-land-neutral']

export interface ProjectCardProps {
  project: ProjectSummary
  now: number
  /** Another tab edits this Project (AD-15): rename, duplicate and delete are unavailable; opening it is read-only. */
  locked?: boolean
  onOpen: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  /** Receives the card's main focus target (or null), so Home can move focus to it. */
  onFocusTarget?: (id: string, element: HTMLElement | null) => void
}

/** A Project card (DESIGN.md `project-card`, UX-DR119): open on click or Enter, menu by its button, right-click or Shift+F10. */
export function ProjectCard({ project, now, locked = false, onOpen, onRename, onDuplicate, onDelete, onFocusTarget }: ProjectCardProps) {
  const { t, i18n } = useTranslation()
  const metaId = useId()
  const nameId = useId()
  const [menuAt, setMenuAt] = useState<MenuPoint | undefined>()
  const [renaming, setRenaming] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const openButton = useRef<HTMLButtonElement | null>(null)
  /** The element focus returns to when the menu closes. */
  const menuOpener = useRef<HTMLElement | null>(null)

  const readable = project.state === 'ok'
  const openable = project.state !== 'unreadable'
  const name = project.name || t('project.defaultName')

  const when = relativeTime(project.updatedAt, now, i18n.resolvedLanguage ?? 'en')
  const modified = t('home.card.modified', {
    when:
      when.key === 'justNow'
        ? t('time.justNow')
        : when.key === 'minutes'
          ? t('time.minutes', { n: when.n })
          : when.key === 'hours'
            ? t('time.hours', { n: when.n })
            : when.key === 'yesterday'
              ? t('time.yesterday')
              : t('time.date', { date: when.date }),
  })
  const meta = project.state === 'unreadable' ? t('home.card.unreadable') : locked ? t('home.card.openElsewhere') : t('home.card.meta', { modified, format: project.outputFormat })
  const disabledReason = locked ? t('home.card.openElsewhere') : undefined

  const items: MenuItem[] = [
    ...(readable
      ? [
          { id: 'rename', label: t('home.card.rename'), icon: <Pencil {...iconProps} />, onSelect: () => setRenaming(true), disabledReason },
          { id: 'duplicate', label: t('home.card.duplicate'), icon: <Copy {...iconProps} />, onSelect: () => onDuplicate(project.id), disabledReason },
        ]
      : []),
    { id: 'delete', label: t('home.card.delete'), icon: <Trash2 {...iconProps} />, danger: true, onSelect: () => onDelete(project.id), disabledReason },
  ]

  function openMenu(at: MenuPoint, opener: HTMLElement | null) {
    menuOpener.current = opener
    setMenuAt(at)
  }

  /** Keyboard opening (button, Shift+F10, Menu key): under the menu button. */
  function openMenuFromKeyboard(opener: HTMLElement | null) {
    const rect = menuButton.current?.getBoundingClientRect()
    openMenu(rect ? { x: rect.left, y: rect.bottom + 4 } : { x: 0, y: 0 }, opener)
  }

  const closeMenu = useCallback(() => {
    setMenuAt(undefined)
    menuOpener.current?.focus()
  }, [])

  function onContextMenu(event: MouseEvent) {
    if (renaming) return
    event.preventDefault()
    // A keyboard-generated contextmenu event has no pointer position.
    if (event.clientX === 0 && event.clientY === 0) openMenuFromKeyboard(event.target instanceof HTMLElement ? event.target : null)
    else openMenu({ x: event.clientX, y: event.clientY }, openButton.current ?? menuButton.current)
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
      event.preventDefault()
      openMenuFromKeyboard(event.currentTarget)
    }
  }

  const thumbnail = <div aria-hidden className="aspect-video w-full border-b border-om-border" style={{ backgroundColor: THUMBNAIL_COLOR }} />
  const metaLine = (
    <span id={metaId} className="block truncate type-caption text-om-text-muted">
      {meta}
    </span>
  )

  return (
    <li
      onContextMenu={onContextMenu}
      className="group relative flex min-w-0 flex-col border border-om-border bg-om-surface hover:border-om-border-input hover:bg-om-surface-raised"
    >
      {renaming ? (
        <div className="flex flex-col">
          {thumbnail}
          <div className="flex flex-col gap-1 px-3 py-2">
            <RenameField
              value={project.name}
              label={t('project.nameField')}
              onCommit={(next) => {
                setRenaming(false)
                onRename(project.id, next)
                requestAnimationFrame(() => openButton.current?.focus())
              }}
              onCancel={() => {
                setRenaming(false)
                requestAnimationFrame(() => openButton.current?.focus())
              }}
            />
            {metaLine}
          </div>
        </div>
      ) : openable ? (
        <button
          ref={(element) => {
            openButton.current = element
            onFocusTarget?.(project.id, element)
          }}
          type="button"
          aria-labelledby={nameId}
          aria-describedby={metaId}
          onClick={() => onOpen(project.id)}
          onKeyDown={onKeyDown}
          className="flex flex-col text-left"
        >
          {thumbnail}
          <span className="flex w-full min-w-0 flex-col gap-1 px-3 py-2">
            <span id={nameId} className="block truncate type-body-strong text-om-text-primary">
              {name}
            </span>
            {metaLine}
          </span>
        </button>
      ) : (
        <div className="flex flex-col">
          {thumbnail}
          <div className="flex min-w-0 flex-col gap-1 px-3 py-2">
            <span className="block truncate type-body-strong text-om-text-primary">{name}</span>
            {metaLine}
          </div>
        </div>
      )}
      {!renaming && (
        <button
          ref={(element) => {
            menuButton.current = element
            if (!openable) onFocusTarget?.(project.id, element)
          }}
          type="button"
          aria-label={t('home.card.menu', { name })}
          aria-haspopup="menu"
          aria-expanded={menuAt !== undefined}
          onClick={(event) => (menuAt ? closeMenu() : openMenuFromKeyboard(event.currentTarget))}
          onKeyDown={onKeyDown}
          className={cn(
            buttonClass.ghostIcon,
            'absolute top-2 right-2 bg-om-surface-raised opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100',
            menuAt !== undefined && 'opacity-100',
          )}
        >
          <Ellipsis {...iconProps} />
        </button>
      )}
      {menuAt && <Menu label={t('home.card.menu', { name })} at={menuAt} items={items} onClose={closeMenu} trigger={menuButton} />}
    </li>
  )
}
