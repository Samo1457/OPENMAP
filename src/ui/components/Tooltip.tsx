import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { formatCombo, registerEscapeStep, TOOLTIP_ESCAPE_PRIORITY, type KeyCombo } from '@/ui/keyboard/registry'

/** Hover waits this long before showing (focus shows at once). */
const HOVER_DELAY_MS = 500
const GAP = 6
const VIEWPORT_MARGIN = 8

/** Leaving the control keeps the tooltip this long, so the pointer can reach it (WCAG 1.4.13 hoverable). */
const LEAVE_GRACE_MS = 150

interface Place {
  readonly x: number
  readonly top: number
  readonly bottom: number
}

/** What the control spreads onto itself: `<Tooltip label="…">{(tip) => <button {...tip} />}</Tooltip>`. */
export interface TooltipTrigger {
  'aria-describedby'?: string
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerDown: () => void
  onFocus: (event: FocusEvent<HTMLElement>) => void
  onBlur: () => void
}

/**
 * A tooltip (DESIGN.md `tooltip`: inverted colours, `rounded-sm`, caption type, no shadow): the
 * control's name and, when it has one, its shortcut, « Annuler · Ctrl+Z ». It shows after a short
 * hover delay and at once on keyboard focus (`:focus-visible`), hides on Escape, on a press and
 * shortly after the pointer leaves the control and the tooltip itself (it stays while hovered). It
 * is the control's `aria-describedby` while shown, unless the control has its own `describedBy`
 * (« Bientôt disponible »), which is then the only description, so it is not read twice. The control spreads the trigger props itself and stays the only element, so
 * layout does not change.
 */
export function Tooltip({ label, shortcut, describedBy, children }: { label: string; shortcut?: KeyCombo; describedBy?: string; children: (trigger: TooltipTrigger) => ReactElement }) {
  const { t } = useTranslation()
  const id = useId()
  const [place, setPlace] = useState<Place | undefined>()
  /** The control under the pointer, shown after the delay. */
  const [hovered, setHovered] = useState<HTMLElement | undefined>()
  /** The pointer left the control while the tooltip is shown: hide unless it reaches the tooltip. */
  const [leaving, setLeaving] = useState(false)
  const bubble = useRef<HTMLSpanElement>(null)
  const open = place !== undefined

  const hide = useCallback(() => {
    setHovered(undefined)
    setLeaving(false)
    setPlace(undefined)
  }, [])
  const show = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    setPlace({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom })
  }, [])

  useEffect(() => {
    if (!hovered) return
    const timer = setTimeout(() => show(hovered), HOVER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [hovered, show])
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(hide, LEAVE_GRACE_MS)
    return () => clearTimeout(timer)
  }, [leaving, hide])
  useEffect(() => {
    if (!open) return
    return registerEscapeStep({ id: `tooltip.${id}`, priority: TOOLTIP_ESCAPE_PRIORITY, run: () => (hide(), true) })
  }, [open, id, hide])

  // Centre under the control, kept inside the viewport; flipped above it when it would overflow the bottom.
  // Measured before paint, so the first frame is already in place.
  const [fit, setFit] = useState({ shift: 0, above: false })
  useLayoutEffect(() => {
    if (!place || !bubble.current) return setFit({ shift: 0, above: false })
    const { width, height } = bubble.current.getBoundingClientRect()
    const left = place.x - width / 2
    setFit({
      shift: Math.max(VIEWPORT_MARGIN - left, Math.min(0, window.innerWidth - VIEWPORT_MARGIN - (left + width))),
      above: place.bottom + GAP + height > window.innerHeight - VIEWPORT_MARGIN && place.top - GAP - height >= VIEWPORT_MARGIN,
    })
  }, [place])

  const text = shortcut ? t('keyboard.tooltip', { name: label, shortcut: formatCombo(shortcut, (key) => t(key as never)) }) : label
  const trigger: TooltipTrigger = {
    'aria-describedby': describedBy ?? (open ? id : undefined),
    onPointerEnter: (event) => {
      if (event.pointerType === 'touch') return
      setLeaving(false)
      setHovered(event.currentTarget)
    },
    onPointerLeave: () => (open ? setLeaving(true) : hide()),
    onPointerDown: hide,
    onFocus: (event) => {
      const element = event.currentTarget
      // Keyboard focus only: a click focuses without the tooltip.
      let visible = false
      try {
        visible = element.matches(':focus-visible')
      } catch {
        visible = false
      }
      if (visible) show(element)
    },
    onBlur: hide,
  }

  return (
    <>
      {children(trigger)}
      {place &&
        createPortal(
          <span
            ref={bubble}
            id={id}
            role="tooltip"
            style={{ left: place.x + fit.shift, top: fit.above ? place.top - GAP : place.bottom + GAP }}
            onPointerEnter={() => setLeaving(false)}
            onPointerLeave={hide}
            className={`fixed z-60 max-w-64 -translate-x-1/2 ${fit.above ? '-translate-y-full' : ''} rounded-sm bg-om-text-primary px-2 py-1 type-caption whitespace-nowrap text-om-background`}
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  )
}
