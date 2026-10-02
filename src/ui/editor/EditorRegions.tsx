import { MousePointer2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { OUTPUT_FRAME_SIZES, type OutputFormat } from '@/core'
import { cn } from '@/ui/lib/utils'
import { Tooltip } from '@/ui/components/Tooltip'
import { announce } from '@/ui/keyboard/announcer'
import { regionProps } from '@/ui/keyboard/regions'
import { setTool, useTool } from '@/ui/keyboard/tool-store'

// The named regions of the Editor (EXPERIENCE.md Accessibility Floor): top bar, tool rail, options
// bar, Map, properties panel, Timeline. Each is a jump target of Alt+1 to Alt+6 (`regionProps`):
// the container takes the focus, the Map is also a tab stop. The DOM order is the visual order.

/** The tool rail (UX-DR31): only Select in this story, active. `V` selects it (registered by the Editor). */
export function ToolRail({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()
  const tool = useTool()
  return (
    <nav aria-label={t('editor.regions.tools')} {...regionProps('rail')} className="flex flex-col items-center gap-0.5 border-r border-om-border bg-om-surface py-2 [grid-area:rail]">
      <Tooltip label={t('editor.tools.select')} shortcut={{ key: 'v' }}>
        {(tip) => (
          <button {...tip}
            type="button"
            aria-pressed={tool === 'select'}
            aria-disabled={disabled || undefined}
            aria-keyshortcuts="V"
            onClick={() => {
              if (disabled) return
              setTool('select')
              announce(t('editor.tools.selectActive'))
            }}
            className={cn(
              'relative flex h-rail-item-height w-18 flex-col items-center justify-center gap-1.5 rounded-sm bg-om-selection type-label-caps text-om-accent dark:text-om-text-primary',
              'before:absolute before:inset-y-1.5 before:-left-0.5 before:w-0.75 before:bg-om-accent',
              disabled && 'control-disabled',
            )}
          >
            <MousePointer2 size={20} aria-hidden className="icon-stroke shrink-0" />
            {t('editor.tools.select')}
          </button>
        )}
      </Tooltip>
    </nav>
  )
}

/**
 * The tool options bar (UX-DR32), above the Map and never over it. Left: the current Step reminder
 * (from Epic 3) and the tool options; right: the read-only Output Format label.
 */
export function OptionsBar({ outputFormat }: { outputFormat?: OutputFormat }) {
  const { t } = useTranslation()
  const size = outputFormat && OUTPUT_FRAME_SIZES[outputFormat]
  return (
    <section aria-label={t('editor.regions.toolOptions')} {...regionProps('options')} className="flex h-tool-options-bar-height shrink-0 items-center gap-2.5 bg-om-background px-4">
      <span className="flex-1" />
      {outputFormat && size && (
        <span data-testid="frame-size" className="type-caption whitespace-nowrap text-om-text-muted">
          {t('editor.frameSize', { format: outputFormat, width: size.width, height: size.height })}
        </span>
      )}
    </section>
  )
}

/** The properties panel (UX-DR33): always visible, scrolls inside. */
export function PropertiesPanel({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <aside aria-label={t('editor.regions.properties')} {...regionProps('panel')} className="min-h-0 overflow-y-auto border-l border-om-border bg-om-surface [grid-area:panel]">
      {children}
    </aside>
  )
}

/** Skeleton rows of the panel while the Project opens (UX-DR128). */
export function PanelSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 px-panel-padding-x py-4">
      <span className="om-skeleton block h-6 w-40" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <span className="om-skeleton block h-3 w-24" />
          <span className="om-skeleton block h-control-height w-full" />
        </div>
      ))}
    </div>
  )
}

/** The Timeline area, collapsed to its header and empty until Epic 3 (UX-DR127). */
export function TimelineArea() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('editor.regions.timeline')} {...regionProps('timeline')} className="flex h-timeline-collapsed-height items-center border-t border-om-border bg-om-surface px-4 [grid-area:timeline]">
      <h2 className="type-title-md text-om-text-primary">{t('editor.timeline')}</h2>
    </section>
  )
}
