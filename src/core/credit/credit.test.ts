import { describe, expect, it } from 'vitest'
import { CLIOPATRIA_META, DATASETS_META } from '../testing/geo-fixtures'
import { CREDIT_SEPARATOR, creditText, drawnBasemapSources, listSources } from './credit'
import { parseDatasets, type SourceMeta } from './sources'

const required = (id: string, attribution: string): SourceMeta => ({ id, source: id, licence: 'CC-BY-4.0', attribution, creditRequired: true })

describe('parseDatasets', () => {
  const document = { schemaVersion: 1, datasets: [{ ...DATASETS_META[0], kind: 'vector-tiles', maxzoom: 6, inputs: [] }, DATASETS_META[2]] }

  it('keeps the four metadata fields and the id, and drops the rest', () => {
    expect(parseDatasets(document)).toEqual({ ok: true, value: [DATASETS_META[0], DATASETS_META[2]] })
  })

  it.each([
    ['null', null],
    ['HTML text', '<!doctype html>'],
    ['another schemaVersion', { ...document, schemaVersion: 2 }],
    ['no datasets', { schemaVersion: 1 }],
    ['a dataset without attribution', { schemaVersion: 1, datasets: [{ id: 'x', source: 'X', licence: 'CC0', creditRequired: false }] }],
    ['a dataset with a blank attribution', { schemaVersion: 1, datasets: [{ ...DATASETS_META[0], attribution: '   ' }] }],
    ['a dataset with a non-boolean creditRequired', { schemaVersion: 1, datasets: [{ ...DATASETS_META[0], creditRequired: 'no' }] }],
  ])('refuses %s with datasets_unavailable', (_label, value) => {
    expect(parseDatasets(value)).toMatchObject({ ok: false, error: { code: 'datasets_unavailable' } })
  })
})

describe('creditText', () => {
  it('is the attribution of every required source, in order, joined with « · »', () => {
    expect(creditText([required('a', 'Credit A.'), required('b', 'Credit B.')])).toBe(`Credit A.${CREDIT_SEPARATOR}Credit B.`)
    expect(creditText([required('b', 'Credit B.'), required('a', 'Credit A.')])).toBe('Credit B. · Credit A.')
  })

  it('writes the exact wording of the source, untouched', () => {
    expect(creditText([CLIOPATRIA_META])).toBe('Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0.')
  })

  it('skips optional credits: Natural Earth and the glyph fonts are never on the Map', () => {
    expect(creditText(DATASETS_META)).toBeUndefined()
    expect(creditText([...DATASETS_META, CLIOPATRIA_META])).toBe(CLIOPATRIA_META.attribution)
  })

  it('writes an attribution shared by two required sources once', () => {
    expect(creditText([required('a', 'Same.'), required('b', 'Same.'), required('c', 'Other.')])).toBe('Same. · Other.')
  })

  it('compares trimmed attributions: a padded duplicate is written once, and blank ones never', () => {
    expect(creditText([required('a', 'Same.'), required('b', '  Same.  '), required('c', '   ')])).toBe('Same.')
  })

  it('gives nothing when no source is drawn or none requires a credit', () => {
    expect(creditText([])).toBeUndefined()
  })
})

describe('drawnBasemapSources', () => {
  it('is the tiles then the styles, in that order, whatever the order of the file', () => {
    expect(drawnBasemapSources([...DATASETS_META].reverse(), 'parchment').map((source) => source.id)).toEqual(['natural-earth-v1', 'basemap-styles-v1'])
  })

  it('leaves out the glyph fonts while the style draws no labels', () => {
    for (const basemap of ['parchment', 'sombre', 'clair', 'relief'] as const) expect(drawnBasemapSources(DATASETS_META, basemap).map((s) => s.id)).not.toContain('glyphs-v1')
  })

  it('draws the glyph fonts too when the style draws labels, after the tiles and styles; optional, so never credited', () => {
    const drawn = drawnBasemapSources(DATASETS_META, 'parchment', true)
    expect(drawn.map((source) => source.id)).toEqual(['natural-earth-v1', 'basemap-styles-v1', 'glyphs-v1'])
    expect(creditText([...drawn, CLIOPATRIA_META])).toBe(CLIOPATRIA_META.attribution)
  })

  it('orders the credit line Basemap sources, then glyphs, then geo, if the glyph fonts required a credit', () => {
    const datasets = DATASETS_META.map((meta) => ({ ...meta, creditRequired: true, attribution: `${meta.id}.` }))
    const drawn = drawnBasemapSources(datasets, 'parchment', true)
    expect(creditText([...drawn, CLIOPATRIA_META])).toBe(['natural-earth-v1.', 'basemap-styles-v1.', 'glyphs-v1.', CLIOPATRIA_META.attribution].join(' · '))
  })

  it('lists only the datasets whose metadata is loaded, never a guess', () => {
    expect(drawnBasemapSources(undefined, 'parchment')).toEqual([])
    expect(drawnBasemapSources([DATASETS_META[1]], 'parchment').map((s) => s.id)).toEqual(['basemap-styles-v1'])
  })
})

describe('listSources', () => {
  it('lists the datasets of the file, then the geo dataset, one row per name, licence and attribution', () => {
    const rows = listSources(DATASETS_META, CLIOPATRIA_META)
    expect(rows.map((row) => row.source)).toEqual(['Natural Earth', 'Libre Baskerville, Source Sans 3 (fontsource)', CLIOPATRIA_META.source])
    expect(rows[0]).toEqual({ ids: ['natural-earth-v1', 'basemap-styles-v1'], source: 'Natural Earth', licence: 'Public-Domain', attribution: 'Made with Natural Earth.', creditRequired: false })
    expect(rows.map((row) => row.creditRequired)).toEqual([false, false, true])
  })

  it('lists what is loaded and nothing else', () => {
    expect(listSources(undefined, undefined)).toEqual([])
    expect(listSources(undefined, CLIOPATRIA_META).map((row) => row.ids)).toEqual([['cliopatria']])
    expect(listSources(DATASETS_META, undefined)).toHaveLength(2)
  })
})
