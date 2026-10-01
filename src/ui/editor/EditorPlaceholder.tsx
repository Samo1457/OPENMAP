import { Info } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { createDispatcher, type Dispatcher } from '@/core'
import { createAutosave, openStoredProject } from '@/persistence'
import { iconProps } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import { RenameField } from '@/ui/components/RenameField'
import { TopBar } from '@/ui/components/TopBar'
import { homeHref } from '@/ui/routing'
import { mapColors } from '@/ui/theme/tokens'

type EditorState =
  | { kind: 'loading' }
  | { kind: 'editable'; dispatcher: Dispatcher }
  | { kind: 'too_new'; name: string }
  | { kind: 'unreadable' }
  | { kind: 'not_found' }
  | { kind: 'error' }

/**
 * Minimal Editor until Story 1.5: a top bar with « Projets » and the Project name (renamable in
 * place, autosaved), opened at `#/p/<id>`. A document newer than the app opens read-only (AD-9).
 */
export function EditorPlaceholder({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [state, setState] = useState<EditorState>({ kind: 'loading' })
  /** Shows the save failure; a ref so the open effect does not rerun when the language changes. */
  const showSaveError = useRef(() => undefined as void)
  useEffect(() => {
    showSaveError.current = () => toast({ tone: 'error', title: t('editor.saveError') })
  }, [toast, t])

  useEffect(() => {
    let cancelled = false
    let closeAutosave: (() => Promise<void>) | undefined
    void openStoredProject(projectId).then((loaded) => {
      if (cancelled) return
      if (!loaded) return setState({ kind: 'error' })
      if (loaded.kind !== 'editable') return setState(loaded.kind === 'too_new' ? { kind: 'too_new', name: loaded.name } : { kind: loaded.kind })
      const dispatcher = createDispatcher(loaded.project)
      const autosave = createAutosave({ source: dispatcher, lockEpoch: loaded.lockEpoch })
      // A failed or refused save (storage, newer epoch, deleted Project) stays on screen until closed.
      const unsubscribe = autosave.subscribe((status) => {
        if (status === 'error') showSaveError.current()
      })
      closeAutosave = async () => {
        unsubscribe()
        await autosave.close()
      }
      setState({ kind: 'editable', dispatcher })
    })
    return () => {
      cancelled = true
      // Leaving the Editor writes what is pending (Home flushes again before listing).
      void closeAutosave?.()
    }
  }, [projectId])

  return (
    <div className="flex min-h-screen flex-col bg-om-background">
      <TopBar>
        <nav aria-label={t('editor.breadcrumb')} className="flex min-w-0 items-center gap-2">
          <a href={homeHref} className="rounded-sm px-1 type-label text-om-accent hover:text-om-accent-hover hover:underline">
            {t('home.title')}
          </a>
          <span aria-hidden className="type-label text-om-text-muted">
            /
          </span>
          {state.kind === 'loading' && <span className="type-label text-om-text-secondary">{t('editor.opening')}</span>}
          {state.kind === 'editable' && <ProjectName dispatcher={state.dispatcher} />}
          {state.kind === 'too_new' && (
            <span aria-current="page" className="truncate type-title-md text-om-text-primary">
              {state.name || t('project.defaultName')}
            </span>
          )}
        </nav>
      </TopBar>

      {state.kind === 'too_new' && (
        <div role="status" className="flex items-center gap-3 border-b border-l-3 border-om-border border-l-om-accent bg-om-surface-raised px-4 py-2">
          <Info {...iconProps} className="icon-stroke shrink-0 text-om-text-secondary" />
          <p className="type-body text-om-text-primary">{t('editor.newerVersion')}</p>
        </div>
      )}

      <main className="flex flex-1 items-center justify-center p-6">
        {state.kind === 'editable' || state.kind === 'too_new' ? (
          // The Map arrives in Story 1.10; until then, the plain land colour of the parchment Basemap.
          <div role="img" aria-label={t('editor.map')} className="aspect-video w-full max-w-4xl" style={{ backgroundColor: mapColors.parchment['map-land-neutral'] }} />
        ) : state.kind !== 'loading' ? (
          <p role="alert" className="type-body text-om-text-primary">
            {t(state.kind === 'not_found' ? 'editor.notFound' : state.kind === 'unreadable' ? 'editor.unreadable' : 'editor.loadError')}
          </p>
        ) : null}
      </main>
    </div>
  )
}

/** The Project name in the top bar: a button that turns into the rename field (SET_PROJECT_NAME). */
function ProjectName({ dispatcher }: { dispatcher: Dispatcher }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { project } = useSyncExternalStore(dispatcher.subscribe, dispatcher.getState)
  const [renaming, setRenaming] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const stopRenaming = () => {
    setRenaming(false)
    requestAnimationFrame(() => button.current?.focus())
  }

  if (renaming) {
    return (
      <div className="w-72">
        <RenameField
          value={project.name}
          label={t('project.nameField')}
          onCommit={(name) => {
            const result = dispatcher.dispatch({ type: 'SET_PROJECT_NAME', payload: { name } })
            if (!result.ok) toast({ tone: 'error', title: t('editor.renameError') })
            stopRenaming()
          }}
          onCancel={stopRenaming}
        />
      </div>
    )
  }
  return (
    <button
      ref={button}
      type="button"
      aria-current="page"
      title={t('editor.rename')}
      onClick={() => setRenaming(true)}
      className="min-w-0 truncate rounded-sm px-1 type-title-md text-om-text-primary hover:bg-om-selection"
    >
      {project.name || t('project.defaultName')}
    </button>
  )
}
