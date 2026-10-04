import { Globe, Landmark, MapPin, Search } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  cameraForPlace,
  type EntityCandidate,
  groupPlaceResults,
  type PlaceKind,
  type PlaceResult,
  searchPlaces,
  type SearchIndex,
  type SearchLocale,
  type Size,
} from '@/core'
import { search } from '@/library'
import { iconProps } from '@/ui/components/button'
import { announce } from '@/ui/keyboard/announcer'
import { registerShortcuts } from '@/ui/keyboard/registry'
import { SEARCH_COMBO, searchShortcuts } from '@/ui/keyboard/search-shortcuts'
import { cn } from '@/ui/lib/utils'
import { setEditCamera } from './edit-camera-store'
import { nextActive } from './place-search-nav'
import { selectEntity } from './selection-store'

/** Results are announced once the typing pauses, so a screen reader is not read every keystroke. */
const ANNOUNCE_DELAY_MS = 250

/** A longer text is not a place name. */
const MAX_QUERY_CHARS = 100

type IndexState = { readonly status: 'idle' | 'unavailable' } | { readonly status: 'ready'; readonly index: SearchIndex }

const KIND_ICON: Record<PlaceKind, typeof Globe> = { country: Globe, entity: Landmark, city: MapPin }

/**
 * The place search of the top bar (FR-8, UX-DR62, UX-DR146): an ARIA combobox over the countries,
 * GeoEntities and cities that match what is typed, accents and case ignored, in French and English.
 * The index is a Library file loaded on the first focus (never at Editor open) and cached; while it
 * loads, or when it cannot be loaded, the GeoEntities valid at the data date are still searched.
 * `↑` `↓` move, Home and End jump, Enter picks (the first result when none is active), Escape closes
 * the list and then leaves the field, a click picks too, an IME composition is left alone, and `/`
 * focuses the field from anywhere that is not a text field or a dialog. Picking centres the edit
 * camera (never the Project, never a Preset) and selects a GeoEntity; the focus then goes to the Map,
 * where Escape clears the selection. Without a `frame` (the Project is opening) the field is inert.
 */
export function PlaceSearch({ frame, entities }: { frame?: Size; entities: readonly EntityCandidate[] }) {
  const { t, i18n } = useTranslation()
  const locale: SearchLocale = i18n.language === 'fr' ? 'fr' : 'en'
  const input = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  /** Escape, a pick or a blur closed the list; typing or ↓ opens it again. */
  const [dismissed, setDismissed] = useState(false)
  const [activeId, setActiveId] = useState<string | undefined>()
  const [focused, setFocused] = useState(false)
  const [composing, setComposing] = useState(false)
  const [source, setSource] = useState<IndexState>({ status: 'idle' })
  const disabled = frame === undefined

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /** The index is being fetched or is loaded; a failed load clears it, so the next focus tries again. */
  const requested = useRef(false)
  /** The first focus loads the index (and so does becoming usable while focused). Setting state only once the load answers. */
  const loadIndex = useCallback(() => {
    if (requested.current) return
    requested.current = true
    void search.load().then((result) => {
      if (!result.ok) requested.current = false
      if (mounted.current) setSource(result.ok ? { status: 'ready', index: result.value } : { status: 'unavailable' })
    })
  }, [])
  useEffect(() => {
    if (focused && !disabled) loadIndex()
  }, [focused, disabled, loadIndex])

  const index = source.status === 'ready' ? source.index : undefined
  const outcome = useMemo(() => searchPlaces(query, { index, entities, locale }), [query, index, entities, locale])
  const results = outcome.results
  const listShown = focused && !dismissed && outcome.status === 'results'
  /** Nothing matched: « Aucun lieu trouvé… », or the index is out and no GeoEntity matched. Not while the index loads. */
  const message = focused && !dismissed && outcome.status === 'empty' && (source.status === 'ready' || source.status === 'unavailable') ? (source.status === 'ready' ? 'empty' : 'unavailable') : undefined
  const groups = useMemo(() => groupPlaceResults(results), [results])
  const active = listShown ? results.find((result) => result.id === activeId) : undefined
  const optionId = (id: string) => `${listId}-${id}`

  // « 3 résultats » / « Aucun lieu trouvé » / « La recherche de lieux est indisponible. », politely, once per change.
  const announced = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!focused) {
      announced.current = undefined
      return
    }
    const text = listShown ? t('placeSearch.count', { count: results.length }) : message === 'empty' ? t('placeSearch.noneFound') : message === 'unavailable' ? t('placeSearch.unavailable') : undefined
    if (text === undefined) {
      announced.current = undefined
      return
    }
    if (text === announced.current) return
    const timer = setTimeout(() => {
      announced.current = text
      announce(text)
    }, ANNOUNCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [focused, listShown, message, results.length, t])

  useEffect(() => {
    if (active) document.getElementById(`${listId}-${active.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  // `/` focuses the field and selects its text, from anywhere but a text field or a dialog.
  const enabled = useRef(!disabled)
  useEffect(() => {
    enabled.current = !disabled
  })
  useEffect(
    () =>
      registerShortcuts(
        searchShortcuts({
          enabled: () => enabled.current,
          focus: () => {
            input.current?.focus()
            input.current?.select()
          },
        }),
      ),
    [],
  )

  function pick(result: PlaceResult) {
    if (!frame) return
    setEditCamera(cameraForPlace(result, frame))
    if (result.entityKey) {
      selectEntity(result.entityKey, result.name)
      announce(t('placeSearch.selected', { name: result.name }))
    } else {
      announce(t('placeSearch.centred', { name: result.name }))
    }
    setQuery(result.name)
    setDismissed(true)
    setActiveId(undefined)
    announced.current = undefined
    // The camera moved: the focus goes to the Map, where the arrows pan and Escape clears the selection.
    document.querySelector<HTMLElement>('[data-region="map"]')?.focus({ preventScroll: true })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // An input method owns its keys while it composes (Chrome reports them with keyCode 229 even after compositionend).
    if (event.nativeEvent.isComposing || composing || event.keyCode === 229) return
    const move = (key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End') => {
      event.preventDefault()
      setActiveId(nextActive(results.map((result) => result.id), active?.id, key))
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (disabled || outcome.status !== 'results') return
        if (dismissed) {
          event.preventDefault()
          setDismissed(false)
          setActiveId(undefined)
          return
        }
        return move(event.key)
      case 'Home':
      case 'End':
        // The caret keeps these keys while there is no list to move in.
        if (listShown) move(event.key)
        return
      case 'Enter':
        if (listShown) {
          event.preventDefault()
          pick(active ?? results[0])
        }
        return
      case 'Escape':
        // The first Escape closes the list (or the message); the registry's blur takes the next one.
        if (listShown || message) {
          event.preventDefault()
          setDismissed(true)
          setActiveId(undefined)
        }
        return
    }
  }

  return (
    <div ref={root} className="relative flex h-control-height-sm w-55 min-w-24 shrink items-center">
      <Search {...iconProps} className="icon-stroke pointer-events-none absolute left-2 shrink-0 text-om-text-secondary" />
      <input
        ref={input}
        type="text"
        role="combobox"
        value={query}
        readOnly={disabled}
        spellCheck={false}
        autoComplete="off"
        maxLength={MAX_QUERY_CHARS}
        aria-label={t('editor.search')}
        aria-keyshortcuts="/"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={listShown}
        aria-controls={listId}
        aria-activedescendant={active ? optionId(active.id) : undefined}
        aria-disabled={disabled || undefined}
        placeholder={t('editor.search')}
        onChange={(event) => {
          setQuery(event.target.value)
          setDismissed(false)
          setActiveId(undefined)
        }}
        onKeyDown={onKeyDown}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={(event) => {
          setFocused(false)
          setComposing(false)
          if (!root.current?.contains(event.relatedTarget as Node | null)) setDismissed(true)
        }}
        className={cn(
          'h-full w-full min-w-0 rounded-sm border border-om-border-input bg-om-surface-raised pr-7 pl-8 type-label text-om-text-primary placeholder:text-om-text-muted',
          disabled && 'control-disabled cursor-not-allowed',
        )}
      />
      {!focused && query === '' && (
        <kbd aria-hidden className="pointer-events-none absolute right-2 rounded-sm border border-om-border px-1 type-caption text-om-text-muted">
          {SEARCH_COMBO.key}
        </kbd>
      )}
      <div
        // A press anywhere in the popover (scrollbar, group header) must not blur the field and close it.
        onMouseDown={(event) => event.preventDefault()}
        className={cn('absolute top-full right-0 z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-om-border bg-om-surface-raised py-1 shadow-long', !listShown && !message && 'hidden')}
      >
        <div role="listbox" id={listId} aria-label={t('placeSearch.listLabel')} hidden={!listShown} className="max-h-[60vh] overflow-y-auto">
          {groups.map(({ kind, results: group }) => (
            <div key={kind} role="group" aria-labelledby={`${listId}-group-${kind}`}>
              <div id={`${listId}-group-${kind}`} className="px-3 pt-2 pb-1 type-label-caps text-om-text-secondary">
                {t(`placeSearch.groups.${kind}`)}
              </div>
              {group.map((result) => (
                <ResultRow key={result.id} id={optionId(result.id)} result={result} active={result.id === active?.id} onHover={() => setActiveId(result.id)} onPick={() => pick(result)} />
              ))}
            </div>
          ))}
        </div>
        {message && (
          <p data-testid="place-search-message" className="px-3 py-2 type-body break-words text-om-text-secondary">
            {message === 'empty' ? t('placeSearch.empty', { query: query.trim() }) : t('placeSearch.unavailable')}
          </p>
        )}
      </div>
    </div>
  )
}

function ResultRow({ id, result, active, onHover, onPick }: { id: string; result: PlaceResult; active: boolean; onHover: () => void; onPick: () => void }) {
  const { t } = useTranslation()
  const Icon = KIND_ICON[result.kind]
  const kind = t(`placeSearch.kinds.${result.kind}`)
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      // The input keeps the focus: a press must not blur it before the click picks.
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onHover}
      onClick={onPick}
      className={cn('flex cursor-pointer items-center gap-2 px-3 py-1.5', active && 'bg-om-selection')}
    >
      <Icon {...iconProps} className="icon-stroke shrink-0 text-om-text-secondary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate type-body text-om-text-primary">{result.name}</span>
        {result.otherName && <span className="block truncate type-caption text-om-text-secondary">{result.otherName}</span>}
      </span>
      <span className="max-w-32 shrink-0 truncate type-caption text-om-text-secondary">{result.country ? t('placeSearch.kindIn', { kind, country: result.country }) : kind}</span>
    </div>
  )
}
