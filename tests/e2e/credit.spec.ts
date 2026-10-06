import { createCanvas, loadImage } from '@napi-rs/canvas'
import { type Page, type Route } from '@playwright/test'
import { CLIOPATRIA_META, GEO_INDEX_WITH_META, GEO_STATES } from '../../src/core/testing/geo-fixtures'
import { DATASETS_DOCUMENT, expect, test } from './fixtures'

// Story 1.13: the Map credit (one locked line of the sources drawn), its position and prominence in
// Project settings, and « Sources et licences ». The data origin is mocked (fixture datasets.json, geo
// index with its full dataset block and states, see tests/e2e/fixtures.ts): no test depends on
// `pipeline/out*`, and no request leaves the app origin.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

const CREDIT = CLIOPATRIA_META.attribution
const SEA = '#D0DBE0'
const STYLE = {
  version: 8,
  sources: { land: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#00FF00' } },
  ],
}

type GeoMode = 'data' | 'not-found'
type DatasetsMode = 'data' | 'not-found' | 'html'

interface Mocks {
  /** Every request path to `/library/v1/`, in order. */
  readonly requests: string[]
}

/** Serves the styles, the geo fixture (with metadata) and datasets.json, and records the requests. */
async function mockData(page: Page, options: { geo?: GeoMode; datasets?: DatasetsMode } = {}): Promise<Mocks> {
  const requests: string[] = []
  await page.route('**/library/v1/styles/*.json', (route) => route.fulfill({ json: STYLE }))
  await page.route('**/library/v1/datasets.json', (route: Route) => {
    requests.push('/library/v1/datasets.json')
    if (options.datasets === 'not-found') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Data not built' })
    if (options.datasets === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>OPENMAP</body></html>' })
    return route.fulfill({ json: DATASETS_DOCUMENT })
  })
  await page.route('**/library/v1/geo/**', (route: Route) => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    if (options.geo === 'not-found') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Data not built' })
    if (path === '/library/v1/geo/index.json') return route.fulfill({ json: GEO_INDEX_WITH_META })
    const match = /^\/library\/v1\/geo\/([^/]+)\/(-?\d+)\.json$/.exec(path)
    const geometry = match && GEO_STATES[`${match[1]}/${match[2]}`]
    if (!geometry) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'unknown state' })
    return route.fulfill({
      json: { type: 'Feature', id: `cliopatria@0.2.0:${match[1]}`, properties: { fromYear: Number(match[2]), toYear: Number(match[2]), area: 1 }, geometry },
    })
  })
  return { requests }
}

function watchProblems(page: Page, baseURL: string) {
  const problems: string[] = []
  const appOrigin = new URL(baseURL).origin
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    // The browser's own "Failed to load resource" line for a 404 is not app-originated.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) problems.push(`console.error: ${message.text()}`)
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== appOrigin) problems.push(`foreign request: ${request.url()}`)
  })
  return problems
}

const canvas = (page: Page) => page.getByTestId('map-canvas')
const panel = (page: Page) => page.getByRole('complementary', { name: /^(Properties|Propriétés)$/ })
const frameBox = (page: Page) => page.getByTestId('output-frame')
const undoButton = (page: Page) => page.getByRole('banner', { name: 'Top bar' }).getByRole('button', { name: 'Undo', exact: true })
const redoButton = (page: Page) => page.getByRole('banner', { name: 'Top bar' }).getByRole('button', { name: 'Redo', exact: true })
const announcer = (page: Page) => page.locator('div.sr-only[role="status"]')

interface CreditLayout {
  corner: string
  prominence: string
  lines: string[]
  fontPx: number
  fontWeight: number
  anchor: [number, number]
  offset: [number, number]
  padding: [number, number]
  band: boolean
}

async function layout(page: Page): Promise<CreditLayout> {
  return JSON.parse((await canvas(page).getAttribute('data-credit-layout')) ?? 'null') as CreditLayout
}

/** Opens a new Project in the Editor and waits for the Map, with the credit drawn when `credit` is true. */
async function readyEditor(page: Page, baseURL: string, options: { credit?: boolean; french?: boolean; geo?: GeoMode; datasets?: DatasetsMode } = {}) {
  const mocks = await mockData(page, options)
  const problems = watchProblems(page, baseURL)
  const french = options.french ?? false
  await page.goto('/')
  await page.getByRole('button', { name: french ? 'Nouveau Projet' : 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
  await expect(canvas(page)).toHaveAttribute('data-showing', 'sea')
  if (options.credit ?? true) await expect(canvas(page)).toHaveAttribute('data-credit-state', 'drawn')
  return { mocks, problems }
}

async function openAdvanced(page: Page, french = false) {
  const row = panel(page).getByRole('button', { name: french ? /Plus d'options/ : /More options/ })
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click()
}

const position = (page: Page) => panel(page).getByRole('combobox', { name: 'Position' })
const prominence = (page: Page) => panel(page).getByRole('radiogroup', { name: 'Discretion' })
const sources = (page: Page) => panel(page).getByTestId('sources-section')

test.describe('the credit on the Map', () => {
  test('a new Project with Territories shows the Cliopatria credit bottom-left, discreet, in the source wording', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    await expect(canvas(page)).toHaveAttribute('data-credit', CREDIT)
    const shown = await layout(page)
    expect(shown).toMatchObject({ corner: 'bottom-left', prominence: 'discreet', lines: [CREDIT], fontWeight: 400, band: false })
    expect(CREDIT).toBe('Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0.')
    expect(problems).toEqual([])
  })

  test('the credit is sized by the frame scale: 18 reference px times s, and 24 times s once Legible', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    const box = (await frameBox(page).boundingBox())!
    const s = Math.min(box.width, box.height) / 1080
    expect((await layout(page)).fontPx).toBeCloseTo(18 * s, 1)
    await openAdvanced(page)
    await prominence(page).getByRole('radio', { name: 'Legible' }).click()
    await expect.poll(async () => (await layout(page)).band).toBe(true)
    const legible = await layout(page)
    expect(legible).toMatchObject({ prominence: 'legible', fontWeight: 500 })
    expect(legible.fontPx).toBeCloseTo(24 * s, 1)
    expect(legible.padding[0]).toBeCloseTo(12 * s, 1)
  })

  test('a position change moves the credit, is announced, and is one undo and redo step', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await expect(position(page)).toHaveValue('bottom-left')
    await expect(position(page)).toBeEnabled()
    await position(page).selectOption({ label: 'Top right' })
    await expect.poll(async () => (await layout(page)).corner).toBe('top-right')
    await expect(announcer(page)).toHaveText('Credit at the top right, discreet')
    await expect(undoButton(page)).toBeEnabled()
    await undoButton(page).click()
    await expect.poll(async () => (await layout(page)).corner).toBe('bottom-left')
    await expect(position(page)).toHaveValue('bottom-left')
    // One entry: nothing more to undo.
    await expect(undoButton(page)).toBeDisabled()
    await redoButton(page).click()
    await expect.poll(async () => (await layout(page)).corner).toBe('top-right')
    await expect(position(page)).toHaveValue('top-right')
  })

  test('both controls work from the keyboard and announce « Credit at the bottom right, legible »', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await position(page).focus()
    await page.keyboard.press('ArrowDown') // bottom-left → bottom-right
    await expect(position(page)).toHaveValue('bottom-right')
    await expect(announcer(page)).toHaveText('Credit at the bottom right, discreet')
    await prominence(page).getByRole('radio', { name: 'Discreet' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(prominence(page).getByRole('radio', { name: 'Legible' })).toBeChecked()
    await expect(announcer(page)).toHaveText('Credit at the bottom right, legible')
    await expect.poll(async () => (await layout(page)).corner).toBe('bottom-right')
    await expect.poll(async () => (await layout(page)).prominence).toBe('legible')
  })

  test('the choice is saved with the Project: it is still there after a reload', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await position(page).selectOption({ label: 'Top left' })
    await prominence(page).getByRole('radio', { name: 'Legible' }).click()
    await expect(undoButton(page)).toBeEnabled()
    await expect.poll(() => storedCredit(page)).toEqual({ corner: 'top-left', prominence: 'legible' })
    await page.reload()
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'drawn')
    expect(await layout(page)).toMatchObject({ corner: 'top-left', prominence: 'legible' })
  })

  test('no Territories data: no credit item, no error; the Sources section still lists the loaded Basemap sources', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!, { credit: false, geo: 'not-found' })
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'none')
    await expect(canvas(page)).toHaveAttribute('data-credit', '')
    await openAdvanced(page)
    await expect(sources(page).getByRole('listitem')).toHaveCount(2) // Natural Earth, the glyph fonts
    await expect(sources(page)).not.toContainText('Cliopatria')
    // No required credit is drawn: no locked row, a plain sentence, and the placement controls remain.
    await expect(panel(page).getByRole('group', { name: 'Required credit, locked' })).toHaveCount(0)
    await expect(panel(page)).toContainText('No source drawn on the map requires a credit at the moment.')
    await expect(position(page)).toBeVisible()
    // No credit is on the Map, so the announcement does not say there is one.
    await position(page).selectOption({ label: 'Top right' })
    await expect(announcer(page)).toHaveText('Credit position: Top right')
    await prominence(page).getByRole('radio', { name: 'Legible' }).click()
    await expect(announcer(page)).toHaveText('Credit discretion: Legible')
    expect(problems).toEqual([])
  })

  for (const datasets of ['not-found', 'html'] as const) {
    test(`the datasets file missing (${datasets === 'html' ? 'the HTML fallback' : '404'}): Basemap not listed, Cliopatria still credited, no toast, no console error`, async ({ page, baseURL }) => {
      const { problems } = await readyEditor(page, baseURL!, { datasets })
      await expect(canvas(page)).toHaveAttribute('data-credit', CREDIT)
      await openAdvanced(page)
      const items = sources(page).getByRole('listitem')
      await expect(items).toHaveCount(1)
      await expect(items.first()).toContainText('Cliopatria')
      await expect(sources(page)).not.toContainText('Natural Earth')
      // The toast region is always there; no toast means nothing in it.
      await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0)
      expect(problems).toEqual([])
    })
  }

  test('the datasets file is requested once per session and not at all after a reload (Library cache), and every request stays on the app origin', async ({ page, baseURL }) => {
    const { mocks, problems } = await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await expect(sources(page).getByRole('listitem')).toHaveCount(3)
    const datasetsRequests = () => mocks.requests.filter((path) => path === '/library/v1/datasets.json').length
    expect(datasetsRequests()).toBe(1)
    await page.reload()
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'drawn')
    await openAdvanced(page)
    await expect(sources(page).getByRole('listitem')).toHaveCount(3)
    expect(datasetsRequests()).toBe(1)
    expect(problems).toEqual([])
  })

  test('Territories hidden end to end: no credit item, the plain sentence in the credit group, and Sources still lists Cliopatria', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    const url = page.url()
    // Hide the Territories Layer in the saved Project (there is no Layer panel yet), as a later Story's UI will.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('openmap')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const transaction = open.result.transaction('projects', 'readwrite')
            const store = transaction.objectStore('projects')
            const all = store.getAll()
            all.onsuccess = () => {
              const [row] = all.result as { document: { layers: { kind: string; hidden: boolean }[] } }[]
              for (const layer of row.document.layers) if (layer.kind === 'territories') layer.hidden = true
              store.put(row)
            }
            transaction.oncomplete = () => {
              open.result.close()
              resolve()
            }
            transaction.onerror = () => reject(transaction.error)
          }
        }),
    )
    await page.goto('/')
    await page.goto(url)
    await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
    await expect(canvas(page)).toHaveAttribute('data-territories', '0')
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'none')
    await openAdvanced(page)
    await expect(panel(page)).toContainText('No source drawn on the map requires a credit at the moment.')
    await expect(panel(page).getByRole('group', { name: 'Required credit, locked' })).toHaveCount(0)
    await expect(sources(page).getByRole('listitem')).toHaveCount(3)
    await expect(sources(page)).toContainText('Cliopatria')
    expect(problems).toEqual([])
  })
})

test.describe('« Sources et licences » and the locked credit', () => {
  test('lists every loaded source with licence and attribution, marks the required one, and shows the credit locked without a checkbox', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await expect(sources(page).getByRole('heading', { name: 'Sources and licences' })).toBeVisible()
    const items = sources(page).getByRole('listitem')
    await expect(items).toHaveCount(3)
    // Natural Earth: the tiles and the styles share one row; optional, so no marker.
    await expect(items.nth(0)).toContainText('Natural Earth')
    await expect(items.nth(0)).toContainText('Licence: Public-Domain')
    await expect(items.nth(0)).toContainText('Made with Natural Earth.')
    await expect(items.nth(0)).toHaveAttribute('data-source', 'natural-earth-v1 basemap-styles-v1')
    await expect(items.nth(0)).not.toContainText('Required credit')
    await expect(items.nth(1)).toContainText('Licence: OFL-1.1')
    await expect(items.nth(1)).not.toContainText('Required credit')
    // Cliopatria: required, with the text marker (not colour alone).
    await expect(items.nth(2)).toContainText('Cliopatria (Seshat Global History Databank)')
    await expect(items.nth(2)).toContainText('Licence: CC-BY-4.0')
    await expect(items.nth(2)).toContainText(CREDIT)
    await expect(items.nth(2)).toContainText('Required credit')

    // The credit group: a locked row with the credit text and a padlock, the explanation, no checkbox.
    const locked = panel(page).getByRole('group', { name: 'Map credit' })
    await expect(locked.getByTestId('credit-locked-text')).toHaveText(CREDIT)
    await expect(locked).toContainText('Required credit, locked')
    await expect(locked).toContainText('Required: a map source licence asks for this credit. You choose its position and how discreet it is.')
    await expect(panel(page).getByRole('checkbox')).toHaveCount(0)
    await expect(panel(page)).not.toContainText('non modifiable')
    await expect(panel(page)).not.toContainText('Non-editable')
    expect(problems).toEqual([])
  })

  test.describe('in French', () => {
    test.use({ locale: 'fr-FR' })
    test('French UI with an English Map language: the credit keeps the source wording, the panel is French, the copy is the agreed one', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!, { french: true })
    await panel(page).getByRole('radio', { name: 'English' }).click()
    await expect(panel(page).getByRole('radio', { name: 'English' })).toBeChecked()
    expect(await layout(page)).toMatchObject({ lines: [CREDIT] })
    await openAdvanced(page, true)
    await expect(sources(page).getByRole('heading', { name: 'Sources et licences' })).toBeVisible()
    await expect(sources(page)).toContainText('Licence\u202f: CC-BY-4.0')
    await expect(sources(page)).toContainText('Crédit obligatoire')
    const locked = panel(page).getByRole('group', { name: 'Crédit sur la Carte' })
    // The source's own English wording, tagged as English.
    await expect(locked.getByTestId('credit-locked-text')).toHaveText(CREDIT)
    await expect(locked.getByTestId('credit-locked-text')).toHaveAttribute('lang', 'en')
    await expect(locked).toContainText('Crédit obligatoire, verrouillé')
    await expect(locked.locator('p')).toHaveText("Obligatoire\u202f: la licence d'une source de la Carte demande ce crédit. Vous choisissez sa position et sa discrétion.")
    await expect(panel(page)).not.toContainText('Crédit non modifiable')
    await expect(panel(page).getByRole('checkbox')).toHaveCount(0)
    await expect(panel(page).getByRole('combobox', { name: 'Position' })).toBeVisible()
    await panel(page).getByRole('combobox', { name: 'Position' }).selectOption({ label: 'Haut à droite' })
    await expect(announcer(page)).toHaveText('Crédit en haut à droite, discrète')
    await panel(page).getByRole('radiogroup', { name: 'Discrétion' }).getByRole('radio', { name: 'Lisible' }).click()
    await expect(announcer(page)).toHaveText('Crédit en haut à droite, lisible')
    // Still the same line on the Map.
    expect(await layout(page)).toMatchObject({ corner: 'top-right', prominence: 'legible', lines: [CREDIT] })
    expect(problems).toEqual([])
    })
  })
})

/** The credit stored in the Project row of IndexedDB. */
function storedCredit(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open('openmap')
        open.onsuccess = () => {
          const request = open.result.transaction('projects').objectStore('projects').getAll()
          request.onsuccess = () => {
            open.result.close()
            const [row] = request.result as { document: { credit?: unknown } }[]
            resolve(row?.document.credit)
          }
        }
      }),
  )
}

test.describe('older and newer documents', () => {
  test('a stored v2 Project opens, is migrated with the default credit, and starts with an empty undo stack', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    const url = page.url()
    // Rewrite the saved row as a v2 document (no credit), as the previous version of the app stored it.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('openmap')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const db = open.result
            const transaction = db.transaction('projects', 'readwrite')
            const store = transaction.objectStore('projects')
            const all = store.getAll()
            all.onsuccess = () => {
              const [row] = all.result as { document: Record<string, unknown> }[]
              const { credit: _credit, ...rest } = row.document
              store.put({ ...row, document: { ...rest, schemaVersion: 2 } })
            }
            transaction.oncomplete = () => {
              db.close()
              resolve()
            }
            transaction.onerror = () => reject(transaction.error)
          }
        }),
    )
    expect(await storedCredit(page)).toBeUndefined()
    await page.goto('/')
    await page.goto(url)
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'drawn')
    expect(await layout(page)).toMatchObject({ corner: 'bottom-left', prominence: 'discreet' })
    await expect(undoButton(page)).toBeDisabled()
    await openAdvanced(page)
    await expect(position(page)).toHaveValue('bottom-left')
    // The next save writes the migrated document.
    await position(page).selectOption({ label: 'Bottom right' })
    await expect.poll(() => storedCredit(page)).toEqual({ corner: 'bottom-right', prominence: 'discreet' })
  })

  test('a newer document (v4) opens without a Map or credit controls, read-only', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('openmap')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const transaction = open.result.transaction('projects', 'readwrite')
            transaction.objectStore('projects').put({
              id: 'newerDocument00000001',
              document: { schemaVersion: 4, id: 'newerDocument00000001', name: 'From the future', mapLocale: 'en' },
              name: 'From the future',
              outputFormat: '16:9',
              updatedAt: Date.now(),
              lockEpoch: 0,
            })
            transaction.oncomplete = () => {
              open.result.close()
              resolve()
            }
            transaction.onerror = () => reject(transaction.error)
          }
        }),
    )
    await page.goto('/#/p/newerDocument00000001')
    await expect(page.getByRole('status').filter({ hasText: 'newer version' })).toBeVisible()
    await expect(canvas(page)).not.toHaveAttribute('data-ready', 'true')
    await expect(panel(page).getByRole('button', { name: /More options/ })).toHaveCount(0)
    await expect(position(page)).toHaveCount(0)
  })
})

interface Shot {
  /** Size of the captured area in CSS px. */
  readonly width: number
  readonly height: number
  /** Pixel ratio of the capture. */
  readonly ratio: number
  /** The RGB of the pixel at CSS px (x, y), rounded down. */
  at(x: number, y: number): number[]
  /** Pixels whose luminance is at least `delta` below `base`, as CSS px [x, y]. */
  darker(base: number, delta: number, within?: (x: number, y: number) => boolean): [number, number][]
}

const luminance = (r: number, g: number, b: number) => 0.3 * r + 0.59 * g + 0.11 * b
const hexLuminance = (hex: string) => luminance(...(([1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number])))

/** A screenshot of `clip` (CSS px of the page) decoded to pixels. */
async function shoot(page: Page, clip: { x: number; y: number; width: number; height: number }): Promise<Shot> {
  const ratio = await page.evaluate(() => window.devicePixelRatio)
  const png = await page.screenshot({ clip })
  const image = await loadImage(png)
  const surface = createCanvas(image.width, image.height)
  const context = surface.getContext('2d')
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, image.width, image.height)
  return {
    width: image.width / ratio,
    height: image.height / ratio,
    ratio,
    at: (x, y) => {
      const i = (Math.floor(y * ratio) * image.width + Math.floor(x * ratio)) * 4
      return [data[i], data[i + 1], data[i + 2]]
    },
    darker: (base, delta, within = () => true) => {
      const found: [number, number][] = []
      for (let i = 0; i < data.length; i += 4) {
        const px = ((i / 4) % image.width) / ratio
        const py = Math.floor(i / 4 / image.width) / ratio
        if (within(px, py) && luminance(data[i], data[i + 1], data[i + 2]) < base - delta) found.push([px, py])
      }
      return found
    },
  }
}

/** The output frame, captured. */
async function frameShot(page: Page): Promise<Shot> {
  await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
  const box = (await frameBox(page).boundingBox())!
  return shoot(page, { x: Math.round(box.x), y: Math.round(box.y), width: Math.floor(box.width), height: Math.floor(box.height) })
}

const SEA_LUMINANCE = hexLuminance(SEA)
const bounds = (pixels: [number, number][]) => ({
  minX: Math.min(...pixels.map(([x]) => x)),
  maxX: Math.max(...pixels.map(([x]) => x)),
  minY: Math.min(...pixels.map(([, y]) => y)),
  maxY: Math.max(...pixels.map(([, y]) => y)),
})

/**
 * Checks the ink of the credit at `corner` of the frame: it sits in that corner's strip, its edges at the
 * 24 reference px margin (plus the band padding when Legible), inside the frame, and the opposite strips
 * (the other side of the frame, and the far end of the same side) have none.
 */
function expectCreditAtCorner(shot: Shot, shown: CreditLayout, s: number, label: string) {
  const left = shown.corner.endsWith('left')
  const top = shown.corner.startsWith('top')
  const margin = 24 * s
  const strip = margin + 70 * s
  const inStrip = (y: number) => (top ? y < strip : y > shot.height - strip)
  // Small anti-aliased text is light: any pixel darker than the flat sea is ink.
  const ink = shot.darker(SEA_LUMINANCE, 8)
  const mine = ink.filter(([, y]) => inStrip(y))
  expect(mine.length, `${label}: ink at the corner`).toBeGreaterThan(15)
  // Nothing in the strip on the other side of the frame, nor at the far end of this strip.
  expect(ink.filter(([, y]) => !inStrip(y) && (top ? y > shot.height - strip : y < strip)).length, `${label}: opposite strip`).toBe(0)
  expect(mine.filter(([x]) => (left ? x > shot.width * 0.75 : x < shot.width * 0.25)).length, `${label}: far end of the strip`).toBe(0)
  const box = bounds(mine)
  expect(box.minX).toBeGreaterThanOrEqual(0)
  expect(box.maxX).toBeLessThanOrEqual(shot.width)
  const padX = shown.padding[0]
  const padY = shown.padding[1]
  // Horizontal edge: at the margin (the band's edge when Legible puts the text one padding further in), ±3 px;
  // on the right the line ends with a full stop and deck.gl's glyph run keeps the advance and atlas padding
  // of that last glyph blank (measured: up to about 0.4 of the type size).
  if (left) expect(Math.abs(box.minX - (margin + padX)), `${label}: left edge`).toBeLessThanOrEqual(3)
  else expect(Math.abs(shot.width - box.maxX - (margin + padX)), `${label}: right edge`).toBeLessThanOrEqual(3 + 0.4 * shown.fontPx)
  // Vertical edge: at the margin ± 3 px, plus the gap between the line box and the glyphs (about a third of the type size).
  const gap = 0.4 * shown.fontPx
  if (top) {
    const delta = box.minY - (margin + padY)
    expect(delta, `${label}: top edge`).toBeGreaterThanOrEqual(-3)
    expect(delta, `${label}: top edge`).toBeLessThanOrEqual(3 + gap)
  } else {
    const delta = shot.height - box.maxY - (margin + padY)
    expect(delta, `${label}: bottom edge`).toBeGreaterThanOrEqual(-3)
    expect(delta, `${label}: bottom edge`).toBeLessThanOrEqual(3 + gap)
  }
}

const frameScaleOf = async (page: Page) => {
  const box = (await frameBox(page).boundingBox())!
  return Math.min(box.width, box.height) / 1080
}

test.describe('the credit in the output frame', () => {
  // A large window, so the smallest text (discreet, 9:16) is several pixels tall in the screenshot.
  test.use({ viewport: { width: 1920, height: 1080 } })
  const FORMATS = ['16:9', '9:16', '1:1'] as const

  test('control: with the same Map and no credit (no Territories data) the four corner strips are free of ink', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!, { credit: false, geo: 'not-found' })
    for (const format of FORMATS) {
      await panel(page).getByRole('radio', { name: format, exact: true }).click()
      const shot = await frameShot(page)
      const s = await frameScaleOf(page)
      expect(shot.darker(SEA_LUMINANCE, 8, (_x, y) => y < 94 * s || y > shot.height - 94 * s), format).toEqual([])
    }
  })

  test('Legible is a real band: halo colour at about 90 % opacity between the text and the margin, its outer edge at the margin', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await prominenceRadio(page, 'Legible').click()
    await expect.poll(async () => (await layout(page)).band).toBe(true)
    const shot = await frameShot(page)
    const s = await frameScaleOf(page)
    const shown = await layout(page)
    const margin = 24 * s
    const [padX, padY] = shown.padding
    const lineHeight = shown.fontPx * 1.2
    const bandHeight = shown.lines.length * lineHeight + 2 * padY
    const midY = shot.height - margin - bandHeight / 2
    // The halo colour of parchment, 90 % over the sea.
    const halo = [0xf7, 0xf3, 0xea]
    const sea = [0xd0, 0xdb, 0xe0]
    const expected = halo.map((channel, i) => 0.9 * channel + 0.1 * sea[i])
    const inside = shot.at(margin + padX / 2, midY) // between the band's edge and the text
    for (let i = 0; i < 3; i++) expect(Math.abs(inside[i] - expected[i]), `channel ${i} of ${inside}`).toBeLessThanOrEqual(6)
    // Just outside the band (one padding beyond the margin) it is the sea; just inside the edge it is the band.
    const outside = shot.at(Math.max(0, margin - 3), midY)
    for (let i = 0; i < 3; i++) expect(Math.abs(outside[i] - sea[i])).toBeLessThanOrEqual(6)
    const justInside = shot.at(margin + 2, midY)
    for (let i = 0; i < 3; i++) expect(Math.abs(justInside[i] - expected[i])).toBeLessThanOrEqual(6)
    // Above and below the band: the sea again (the band stops at its padding).
    const above = shot.at(margin + padX / 2, shot.height - margin - bandHeight - 3)
    for (let i = 0; i < 3; i++) expect(Math.abs(above[i] - sea[i])).toBeLessThanOrEqual(6)
  })

  test('the Map moving under the frame does not move the credit: a zoom and a pan keep the anchor and the ink in the corner', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    const before = await canvas(page).getAttribute('data-credit-layout')
    const cameraBefore = await canvas(page).getAttribute('data-camera')
    await page.getByRole('region', { name: 'Map' }).getByRole('button', { name: 'Zoom in' }).click()
    await page.keyboard.press('Alt+4')
    await page.keyboard.down('ArrowLeft')
    await expect.poll(() => canvas(page).getAttribute('data-camera')).not.toBe(cameraBefore)
    await page.keyboard.up('ArrowLeft')
    await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
    expect(await canvas(page).getAttribute('data-camera')).not.toBe(cameraBefore)
    expect(await canvas(page).getAttribute('data-credit-layout')).toBe(before)
    const s = await frameScaleOf(page)
    expectCreditAtCorner(await frameShot(page), await layout(page), s, 'after a zoom and a pan')
  })

  test('the credit is clipped to the frame: a world copy of the Map in view shows no credit in the dimmed area', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await panel(page).getByRole('radio', { name: '1:1', exact: true }).click()
    await prominenceRadio(page, 'Legible').click()
    for (const corner of ['Bottom left', 'Top right'] as const) {
      await position(page).selectOption({ label: corner })
      await expect.poll(async () => (await layout(page)).corner).toBe(corner.toLowerCase().replace(' ', '-'))
      await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
      const area = (await page.getByRole('region', { name: 'Map' }).boundingBox())!
      const box = (await frameBox(page).boundingBox())!
      // The frame is narrower than the area: the world repeats left and right of it.
      expect(box.width).toBeLessThan(area.width - 200)
      const shot = await shoot(page, { x: area.x, y: box.y, width: area.width, height: box.height })
      const frameLeft = box.x - area.x
      const outside = (x: number) => x < frameLeft - 1 || x > frameLeft + box.width + 1
      // In the dimmed area the credit would be dark ink at 55 % under the mask: far darker than the dimmed sea.
      const dimSea = shot.at(frameLeft / 2, box.height / 2)
      const dimLuminance = luminance(dimSea[0], dimSea[1], dimSea[2])
      expect(dimLuminance).toBeLessThan(SEA_LUMINANCE) // it is the dimmed area
      expect(shot.darker(dimLuminance, 70, (x) => outside(x)), `${corner}: ink outside the frame`).toEqual([])
      // Control: inside the frame the same threshold does find the credit.
      expect(shot.darker(SEA_LUMINANCE, 35, (x) => !outside(x)).length).toBeGreaterThan(15)
    }
  })

  test('on Dark (sombre) the credit is light ink on a dark halo and reads against the sea', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await panel(page).getByRole('radio', { name: 'Dark' }).click()
    await expect(canvas(page)).toHaveAttribute('data-basemap', 'sombre')
    await expect(canvas(page)).toHaveAttribute('data-showing', 'sea')
    await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
    const sea = (await canvas(page).getAttribute('data-sea'))!
    const shot = await frameShot(page)
    const s = await frameScaleOf(page)
    const margin = 24 * s
    // Light pixels in the bottom-left strip: the text (`map-label` of sombre, #ECE7DB).
    const seaLuminance = hexLuminance(sea)
    let brightest = 0
    for (let y = shot.height - margin - 40 * s; y < shot.height - margin + 2; y++) {
      for (let x = margin - 2; x < shot.width * 0.7; x++) {
        const [r, g, b] = shot.at(x, y)
        brightest = Math.max(brightest, luminance(r, g, b))
      }
    }
    expect(brightest).toBeGreaterThan(seaLuminance + 80)
    expect(brightest).toBeGreaterThan(190)
    // The sea is dark and the text light: a contrast ratio well above 4.5 on the strongest pixel.
    const toLinear = (value: number) => (value / 255 <= 0.03928 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4)
    const relative = (l: number) => toLinear(l)
    expect((relative(brightest) + 0.05) / (relative(seaLuminance) + 0.05)).toBeGreaterThan(4.5)
  })
})

test.describe('the credit in every Output Format and corner', () => {
  // Pixel ratio 2 and a large window: the smallest text (discreet, 9:16) is about 8 CSS px tall, and at ratio 1 its thin
  // strokes and its full stops fall below any threshold, so the last glyphs of the line would not show as ink.
  test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  const FORMATS = ['16:9', '9:16', '1:1'] as const
  const CORNERS = ['Bottom left', 'Bottom right', 'Top left', 'Top right'] as const
  const PROMINENCES = ['Discreet', 'Legible'] as const

  test('every Output Format, corner and prominence: the credit sits in the frame at the 24 reference px margin, wrapped, never clipped, and nowhere else', async ({ page, baseURL }) => {
    test.setTimeout(500_000)
    const { problems } = await readyEditor(page, baseURL!)
    await openAdvanced(page)
    for (const format of FORMATS) {
      await panel(page).getByRole('radio', { name: format, exact: true }).click()
      for (const prominence of PROMINENCES) {
        await prominenceRadio(page, prominence).click()
        for (const corner of CORNERS) {
          const label = `${format} ${prominence} ${corner}`
          await position(page).selectOption({ label: corner })
          await expect.poll(async () => (await layout(page)).corner, { message: label }).toBe(corner.toLowerCase().replace(' ', '-'))
          await expect.poll(async () => (await layout(page)).prominence, { message: label }).toBe(prominence.toLowerCase())
          const shot = await frameShot(page)
          const box = (await frameBox(page).boundingBox())!
          const area = (await page.getByRole('region', { name: 'Map' }).boundingBox())!
          const s = await frameScaleOf(page)
          const shown = await layout(page)
          // The anchor is the frame corner (in the Map area), the offset the margin times s (plus the band padding), inward.
          expect(shown.anchor[0]).toBeCloseTo(box.x - area.x + (corner.endsWith('left') ? 0 : box.width), 0)
          expect(shown.anchor[1]).toBeCloseTo(box.y - area.y + (corner.startsWith('Top') ? 0 : box.height), 0)
          expect(Math.abs(shown.offset[0])).toBeCloseTo(24 * s + shown.padding[0], 1)
          expect(Math.abs(shown.offset[1])).toBeCloseTo(24 * s + shown.padding[1], 1)
          expect(shown.lines.length).toBeLessThanOrEqual(2)
          expect(shown.lines.join(' ')).toBe(CREDIT)
          expectCreditAtCorner(shot, shown, s, label)
        }
      }
    }
    expect(problems).toEqual([])
  })

})

test.describe('the credit at a device pixel ratio of 2', () => {
  test.use({ deviceScaleFactor: 2 })

  test('top-right, discreet and legible: the same edges and the same strips as at ratio 1, in a clipped frame', async ({ page, baseURL }) => {
    test.setTimeout(120_000)
    await readyEditor(page, baseURL!)
    await openAdvanced(page)
    await position(page).selectOption({ label: 'Top right' })
    for (const prominence of ['Discreet', 'Legible'] as const) {
      await prominenceRadio(page, prominence).click()
      await expect.poll(async () => (await layout(page)).prominence).toBe(prominence.toLowerCase())
      await expect.poll(async () => (await layout(page)).corner).toBe('top-right')
      const shot = await frameShot(page)
      expect(shot.ratio).toBe(2)
      expectCreditAtCorner(shot, await layout(page), await frameScaleOf(page), `ratio 2 ${prominence}`)
    }
  })
})

const prominenceRadio = (page: Page, name: 'Discreet' | 'Legible') => prominence(page).getByRole('radio', { name })

test.describe('the credit font', () => {
  test('a slow font does not block the Map: the credit appears when the font is ready, in the right place, and nothing moves', async ({ page }) => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/*source-sans-3*.woff2*', async (route) => {
      await gate
      await route.continue()
    })
    await mockData(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
    await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
    // The Map is up and editable while the font is still loading.
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'pending')
    await expect(canvas(page)).toHaveAttribute('data-credit', CREDIT)
    const before = await frameBox(page).boundingBox()
    const camera = await canvas(page).getAttribute('data-camera')
    // Interactive while pending: the zoom button moves the camera.
    await page.getByRole('region', { name: 'Map' }).getByRole('button', { name: 'Zoom in' }).click()
    await expect.poll(() => canvas(page).getAttribute('data-camera')).not.toBe(camera)
    await page.getByRole('region', { name: 'Map' }).getByRole('button', { name: 'Recentre' }).click()
    await expect.poll(() => canvas(page).getAttribute('data-camera')).toBe(camera)
    release()
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'drawn')
    expect(await frameBox(page).boundingBox()).toEqual(before)
    expect(await canvas(page).getAttribute('data-camera')).toBe(camera)
    // Where it appears: the bottom-left corner of the frame, at the margin, as computed from the frame.
    const box = before!
    const area = (await page.getByRole('region', { name: 'Map' }).boundingBox())!
    const s = Math.min(box.width, box.height) / 1080
    const first = await layout(page)
    expect(first.anchor[0]).toBeCloseTo(box.x - area.x, 0)
    expect(first.anchor[1]).toBeCloseTo(box.y - area.y + box.height, 0)
    expect(first.offset[0]).toBeCloseTo(24 * s, 1)
    expect(first.offset[1]).toBeCloseTo(-24 * s, 1)
    expect(first.fontPx).toBeCloseTo(18 * s, 1)
    await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
    expect(await layout(page)).toEqual(first) // it does not move between two polls
  })
})
