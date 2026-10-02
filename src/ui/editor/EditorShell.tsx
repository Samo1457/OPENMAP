import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { type Command, createDispatcher, type Dispatcher, type DispatcherState, evaluate, type MapLocale, OUTPUT_FRAME_SIZES, type OutputFormat, type Scene } from '@/core'
import { type Autosave, createAutosave, openStoredProject } from '@/persistence'
import { Banner } from '@/ui/components/Banner'
import { useToast } from '@/ui/components/toast'
import { TopBar } from '@/ui/components/TopBar'
import { SmallWindowBanner } from '@/ui/gate/EnvironmentBanners'
import { announce, useAnnouncement } from '@/ui/keyboard/announcer'
import { editorShortcuts } from '@/ui/keyboard/editor-shortcuts'
import { regionShortcuts } from '@/ui/keyboard/regions'
import { registerEscapeStep, registerShortcuts } from '@/ui/keyboard/registry'
import { returnToSelect, selectToolShortcut } from '@/ui/keyboard/tool-store'
import { homeHref } from '@/ui/routing'
import type { EditorActions, EditorModel } from './editor-model'
import { EditorTopBar } from './EditorTopBar'
import { OptionsBar, PanelSkeleton, PropertiesPanel, TimelineArea, ToolRail } from './EditorRegions'
import { clearBasemapPreview, useBasemapPreview } from './basemap-preview-store'
import { MapArea } from './MapArea'
import { ProjectSettingsPanel } from './ProjectSettingsPanel'
import { createSaveIndicator, type SaveIndicatorStore } from './save-status'

type EditorState =
  | { kind: 'loading' }
  | { kind: 'editable'; dispatcher: Dispatcher; autosave: Autosave; saveStatus: SaveIndicatorStore }
  | { kind: 'too_new'; name: string; outputFormat?: OutputFormat; mapLocale?: MapLocale }
  | { kind: 'unreadable' }
  | { kind: 'not_found' }
  | { kind: 'error' }

const NO_DISPATCHER = { subscribe: () => () => undefined, getState: () => undefined }

/**
 * The Editor shell (UX-DR127), opened at `#/p/<id>`: top bar, tool rail, options bar above the
 * Map, properties panel and the collapsed Timeline. Every Project change is a Command through the
 * dispatcher (AD-3), autosaved (AD-8); undo and redo use the in-memory history, lost on reload. A
 * document newer than the app opens read-only (AD-9).
 */
export function EditorShell({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [state, setState] = useState<EditorState>({ kind: 'loading' })
  /** Shows a save failure until closed; a ref so the open effect does not rerun when the language changes. */
  const showSaveError = useRef(() => undefined as void)
  useEffect(() => {
    showSaveError.current = () => toast({ tone: 'error', title: t('editor.saveError') })
  }, [toast, t])

  useEffect(() => {
    let cancelled = false
    let close: (() => Promise<void>) | undefined
    void openStoredProject(projectId).then((loaded) => {
      if (cancelled) return
      if (!loaded) return setState({ kind: 'error' })
      if (loaded.kind === 'too_new') return setState({ ...loaded })
      if (loaded.kind !== 'editable') return setState({ kind: loaded.kind })
      const dispatcher = createDispatcher(loaded.project)
      const autosave = createAutosave({ source: dispatcher, lockEpoch: loaded.lockEpoch })
      // A failed or refused save (storage, newer epoch, deleted Project) shows « Non enregistré »
      // and an error toast that stays until closed.
      const saveStatus = createSaveIndicator(autosave, () => showSaveError.current())
      close = async () => {
        saveStatus.dispose()
        await autosave.close()
      }
      setState({ kind: 'editable', dispatcher, autosave, saveStatus })
    })
    return () => {
      cancelled = true
      // Leaving the Editor writes what is pending (Home flushes again before listing).
      void close?.()
    }
  }, [projectId])

  const dispatcher = state.kind === 'editable' ? state.dispatcher : NO_DISPATCHER
  const current: DispatcherState | undefined = useSyncExternalStore(dispatcher.subscribe, dispatcher.getState)

  const model = useMemo<EditorModel>(() => {
    if (state.kind === 'editable' && current) {
      const { project } = current
      return {
        loading: false,
        name: project.name,
        outputFormat: project.outputFormat,
        mapLocale: project.mapLocale,
        basemap: project.map.basemap,
        readOnly: current.readOnly,
        canUndo: current.canUndo,
        canRedo: current.canRedo,
      }
    }
    if (state.kind === 'too_new') {
      return { loading: false, name: state.name, outputFormat: state.outputFormat, mapLocale: state.mapLocale, readOnly: true, canUndo: false, canRedo: false }
    }
    return { loading: true, readOnly: true, canUndo: false, canRedo: false }
  }, [state, current])

  // The Scene the Map draws (AD-1): the Project at t = 0 with a slider drag's live values laid over
  // its Basemap adjustments. The drag itself is UI state; the Command comes on release.
  const preview = useBasemapPreview()
  const project = state.kind === 'editable' ? current?.project : undefined
  const scene = useMemo<Scene | undefined>(() => {
    if (!project) return undefined
    const shown = preview ? { ...project, map: { ...project.map, basemap: { ...project.map.basemap, adjustments: preview } } } : project
    return evaluate(shown, 0, { geodata: {}, frame: OUTPUT_FRAME_SIZES[project.outputFormat] })
  }, [project, preview])
  // A preview never outlives its Project or the Editor.
  useEffect(() => clearBasemapPreview, [projectId])

  /** « Annulé » / « Rétabli » for screen readers; `n` makes a repeated message be read again. */
  const announcement = useAnnouncement()

  const actions = useMemo<EditorActions | undefined>(() => {
    if (state.kind !== 'editable') return undefined
    const { dispatcher: editing, autosave } = state
    return {
      dispatch: (command: Command) => editing.dispatch(command).ok,
      saveOnPageHide: () => autosave.flushOnPageHide(),
      undo: () => {
        if (editing.undo().ok) announce(t('editor.undone'))
      },
      redo: () => {
        if (editing.redo().ok) announce(t('editor.redone'))
      },
    }
  }, [state, t])

  // Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Ctrl+S, V and Alt+1..6 go through the shortcut registry, read
  // through a ref so they are registered once per language.
  const latest = useRef({ state, model, actions })
  useEffect(() => {
    latest.current = { state, model, actions }
  })
  useEffect(() => {
    let disposed = false
    const unregister = registerShortcuts([
      ...editorShortcuts({
      undo: () => {
        const { model: shown, actions: act } = latest.current
        if (!shown.readOnly && shown.canUndo) act?.undo()
      },
      redo: () => {
        const { model: shown, actions: act } = latest.current
        if (!shown.readOnly && shown.canRedo) act?.redo()
      },
      save: () => {
        const { state: open } = latest.current
        if (open.kind !== 'editable' || open.dispatcher.getState().readOnly) return
        // Confirms the save only when it succeeded; a failure keeps « Non enregistré » and its toast.
        void open.autosave.flush().then(() => {
          if (!disposed && open.saveStatus.get() !== 'error') toast({ tone: 'success', title: t('editor.save.done'), description: t('editor.save.doneDetail') })
        })
      },
      }),
      // Like the rail button, inert while the Project opens.
      selectToolShortcut(() => announce(t('editor.tools.selectActive')), () => !latest.current.model.loading),
      ...regionShortcuts(),
    ])
    // The last step of the Escape chain: back to the Select tool.
    const unregisterEscape = registerEscapeStep({ id: 'tool.return', priority: 0, run: returnToSelect })
    return () => {
      disposed = true
      unregister()
      unregisterEscape()
    }
  }, [toast, t])

  if (state.kind === 'unreadable' || state.kind === 'not_found' || state.kind === 'error') {
    return (
      <div className="flex min-h-screen flex-col bg-om-background">
        {/* Nothing to show or edit: only the way back to Projects. */}
        <TopBar label={t('editor.regions.topBar')} end={null}>
          <span aria-hidden className="h-6 w-px shrink-0 bg-om-border" />
          <nav aria-label={t('editor.breadcrumb')}>
            <a href={homeHref} className="rounded-sm px-1 type-label text-om-accent hover:text-om-accent-hover hover:underline">
              {t('home.title')}
            </a>
          </nav>
        </TopBar>
        <main className="flex flex-1 items-center justify-center p-6">
          <p role="alert" className="type-body text-om-text-primary">
            {t(state.kind === 'not_found' ? 'editor.notFound' : state.kind === 'unreadable' ? 'editor.unreadable' : 'editor.loadError')}
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="om-editor bg-om-background">
      <div className="min-w-0 [grid-area:top]">
        <EditorTopBar model={model} actions={actions} saveStatus={state.kind === 'editable' ? state.saveStatus : undefined} />
      </div>
      <div className="flex min-w-0 flex-col [grid-area:banner]">
        {/* Read-only: not dismissable (UX-DR66). */}
        {state.kind === 'too_new' && <Banner tone="info">{t('editor.newerVersion')}</Banner>}
        <SmallWindowBanner />
      </div>
      <ToolRail disabled={model.loading} />
      <main className="flex min-h-0 min-w-0 flex-col [grid-area:scene]">
        <OptionsBar outputFormat={model.outputFormat} />
        <MapArea scene={scene} outputFormat={model.outputFormat} />
      </main>
      <PropertiesPanel>{model.loading ? <PanelSkeleton /> : <ProjectSettingsPanel model={model} actions={actions} />}</PropertiesPanel>
      <TimelineArea />
      <div role="status" aria-live="polite" className="sr-only">
        <span key={announcement.n}>{announcement.text}</span>
      </div>
    </div>
  )
}
