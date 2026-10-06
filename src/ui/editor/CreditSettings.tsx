import { Lock } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { CREDIT_CORNERS, CREDIT_PROMINENCES, type CreditCorner, type CreditProminence } from '@/core'
import { iconProps } from '@/ui/components/button'
import { SegmentedControl, type SegmentedOption } from '@/ui/components/SegmentedControl'
import { announce } from '@/ui/keyboard/announcer'
import { cn } from '@/ui/lib/utils'
import type { EditorActions, EditorModel } from './editor-model'

export interface CreditChange {
  readonly corner?: CreditCorner
  readonly prominence?: CreditProminence
}

export interface CreditChangeEnv {
  readonly credit: NonNullable<EditorModel['credit']>
  /** The credit line drawn on the Map, when a required source is drawn. */
  readonly creditText?: string
  readonly editable: boolean
  readonly dispatch?: EditorActions['dispatch']
  readonly announce: (text: string) => void
  readonly t: (key: string, options?: Record<string, string>) => string
}

/**
 * One change of the placement: a SET_CREDIT, announced once it was accepted and only if a value really
 * changed. « Crédit en bas à droite, lisible » says there is a credit, so it is used only while a required
 * credit is drawn; otherwise the change is announced neutrally (the setting exists, nothing is on the Map).
 * A read-only Project (or a refused Command) changes and announces nothing. Returns whether it applied.
 */
export function changeCredit({ credit, creditText, editable, dispatch, announce, t }: CreditChangeEnv, next: CreditChange): boolean {
  if (!editable || !dispatch) return false
  const corner = next.corner ?? credit.corner
  const prominence = next.prominence ?? credit.prominence
  if (corner === credit.corner && prominence === credit.prominence) return false
  if (!dispatch({ type: 'SET_CREDIT', payload: next })) return false
  if (creditText !== undefined) {
    announce(t('editor.credit.announce', { position: t(`editor.credit.at.${corner}`), prominence: t(`editor.credit.prominenceNames.${prominence}`) }))
  } else if (corner !== credit.corner) {
    announce(t('editor.credit.announcePosition', { position: t(`editor.credit.positions.${corner}`) }))
  } else {
    announce(t('editor.credit.announceProminence', { prominence: t(`editor.credit.prominences.${prominence}`) }))
  }
  return true
}

/**
 * The credit group of Project settings (FR-10, UX-DR108, `export-credit-locked`): when a source on the
 * Map requires a credit, a locked row with its text and a padlock, no checkbox, and the explanation;
 * then the « Position » Select (four corners) and the « Discrète / Lisible » segmented control. Only
 * the placement is editable: nothing here can hide a required credit. Each change is one SET_CREDIT
 * (one undo entry), applied at once and announced; read-only, the controls are disabled (the dispatcher
 * refuses the Command anyway).
 */
export function CreditSettings({ credit, creditText, actions, editable }: { credit: NonNullable<EditorModel['credit']>; creditText?: string; actions?: EditorActions; editable: boolean }) {
  const { t } = useTranslation()
  const titleId = useId()
  const positionId = useId()
  const prominenceId = useId()
  const explanationId = useId()

  const prominences: SegmentedOption<CreditProminence>[] = CREDIT_PROMINENCES.map((value) => ({ value, label: t(`editor.credit.prominences.${value}`) }))

  const change = (next: CreditChange) => changeCredit({ credit, creditText, editable, dispatch: actions?.dispatch, announce, t: (key, options) => String(t(key as never, options as never)) }, next)

  return (
    <div className="flex flex-col gap-3">
      <span id={titleId} className="type-label text-om-text-secondary">
        {t('editor.credit.title')}
      </span>
      {creditText !== undefined ? (
        // A required credit: a row with a padlock instead of a checkbox, and why it is there (never « non modifiable »).
        <div role="group" aria-labelledby={titleId} aria-describedby={explanationId} className="flex flex-col gap-1.5">
          <div className="flex min-h-control-height items-start gap-2 rounded-sm border border-om-border bg-om-background px-2 py-1.5">
            <Lock {...iconProps} className="icon-stroke mt-0.5 shrink-0 text-om-text-secondary" />
            <span className="sr-only">{t('editor.credit.locked')}. </span>
            {/* The source's own wording, whatever the UI language (AD-20). */}
            <span lang="en" data-testid="credit-locked-text" className="min-w-0 break-words [overflow-wrap:anywhere] type-body text-om-text-primary">
              {creditText}
            </span>
          </div>
          <p id={explanationId} className="type-caption text-om-text-muted">
            {t('editor.credit.explanation')}
          </p>
        </div>
      ) : (
        <p className="type-caption text-om-text-muted">{t('editor.credit.none')}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={positionId} className="type-label text-om-text-secondary">
          {t('editor.credit.position')}
        </label>
        <select
          id={positionId}
          value={credit.corner}
          disabled={!editable}
          onChange={(event) => change({ corner: event.target.value as CreditCorner })}
          className={cn(
            'h-control-height w-full min-w-0 rounded-sm border border-om-border-input bg-om-surface-raised px-2 type-body text-om-text-primary',
            !editable && 'control-disabled cursor-not-allowed',
          )}
        >
          {CREDIT_CORNERS.map((corner) => (
            <option key={corner} value={corner}>
              {t(`editor.credit.positions.${corner}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={prominenceId} className="type-label text-om-text-secondary">
          {t('editor.credit.prominence')}
        </span>
        <SegmentedControl labelledBy={prominenceId} options={prominences} value={credit.prominence} disabled={!editable} onChange={(prominence) => change({ prominence })} />
      </div>
    </div>
  )
}
