import { X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { editorShortcut } from '@/ui/editor/editor-shortcuts'
import { cn } from '@/ui/lib/utils'
import { buttonClass, iconProps } from './button'
import { focusableWithin, nextFocusIndex } from './focus-trap'

/**
 * Marks a `<body>`-level layer that stays usable above a modal dialog (the toasts, UX-DR105):
 * the dialog never makes it inert. The toast region carries it.
 */
export const ABOVE_DIALOG_ATTRIBUTE = 'data-above-dialog'

/**
 * A modal dialog (DESIGN.md `dialog`, UX-DR67): surface-raised panel with border, `rounded-md`,
 * long shadow and a `title-lg` heading, over the `dialog-scrim`. While open, the rest of the page is
 * inert and Tab cycles inside; Escape, the close button (×) and a click on the scrim close it, and
 * the focus returns to `returnFocus` (by default the element focused when it opened), or to
 * `fallbackFocus` when that element is gone. The first element marked `data-autofocus`, else the
 * first focusable one, takes the focus on open. The page behind does not scroll. Keys pressed inside
 * never reach page-level shortcuts, and Ctrl/Cmd+S never opens the browser's Save page. The caller
 * renders it only while open.
 */
export function Dialog({
  title,
  closeLabel,
  onClose,
  returnFocus,
  fallbackFocus,
  className,
  children,
}: {
  title: string
  /** Accessible name of the close button (×). */
  closeLabel: string
  onClose: () => void
  returnFocus?: HTMLElement | null
  /** Where the focus goes on close when `returnFocus` is no longer in the page (e.g. the menu button). */
  fallbackFocus?: HTMLElement | null
  /** Width and layout of the panel, e.g. `w-export-dialog-width`. */
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  const layer = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  // The element to give the focus back to, fixed when the dialog opens.
  const [restoreTo] = useState(() => returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null))

  // Everything outside the dialog is inert while it is open (one modal level, UX-DR67), including
  // what is added to <body> later; layers marked ABOVE_DIALOG_ATTRIBUTE stay usable.
  useLayoutEffect(() => {
    const made: Element[] = []
    const makeInert = (element: Element) => {
      if (element === layer.current || element.hasAttribute(ABOVE_DIALOG_ATTRIBUTE) || element.hasAttribute('inert') || element.tagName === 'SCRIPT') return
      element.setAttribute('inert', '')
      made.push(element)
    }
    Array.from(document.body.children).forEach(makeInert)
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of Array.from(record.addedNodes)) if (node instanceof Element && node.parentElement === document.body) makeInert(node)
    })
    observer.observe(document.body, { childList: true })
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      observer.disconnect()
      for (const element of made) element.removeAttribute('inert')
      root.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    const element = panel.current
    if (!element) return
    const target = element.querySelector<HTMLElement>('[data-autofocus]') ?? focusableWithin(element)[0] ?? element
    target.focus()
    return () => {
      const back = restoreTo?.isConnected ? restoreTo : fallbackFocus?.isConnected ? fallbackFocus : undefined
      back?.focus()
    }
  }, [restoreTo, fallbackFocus])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Page-level shortcuts (undo, save…) never act behind a modal dialog.
    event.stopPropagation()
    // The Editor's Ctrl/Cmd+S handler no longer sees the key: still keep the browser's Save page away.
    if (editorShortcut(event) === 'save') {
      event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Tab' && panel.current) {
      const stops = focusableWithin(panel.current)
      const next = nextFocusIndex(stops.length, stops.indexOf(document.activeElement as HTMLElement), event.shiftKey)
      event.preventDefault()
      if (next !== undefined) stops[next].focus()
    }
  }

  return createPortal(
    <div ref={layer} className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        aria-hidden
        data-testid="dialog-scrim"
        className="absolute inset-0 bg-om-dialog-scrim"
        // Keep the focus in the dialog until the click closes it, so it goes back to the trigger.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex max-h-full max-w-full flex-col rounded-md border border-om-border bg-om-surface-raised shadow-long outline-none',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 pb-3">
          <h2 id={titleId} className="type-title-lg text-om-text-primary">
            {title}
          </h2>
          <button type="button" aria-label={closeLabel} title={closeLabel} onClick={onClose} className={buttonClass.ghostIcon}>
            <X {...iconProps} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
