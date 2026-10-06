import { describe, expect, it } from 'vitest'
import { apply } from '../commands/apply'
import { BASEMAP_IDS, OUTPUT_FORMATS, OUTPUT_FRAME_SIZES, type Project } from '../model/project'
import { blankProject } from '../testing/fixtures'
import { CLIOPATRIA_META, DATASETS_META, GEO_INDEX_WITH_META, GEO_STATES } from '../testing/geo-fixtures'
import { evaluate } from './evaluate'
import { isCredit, isTerritory, type EvaluateContext, type Scene } from './scene'
import { Z_BANDS } from './z-bands'

const FRAME = OUTPUT_FRAME_SIZES['16:9']
const ctx = (overrides: Partial<EvaluateContext> = {}): EvaluateContext => ({ geodata: { index: GEO_INDEX_WITH_META, states: GEO_STATES }, frame: FRAME, datasets: DATASETS_META, ...overrides })
const credits = (scene: Scene) => scene.items.filter(isCredit)

function change(project: Project, command: Parameters<typeof apply>[1]): Project {
  const result = apply(project, command)
  if (!result.ok || !result.value.changed) throw new Error('expected a change')
  return result.value.project
}
const at1050 = () => change(blankProject(), { type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year: 1050 } } })
const hideTerritories = (project: Project): Project => ({ ...project, layers: project.layers.map((layer) => (layer.kind === 'territories' ? { ...layer, hidden: true } : layer)) })

describe('evaluate: the Map credit (Story 1.13)', () => {
  it('Default: Territories drawn gives the Cliopatria credit, bottom-left, discreet, in the credit band', () => {
    const scene = evaluate(at1050(), 0, ctx())
    expect(scene.items.filter(isTerritory).length).toBeGreaterThan(0)
    expect(credits(scene)).toEqual([
      { kind: 'credit', z: Z_BANDS.credit, text: 'Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0.', corner: 'bottom-left', prominence: 'discreet' },
    ])
  })

  it('is above every other item, and last', () => {
    const scene = evaluate(at1050(), 0, ctx())
    const credit = scene.items[scene.items.length - 1]
    expect(isCredit(credit)).toBe(true)
    for (const item of scene.items.filter((i) => !isCredit(i))) expect(item.z).toBeLessThan(credit.z)
  })

  it('follows project.credit: corner and prominence', () => {
    const project = change(at1050(), { type: 'SET_CREDIT', payload: { corner: 'top-right', prominence: 'legible' } })
    expect(credits(evaluate(project, 0, ctx()))[0]).toMatchObject({ corner: 'top-right', prominence: 'legible' })
  })

  it('Basemap only: no Territories Layer content, no required source, no credit item', () => {
    const noTerritories = { ...at1050(), layers: at1050().layers.filter((layer) => layer.kind !== 'territories') }
    expect(credits(evaluate(noTerritories, 0, ctx()))).toEqual([])
    expect(credits(evaluate(blankProject(), 0, ctx({ geodata: {} })))).toEqual([])
  })

  it('Territories hidden: no credit item', () => {
    expect(credits(evaluate(hideTerritories(at1050()), 0, ctx()))).toEqual([])
  })

  it('Territories on but no state loaded yet (nothing drawn): no credit item', () => {
    expect(credits(evaluate(at1050(), 0, ctx({ geodata: { index: GEO_INDEX_WITH_META, states: {} } })))).toEqual([])
  })

  it('geo index absent: no credit item', () => {
    expect(credits(evaluate(at1050(), 0, ctx({ geodata: {} })))).toEqual([])
  })

  it('Metadata unavailable: with no datasets.json the Basemap adds nothing and Cliopatria is still credited', () => {
    expect(credits(evaluate(at1050(), 0, ctx({ datasets: undefined })))).toHaveLength(1)
    expect(credits(evaluate(at1050(), 0, ctx({ datasets: [] })))[0].text).toBe(CLIOPATRIA_META.attribution)
  })

  it('credits a required Basemap source before the geo one, joined with « · »', () => {
    const datasets = [{ ...DATASETS_META[0], creditRequired: true, attribution: 'Tiles: Example.' }, ...DATASETS_META.slice(1)]
    expect(credits(evaluate(at1050(), 0, ctx({ datasets })))[0].text).toBe(`Tiles: Example. · ${CLIOPATRIA_META.attribution}`)
    // Basemap only: the Basemap's own required credit is drawn alone.
    expect(credits(evaluate(blankProject(), 0, ctx({ datasets, geodata: {} })))[0].text).toBe('Tiles: Example.')
  })

  it('optional credits (Natural Earth, glyph fonts) are never in the line', () => {
    expect(credits(evaluate(at1050(), 0, ctx()))[0].text).not.toContain('Natural Earth')
  })

  it('French UI and English mapLocale: the wording is the source wording, unchanged by mapLocale', () => {
    const fr = evaluate({ ...at1050(), mapLocale: 'fr' }, 0, ctx())
    const en = evaluate({ ...at1050(), mapLocale: 'en' }, 0, ctx())
    expect(credits(fr)).toEqual(credits(en))
  })

  it('is independent of the Output Format (the renderer scales and wraps it) and of t', () => {
    const project = at1050()
    const wide = credits(evaluate(project, 0, ctx()))
    expect(credits(evaluate(project, 0, ctx({ frame: OUTPUT_FRAME_SIZES['9:16'] })))).toEqual(wide)
    expect(credits(evaluate(project, 12, ctx()))).toEqual(wide)
  })

  it('is deterministic and serializable', () => {
    const project = at1050()
    expect(evaluate(project, 0, ctx())).toEqual(evaluate(project, 0, ctx()))
    const scene = evaluate(project, 0, ctx())
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene)
  })

  it('no document or command can hide a required credit: a hidden-looking project still credits when drawn', () => {
    const project = change(at1050(), { type: 'SET_CREDIT', payload: { corner: 'top-left' } })
    expect(credits(evaluate(project, 0, ctx()))).toHaveLength(1)
  })

  describe('a required credit survives every path', () => {
    /** What the credit items of a Scene come to: exactly one, with the source's wording, in the credit band, last. */
    const credit = (scene: Scene) => {
      const found = scene.items.filter(isCredit)
      return { count: found.length, text: found[0]?.text, z: found[0]?.z, last: isCredit(scene.items[scene.items.length - 1]) }
    }
    const ONE = { count: 1, text: CLIOPATRIA_META.attribution, z: Z_BANDS.credit, last: true }
    /** Like `change`, but a command that sets the current value leaves the Project as it is. */
    const set = (project: Project, command: Parameters<typeof apply>[1]): Project => {
      const result = apply(project, command)
      if (!result.ok) throw new Error('refused')
      return result.value.project
    }

    it.each(BASEMAP_IDS)('Basemap %s, at both adjustment extremes', (basemap) => {
      const project = set(at1050(), { type: 'SET_BASEMAP', payload: { basemap } })
      expect(credit(evaluate(project, 0, ctx()))).toEqual(ONE)
      for (const adjustments of [
        { brightness: -50, saturation: -100, tintColor: '#000000', tintIntensity: 60 },
        { brightness: 50, saturation: 50, tintColor: '#FFFFFF', tintIntensity: 60 },
      ]) expect(credit(evaluate(set(project, { type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments } }), 0, ctx()))).toEqual(ONE)
    })

    it.each(OUTPUT_FORMATS)('Output Format %s', (format) => {
      expect(credit(evaluate(set(at1050(), { type: 'SET_OUTPUT_FORMAT', payload: { outputFormat: format } }), 0, ctx({ frame: OUTPUT_FRAME_SIZES[format] })))).toEqual(ONE)
    })

    it('every Reference Date that has data, and the nearest-data fallback', () => {
      for (const year of [1050, 1150, 1450, 1900, 2030]) expect(credit(evaluate(set(blankProject(), { type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year } } }), 0, ctx()))).toEqual(ONE)
    })

    it('every Layer order, and every corner and prominence', () => {
      const project = at1050()
      const reversed = { ...project, layers: [...project.layers].reverse() }
      expect(credit(evaluate(reversed, 0, ctx()))).toEqual(ONE)
      for (const corner of ['bottom-left', 'bottom-right', 'top-left', 'top-right'] as const) {
        for (const prominence of ['discreet', 'legible'] as const) {
          expect(credit(evaluate(set(project, { type: 'SET_CREDIT', payload: { corner, prominence } }), 0, ctx()))).toEqual(ONE)
        }
      }
    })
  })
})
