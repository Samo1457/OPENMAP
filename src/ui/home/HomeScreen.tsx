import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { flushPendingSaves, listProjects, purgeProject, restoreProject, tombstoneProject, type ProjectSummary } from '@/persistence'
import { buttonClass, iconProps } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import { TopBar } from '@/ui/components/TopBar'
import { FirefoxBanner, SmallWindowBanner } from '@/ui/gate/EnvironmentBanners'
import { editorHref, navigate } from '@/ui/routing'
import { copyName } from './copy-name'
import { createBlank, duplicateStored, renameStored } from './project-actions'
import { ProjectCard } from './ProjectCard'

type HomeState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; projects: readonly ProjectSummary[] }

const SKELETON_COUNT = 4
const MINUTE = 60_000

/** Reads the list; a Project just left in the Editor may still be saving, so flush first. */
async function loadHome(): Promise<HomeState> {
  try {
    await flushPendingSaves()
    return { kind: 'ready', projects: await listProjects() }
  } catch {
    return { kind: 'error' }
  }
}

/** The card dates are relative: refresh them every minute. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE)
    return () => clearInterval(timer)
  }, [])
  return now
}

/** Home (UX-DR118–120, UX-DR136): Projects from most to least recently modified. */
export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const now = useNow()
  const [state, setState] = useState<HomeState>({ kind: 'loading' })
  const [creating, setCreating] = useState(false)
  const newProjectButton = useRef<HTMLButtonElement>(null)
  /** Where focus goes once the list next renders (after a delete, an Undo or a closed toast). */
  const focusAfterLoad = useRef<{ index: number } | { id: string } | undefined>(undefined)
  const cardFocus = useRef(new Map<string, HTMLElement>())

  const refresh = useCallback(async (showSkeletons: boolean) => {
    if (showSkeletons) setState({ kind: 'loading' })
    setState(await loadHome())
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadHome().then((loaded) => {
      if (!cancelled) setState(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const projects = state.kind === 'ready' ? state.projects : []

  useEffect(() => {
    const wanted = focusAfterLoad.current
    if (wanted === undefined || state.kind !== 'ready') return
    focusAfterLoad.current = undefined
    const target = 'id' in wanted ? state.projects.find((project) => project.id === wanted.id) : state.projects[Math.min(wanted.index, state.projects.length - 1)]
    const element = target ? cardFocus.current.get(target.id) : undefined
    ;(element ?? newProjectButton.current)?.focus()
  }, [state])

  const registerFocusTarget = useCallback((id: string, element: HTMLElement | null) => {
    if (element) cardFocus.current.set(id, element)
    else cardFocus.current.delete(id)
  }, [])

  const showChangeError = () => toast({ tone: 'error', title: t('home.errors.change'), description: t('home.errors.detail') })

  async function onNewProject() {
    if (creating) return
    setCreating(true)
    let project: Awaited<ReturnType<typeof createBlank>>
    try {
      project = await createBlank(t('project.defaultName'), i18n.resolvedLanguage === 'fr' ? 'fr' : 'en')
    } catch {
      project = undefined
    } finally {
      setCreating(false)
    }
    if (project) navigate(editorHref(project.id))
    else toast({ tone: 'error', title: t('home.errors.create'), description: t('home.errors.detail') })
  }

  async function onRename(id: string, name: string) {
    if (!(await renameStored(id, name))) showChangeError()
    await refresh(false)
  }

  async function onDuplicate(id: string) {
    const ok = await duplicateStored(id, (name) => copyName(name, (base) => t('home.copyName', { name: base })))
    if (!ok) showChangeError()
    await refresh(false)
  }

  async function onDelete(id: string) {
    if (!(await tombstoneProject(id))) {
      showChangeError()
      return
    }
    // Functional update: a second delete before this render must not bring the first card back.
    setState((current) => {
      if (current.kind !== 'ready') return current
      focusAfterLoad.current = { index: Math.max(0, current.projects.findIndex((project) => project.id === id)) }
      return { kind: 'ready', projects: current.projects.filter((project) => project.id !== id) }
    })
    toast({
      tone: 'info',
      title: t('home.deleted'),
      action: { label: t('home.undo') },
      onClose: (reason, { hadFocus }) => {
        if (reason === 'action') {
          void restoreProject(id).then(async (restored) => {
            if (!restored) {
              toast({ tone: 'error', title: t('home.errors.restore'), description: t('home.errors.detail') })
              return
            }
            focusAfterLoad.current = { id }
            await refresh(false)
          })
          return
        }
        // The tombstone becomes permanent when its toast closes (AD-8); media GC follows.
        void purgeProject(id)
        if (hadFocus) {
          focusAfterLoad.current = { index: 0 }
          setState((current) => ({ ...current }))
        }
      },
    })
  }

  const empty = state.kind === 'ready' && projects.length === 0
  const newProject = (
    <button ref={newProjectButton} type="button" className={buttonClass.primary} onClick={() => void onNewProject()} disabled={creating}>
      <Plus {...iconProps} />
      {t('home.newProject')}
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-om-background">
      <TopBar />
      {/* Browser and window banners sit between the top bar and the header (UX-DR66, UX-DR148). */}
      <div className="flex flex-col">
        <FirefoxBanner />
        <SmallWindowBanner />
      </div>
      <main className="mx-auto flex w-full max-w-home-max-width flex-col gap-6 px-8 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="type-title-xl text-om-text-primary">{t('home.title')}</h1>
          {!empty && newProject}
        </div>

        {state.kind === 'loading' && (
          <div aria-busy="true">
            <p className="sr-only" role="status">
              {t('home.loading')}
            </p>
            <ul aria-hidden className="grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-project-card-min-width),1fr))] gap-6">
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <li key={index} className="flex flex-col border border-om-border bg-om-surface">
                  <div className="om-skeleton aspect-video w-full" />
                  <div className="flex flex-col gap-2 px-3 py-2">
                    <div className="om-skeleton h-4 w-2/3" />
                    <div className="om-skeleton h-3 w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.kind === 'error' && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="type-body text-om-text-primary">{t('home.loadError')}</p>
            <button type="button" className={buttonClass.secondary} onClick={() => void refresh(true)}>
              {t('home.retry')}
            </button>
          </div>
        )}

        {empty && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <h2 className="type-title-lg text-om-text-primary">{t('home.empty.title')}</h2>
            <p className="type-body text-om-text-secondary">{t('home.empty.text')}</p>
            <div className="mt-2">{newProject}</div>
          </div>
        )}

        {state.kind === 'ready' && projects.length > 0 && (
          <ul aria-label={t('home.title')} className="grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-project-card-min-width),1fr))] gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                now={now}
                onFocusTarget={registerFocusTarget}
                onOpen={(id) => navigate(editorHref(id))}
                onRename={(id, name) => void onRename(id, name)}
                onDuplicate={(id) => void onDuplicate(id)}
                onDelete={(id) => void onDelete(id)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
