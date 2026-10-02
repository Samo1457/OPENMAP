// Server-rendered markup of the small Editor components (Vitest runs in Node, without a DOM).

import i18next from 'i18next'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { initReactI18next } from 'react-i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en.json'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { MoreOptions, resetMoreOptionsMemory } from './MoreOptions'

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
