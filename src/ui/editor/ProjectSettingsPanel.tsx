import { CircleAlert } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type MapLocale, OUTPUT_FORMATS, type OutputFormat, PROJECT_NAME_MAX_LENGTH } from '@/core'
import { iconProps } from '@/ui/components/button'
import { SegmentedControl, type SegmentedOption } from '@/ui/components/SegmentedControl'
import { isSaveKey } from '@/ui/keyboard/registry'
import { cn } from '@/ui/lib/utils'
import type { EditorActions, EditorModel } from './editor-model'
import { BasemapSettings } from './BasemapSettings'
import { CreditSettings } from './CreditSettings'
import { ReferenceDateField } from './ReferenceDateField'
import { SourcesSection } from './SourcesSection'
import { MoreOptions } from './MoreOptions'
import { registerPendingEdit } from './pending-edits'

/**
 * The panel when nothing is selected: Project settings (UX-DR35). Essential settings only (NFR-9):
 * name, Reference Date, Output Format, Map language and Basemap (picker, brightness, saturation, tint); Region joins in a later story.
 * Behind « Plus d'options »: the credit position and prominence, and « Sources et licences » (Story 1.13).
 * Every change is one Command, applied at once with no « Appliquer » button.
 */
export function ProjectSettingsPanel({ model, actions }: { model: EditorModel; actions?: EditorActions }) {
  const { t } = useTranslation()
  const formatLabel = useId()
  const localeLabel = useId()
  const editable = !model.readOnly && actions !== undefined
  const formats: SegmentedOption<OutputFormat>[] = OUTPUT_FORMATS.map((format) => ({ value: format, label: format }))
  const locales: SegmentedOption<MapLocale>[] = [
    { value: 'fr', label: t('settings.language.fr'), lang: 'fr' },
    { value: 'en', label: t('settings.language.en'), lang: 'en' },
  ]

  return (
    <>
      <div className="border-b border-om-border px-panel-padding-x py-3">
        <h2 className="type-title-lg text-om-text-primary">{t('editor.projectSettings')}</h2>
      </div>
      <div className="flex flex-col gap-3 px-panel-padding-x py-3">
        <ProjectNameField
          name={model.name ?? ''}
          readOnly={!editable}
          onCommit={(name) => actions?.dispatch({ type: 'SET_PROJECT_NAME', payload: { name } }) ?? false}
          onPageHide={actions?.saveOnPageHide}
        />
        {model.referenceDate && model.mapLocale && (
          <ReferenceDateField
            year={model.referenceDate.year}
            mapLocale={model.mapLocale}
            readOnly={!editable}
            geo={model.geo}
            dataDate={model.dataDate}
            onCommit={(year) => actions?.dispatch({ type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year } } }) ?? false}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <span id={formatLabel} className="type-label text-om-text-secondary">
            {t('editor.outputFormat')}
          </span>
          <SegmentedControl
            labelledBy={formatLabel}
            options={formats}
            value={model.outputFormat}
            disabled={!editable}
            onChange={(outputFormat) => actions?.dispatch({ type: 'SET_OUTPUT_FORMAT', payload: { outputFormat } })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span id={localeLabel} className="type-label text-om-text-secondary">
            {t('editor.mapLocale')}
          </span>
          <SegmentedControl
            labelledBy={localeLabel}
            options={locales}
            value={model.mapLocale}
            disabled={!editable}
            onChange={(mapLocale) => actions?.dispatch({ type: 'SET_MAP_LOCALE', payload: { mapLocale } })}
          />
        </div>
        {model.basemap && <BasemapSettings basemap={model.basemap} actions={actions} editable={editable} />}
      </div>
      {/* The advanced group: the Map credit placement and « Sources et licences » (Story 1.13); Front Line joins later. */}
      {/* A document newer than the app has no Map to credit. */}
      <MoreOptions panel="project" summary={t('editor.sources.title')}>
        {model.credit && (
          <div className="flex flex-col gap-4">
            <CreditSettings credit={model.credit} creditText={model.creditText} actions={actions} editable={editable} />
            <SourcesSection sources={model.sources ?? []} />
          </div>
        )}
      </MoreOptions>
    </>
  )
}

/**
 * The Project name. Typing is one gesture: Enter, leaving the field or Ctrl+S commits it as one
 * SET_PROJECT_NAME (one undo entry); so do leaving the Editor and `pagehide`, so a typed name is
 * not lost. Escape restores the name. An unusable name keeps the previous one and says so (and
 * Ctrl+S then confirms nothing). Read-only, the value keeps its colour but loses border and caret
 * (UX-DR33).
 */
function ProjectNameField({ name, readOnly, onCommit, onPageHide }: { name: string; readOnly: boolean; onCommit: (name: string) => boolean; onPageHide?: () => void }) {
  const { t } = useTranslation()
  const inputId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState(name)
  const [invalid, setInvalid] = useState(false)
  /** Set by Escape: the blur that follows restores the name instead of committing the draft. */
  const skipBlurCommit = useRef(false)

  // Undo, redo or a commit changed the name: show it.
  const [shown, setShown] = useState(name)
  if (shown !== name) {
    setShown(name)
    setDraft(name)
  }

  /** Commits the draft; false when it was refused. */
  function commit(): boolean {
    if (readOnly) return true
    const next = draft.trim()
    if (next === name) {
      setDraft(name)
      return true
    }
    const ok = next !== '' && onCommit(next)
    setInvalid(!ok)
    if (!ok) setDraft(name)
    return ok
  }

  // Leaving the Editor (unmount) or the page (`pagehide`) commits a typed name. Layout-effect
  // cleanup runs before the Editor's autosave closes. On `pagehide` the app's own page-hide save may
  // already have run, so the commit is followed by a synchronous save of its own (AD-8).
  const latestCommit = useRef(commit)
  useLayoutEffect(() => {
    latestCommit.current = commit
  })
  const latestPageHide = useRef(onPageHide)
  useLayoutEffect(() => {
    latestPageHide.current = onPageHide
  })
  // A takeover commits the draft before the holder's last save.
  useLayoutEffect(() => registerPendingEdit(() => latestCommit.current()), [])
  useLayoutEffect(() => {
    const onPageHideEvent = () => {
      latestCommit.current()
      latestPageHide.current?.()
    }
    window.addEventListener('pagehide', onPageHideEvent)
    return () => {
      window.removeEventListener('pagehide', onPageHideEvent)
      latestCommit.current()
    }
  }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="type-label text-om-text-secondary">
        {t('project.nameField')}
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        readOnly={readOnly}
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        // The name limit counts code points (core `projectNameSchema`), not UTF-16 units.
        onChange={(event) => {
          setInvalid(false)
          skipBlurCommit.current = false
          setDraft(Array.from(event.target.value).slice(0, PROJECT_NAME_MAX_LENGTH).join(''))
        }}
        onBlur={() => {
          if (skipBlurCommit.current) {
            skipBlurCommit.current = false
            return
          }
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            // Restores the name; the shortcut registry then leaves the field (blur), which must not commit.
            setDraft(name)
            setInvalid(false)
            skipBlurCommit.current = true
            event.currentTarget.blur()
          } else if (isSaveKey(event.nativeEvent)) {
            // A refused name: Ctrl+S is handled here (no browser dialog) and confirms nothing.
            if (!commit()) event.preventDefault()
          }
        }}
        className={cn(
          'h-control-height w-full min-w-0 rounded-sm border px-2 type-body text-om-text-primary',
          readOnly ? 'border-transparent bg-transparent caret-transparent' : 'border-om-border-input bg-om-surface-raised',
        )}
      />
      {invalid && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 type-caption text-om-danger">
          <CircleAlert {...iconProps} />
          {t('editor.renameError')}
        </p>
      )}
    </div>
  )
}
