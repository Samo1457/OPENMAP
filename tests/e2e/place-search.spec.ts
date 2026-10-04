import AxeBuilder from '@axe-core/playwright'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { type Locator, type Page, type Route } from '@playwright/test'
import { SEARCH_GEO_INDEX, SEARCH_GEO_STATES, SEARCH_INDEX } from '../../src/core/testing/search-fixtures'
import { expect, test } from './fixtures'

// Story 1.12: the place search (FR-8, UX-DR62, UX-DR146): the combobox in the top bar, matching in both
// languages, the `/` key, picking (edit camera + selected GeoEntity), the empty and unavailable states,
// the Library cache. The data origin is mocked (the search fixture and the Ottoman fixture of
// src/core/testing/search-fixtures.ts): no test depends on `pipeline/out-search`, and no request leaves
// the app origin.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

const INK = '#18222D'
const HALO = '#F7F3EA'

/** A style that is only the sea: every pixel that is not the sea is an outline. */
const STYLE = {
  version: 8,
  sources: { land: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#00FF00' } },
  ],
}

type IndexMode = 'data' | 'not-found' | 'html' | 'bad-json' | 'invalid' | 'offline'

interface Mocks {
  /** Every request to the search index, in order. */
  readonly searchRequests: string[]
  setIndexMode(mode: IndexMode): void
}

async function mockData(page: Page, initial: IndexMode = 'data'): Promise<Mocks> {
  let mode = initial
  const searchRequests: string[] = []
  await page.route('**/library/v1/styles/*.json', (route) => route.fulfill({ json: STYLE }))
  await page.route('**/library/v1/search/**', async (route: Route) => {
    searchRequests.push(new URL(route.request().url()).pathname)
    if (mode === 'offline') return route.abort('internetdisconnected')
    if (mode === 'not-found') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Place search index not built' })
    if (mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>OPENMAP</body></html>' })
    if (mode === 'bad-json') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"schemaVersion": 1, "places": [' })
    if (mode === 'invalid') return route.fulfill({ json: { ...SEARCH_INDEX, places: [['X', '', 999, 0, 1, 0]] } })
    return route.fulfill({ json: SEARCH_INDEX })
  })
  await page.route('**/library/v1/geo/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/library/v1/geo/index.json') return route.fulfill({ json: SEARCH_GEO_INDEX })
    const match = /^\/library\/v1\/geo\/([^/]+)\/(-?\d+)\.json$/.exec(path)
    const geometry = match && SEARCH_GEO_STATES[`${match[1]}/${match[2]}`]
    if (!geometry) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'unknown state' })
    return route.fulfill({ json: { type: 'Feature', id: `cliopatria@0.2.0:${match[1]}`, properties: { fromYear: Number(match[2]), toYear: Number(match[2]), area: 1 }, geometry } })
  })
  return { searchRequests, setIndexMode: (next) => void (mode = next) }
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
const field = (page: Page) => page.getByRole('combobox', { name: /^(Search for a place|Rechercher un lieu)$/ })
const listbox = (page: Page) => page.getByRole('listbox')
const options = (page: Page) => listbox(page).getByRole('option')
const message = (page: Page) => page.getByTestId('place-search-message')
const announcer = (page: Page) => page.locator('div.sr-only[role="status"]')
const undoButton = (page: Page) => page.getByRole('banner').getByRole('button', { name: /^(Undo|Annuler)$/ })
const dateField = (page: Page) => page.getByRole('complementary').getByRole('textbox', { name: /^(Reference date|Date de référence)$/ })
const mapRegion = (page: Page) => page.locator('[data-region="map"]')

async function readyEditor(page: Page, baseURL: string, mode: IndexMode = 'data') {
  const mocks = await mockData(page, mode)
  const problems = watchProblems(page, baseURL)
  await page.goto('/')
  await page.getByRole('button', { name: /^(New Project|Nouveau Projet)$/ }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
  // The Territories of 1900 (the Ottoman Empire) are loaded: the search can offer them.
  await expect(canvas(page)).toHaveAttribute('data-territories', '1')
  await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
  return { ...mocks, problems }
}

async function search(page: Page, text: string) {
  await field(page).click()
  await field(page).fill(text)
}

const labels = (locator: Locator) => locator.evaluateAll((nodes) => nodes.map((node) => node.querySelector('span span')?.textContent ?? ''))

interface Camera {
  center: [number, number]
  zoom: number
}
const camera = async (page: Page) => JSON.parse((await canvas(page).getAttribute('data-camera'))!) as Camera

/** Library cache keys held by the app's IndexedDB. */
function cacheKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('openmap')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const request = db.transaction('libraryCache').objectStore('libraryCache').getAllKeys()
          request.onsuccess = () => {
            db.close()
            resolve((request.result as string[]).sort())
          }
          request.onerror = () => reject(request.error)
        }
      }),
  )
}

/** The stored Projects, to check that a search never writes one. */
function projectRows(page: Page): Promise<unknown[]> {
  return page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('openmap')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const request = db.transaction('projects').objectStore('projects').getAll()
          request.onsuccess = () => {
            db.close()
            resolve(request.result)
          }
          request.onerror = () => reject(request.error)
        }
      }),
  )
}

const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
const distance = (a: number[], b: number[]) => Math.max(...a.map((value, i) => Math.abs(value - b[i])))

async function windowPixels(page: Page, x: number, y: number): Promise<number[][]> {
  const png = await page.screenshot({ clip: { x: Math.floor(x) - 12, y: Math.floor(y) - 12, width: 24, height: 24 } })
  const image = await loadImage(png)
  const surface = createCanvas(24, 24)
  const context = surface.getContext('2d')
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, 24, 24)
  return Array.from({ length: 576 }, (_, i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]])
}

/** Page position of the point (lon, lat) for the camera the Map shows now. */
async function pagePoint(page: Page, lon: number, lat: number) {
  const frameBox = (await page.getByTestId('output-frame').boundingBox())!
  const view = await camera(page)
  const scale = Math.min(frameBox.width, frameBox.height) / 1080
  const world = 512 * 2 ** (view.zoom + Math.log2(scale))
  const mercatorY = (degrees: number) => Math.log(Math.tan(Math.PI / 4 + (degrees * Math.PI) / 360)) / (2 * Math.PI)
  return {
    x: frameBox.x + frameBox.width / 2 + ((lon - view.center[0]) / 360) * world,
    y: frameBox.y + frameBox.height / 2 - (mercatorY(lat) - mercatorY(view.center[1])) * world,
  }
}

test.describe('the field', () => {
  test('is a labelled combobox in the top bar, inert nowhere, with the `/` hint, and loads nothing until it is focused', async ({ page, baseURL }) => {
    const { searchRequests, problems } = await readyEditor(page, baseURL!)
    await expect(field(page)).toBeVisible()
    await expect(page.getByRole('banner', { name: 'Top bar' }).getByRole('combobox')).toHaveCount(1)
    await expect(field(page)).toHaveAttribute('aria-autocomplete', 'list')
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(field(page)).toHaveAttribute('aria-keyshortcuts', '/')
    await expect(field(page)).toHaveAttribute('placeholder', 'Search for a place')
    await expect(page.getByRole('banner', { name: 'Top bar' }).locator('kbd')).toHaveText('/')
    // Lazy: not at Editor open, not when another control is focused.
    await page.keyboard.press('Alt+5')
    await page.keyboard.press('Tab')
    expect(searchRequests).toEqual([])
    expect(await cacheKeys(page)).not.toContain('library/v1/search/index')
    await field(page).focus()
    await expect.poll(() => searchRequests.length).toBe(1)
    expect(searchRequests).toEqual(['/library/v1/search/index.json'])
    await expect.poll(() => cacheKeys(page)).toContain('library/v1/search/index')
    expect(problems).toEqual([])
  })

  test('fewer than two characters show nothing; two show the list', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, '')
    await expect(listbox(page)).toHaveCount(0)
    await field(page).fill('l')
    await expect(listbox(page)).toHaveCount(0)
    await expect(message(page)).toHaveCount(0)
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false')
    await field(page).fill(' l ')
    await expect(listbox(page)).toHaveCount(0)
    await field(page).fill('lo')
    await expect(listbox(page)).toBeVisible()
    await expect(field(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(field(page)).toHaveAttribute('aria-controls', (await listbox(page).getAttribute('id'))!)
  })
})

test.describe('matching', () => {
  for (const [typed, shown] of [
    ['londres', 'London'],
    ['LONDON', 'London'],
    ['Londrès', 'London'],
    ['allemagne', 'Germany'],
    ['GERMANY', 'Germany'],
    ["cote d'ivoire", 'Ivory Coast'],
    ["COTE D’IVOIRE", 'Ivory Coast'],
    ['ivory', 'Ivory Coast'],
  ] as const) {
    test(`« ${typed} » finds ${shown} (English UI)`, async ({ page, baseURL }) => {
      await readyEditor(page, baseURL!)
      await search(page, typed)
      await expect(options(page).first()).toBeVisible()
      expect((await labels(options(page)))[0]).toBe(shown)
    })
  }

  test('« Allemagne » and « Germany » are the same country, named in the UI language', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'Allemagne')
    await expect(options(page)).toHaveCount(1)
    const id = await options(page).first().getAttribute('id')
    await expect(options(page).first()).toContainText('Germany')
    await expect(options(page).first()).toContainText('Allemagne') // the other name, as secondary text
    await field(page).fill('Germany')
    await expect(options(page)).toHaveCount(1)
    expect(await options(page).first().getAttribute('id')).toBe(id)
  })

  test('the groups are headed Countries, Historical entities, Cities, in that order, with the kind and country of each row', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('100') // the Roman Empire, a group, is valid then
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '1')
    await search(page, 'ro')
    await expect(listbox(page)).toBeVisible()
    const groups = listbox(page).getByRole('group')
    await expect(groups).toHaveCount(3)
    await expect(groups.nth(0)).toHaveAccessibleName('Countries')
    await expect(groups.nth(1)).toHaveAccessibleName('Historical entities')
    await expect(groups.nth(2)).toHaveAccessibleName('Cities')
    await expect(groups.nth(0).getByRole('option').first()).toContainText('Country')
    await expect(groups.nth(1).getByRole('option').first()).toContainText('Historical entity')
    await expect(groups.nth(2).getByRole('option').first()).toContainText('City · ')
    await search(page, 'london')
    await expect(options(page)).toHaveCount(3)
    await expect(options(page).nth(0)).toContainText('City · United Kingdom')
    await expect(options(page).nth(1)).toContainText('City · Canada')
    await expect(options(page).nth(2)).toContainText('City · United States of America')
  })

  test('a historical entity matches at its date: « ottoman » at 1900, not « prussia », which exists in 1750', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    await search(page, 'ottoman')
    await expect(options(page)).toHaveCount(1)
    await expect(listbox(page).getByRole('group')).toHaveAccessibleName('Historical entities')
    await expect(options(page).first()).toContainText('Ottoman Empire')
    await field(page).fill('prussia')
    await expect(message(page)).toHaveText('No place found for "prussia". Check the spelling or try a current name.')

    await dateField(page).fill('1750')
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '3') // ottoman, kingdom of france, prussia
    await search(page, 'prussia')
    await expect(options(page)).toHaveCount(1)
    await expect(options(page).first()).toContainText('Prussia')
    expect(problems).toEqual([])
  })

  test('a group is found without its parentheses', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('100')
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '1')
    await search(page, 'roman')
    await expect(options(page)).toHaveCount(1)
    expect((await labels(options(page)))[0]).toBe('Roman Empire')
  })

  test('« Constantinople » and « Stalingrad » are not expected to match: the empty message, not an error', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    await search(page, 'Constantinople')
    await expect(message(page)).toHaveText('No place found for "Constantinople". Check the spelling or try a current name.')
    await expect(listbox(page)).toHaveCount(0)
    await field(page).fill('Stalingrad')
    await expect(message(page)).toContainText('Stalingrad')
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')
    expect(problems).toEqual([])
  })
})

test.describe('announcements', () => {
  test('the number of results is announced politely, and « No place found » for none', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(announcer(page)).toHaveText('3 results')
    await field(page).fill('allemagne')
    await expect(announcer(page)).toHaveText('1 result')
    await field(page).fill('Marioupl')
    await expect(announcer(page)).toHaveText('No place found')
    await expect(announcer(page)).toHaveAttribute('role', 'status')
  })
})

test.describe('the empty state in French (UX-DR146)', () => {
  test.use({ locale: 'fr-FR' })

  test('« Marioupl » shows the French message, announced, and the French names lead', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await expect(field(page)).toHaveAttribute('placeholder', 'Rechercher un lieu')
    await search(page, 'Marioupl')
    await expect(message(page)).toHaveText("Aucun lieu trouvé pour « Marioupl ». Vérifiez l'orthographe ou essayez un nom actuel.")
    await expect(announcer(page)).toHaveText('Aucun lieu trouvé')
    await field(page).fill('Marioup')
    await expect(options(page)).toHaveCount(1)
    // The French name first, the English one as secondary text, the country in French.
    await expect(options(page).first()).toContainText('Marioupol')
    await expect(options(page).first()).toContainText('Mariupol')
    await expect(options(page).first()).toContainText('Ville · Ukraine')
    await field(page).fill('londres')
    await expect(options(page).first()).toContainText('Londres')
    await expect(options(page).first()).toContainText('Ville · Royaume-Uni')
    await expect(listbox(page).getByRole('group')).toHaveAccessibleName('Villes')
    await expect(announcer(page)).toHaveText('1 résultat')
    await field(page).fill('germ')
    await expect(options(page).first()).toContainText('Allemagne')
    await expect(listbox(page).getByRole('group')).toHaveAccessibleName('Pays')
    await field(page).fill('ottom')
    await expect(listbox(page).getByRole('group')).toHaveAccessibleName('Entités historiques')
    await expect(options(page).first()).toContainText('Ottoman Empire')
    await expect(options(page).first()).toContainText('Entité historique')
  })
})

test.describe('keyboard', () => {
  test('↓ then Enter on « London » centres the edit camera at reference zoom 6 and leaves the Project untouched', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    const before = await projectRows(page)
    await search(page, 'London')
    await expect(options(page)).toHaveCount(3)
    await page.keyboard.press('ArrowDown')
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'true')
    await expect(field(page)).toHaveAttribute('aria-activedescendant', (await options(page).first().getAttribute('id'))!)
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(6, 3)
    const view = await camera(page)
    expect(view.center[0]).toBeCloseTo(-0.119, 3)
    expect(view.center[1]).toBeCloseTo(51.502, 3)
    // A city is not an entity: nothing is selected, and the Project is exactly as it was.
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
    await expect(undoButton(page)).toBeDisabled()
    await expect(announcer(page)).toHaveText('Map centred on London')
    await expect(listbox(page)).toHaveCount(0)
    await expect(mapRegion(page)).toBeFocused()
    expect(await projectRows(page)).toEqual(before)
    expect(problems).toEqual([])
  })

  test('↓ moves and wraps, ↑ goes to the last, Home and End jump, and the active option is the one Enter picks', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(options(page)).toHaveCount(3)
    const selected = async () => options(page).evaluateAll((nodes) => nodes.findIndex((node) => node.getAttribute('aria-selected') === 'true'))
    expect(await selected()).toBe(-1)
    await page.keyboard.press('ArrowDown')
    expect(await selected()).toBe(0)
    await page.keyboard.press('ArrowDown')
    expect(await selected()).toBe(1)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    expect(await selected()).toBe(0) // wrapped
    await page.keyboard.press('ArrowUp')
    expect(await selected()).toBe(2) // wrapped the other way
    await page.keyboard.press('Home')
    expect(await selected()).toBe(0)
    await page.keyboard.press('End')
    expect(await selected()).toBe(2)
    await page.keyboard.press('Enter') // London, Kentucky
    await expect.poll(async () => (await camera(page)).center[0]).toBeCloseTo(-84.083, 2)
    expect((await camera(page)).center[1]).toBeCloseTo(37.129, 2)
  })

  test('Enter with no active option picks the first result', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'londres')
    await expect(options(page)).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await camera(page)).center[0]).toBeCloseTo(-0.119, 2)
  })

  test('Enter on « France » fits the main landmass in the frame, with a margin', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'France')
    await expect(options(page)).toHaveCount(1)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(5)
    const view = await camera(page)
    // Fitted by its height (42.3° to 51.1°) in 80 % of the frame: about zoom 5.56, centred on the extent.
    expect(view.zoom).toBeGreaterThan(5.4)
    expect(view.zoom).toBeLessThan(5.7)
    expect(view.center[0]).toBeCloseTo(1.7, 1)
    expect(view.center[1]).toBeGreaterThan(46)
    expect(view.center[1]).toBeLessThan(47.5)
    await expect(canvas(page)).toHaveAttribute('data-selection', '') // a country is not a GeoEntity
    await expect(undoButton(page)).toBeDisabled()
    await expect(announcer(page)).toHaveText('Map centred on France')
  })

  test('Enter on « Ottoman Empire » fits it, selects and outlines it in ink on a halo, announces it, and Escape clears it', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    const before = await projectRows(page)
    await search(page, 'ottoman')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:ottoman-empire')
    await expect(announcer(page)).toHaveText('Ottoman Empire selected')
    // Its main landmass is the 12° square [-10, 2] × [5, 17] (the far island is not counted): fitted by height.
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(5.5)
    const view = await camera(page)
    expect(view.zoom).toBeLessThan(5.8)
    expect(view.center[0]).toBeCloseTo(-4, 1)
    expect(await projectRows(page)).toEqual(before)
    await expect(undoButton(page)).toBeDisabled()

    // The outline: halo and ink on the west edge of the square; no pixel of the UI accent.
    await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
    const edge = await pagePoint(page, -10, 11)
    await expect
      .poll(async () => {
        const pixels = await windowPixels(page, edge.x, edge.y)
        return Math.min(...pixels.map((p) => distance(p, channels(HALO)))) <= 24 && Math.min(...pixels.map((p) => distance(p, channels(INK)))) <= 60
      })
      .toBe(true)
    // Never the UI accent: no pixel of the outline window is the accent colour (a few levels of slack for anti-aliasing).
    const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--om-accent').trim().toUpperCase())
    expect(accent).toMatch(/^#[0-9A-F]{6}$/)
    const window = await windowPixels(page, edge.x, edge.y)
    expect(Math.min(...window.map((p) => distance(p, channels(accent))))).toBeGreaterThan(12)
    // The layer's own settings (secondary check): ink and halo are the mono canvas tokens.
    await expect(canvas(page)).toHaveAttribute('data-selection-colours', `${INK} ${HALO}`)
    // The ink is dashed: along the edge, rows with ink alternate with rows of halo only.
    const png = await page.screenshot({ clip: { x: Math.floor(edge.x) - 4, y: Math.floor(edge.y) - 60, width: 9, height: 120 } })
    const image = await loadImage(png)
    const strip = createCanvas(9, 120)
    const context = strip.getContext('2d')
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, 9, 120)
    const rowHasInk = Array.from({ length: 120 }, (_, row) => Array.from({ length: 9 }, (_, col) => [data[(row * 9 + col) * 4], data[(row * 9 + col) * 4 + 1], data[(row * 9 + col) * 4 + 2]]).some((p) => distance(p, channels(INK)) <= 60))
    const changes = rowHasInk.filter((has, row) => row > 0 && has !== rowHasInk[row - 1]).length
    expect(rowHasInk.filter(Boolean).length).toBeGreaterThan(10)
    expect(rowHasInk.filter((has) => !has).length).toBeGreaterThan(10)
    expect(changes).toBeGreaterThanOrEqual(4)

    // Escape (the focus is on the Map after a pick) clears the selection, and nothing else.
    await expect(mapRegion(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
    await expect(announcer(page)).toHaveText('Selection cleared')
    await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
    // Only the thin coast-coloured outline and the sea are left: no ink, and nothing as light as the halo (the sea is 39 away from it).
    await expect
      .poll(async () => {
        const pixels = await windowPixels(page, edge.x, edge.y)
        return Math.min(...pixels.map((p) => distance(p, channels(INK)))) > 60 && Math.min(...pixels.map((p) => distance(p, channels(HALO)))) > 30
      })
      .toBe(true)
    // The camera stays where the pick left it.
    expect((await camera(page)).zoom).toBeCloseTo(view.zoom, 3)
    expect(problems).toEqual([])
  })

  test('the selection is cleared in its place in the Escape order: after a menu, before « return to Select »', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'ottoman')
    await page.keyboard.press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:ottoman-empire')
    // A menu opened over the selection takes the first Escape.
    await page.getByRole('button', { name: /^Output format/ }).click()
    await expect(page.getByRole('menu', { name: 'Output format' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:ottoman-empire')
    // Then the selection, with the Select tool already active.
    await mapRegion(page).focus()
    await page.keyboard.press('Escape')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
    // Nothing left to clear: a further Escape does nothing.
    await page.keyboard.press('Escape')
    await expect(announcer(page)).toHaveText('Selection cleared')
  })

  test('Escape closes the list first, then leaves the field', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(listbox(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(listbox(page)).toHaveCount(0)
    await expect(field(page)).toBeFocused()
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(field(page)).toHaveValue('london')
    await page.keyboard.press('Escape')
    await expect(field(page)).not.toBeFocused()
    // ↓ opens it again.
    await field(page).focus()
    await page.keyboard.press('Escape')
    await expect(listbox(page)).toHaveCount(0)
    await page.keyboard.press('ArrowDown')
    await expect(listbox(page)).toBeVisible()
  })

  test('Escape closes the empty message first, then leaves the field', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'Marioupl')
    await expect(message(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(message(page)).toHaveCount(0)
    await expect(field(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(field(page)).not.toBeFocused()
  })

  test('typing again reopens the list after Escape', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'lon')
    await page.keyboard.press('Escape')
    await expect(listbox(page)).toHaveCount(0)
    await page.keyboard.type('d')
    await expect(listbox(page)).toBeVisible()
  })

  test('an IME composition is left alone: Enter and the arrows do nothing while composing', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(options(page)).toHaveCount(3)
    // One task per event, as an input method sends them.
    await field(page).evaluate((input) => input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })))
    await field(page).evaluate((input) => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })))
    await field(page).evaluate((input) => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'false')
    await expect(listbox(page)).toBeVisible()
    await expect(canvas(page)).toHaveAttribute('data-camera', /.*/)
    const before = await camera(page)
    await field(page).evaluate((input) => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })))
    // The Enter that confirms a composition arrives with `isComposing`, after compositionend in some browsers.
    await field(page).evaluate((input) => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })))
    expect(await camera(page)).toEqual(before)
    await expect(listbox(page)).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(listbox(page)).toHaveCount(0)
  })

  test('Tab leaves the field and closes the list', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(listbox(page)).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(field(page)).not.toBeFocused()
    await expect(listbox(page)).toHaveCount(0)
  })
})

test.describe('mouse', () => {
  test('hovering an option makes it active; a click picks it', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(options(page)).toHaveCount(3)
    await options(page).nth(1).hover()
    await expect(options(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(field(page)).toHaveAttribute('aria-activedescendant', (await options(page).nth(1).getAttribute('id'))!)
    await options(page).nth(1).click()
    await expect.poll(async () => (await camera(page)).center[0]).toBeCloseTo(-81.25, 2)
    expect((await camera(page)).center[1]).toBeCloseTo(42.97, 2)
    await expect(listbox(page)).toHaveCount(0)
  })

  test('picking an entity with the mouse selects it', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'ottoman')
    await options(page).first().click()
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:ottoman-empire')
  })

  test('a press on a group header (or the scrollbar) does not close the list; the field is limited to 100 characters', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(listbox(page)).toBeVisible()
    await listbox(page).getByText('Cities').click()
    await expect(listbox(page)).toBeVisible()
    await expect(field(page)).toBeFocused()
    await expect(field(page)).toHaveAttribute('maxlength', '100')
    await field(page).fill('x'.repeat(150))
    await expect(field(page)).toHaveValue('x'.repeat(100))
    await expect(message(page)).toBeVisible()
    expect((await message(page).boundingBox())!.width).toBeLessThanOrEqual(320)
  })

  test('a click elsewhere closes the list', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await expect(listbox(page)).toBeVisible()
    await page.getByRole('region', { name: 'Timeline' }).click()
    await expect(listbox(page)).toHaveCount(0)
  })
})

test.describe('the / shortcut (UX-DR154)', () => {
  test('focuses the field from the Map and selects its text; `/` typed in a text field stays text', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await mapRegion(page).focus()
    await page.keyboard.press('/')
    await expect(field(page)).toBeFocused()
    await expect(field(page)).toHaveValue('') // the `/` was not typed
    await page.keyboard.type('lon/d')
    await expect(field(page)).toHaveValue('lon/d') // inside the field it is text
    await page.keyboard.press('Escape') // list (empty here) or field
    await page.keyboard.press('Escape')
    await mapRegion(page).focus()
    await page.keyboard.press('/')
    await expect(field(page)).toBeFocused()
    // The previous text is selected: typing replaces it.
    await page.keyboard.type('paris')
    await expect(field(page)).toHaveValue('paris')

    // Another text field keeps its `/`.
    const nameField = page.getByRole('textbox', { name: 'Project name' })
    await nameField.fill('')
    await nameField.press('/')
    await expect(nameField).toHaveValue('/')
    await expect(nameField).toBeFocused()
  })

  test('works from the tool rail and the panel, and with Shift (AZERTY types it with Shift)', async ({ page, baseURL }) => {
    const { searchRequests } = await readyEditor(page, baseURL!)
    await page.getByRole('button', { name: 'Select' }).focus()
    await page.keyboard.press('/')
    await expect(field(page)).toBeFocused()
    await field(page).blur()
    await page.getByRole('button', { name: 'Select' }).focus()
    await page.keyboard.press('Shift+/')
    await expect(field(page)).toBeFocused()
    await expect.poll(() => searchRequests.length).toBe(1) // the index request is answered before the test ends
  })

  test('does nothing while a dialog is open', async ({ page, baseURL }) => {
    const { searchRequests } = await readyEditor(page, baseURL!)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await page.keyboard.press('/')
    await expect(field(page)).not.toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.keyboard.press('/')
    await expect(field(page)).toBeFocused()
    await expect.poll(() => searchRequests.length).toBe(1)
  })

  test('is listed in the shortcuts help', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await mapRegion(page).focus()
    await page.keyboard.press('?')
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
    await expect(help).toBeVisible()
    const row = help.locator('div', { has: page.getByText('Search for a place', { exact: true }) }).last()
    await expect(row.locator('kbd')).toHaveText('/')
  })
})

test.describe('the index cannot be loaded (404, HTML, invalid JSON, invalid content)', () => {
  for (const mode of ['not-found', 'html', 'bad-json', 'invalid', 'offline'] as const) {
    test(`${mode}: the GeoEntities are still searchable, the message shows when nothing else matches, no toast, no console error`, async ({ page, baseURL }) => {
      const { problems } = await readyEditor(page, baseURL!, mode)
      await search(page, 'ottoman')
      await expect(options(page)).toHaveCount(1)
      await expect(options(page).first()).toContainText('Ottoman Empire')
      await expect(message(page)).toHaveCount(0)
      await field(page).fill('londres')
      await expect(message(page)).toHaveText('Place search is unavailable.')
      await expect(announcer(page)).toHaveText('Place search is unavailable.')
      await expect(listbox(page)).toHaveCount(0)
      // No toast, and no alert anywhere but the (empty) notifications region.
      await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')
      await expect(page.locator('[role="alert"]:not(.om-toast-region [role="alert"])')).toHaveCount(0)
      // Nothing was cached from a bad answer.
      expect(await cacheKeys(page)).not.toContain('library/v1/search/index')
      // Picking the entity still works.
      await field(page).fill('ottoman')
      await page.keyboard.press('Enter')
      await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:ottoman-empire')
      expect(problems).toEqual([])
    })
  }

  test('a later focus tries again, and a recovered index serves the results', async ({ page, baseURL }) => {
    const mocks = await readyEditor(page, baseURL!, 'not-found')
    await search(page, 'londres')
    await expect(message(page)).toHaveText('Place search is unavailable.')
    mocks.setIndexMode('data')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await field(page).focus()
    await expect(options(page).first()).toContainText('London')
    expect(mocks.searchRequests).toHaveLength(2)
  })
})

test.describe('the index cannot be loaded, in French', () => {
  test.use({ locale: 'fr-FR' })
  test('« La recherche de lieux est indisponible. »', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!, 'html')
    await search(page, 'londres')
    await expect(message(page)).toHaveText('La recherche de lieux est indisponible.')
    await expect(announcer(page)).toHaveText('La recherche de lieux est indisponible.')
  })
})

test.describe('Library cache', () => {
  test('a second Editor session reads the index from Dexie with the network cut', async ({ page, baseURL }) => {
    const mocks = await readyEditor(page, baseURL!)
    await search(page, 'londres')
    await expect(options(page)).toHaveCount(1)
    expect(mocks.searchRequests).toHaveLength(1)
    await expect.poll(() => cacheKeys(page)).toContain('library/v1/search/index')

    mocks.setIndexMode('offline')
    await page.reload()
    await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
    await search(page, 'allemagne')
    await expect(options(page)).toHaveCount(1)
    await expect(options(page).first()).toContainText('Germany')
    await field(page).fill('londres')
    await expect(options(page)).toHaveCount(1)
    expect(mocks.searchRequests).toHaveLength(1) // no second request
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')
  })

  test('the index is requested once per session, however often the field is focused', async ({ page, baseURL }) => {
    const mocks = await readyEditor(page, baseURL!)
    for (let i = 0; i < 3; i++) {
      await field(page).focus()
      await field(page).blur()
    }
    await field(page).focus()
    await expect.poll(() => mocks.searchRequests.length).toBe(1)
  })
})

test.describe('Reference Date', () => {
  test('the selection is removed when a new Reference Date takes the entity away', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('1750')
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '3')
    await search(page, 'prussia')
    await page.keyboard.press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:prussia')
    // 1750 to 1800: Prussia (1701-1871) is still there, the selection stays.
    await dateField(page).fill('1800')
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '2')
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:prussia')
    // 1900: it is gone, and so is the selection.
    await dateField(page).fill('1900')
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '1')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
    // Undoing the date brings the entity back, not the selection.
    await undoButton(page).click()
    await undoButton(page).click()
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
  })

  test('the entity results follow the date', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'kingdom of f')
    await expect(message(page)).toBeVisible()
    await dateField(page).fill('1400')
    await dateField(page).press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-territories', '2')
    await search(page, 'kingdom of f')
    await expect(options(page)).toHaveCount(1)
    await expect(options(page).first()).toContainText('Kingdom of France')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
  })
})

test.describe('Escape order and the selection lifetime', () => {
  const SELECTED = 'cliopatria@0.2.0:ottoman-empire'

  test('a dialog opened over the selection takes the Escape and keeps the selection', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'ottoman')
    await page.keyboard.press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-selection', SELECTED)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
    await expect(canvas(page)).toHaveAttribute('data-selection', SELECTED)
    await mapRegion(page).focus()
    await page.keyboard.press('Escape')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
  })

  test('the selection is cleared when the Editor is left: back in the Project nothing is selected', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'ottoman')
    await page.keyboard.press('Enter')
    await expect(canvas(page)).toHaveAttribute('data-selection', SELECTED)
    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await page.goBack() // the Editor opens again on the same Project
    await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
    await expect(canvas(page)).toHaveAttribute('data-territories', '1')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
  })
})

test.describe('Home and End', () => {
  test('with the list closed they move the caret and keep it closed', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'london')
    await page.keyboard.press('Escape')
    await expect(listbox(page)).toHaveCount(0)
    const caret = () => field(page).evaluate((input: HTMLInputElement) => input.selectionStart)
    await page.keyboard.press('Home')
    expect(await caret()).toBe(0)
    await expect(listbox(page)).toHaveCount(0)
    await page.keyboard.press('End')
    expect(await caret()).toBe('london'.length)
    await expect(listbox(page)).toHaveCount(0)
    await expect(field(page)).toBeFocused()
  })
})

test.describe('French picks and accessibility', () => {
  test.use({ locale: 'fr-FR' })

  test('picking Londres and the Ottoman Empire is announced in French, and Escape says the selection is cleared', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await search(page, 'londres')
    await page.keyboard.press('Enter')
    await expect(announcer(page)).toHaveText('Carte centrée sur Londres')
    await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(6, 3)
    await search(page, 'ottoman')
    await page.keyboard.press('Enter')
    await expect(announcer(page)).toHaveText('Ottoman Empire sélectionné')
    await expect(canvas(page)).toHaveAttribute('data-selection', 'cliopatria@0.2.0:ottoman-empire')
    await page.keyboard.press('Escape')
    await expect(announcer(page)).toHaveText('Sélection retirée')
    await expect(canvas(page)).toHaveAttribute('data-selection', '')
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`the French list and empty message have no axe violation (${scheme})`, async ({ page, baseURL }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await readyEditor(page, baseURL!)
      const check = async (label: string) => {
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), `axe violations on ${label}`).toEqual([])
      }
      await search(page, 'ro')
      await expect(options(page).first()).toBeVisible()
      await page.keyboard.press('ArrowDown')
      await check('the French list')
      await field(page).fill('Marioupl')
      await expect(message(page)).toHaveText(/^Aucun lieu trouvé pour «.Marioupl.»/)
      await check('the French empty message')
    })
  }
})
