import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/ui/lib/utils'

export interface TabItem<T extends string> {
  readonly id: T
  readonly label: string
}

/**
 * Horizontal tabs (ARIA tabs pattern): one tab stop on the selected tab; Left/Right arrows (wrapping),
 * Home and End move and select at once. `label` names the tab list; only the selected panel renders.
 * Looks: `label` type in text-secondary; the selected tab in text-primary with a 2 px accent underline.
 * `autoFocus` marks the selected tab `data-autofocus`, so a Dialog focuses it on open.
 */
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  autoFocus = false,
  children,
}: {
  label: string
  tabs: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  autoFocus?: boolean
  /** The selected tab's panel content. */
  children: ReactNode
}) {
  const base = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const selected = Math.max(0, tabs.findIndex((tab) => tab.id === value))
  const tabId = (index: number) => `${base}-tab-${index}`
  const panelId = `${base}-panel`

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const last = tabs.length - 1
    const moves: Record<string, number> = {
      ArrowRight: index >= last ? 0 : index + 1,
      ArrowLeft: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = moves[event.key]
    onChange(tabs[next].id)
    buttons.current[next]?.focus()
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div role="tablist" aria-label={label} className="flex shrink-0 gap-1 border-b border-om-border px-6">
        {tabs.map((tab, index) => {
          const isSelected = index === selected
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element
              }}
              id={tabId(index)}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={isSelected ? panelId : undefined}
              tabIndex={isSelected ? 0 : -1}
              data-autofocus={autoFocus && isSelected ? '' : undefined}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'relative h-control-height rounded-t-sm px-3 type-label focus-visible:z-10',
                isSelected
                  ? 'font-semibold text-om-text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-om-accent'
                  : 'text-om-text-secondary hover:bg-om-selection hover:text-om-text-primary',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(selected)} className="min-h-0 overflow-y-auto px-6 py-5">
        {children}
      </div>
    </div>
  )
}
