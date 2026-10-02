import { ChevronDown } from 'lucide-react'
import { Children, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { iconProps } from '@/ui/components/button'
import { cn } from '@/ui/lib/utils'

/** Expanded « Plus d'options » rows, per panel type, for the session (UX-DR34). */
const expandedPanels = new Set<string>()

/**
 * The « Plus d'options » row (DESIGN.md `more-options-row`, UX-DR34, NFR-9): at the bottom of a
 * panel, it summarises the advanced settings and expands them in place. A panel with no advanced
 * setting shows no row.
 */
export function MoreOptions({ panel, summary, children }: { panel: string; summary?: string; children?: ReactNode }) {
  if (Children.toArray(children).length === 0) return null
  return (
    <MoreOptionsRow panel={panel} summary={summary}>
      {children}
    </MoreOptionsRow>
  )
}

function MoreOptionsRow({ panel, summary, children }: { panel: string; summary?: string; children: ReactNode }) {
  const { t } = useTranslation()
  const contentId = useId()
  const [expanded, setExpanded] = useState(() => expandedPanels.has(panel))
  const toggle = () => {
    const next = !expanded
    if (next) expandedPanels.add(panel)
    else expandedPanels.delete(panel)
    setExpanded(next)
  }
  return (
    <div className="border-t border-om-border">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={toggle}
        className="group flex h-11 w-full items-center gap-2 px-panel-padding-x text-left hover:bg-om-selection"
      >
        <span className="type-body-strong text-om-text-primary">{t('editor.moreOptions')}</span>
        <span className="min-w-0 flex-1 truncate text-right type-caption text-om-text-muted group-hover:text-om-text-secondary">{summary}</span>
        <ChevronDown {...iconProps} className={cn('icon-stroke shrink-0 text-om-text-secondary', expanded && 'rotate-180')} />
      </button>
      <div id={contentId} hidden={!expanded} className="px-panel-padding-x pb-3">
        {children}
      </div>
    </div>
  )
}

/** Test seam: forgets the remembered rows (a new session). */
export function resetMoreOptionsMemory(): void {
  expandedPanels.clear()
}
