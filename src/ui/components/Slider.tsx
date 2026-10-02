import { type CSSProperties, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/ui/lib/utils'

/**
 * Slider (DESIGN.md `slider`, UX Slider): a track with a thumb and a coupled numeric field with its
 * unit. One drag is one gesture: `onPreview` follows the thumb live, `onCommit` fires once on release
 * (pointer up, change, blur), so the caller makes one undo entry; a cancelled gesture (pointercancel)
 * drops the pending value through `onCancel`. Keys: ←/→ one step, Shift ten,
 * PageUp/PageDown ten, Home/End the bounds, each key press one commit; double-click restores the
 * default. The number field takes Enter or blur to commit; an invalid or empty entry keeps the
 * previous value. Disabled, it keeps its slot and ignores input (UX-DR8).
 */
export function Slider({
  label,
  valueLabel,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  unit,
  disabled = false,
  onPreview,
  onCommit,
  onCancel,
}: {
  label: string
  /** Accessible name of the number field. */
  valueLabel: string
  value: number
  min: number
  max: number
  step?: number
  defaultValue: number
  unit: string
  disabled?: boolean
  onPreview: (value: number) => void
  onCommit: (value: number) => void
  /** A gesture was cancelled (pointercancel): the preview must go back to the committed value. */
  onCancel?: () => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  /** The value of a gesture in progress, committed on release. */
  const pending = useRef<number | undefined>(undefined)
  const [draft, setDraft] = useState(String(value))
  const [shownValue, setShownValue] = useState(value)
  // Undo, redo, reset or a commit changed the value: show it.
  if (shownValue !== value) {
    setShownValue(value)
    setDraft(String(value))
  }

  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step))

  function commit(next: number) {
    pending.current = undefined
    onCommit(clamp(next))
  }

  function cancel() {
    if (pending.current === undefined) return
    pending.current = undefined
    onCancel?.()
  }

  function release() {
    if (pending.current !== undefined) commit(pending.current)
  }

  // The native `change` event ends a drag or a programmatic fill; React's onChange is the `input` event.
  const latestRelease = useRef(release)
  useEffect(() => {
    latestRelease.current = release
  })
  useEffect(() => {
    const element = input.current
    if (!element) return
    const onChange = () => latestRelease.current()
    element.addEventListener('change', onChange)
    return () => element.removeEventListener('change', onChange)
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || disabled) return
    const big = event.shiftKey ? 10 * step : step
    const keys: Record<string, number> = {
      ArrowRight: value + big,
      ArrowUp: value + big,
      ArrowLeft: value - big,
      ArrowDown: value - big,
      PageUp: value + 10 * step,
      PageDown: value - 10 * step,
      Home: min,
      End: max,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    const next = clamp(keys[event.key])
    if (next !== value) commit(next)
  }

  function commitField() {
    const parsed = Number(draft.trim().replace(',', '.'))
    if (draft.trim() === '' || !Number.isFinite(parsed)) return setDraft(String(value))
    const next = clamp(parsed)
    setDraft(String(next))
    if (next !== value) commit(next)
  }

  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label text-om-text-secondary">
        {label}
      </label>
      <div className={cn('flex items-center gap-2', disabled && 'control-disabled')}>
        <input
          ref={input}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={`${value} ${unit}`}
          style={{ '--om-slider-fill': `${fill}%` } as CSSProperties}
          onChange={(event) => {
            const next = clamp(Number(event.target.value))
            pending.current = next
            setDraft(String(next))
            onPreview(next)
          }}
          onPointerUp={release}
          onPointerCancel={cancel}
          onBlur={release}
          onKeyDown={onKeyDown}
          onDoubleClick={() => {
            if (!disabled && defaultValue !== value) commit(defaultValue)
          }}
          className="om-slider min-w-0 flex-1"
        />
        <input
          type="text"
          inputMode="numeric"
          aria-label={valueLabel}
          value={draft}
          disabled={disabled}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitField}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitField()
            } else if (event.key === 'Escape') {
              setDraft(String(value))
            }
          }}
          className="h-control-height w-14 min-w-0 shrink-0 rounded-sm border border-om-border-input bg-om-surface-raised px-2 text-right type-timecode text-om-text-primary"
        />
        <span aria-hidden className="w-4 shrink-0 type-caption text-om-text-muted">
          {unit}
        </span>
      </div>
    </div>
  )
}
