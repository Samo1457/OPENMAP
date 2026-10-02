import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/ui/lib/utils'
import { buttonClass, iconProps } from './button'

/** EXPERIENCE.md Toasts: information 4 s, with an action 8 s, an error stays until closed. */
export const INFO_TOAST_MS = 4000
export const ACTION_TOAST_MS = 8000

export type ToastTone = 'info' | 'success' | 'error'
/** Why a toast closed: its action, its time ran out, or the user closed it. */
export type ToastCloseReason = 'action' | 'expired' | 'dismissed'

export interface ToastOptions {
  readonly tone: ToastTone
  readonly title: string
  readonly description?: string
  readonly action?: { readonly label: string }
  /**
   * Called exactly once, when the toast leaves the screen. `hadFocus`: the focus was in the toast,
   * so the caller should move it somewhere useful (it would fall to the page otherwise).
   */
  readonly onClose?: (reason: ToastCloseReason, details: { readonly hadFocus: boolean }) => void
}

interface QueuedToast extends ToastOptions {
  readonly id: number
}

type ShowToast = (options: ToastOptions) => void

const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const show = use(ToastContext)
  if (!show) throw new Error('useToast needs a ToastProvider.')
  return show
}

const durationOf = (toast: ToastOptions) => (toast.tone === 'error' ? undefined : toast.action ? ACTION_TOAST_MS : INFO_TOAST_MS)

/**
 * Toasts at the bottom right (DESIGN.md `toast`): one visible at a time, the next ones queued.
 * The timer pauses while the pointer or the focus is on the toast, so its action stays reachable.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<readonly QueuedToast[]>([])
  const nextId = useRef(1)

  const show = useCallback<ShowToast>((options) => {
    const id = nextId.current++
    setQueue((current) => [...current, { ...options, id }])
  }, [])

  const close = useCallback((toast: QueuedToast, reason: ToastCloseReason, hadFocus: boolean) => {
    setQueue((current) => current.filter((queued) => queued.id !== toast.id))
    toast.onClose?.(reason, { hadFocus })
  }, [])

  const current = queue[0]
  const { t } = useTranslation()

  return (
    <ToastContext value={show}>
      {children}
      {/* Live regions stay mounted so a new toast is announced: polite for information, assertive for errors.
          Their own <body>-level layer, above a modal dialog and never made inert by it. */}
      {createPortal(
        <section data-above-dialog aria-label={t('toast.region')} className="om-toast-region pointer-events-none fixed right-6 bottom-6 z-60 flex w-90 max-w-[calc(100vw-48px)] flex-col">
          <div role="status" aria-live="polite">
            {current && current.tone !== 'error' && <Toast key={current.id} toast={current} onClose={(reason, hadFocus) => close(current, reason, hadFocus)} />}
          </div>
          <div role="alert" aria-live="assertive">
            {current && current.tone === 'error' && <Toast key={current.id} toast={current} onClose={(reason, hadFocus) => close(current, reason, hadFocus)} />}
          </div>
        </section>,
        document.body,
      )}
    </ToastContext>
  )
}

const toneIcon = {
  info: <Info {...iconProps} className="icon-stroke shrink-0 text-om-text-secondary" />,
  success: <CircleCheck {...iconProps} className="icon-stroke shrink-0 text-om-success" />,
  error: <CircleAlert {...iconProps} className="icon-stroke shrink-0 text-om-danger" />,
}

function Toast({ toast, onClose }: { toast: QueuedToast; onClose: (reason: ToastCloseReason, hadFocus: boolean) => void }) {
  const { t } = useTranslation()
  const duration = durationOf(toast)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(duration ?? 0)
  const closed = useRef(false)
  const element = useRef<HTMLDivElement>(null)

  const finish = useCallback(
    (reason: ToastCloseReason) => {
      if (closed.current) return
      closed.current = true
      onClose(reason, element.current?.contains(document.activeElement) ?? false)
    },
    [onClose],
  )

  const paused = hovered || focused
  useEffect(() => {
    if (duration === undefined || paused) return
    const startedAt = Date.now()
    const timer = setTimeout(() => finish('expired'), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [duration, paused, finish])

  return (
    <div
      ref={element}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
      className="pointer-events-auto flex items-start gap-3 rounded-md border border-om-border bg-om-surface-raised py-3 pr-2 pl-3 shadow-short"
    >
      <span className="mt-0.5">{toneIcon[toast.tone]}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-body-strong text-om-text-primary">{toast.title}</span>
        {toast.description && <span className="type-caption text-om-text-secondary">{toast.description}</span>}
      </div>
      {toast.action && (
        <button type="button" className={buttonClass.secondarySmall} onClick={() => finish('action')}>
          {toast.action.label}
        </button>
      )}
      <button type="button" aria-label={t('toast.close')} title={t('toast.close')} className={cn(buttonClass.ghostIcon, 'size-control-height-sm')} onClick={() => finish('dismissed')}>
        <X {...iconProps} />
      </button>
    </div>
  )
}
