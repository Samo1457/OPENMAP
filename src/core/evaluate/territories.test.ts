import { describe, expect, it } from 'vitest'
import { apply } from '../commands/apply'
import type { Geodata } from '../geo/geo'
import { type Project, OUTPUT_FRAME_SIZES } from '../model/project'
import { mapColors } from '../basemap/palettes'
import { adjustColour } from '../basemap/adjust-colour'
import { blankProject } from '../testing/fixtures'
import { GEO_INDEX, GEO_STATES } from '../testing/geo-fixtures'
import { evaluate, TERRITORY_OUTLINE_WIDTH } from './evaluate'
import { isTerritory, type Scene } from './scene'
import { layerZ } from './z-bands'

/** The Territory items of a Scene (the credit, when there is one, is another kind). */
const territoriesOf = (scene: Scene) => scene.items.filter(isTerritory)
const geodata: Geodata = { index: GEO_INDEX, states: GEO_STATES }
const ctx = (data: Geodata = geodata) => ({ geodata: data, frame: OUTPUT_FRAME_SIZES['16:9'] })

function at(year: number, project: Project = blankProject()): Project {
  const result = apply(project, { type: 'SET_REFERENCE_DATE', payload: { referenceDate: { year } } })
  if (!result.ok || !result.value.changed) throw new Error('expected a change')
  return result.value.project
}

describe('evaluate: neutral Territories (Story 1.11)', () => {
  it('draws the entities valid at the Reference Date, one item each, with canonical keys', () => {
    const scene = evaluate(at(1050), 0, ctx())
    expect(territoriesOf(scene).map((item) => item.key)).toEqual(['cliopatria@0.2.0:rome', 'cliopatria@0.2.0:gaul'])
    expect(scene.dataDate).toEqual({ year: 1050, exact: true })
    expect(territoriesOf(scene)[0].geometry).toBe(GEO_STATES['rome/1000'])
  })

  it('applies the countries view: members of a valid group and relations are hidden', () => {
    expect(territoriesOf(evaluate(at(1450), 0, ctx())).map((item) => item.key)).toEqual(['cliopatria@0.2.0:rome', 'cliopatria@0.2.0:empire.group'])
  })

  it('uses the nearest data year and says so when there is no exact data', () => {
    const scene = evaluate(at(2030), 0, ctx())
    expect(scene.dataDate).toEqual({ year: 1900, exact: false })
    expect(territoriesOf(scene).map((item) => item.key)).toEqual(['cliopatria@0.2.0:solo'])
  })

  it('puts every item in the Territories Layer z, inside the Project Layers band', () => {
    const project = at(1050)
    const index = project.layers.findIndex((layer) => layer.kind === 'territories')
    for (const item of territoriesOf(evaluate(project, 0, ctx()))) expect(item.z).toBe(layerZ(index))
  })

  it('styles an outline with the Basemap coast colour, adjustments applied, and no fill', () => {
    const plain = evaluate(at(1050), 0, ctx())
    expect(territoriesOf(plain)[0].outline).toEqual({ colour: mapColors.parchment['map-coast'], width: TERRITORY_OUTLINE_WIDTH })
    expect('fill' in territoriesOf(plain)[0]).toBe(false)
    const adjustments = { brightness: 20, saturation: -30 }
    const adjusted = apply(at(1050), { type: 'SET_BASEMAP_ADJUSTMENTS', payload: { adjustments } })
    if (!adjusted.ok || !adjusted.value.changed) throw new Error('expected a change')
    const scene = evaluate(adjusted.value.project, 0, ctx())
    expect(territoriesOf(scene)[0].outline.colour).toBe(adjustColour(mapColors.parchment['map-coast'], adjustments))
    expect(territoriesOf(scene)[0].outline.colour).toBe(scene.basemap.colours.coast)
    expect(territoriesOf(scene)[0].outline.colour).not.toBe(territoriesOf(plain)[0].outline.colour)
  })

  it('keeps the outline width in reference px whatever the Output Format (the renderer scales it by s)', () => {
    const project = at(1050)
    const wide = evaluate(project, 0, ctx())
    const tall = evaluate(project, 0, { geodata, frame: OUTPUT_FRAME_SIZES['9:16'] })
    expect(territoriesOf(wide).map((item) => item.outline.width)).toEqual(territoriesOf(tall).map((item) => item.outline.width))
    expect(tall.frame).toEqual(OUTPUT_FRAME_SIZES['9:16'])
  })

  it('is deterministic and serializable, and does not change with t', () => {
    const project = at(1450)
    const first = evaluate(project, 0, ctx())
    expect(evaluate(project, 0, ctx())).toEqual(first)
    expect(territoriesOf(evaluate(project, 12, ctx()))).toEqual(territoriesOf(first))
    expect(JSON.parse(JSON.stringify(first))).toEqual(first)
  })

  it('draws nothing and carries no dataDate without the index, or with another version of it', () => {
    for (const data of [{}, { states: GEO_STATES }, { index: { ...GEO_INDEX, dataset: { ...GEO_INDEX.dataset, version: '0.3.0' } }, states: GEO_STATES }]) {
      const scene = evaluate(at(1050), 0, ctx(data))
      expect(territoriesOf(scene)).toEqual([])
      expect('dataDate' in scene).toBe(false)
    }
  })

  it('skips an entity whose state is not loaded yet, and still reports the data date', () => {
    const { ['gaul/1000']: _skipped, ...rest } = GEO_STATES
    const scene = evaluate(at(1050), 0, ctx({ index: GEO_INDEX, states: rest }))
    expect(territoriesOf(scene).map((item) => item.key)).toEqual(['cliopatria@0.2.0:rome'])
    expect(scene.dataDate).toEqual({ year: 1050, exact: true })
  })

  it('draws no Territory when the Territories Layer is hidden or missing (AD-24)', () => {
    const project = at(1050)
    const hidden = { ...project, layers: project.layers.map((layer) => (layer.kind === 'territories' ? { ...layer, hidden: true } : layer)) }
    expect(territoriesOf(evaluate(hidden, 0, ctx()))).toEqual([])
    const missing = { ...project, layers: project.layers.filter((layer) => layer.kind !== 'territories') }
    expect(territoriesOf(evaluate(missing, 0, ctx()))).toEqual([])
  })
})
