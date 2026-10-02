import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BASEMAP_IDS, type BasemapId, mapColors } from '@/core'
import { cn } from '@/ui/lib/utils'

/**
 * The Basemap picker (DESIGN.md `basemap-picker`): a grid of three columns of 56 px tiles, name
 * under each; the chosen tile has a 2 px inner outline in the accent. Tiles are static swatches
 * built from the palette (sea, land, coast), not live maps. A radio group with one tab stop; arrows,
 * Home and End move the choice, like the segmented control. Satellite arrives with Epic 8.
 */
export function BasemapPicker({ labelledBy, value, onChange, disabled }: { labelledBy: string; value: BasemapId; onChange: (basemap: BasemapId) => void; disabled: boolean }) {
  const { t } = useTranslation()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const tabStop = Math.max(0, BASEMAP_IDS.indexOf(value))

  function select(index: number) {
    const id = BASEMAP_IDS[(index + BASEMAP_IDS.length) % BASEMAP_IDS.length]
    onChange(id)
    buttons.current[BASEMAP_IDS.indexOf(id)]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: BASEMAP_IDS.length - 1,
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !(event.key in moves)) return
    event.preventDefault()
    if (disabled) return
    select(moves[event.key])
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-disabled={disabled || undefined} className={cn('grid grid-cols-3 gap-2', disabled && 'control-disabled')}>
      {BASEMAP_IDS.map((id, index) => {
        const checked = id === value
        const name = t(`editor.basemap.${id}`)
        return (
          <button
            key={id}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            tabIndex={index === tabStop ? 0 : -1}
            data-basemap={id}
            onClick={() => {
              if (!disabled && !checked) onChange(id)
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn('flex min-w-0 flex-col gap-1 text-left', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
          >
            <Swatch id={id} selected={checked} />
            <span className={cn('truncate type-caption', checked ? 'font-semibold text-om-text-primary' : 'text-om-text-secondary')}>{name}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A tile: sea, a stretch of land and its coast, from the Basemap's own palette. */
function Swatch({ id, selected }: { id: BasemapId; selected: boolean }) {
  const palette = mapColors[id]
  return (
    <span className="relative block h-basemap-tile-height w-full">
      <svg aria-hidden viewBox="0 0 100 56" preserveAspectRatio="none" className="block h-full w-full">
        <rect width="100" height="56" fill={palette['map-sea']} />
        <path d="M0 56 L0 22 C18 14 30 30 48 24 C66 18 80 26 100 12 L100 56 Z" fill={palette['map-land-neutral']} />
        <path d="M0 22 C18 14 30 30 48 24 C66 18 80 26 100 12" fill="none" stroke={palette['map-coast']} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      {selected && <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_var(--om-accent)]" />}
    </span>
  )
}
