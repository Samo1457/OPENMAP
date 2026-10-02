import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BASEMAP_ADJUSTMENT_RANGES,
  type Basemap,
  type BasemapAdjustments,
  type BasemapId,
  DEFAULT_ADJUSTMENTS,
  parseHexColour,
  resolveAdjustments,
  withoutDefaults,
} from '@/core'
import { buttonLook } from '@/ui/components/button'
import { Slider } from '@/ui/components/Slider'
import { announce } from '@/ui/keyboard/announcer'
import { cn } from '@/ui/lib/utils'
import { BasemapPicker } from './BasemapPicker'
import { clearBasemapPreview, setBasemapPreview, useBasemapPreview } from './basemap-preview-store'
import type { EditorActions } from './editor-model'

/**
 * The « Fond de carte » section of Project settings (FR-5, UX-DR21): the picker and the brightness,
 * saturation and tint settings with their reset. Choosing a Basemap is one SET_BASEMAP; a slider drag
 * previews live (UI state) and is one SET_BASEMAP_ADJUSTMENTS on release; the reset sends `{}`.
 * Changing the Basemap keeps the adjustments (DESIGN.md).
 */
export function BasemapSettings({ basemap, actions, editable }: { basemap: Basemap; actions?: EditorActions; editable: boolean }) {
  const { t } = useTranslation()
  const titleId = useId()
  const preview = useBasemapPreview()
  const adjustments = basemap.adjustments
  const shown = resolveAdjustments(preview ?? adjustments)
  const ranges = BASEMAP_ADJUSTMENT_RANGES

  function nextAdjustments(change: BasemapAdjustments): BasemapAdjustments {
    return withoutDefaults({ ...adjustments, ...preview, ...change })
  }

  const previewValue = (change: BasemapAdjustments) => setBasemapPreview(nextAdjustments(change))
  function commitValue(change: BasemapAdjustments, name: string, value: string) {
    if (!editable) return clearBasemapPreview()
    const done = actions?.dispatch({ type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments: nextAdjustments(change) } })
    clearBasemapPreview()
    if (done) announce(t('editor.basemap.adjusted', { name, value }))
  }

  const atDefault = Object.keys(adjustments).length === 0 && preview === undefined
  const brightnessName = t('editor.basemap.brightness')
  const saturationName = t('editor.basemap.saturation')
  const tintName = t('editor.basemap.tint')

  return (
    <div className="flex flex-col gap-3">
      <span id={titleId} className="type-label text-om-text-secondary">
        {t('editor.basemap.title')}
      </span>
      <BasemapPicker
        labelledBy={titleId}
        value={basemap.id}
        disabled={!editable}
        onChange={(id: BasemapId) => {
          const done = actions?.dispatch({ type: 'SET_BASEMAP', payload: { basemap: id } })
          clearBasemapPreview()
          if (done) announce(t('editor.basemap.changed', { name: t(`editor.basemap.${id}`) }))
        }}
      />
      <Slider
        label={brightnessName}
        valueLabel={t('editor.basemap.valueOf', { name: brightnessName })}
        value={shown.brightness}
        min={ranges.brightness.min}
        max={ranges.brightness.max}
        defaultValue={DEFAULT_ADJUSTMENTS.brightness}
        unit="%"
        disabled={!editable}
        onCancel={clearBasemapPreview}
        onPreview={(brightness) => previewValue({ brightness })}
        onCommit={(brightness) => commitValue({ brightness }, brightnessName, String(brightness))}
      />
      <Slider
        label={saturationName}
        valueLabel={t('editor.basemap.valueOf', { name: saturationName })}
        value={shown.saturation}
        min={ranges.saturation.min}
        max={ranges.saturation.max}
        defaultValue={DEFAULT_ADJUSTMENTS.saturation}
        unit="%"
        disabled={!editable}
        onCancel={clearBasemapPreview}
        onPreview={(saturation) => previewValue({ saturation })}
        onCommit={(saturation) => commitValue({ saturation }, saturationName, String(saturation))}
      />
      <Slider
        label={tintName}
        valueLabel={t('editor.basemap.valueOf', { name: tintName })}
        value={shown.tintIntensity}
        min={ranges.tintIntensity.min}
        max={ranges.tintIntensity.max}
        defaultValue={DEFAULT_ADJUSTMENTS.tintIntensity}
        unit="%"
        disabled={!editable}
        onCancel={clearBasemapPreview}
        onPreview={(tintIntensity) => previewValue({ tintIntensity })}
        onCommit={(tintIntensity) => commitValue({ tintIntensity }, tintName, String(tintIntensity))}
      />
      <TintColour
        value={shown.tintColor}
        disabled={!editable}
        onPreview={(tintColor) => previewValue({ tintColor })}
        onCommit={(tintColor) => commitValue({ tintColor }, t('editor.basemap.tintColour'), tintColor)}
      />
      <button
        type="button"
        aria-disabled={!editable || atDefault || undefined}
        onClick={() => {
          if (!editable || atDefault) return
          const done = actions?.dispatch({ type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments: {} } })
          clearBasemapPreview()
          if (done) announce(t('editor.basemap.resetDone'))
        }}
        className={cn(buttonLook('secondarySmall', !editable || atDefault), 'self-start')}
      >
        {t('editor.basemap.reset')}
      </button>
    </div>
  )
}

/**
 * A minimal colour control for the tint: a hex field and the browser's colour input (the full
 * `color-field` popover comes in a later story). The picker previews live and commits on `change`;
 * the hex field commits on Enter or blur, and an invalid entry keeps the previous colour.
 */
function TintColour({ value, disabled, onPreview, onCommit }: { value: string; disabled: boolean; onPreview: (colour: string) => void; onCommit: (colour: string) => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const [shownValue, setShownValue] = useState(value)
  if (shownValue !== value) {
    setShownValue(value)
    setDraft(value)
  }
  const pending = useRef<string | undefined>(undefined)

  function commitHex() {
    const colour = parseHexColour(draft)
    if (!colour) return setDraft(value)
    setDraft(colour)
    if (colour !== value) onCommit(colour)
  }

  return (
    <div className={cn('flex items-center gap-2', disabled && 'control-disabled')}>
      <input
        type="color"
        aria-label={t('editor.basemap.tintColourPicker')}
        value={value.toLowerCase()}
        disabled={disabled}
        onChange={(event) => {
          pending.current = event.target.value.toUpperCase()
          setDraft(pending.current)
          onPreview(pending.current)
        }}
        onBlur={() => {
          if (pending.current !== undefined) onCommit(pending.current)
          pending.current = undefined
        }}
        ref={(element) => {
          if (!element) return
          // The native `change` event closes a colour pick; React's onChange is `input`.
          element.onchange = () => {
            if (pending.current !== undefined) onCommit(pending.current)
            pending.current = undefined
          }
        }}
        className="size-color-swatch-size shrink-0 cursor-pointer border border-om-border-input bg-transparent p-0"
      />
      <input
        type="text"
        aria-label={t('editor.basemap.tintColour')}
        value={draft}
        disabled={disabled}
        spellCheck={false}
        maxLength={7}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitHex}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitHex()
          } else if (event.key === 'Escape') {
            setDraft(value)
          }
        }}
        className="h-control-height w-24 min-w-0 rounded-sm border border-om-border-input bg-om-surface-raised px-2 type-timecode text-om-text-primary"
      />
    </div>
  )
}
