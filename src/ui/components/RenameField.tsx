import { useEffect, useRef, useState } from 'react'
import { PROJECT_NAME_MAX_LENGTH } from '@/core'
import { cn } from '@/ui/lib/utils'

/**
 * In-place rename (Story 1.4 decision): Enter or leaving the field commits, Escape cancels, an
 * empty name keeps the previous one. `onCommit` receives a changed, non-blank name only.
 */
export function RenameField({
  value,
  label,
  onCommit,
  onCancel,
  className,
}: {
  value: string
  label: string
  onCommit: (name: string) => void
  onCancel: () => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const input = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  function finish(commit: boolean) {
    if (done.current) return
    done.current = true
    const name = draft.trim()
    if (commit && name !== '' && name !== value) onCommit(name)
    else onCancel()
  }

  return (
    <input
      ref={input}
      type="text"
      aria-label={label}
      value={draft}
      spellCheck={false}
      // The name limit counts code points (core `projectNameSchema`), not UTF-16 units.
      onChange={(event) => setDraft(Array.from(event.target.value).slice(0, PROJECT_NAME_MAX_LENGTH).join(''))}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          finish(true)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          finish(false)
        }
      }}
      className={cn(
        'h-control-height-sm w-full min-w-0 rounded-sm border border-om-border-input bg-om-surface-raised px-2 type-body text-om-text-primary',
        className,
      )}
    />
  )
}
