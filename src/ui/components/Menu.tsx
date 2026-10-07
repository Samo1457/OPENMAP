import { Check } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/ui/lib/utils'
import { iconProps } from './button'

export interface MenuItem {
  readonly id: string
  readonly label: string
  readonly icon?: ReactNode
  /** Destructive action, shown in the danger colour with its icon (never colour alone). */
  readonly danger?: boolean
  /**
   * Makes the item one choice of an exclusive set (`menuitemradio`), shown with a check mark when
   * true. Opening the menu focuses the checked item.
   */
  readonly checked?: boolean
  readonly onSelect: () => void
  /**
   * Why the item is unavailable (it stays listed and focusable, but does nothing): read out as its
   * description and shown as its tooltip. Absent: the item is available.
   */
  readonly disabledReason?: string
}

export interface MenuPoint {
  readonly x: number
  readonly y: number
}

const VIEWPORT_MARGIN = 8

/**
 * A popup menu (DESIGN.md `popover`) opened at a point: by its button, a right-click or Shift+F10.
 * Focus moves to the first item; arrows, Home and End move; Enter or Space selects; Escape and
 * Tab close it. `onClose` runs before the selected item, so the caller can restore focus first.
 */
export function Menu({
  label,
  at,
  items,
  onClose,
  trigger,
}: {
  label: string
  at: MenuPoint
  items: readonly MenuItem[]
  onClose: () => void
  /** The button that toggles the menu: a press on it is left to its own click handler. */
  trigger?: RefObject<HTMLElement | null>
}) {
  const menu = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const [position, setPosition] = useState(at)

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    const element = menu.current
    if (!element) return
    const { width, height } = element.getBoundingClientRect()
    setPosition({
      x: Math.max(VIEWPORT_MARGIN, Math.min(at.x, window.innerWidth - width - VIEWPORT_MARGIN)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(at.y, window.innerHeight - height - VIEWPORT_MARGIN)),
    })
  }, [at])

  /** Opening focuses the checked item, else the first; later item changes do not move the focus. */
  const initialFocus = useRef(Math.max(0, items.findIndex((item) => item.checked)))
  useEffect(() => {
    buttons.current[initialFocus.current]?.focus()
  }, [])

  const radio = items.some((item) => item.checked !== undefined)

  // A press anywhere else closes the menu.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !trigger?.current?.contains(target)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [onClose, trigger])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = buttons.current.findIndex((button) => button === document.activeElement)
    const last = items.length - 1
    const moves: Record<string, number> = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    }
    if (event.key in moves) {
      event.preventDefault()
      buttons.current[moves[event.key]]?.focus()
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  return createPortal(
    <div
      ref={menu}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 flex min-w-40 flex-col rounded-md border border-om-border bg-om-surface-raised py-1 shadow-long"
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(element) => {
            buttons.current[index] = element
          }}
          type="button"
          role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
          aria-checked={item.checked}
          tabIndex={-1}
          aria-disabled={item.disabledReason ? true : undefined}
          aria-description={item.disabledReason}
          title={item.disabledReason}
          onClick={() => {
            if (item.disabledReason) return
            onClose()
            item.onSelect()
          }}
          className={cn(
            'flex h-control-height items-center gap-2 px-3 text-left type-body hover:bg-om-selection focus-visible:bg-om-selection',
            item.disabledReason ? 'control-disabled cursor-not-allowed' : item.danger ? 'text-om-danger' : 'text-om-text-primary',
          )}
        >
          {radio && <span className="flex size-4 shrink-0 items-center justify-center">{item.checked && <Check {...iconProps} />}</span>}
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
