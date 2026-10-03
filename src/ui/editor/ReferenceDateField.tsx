import { CircleAlert } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type DataDate, formatYear, type MapLocale, parseYear } from '@/core'
import { iconProps } from '@/ui/components/button'
import { announce } from '@/ui/keyboard/announcer'
import { isSaveKey } from '@/ui/keyboard/registry'
import { cn } from '@/ui/lib/utils'
import { NearestDataChip } from './NearestDataChip'
import type { GeoStatus } from './use-geodata'

/**
 * The « Date de référence » field of Project settings (FR-6, UX-DR88, UX-DR147): a year, BCE
 * allowed (« 1453 », « -51 », « 52 av. J.-C. », « 52 BC »), written in the Map language. Enter or
 * leaving the field commits it as one SET_REFERENCE_DATE (one undo entry, no dialog yet: nothing is
 * converted until Epic 2); an unusable entry shows its message under the field with the danger
 * icon and keeps the previous date. Escape restores it. A date outside the data is not an error:
 * the nearest-data chip says which year is shown. When the historical data cannot be loaded, a
 * caption says so. The label is always « Date de référence », never a Step date's.
 */
export function ReferenceDateField({
  year,
  mapLocale,
  readOnly,
  geo,
  dataDate,
  onCommit,
}: {
  year: number
  mapLocale: MapLocale
  readOnly: boolean
  geo?: GeoStatus
  dataDate?: DataDate
  /** Dispatches SET_REFERENCE_DATE; false when it was refused. */
  onCommit: (year: number) => boolean
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const errorId = useId()
  const captionId = useId()
  const shownText = formatYear(year, mapLocale)
  const [draft, setDraft] = useState(shownText)
  const [error, setError] = useState<'yearZero' | 'notAYear' | undefined>()
  /** Set by Escape: the blur that follows restores the date instead of committing the draft. */
  const skipBlurCommit = useRef(false)

  // Undo, redo, a commit or a change of Map language changed the date: show it.
  const [shown, setShown] = useState(shownText)
  if (shown !== shownText) {
    setShown(shownText)
    setDraft(shownText)
  }

  /**
   * Commits the draft; false when it was refused. On Enter or Ctrl+S an unusable entry keeps the typed
   * text, the message and `aria-invalid` until the next edit or Escape, so the typo can be fixed; on
   * blur the field goes back to the previous date and the message goes away. The Project is unchanged.
   */
  function commit(source: 'enter' | 'blur'): boolean {
    if (readOnly) return true
    const parsed = parseYear(draft)
    if (!parsed.ok) {
      if (source === 'blur') {
        setError(undefined)
        setDraft(shownText)
      } else {
        setError(parsed.error.code === 'year_zero' ? 'yearZero' : 'notAYear')
      }
      return false
    }
    setError(undefined)
    if (parsed.value === year) {
      setDraft(shownText)
      return true
    }
    const done = onCommit(parsed.value)
    if (done) announce(t('editor.referenceDate.announce', { date: formatYear(parsed.value, mapLocale) }))
    else setDraft(shownText)
    return done
  }

  const unavailable = geo === 'unavailable'
  const describedBy = [error ? errorId : undefined, unavailable ? captionId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="type-label text-om-text-secondary">
        {t('editor.referenceDate.label')}
      </label>
      <input
        id={inputId}
        data-testid="reference-date"
        type="text"
        value={draft}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          setError(undefined)
          skipBlurCommit.current = false
          setDraft(event.target.value)
        }}
        onBlur={() => {
          if (skipBlurCommit.current) {
            skipBlurCommit.current = false
            return
          }
          commit('blur')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            // Enter that confirms an IME composition is not a commit.
            if (event.nativeEvent.isComposing) return
            event.preventDefault()
            commit('enter')
          } else if (event.key === 'Escape') {
            // Restores the date and leaves the field; that blur must not commit.
            setDraft(shownText)
            setError(undefined)
            if (document.activeElement === event.currentTarget) {
              skipBlurCommit.current = true
              event.currentTarget.blur() // onBlur runs synchronously and clears the flag
              skipBlurCommit.current = false
            }
          } else if (isSaveKey(event.nativeEvent)) {
            // A refused entry: Ctrl+S is handled here (no browser dialog) and confirms nothing.
            if (!commit('enter')) event.preventDefault()
          }
        }}
        className={cn(
          'h-control-height w-full min-w-0 rounded-sm border px-2 type-body text-om-text-primary',
          readOnly ? 'border-transparent bg-transparent caret-transparent' : 'border-om-border-input bg-om-surface-raised',
        )}
      />
      {error && (
        <p id={errorId} role="alert" data-testid="reference-date-error" className="flex items-start gap-1.5 type-caption text-om-danger">
          <CircleAlert {...iconProps} />
          {t(`editor.referenceDate.${error}`)}
        </p>
      )}
      {unavailable && (
        <p id={captionId} role="status" data-testid="geo-unavailable" className="type-caption text-om-text-secondary">
          {t('editor.referenceDate.unavailable')}
        </p>
      )}
      <NearestDataChip dataDate={dataDate} mapLocale={mapLocale} />
    </div>
  )
}
