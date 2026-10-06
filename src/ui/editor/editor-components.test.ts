// Server-rendered markup of the small Editor components (Vitest runs in Node, without a DOM).

import i18next from 'i18next'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { initReactI18next } from 'react-i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { type CreditChangeEnv, CreditSettings, changeCredit } from './CreditSettings'
import { MoreOptions, resetMoreOptionsMemory } from './MoreOptions'
import { SourcesSection } from './SourcesSection'

beforeAll(async () => {
  await i18next.use(initReactI18next).init({ resources: { en: { translation: en } }, lng: 'en', initAsync: false, interpolation: { escapeValue: false } })
})

describe('MoreOptions (UX-DR34, NFR-9)', () => {
  it('renders nothing while the panel has no advanced setting', () => {
    expect(renderToStaticMarkup(createElement(MoreOptions, { panel: 'empty' }))).toBe('')
  })

  it('renders a collapsed row with its summary that controls the hidden settings', () => {
    resetMoreOptionsMemory()
    const html = renderToStaticMarkup(createElement(MoreOptions, { panel: 'project', summary: 'Front line, Sources' }, createElement('p', null, 'Advanced')))
    expect(html).toContain('More options')
    expect(html).toContain('Front line, Sources')
    expect(html).toMatch(/aria-expanded="false"/)
    expect(html).toMatch(/hidden=""[^>]*>.*Advanced/)
  })
})

describe('SegmentedControl disabled (UX-DR8)', () => {
  it('keeps its slot and tab stop, marks the group and each option disabled, and uses control-disabled', () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl<'a' | 'b'>, { labelledBy: 'l', value: 'a', disabled: true, onChange: () => undefined, options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }),
    )
    expect(html).toMatch(/role="radiogroup"[^>]*aria-disabled="true"[^>]*class="[^"]*control-disabled/)
    expect(html.match(/role="radio"[^>]*aria-disabled="true"/g)).toHaveLength(2)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).not.toContain('hover:bg-om-selection')
  })
})

describe('CreditSettings (Story 1.13, UX-DR108)', () => {
  const credit = { corner: 'bottom-left', prominence: 'discreet' } as const
  const render = (props: { creditText?: string; editable: boolean }) => renderToStaticMarkup(createElement(CreditSettings, { credit, ...props }))

  it('shows a required credit locked: its text, a padlock, the explanation, and no checkbox', () => {
    const html = render({ creditText: 'Historical borders: Cliopatria.', editable: true })
    expect(html).toContain('Historical borders: Cliopatria.')
    expect(html).toContain('lang="en"')
    expect(html).toContain('Required credit, locked')
    expect(html).toContain('Required: a map source licence asks for this credit.')
    expect(html).toContain('lucide-lock')
    expect(html).not.toContain('type="checkbox"')
    expect(html).not.toContain('role="checkbox"')
  })

  it('says so when no source drawn requires a credit, and keeps the placement controls', () => {
    const html = render({ editable: true })
    expect(html).toContain('No source drawn on the map requires a credit at the moment.')
    expect(html).not.toContain('Required credit, locked')
    expect(html).toContain('Bottom left')
    expect(html).toContain('Discreet')
  })

  it('offers the four corners and the two prominences', () => {
    const html = render({ editable: true })
    for (const label of ['Bottom left', 'Bottom right', 'Top left', 'Top right', 'Discreet', 'Legible']) expect(html).toContain(label)
  })

  it('read-only: the Select is disabled and the segmented control is marked disabled', () => {
    const html = render({ editable: false })
    expect(html).toMatch(/<select[^>]*disabled=""/)
    expect(html).toMatch(/role="radiogroup"[^>]*aria-disabled="true"/)
    const editable = render({ editable: true })
    expect(editable).not.toMatch(/<select[^>]*disabled=""/)
  })
})

describe('SourcesSection (Story 1.13, FR-10)', () => {
  const entry = { ids: ['cliopatria'], source: 'Cliopatria (Seshat Global History Databank)', licence: 'CC-BY-4.0', attribution: 'Historical borders: Cliopatria, CC BY 4.0.', creditRequired: true }

  it('lists name, licence and attribution, with the required marker in words and a padlock', () => {
    const html = renderToStaticMarkup(createElement(SourcesSection, { sources: [entry, { ...entry, ids: ['ne'], source: 'Natural Earth', creditRequired: false }] }))
    expect(html).toContain('Sources and licences')
    expect(html).toContain('Licence: CC-BY-4.0')
    expect(html).toContain('Historical borders: Cliopatria, CC BY 4.0.')
    expect(html.match(/Required credit/g)).toHaveLength(1)
    expect(html).toContain('lucide-lock')
  })

  it('says no source is loaded when there is none', () => {
    expect(renderToStaticMarkup(createElement(SourcesSection, { sources: [] }))).toContain('No source is loaded at the moment.')
  })
})

describe('credit copy (EXPERIENCE.md, FR/EN)', () => {
  it('explains why the credit is required, in both languages, and never says « non modifiable » or « Obligatoire » alone', () => {
    expect(fr.editor.credit.explanation).toBe('Obligatoire\u202f: la licence d\'une source de la Carte demande ce crédit. Vous choisissez sa position et sa discrétion.')
    expect(en.editor.credit.explanation).toBe('Required: a map source licence asks for this credit. You choose its position and how discreet it is.')
    const everything = JSON.stringify({ fr: fr.editor.credit, en: en.editor.credit, frs: fr.editor.sources, ens: en.editor.sources })
    expect(everything).not.toMatch(/non modifiable/i)
    expect(everything).not.toMatch(/non-editable|not editable|cannot be changed/i)
  })

  it('announces « Crédit en bas à droite, lisible »', () => {
    expect(fr.editor.credit.announce).toBe('Crédit {{position}}, {{prominence}}')
    expect(fr.editor.credit.at['bottom-right']).toBe('en bas à droite')
    expect(fr.editor.credit.prominenceNames.legible).toBe('lisible')
  })
})

describe('changeCredit (announcements and the read-only rule)', () => {
  const credit = { corner: 'bottom-left', prominence: 'discreet' } as const
  const setup = (overrides: Partial<CreditChangeEnv> = {}) => {
    const said: string[] = []
    const sent: unknown[] = []
    const env: CreditChangeEnv = {
      credit,
      creditText: 'Historical borders: Cliopatria.',
      editable: true,
      dispatch: (command) => {
        sent.push(command)
        return true
      },
      announce: (text) => void said.push(text),
      t: (key, options) => String(i18next.t(key as never, options as never)),
      ...overrides,
    }
    return { env, said, sent }
  }

  it('announces « Credit at the bottom right, legible » when a required credit is drawn', () => {
    const { env, said, sent } = setup({ credit: { corner: 'bottom-right', prominence: 'discreet' } })
    expect(changeCredit(env, { prominence: 'legible' })).toBe(true)
    expect(sent).toEqual([{ type: 'SET_CREDIT', payload: { prominence: 'legible' } }])
    expect(said).toEqual(['Credit at the bottom right, legible'])
  })

  it('announces neutrally, without saying there is a credit, when none is drawn', () => {
    const { env, said } = setup({ creditText: undefined })
    changeCredit(env, { corner: 'top-right' })
    changeCredit(env, { prominence: 'legible' })
    expect(said).toEqual(['Credit position: Top right', 'Credit discretion: Legible'])
  })

  it('announces nothing and dispatches nothing when no value changes', () => {
    const { env, said, sent } = setup()
    expect(changeCredit(env, { corner: 'bottom-left' })).toBe(false)
    expect(changeCredit(env, { corner: 'bottom-left', prominence: 'discreet' })).toBe(false)
    expect(said).toEqual([])
    expect(sent).toEqual([])
  })

  it('a read-only Project: nothing is dispatched or announced', () => {
    const { env, said, sent } = setup({ editable: false })
    expect(changeCredit(env, { corner: 'top-left' })).toBe(false)
    expect(said).toEqual([])
    expect(sent).toEqual([])
  })

  it('a dispatcher that rejects the Command (read_only): no announcement, the value is not reported changed', () => {
    const { env, said } = setup({ dispatch: () => false })
    expect(changeCredit(env, { corner: 'top-left' })).toBe(false)
    expect(said).toEqual([])
  })

  it('has French neutral and required announcements', () => {
    expect(fr.editor.credit.announcePosition).toBe('Position du crédit\u202f: {{position}}')
    expect(fr.editor.credit.announceProminence).toBe('Discrétion du crédit\u202f: {{prominence}}')
  })
})
