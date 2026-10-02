import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/ui/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Language of the label when it differs from the page, e.g. "Français" (WCAG 3.1.2). */
  lang?: string
}

/**
 * Exclusive choice of 2 to 4 options (DESIGN.md `segmented-control`): a radio
 * group with one tab stop; arrow keys, Home and End move the choice. Disabled
 * (UX-DR8), it keeps its slot and its tab stop so the value stays readable, but ignores input.
 */
export function SegmentedControl<T extends string>({
  labelledBy,
  options,
  value,
  onChange,
  disabled = false,
}: {
  labelledBy: string
  options: readonly SegmentedOption<T>[]
  /** The chosen option; none is chosen when it is undefined (an unknown stored value). */
  value?: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  // With no matching value, the first option keeps the group reachable with Tab.
  const tabStop = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  function select(index: number) {
    const option = options[(index + options.length) % options.length]
    onChange(option.value)
    buttons.current[options.indexOf(option)]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !(event.key in moves)) return
    event.preventDefault()
    if (disabled) return
    select(moves[event.key])
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      className={cn('inline-flex h-control-height rounded-sm border border-om-border-input bg-om-surface-raised', disabled && 'control-disabled')}
    >
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            tabIndex={index === tabStop ? 0 : -1}
            lang={option.lang}
            onClick={() => {
              if (!disabled && !checked) onChange(option.value)
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative min-w-hit-area-min px-3 type-label text-om-text-secondary focus-visible:z-10',
              'not-first:border-l not-first:border-om-border',
              disabled ? 'cursor-not-allowed' : 'hover:bg-om-selection hover:text-om-text-primary',
              checked &&
                'bg-om-selection font-semibold text-om-text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-om-accent',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
