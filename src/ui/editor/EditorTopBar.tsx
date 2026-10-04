import { ChevronDown, Play, Redo2, Undo2, Upload } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type EntityCandidate, OUTPUT_FORMATS, type OutputFormat, type Size } from '@/core'
import { buttonLook, iconProps } from '@/ui/components/button'
import { Menu, type MenuPoint } from '@/ui/components/Menu'
import { Tooltip } from '@/ui/components/Tooltip'
import { TopBar } from '@/ui/components/TopBar'
import { REDO_COMBO, UNDO_COMBO } from '@/ui/keyboard/editor-shortcuts'
import { cn } from '@/ui/lib/utils'
import { homeHref } from '@/ui/routing'
import type { EditorActions, EditorModel } from './editor-model'
import type { SaveIndicatorStore } from './save-status'
import { PlaceSearch } from './PlaceSearch'
import { SaveStatus } from './SaveStatus'

/**
 * The Editor top bar (UX-DR30): breadcrumb, save status, Output Format menu, undo/redo, the place
 * place search (Story 1.12), Presentation and Export (disabled until their stories) and the « ⋯ » menu
 * (TopBar's default end slot).
 */
export function EditorTopBar({
  model,
  actions,
  saveStatus,
  search,
}: {
  model: EditorModel
  actions?: EditorActions
  saveStatus?: SaveIndicatorStore
  /** What the place search needs from the open Project: the output frame (reference px) and the GeoEntities valid at the data date. */
  search?: { frame?: Size; entities: readonly EntityCandidate[] }
}) {
  const { t } = useTranslation()
  const editable = !model.readOnly && actions !== undefined
  /** « Bientôt disponible », the description of the slots whose stories come later. */
  const comingSoonId = useId()
  return (
    <TopBar label={t('editor.regions.topBar')} region>
      <span aria-hidden className="h-6 w-px shrink-0 bg-om-border" />
      <nav aria-label={t('editor.breadcrumb')} className="flex min-w-0 items-center gap-2">
        <a href={homeHref} className="shrink-0 rounded-sm px-1 type-label text-om-accent hover:text-om-accent-hover hover:underline">
          {t('home.title')}
        </a>
        <span aria-hidden className="type-label text-om-text-muted">
          /
        </span>
        {model.loading ? (
          <span className="type-label whitespace-nowrap text-om-text-secondary">{t('editor.opening')}</span>
        ) : (
          <span aria-current="page" title={model.name || t('project.defaultName')} className="min-w-0 truncate type-title-md text-om-text-primary">
            {model.name || t('project.defaultName')}
          </span>
        )}
      </nav>
      {saveStatus && <SaveStatus store={saveStatus} />}
      <span aria-hidden className="h-6 w-px shrink-0 bg-om-border" />
      <OutputFormatMenu value={model.outputFormat} loading={model.loading} disabled={!editable} onChange={(outputFormat) => actions?.dispatch({ type: 'SET_OUTPUT_FORMAT', payload: { outputFormat } })} />
      <div className="flex shrink-0 items-center">
        <Tooltip label={t('editor.undo')} shortcut={UNDO_COMBO}>
          {(tip) => (
            <button {...tip}
              type="button"
              aria-label={t('editor.undo')}
              aria-keyshortcuts="Control+Z"
              aria-disabled={!(editable && model.canUndo)}
              onClick={() => editable && model.canUndo && actions?.undo()}
              className={buttonLook('ghostIcon', !(editable && model.canUndo))}
            >
              <Undo2 {...iconProps} />
            </button>
          )}
        </Tooltip>
        <Tooltip label={t('editor.redo')} shortcut={REDO_COMBO}>
          {(tip) => (
            <button {...tip}
              type="button"
              aria-label={t('editor.redo')}
              aria-keyshortcuts="Control+Shift+Z Control+Y"
              aria-disabled={!(editable && model.canRedo)}
              onClick={() => editable && model.canRedo && actions?.redo()}
              className={buttonLook('ghostIcon', !(editable && model.canRedo))}
            >
              <Redo2 {...iconProps} />
            </button>
          )}
        </Tooltip>
      </div>
      <span className="flex-1" />
      <span id={comingSoonId} hidden>
        {t('common.comingSoon')}
      </span>
      <PlaceSearch frame={search?.frame} entities={search?.entities ?? []} />
      <Tooltip label={t('common.comingSoon')} describedBy={comingSoonId}>
        {(tip) => (
          <button {...tip} type="button" aria-disabled className={buttonLook('secondary', true)}>
            <Play {...iconProps} />
            {t('editor.presentation')}
          </button>
        )}
      </Tooltip>
      <Tooltip label={t('common.comingSoon')} describedBy={comingSoonId}>
        {(tip) => (
          <button {...tip} type="button" aria-disabled className={buttonLook('primary', true)}>
            <Upload {...iconProps} />
            {t('editor.export')}
          </button>
        )}
      </Tooltip>
    </TopBar>
  )
}

/** « Format de sortie » and its menu, 16:9 · 9:16 · 1:1 (UX-DR30, FR-50). */
function OutputFormatMenu({ value, loading, disabled, onChange }: { value?: OutputFormat; loading: boolean; disabled: boolean; onChange: (format: OutputFormat) => void }) {
  const { t } = useTranslation()
  const labelId = useId()
  const buttonId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const [menuAt, setMenuAt] = useState<MenuPoint | undefined>()
  const close = useCallback(() => {
    setMenuAt(undefined)
    button.current?.focus()
  }, [])

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span id={labelId} className="type-label whitespace-nowrap text-om-text-secondary">
        {t('editor.outputFormat')}
      </span>
      {loading ? (
        <span aria-hidden className="om-skeleton block h-control-height-sm w-16" />
      ) : (
        <button
          ref={button}
          id={buttonId}
          type="button"
          aria-labelledby={`${labelId} ${buttonId}`}
          aria-haspopup="menu"
          aria-expanded={menuAt !== undefined}
          aria-disabled={disabled || undefined}
          onClick={() => {
            if (disabled) return
            if (menuAt) return setMenuAt(undefined)
            const rect = button.current?.getBoundingClientRect()
            setMenuAt(rect ? { x: rect.left, y: rect.bottom + 4 } : { x: 0, y: 0 })
          }}
          className={cn(
            'flex h-control-height-sm items-center gap-1.5 rounded-sm border border-om-border-input bg-om-surface-raised px-2 type-label font-semibold text-om-text-primary',
            disabled ? 'control-disabled' : 'hover:bg-om-selection',
          )}
        >
          {value ?? t('editor.unknownValue')}
          <ChevronDown {...iconProps} />
        </button>
      )}
      {menuAt && (
        <Menu
          label={t('editor.outputFormat')}
          at={menuAt}
          trigger={button}
          onClose={close}
          items={OUTPUT_FORMATS.map((format) => ({ id: format, label: format, checked: format === value, onSelect: () => onChange(format) }))}
        />
      )}
    </div>
  )
}
