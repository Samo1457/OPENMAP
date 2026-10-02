import { ChevronDown, Ellipsis, Play, Redo2, Search, Settings, Undo2, Upload } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OUTPUT_FORMATS, type OutputFormat } from '@/core'
import { buttonLook, iconProps } from '@/ui/components/button'
import { Menu, type MenuPoint } from '@/ui/components/Menu'
import { TopBar } from '@/ui/components/TopBar'
import { cn } from '@/ui/lib/utils'
import { homeHref } from '@/ui/routing'
import { SettingsPanel } from '@/ui/settings/SettingsPopover'
import type { EditorActions, EditorModel } from './editor-model'
import type { SaveIndicatorStore } from './save-status'
import { SaveStatus } from './SaveStatus'

/**
 * The Editor top bar (UX-DR30): breadcrumb, save status, Output Format menu, undo/redo, the place
 * search slot (Story 1.12), Presentation and Export (disabled until their stories) and the « ⋯ » menu.
 */
export function EditorTopBar({ model, actions, saveStatus }: { model: EditorModel; actions?: EditorActions; saveStatus?: SaveIndicatorStore }) {
  const { t } = useTranslation()
  const editable = !model.readOnly && actions !== undefined
  /** « Bientôt disponible », the description of the slots whose stories come later. */
  const comingSoonId = useId()
  return (
    <TopBar label={t('editor.regions.topBar')} end={<EditorMenu />}>
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
        <button
          type="button"
          aria-label={t('editor.undo')}
          title={t('editor.undoTooltip')}
          aria-keyshortcuts="Control+Z"
          aria-disabled={!(editable && model.canUndo)}
          onClick={() => editable && model.canUndo && actions?.undo()}
          className={buttonLook('ghostIcon', !(editable && model.canUndo))}
        >
          <Undo2 {...iconProps} />
        </button>
        <button
          type="button"
          aria-label={t('editor.redo')}
          title={t('editor.redoTooltip')}
          aria-keyshortcuts="Control+Shift+Z Control+Y"
          aria-disabled={!(editable && model.canRedo)}
          onClick={() => editable && model.canRedo && actions?.redo()}
          className={buttonLook('ghostIcon', !(editable && model.canRedo))}
        >
          <Redo2 {...iconProps} />
        </button>
      </div>
      <span className="flex-1" />
      <span id={comingSoonId} hidden>
        {t('editor.comingSoon')}
      </span>
      <SearchSlot describedBy={comingSoonId} />
      <button type="button" aria-disabled title={t('editor.comingSoon')} aria-describedby={comingSoonId} className={buttonLook('secondary', true)}>
        <Play {...iconProps} />
        {t('editor.presentation')}
      </button>
      <button type="button" aria-disabled title={t('editor.comingSoon')} aria-describedby={comingSoonId} className={buttonLook('primary', true)}>
        <Upload {...iconProps} />
        {t('editor.export')}
      </button>
    </TopBar>
  )
}

/** « Rechercher un lieu »: the search itself, and its `/` shortcut, arrive in Story 1.12. */
function SearchSlot({ describedBy }: { describedBy: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-control-height-sm w-55 min-w-24 shrink items-center gap-2 rounded-sm border border-om-border-input bg-om-surface-raised px-2 control-disabled">
      <Search {...iconProps} className="icon-stroke shrink-0 text-om-text-secondary" />
      <input
        type="search"
        readOnly
        aria-disabled
        aria-label={t('editor.search')}
        aria-describedby={describedBy}
        title={t('editor.comingSoon')}
        placeholder={t('editor.search')}
        className="min-w-0 flex-1 cursor-not-allowed bg-transparent type-label text-om-text-primary outline-none placeholder:text-om-text-muted"
      />
    </div>
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

/**
 * The « ⋯ » menu: « Réglages » for now (Project File arrives in Epic 7). Settings opens the
 * temporary Appearance and Language panel until Story 1.6 brings the dialog.
 */
function EditorMenu() {
  const { t } = useTranslation()
  const button = useRef<HTMLButtonElement>(null)
  const [menuAt, setMenuAt] = useState<MenuPoint | undefined>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeMenu = useCallback(() => {
    setMenuAt(undefined)
    button.current?.focus()
  }, [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const settingsId = useId()

  return (
    <div className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={t('editor.menu')}
        title={t('editor.menu')}
        aria-haspopup="menu"
        aria-expanded={menuAt !== undefined || settingsOpen}
        aria-controls={settingsOpen ? settingsId : undefined}
        onClick={() => {
          if (menuAt) return setMenuAt(undefined)
          setSettingsOpen(false)
          const rect = button.current?.getBoundingClientRect()
          setMenuAt(rect ? { x: rect.left, y: rect.bottom + 4 } : { x: 0, y: 0 })
        }}
        className={buttonLook('ghostIcon')}
      >
        <Ellipsis {...iconProps} />
      </button>
      {menuAt && (
        <Menu
          label={t('editor.menu')}
          at={menuAt}
          trigger={button}
          onClose={closeMenu}
          items={[{ id: 'settings', label: t('settings.title'), icon: <Settings {...iconProps} />, onSelect: () => setSettingsOpen(true) }]}
        />
      )}
      {settingsOpen && <SettingsPanel id={settingsId} owner={button} onClose={closeSettings} />}
    </div>
  )
}
