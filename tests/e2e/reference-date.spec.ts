import { createCanvas, loadImage } from '@napi-rs/canvas'
import { type Page, type Route } from '@playwright/test'
import { GEO_INDEX_WITH_META as GEO_INDEX, GEO_STATES } from '../../src/core/testing/geo-fixtures'
import { expect, test } from './fixtures'

// Story 1.11: the Reference Date field, the neutral Territories drawn at that date, the nearest-data
// chip, the Library cache and the unavailable-data caption. The data origin is mocked (fixture index
// and states, see src/core/testing/geo-fixtures.ts): no test depends on `pipeline/out-geo`, and no
// request leaves the app origin.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

const SEA = '#D0DBE0'

/** A style that is only the sea: every pixel that is not the sea is a Territory outline. */
const STYLE = {
  version: 8,
  sources: { land: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#00FF00' } },
  ],
}

type Mode = 'data' | 'not-found' | 'html' | 'bad-json' | 'other-version'

interface Geo {
  /** Every request to `/library/v1/geo/`, in order. */
  readonly requests: string[]
  setMode(mode: Mode): void
  /** Delays every state file (ms), to look at the Editor while a date loads. */
  setDelay(ms: number): void
}

/** Serves the fixture dataset (or a failure) on top of the default empty one, and records the requests. */
async function mockGeo(page: Page, initial: Mode = 'data'): Promise<Geo> {
  let mode = initial
  let delay = 0
  const requests: string[] = []
  await page.route('**/library/v1/styles/*.json', (route) => route.fulfill({ json: STYLE }))
  await page.route('**/library/v1/geo/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    if (delay > 0 && !path.endsWith('/index.json')) await new Promise((resolve) => setTimeout(resolve, delay))
    if (mode === 'not-found') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Data not built' })
    if (mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>OPENMAP</body></html>' })
    if (mode === 'bad-json') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"schemaVersion": 1, "entities": [' })
    if (path === '/library/v1/geo/index.json') {
      return route.fulfill({ json: mode === 'other-version' ? { ...GEO_INDEX, dataset: { ...GEO_INDEX.dataset, version: '0.3.0' } } : GEO_INDEX })
    }
    const match = /^\/library\/v1\/geo\/([^/]+)\/(-?\d+)\.json$/.exec(path)
    const geometry = match && GEO_STATES[`${match[1]}/${match[2]}`]
    if (!geometry) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'unknown state' })
    return route.fulfill({
      json: { type: 'Feature', id: `cliopatria@0.2.0:${match[1]}`, properties: { fromYear: Number(match[2]), toYear: Number(match[2]), area: 1 }, geometry },
    })
  })
  return { requests, setMode: (next) => void (mode = next), setDelay: (ms) => void (delay = ms) }
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

async function openEditor(page: Page, french = false) {
  await page.goto('/')
  await page.getByRole('button', { name: french ? 'Nouveau Projet' : 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(page.getByRole('textbox', { name: french ? 'Nom du Projet' : 'Project name' })).toHaveValue(french ? 'Projet sans titre' : 'Untitled Project')
}

const canvas = (page: Page) => page.getByTestId('map-canvas')
const panel = (page: Page) => page.getByRole('complementary', { name: 'Properties' })
const optionsBar = (page: Page) => page.getByRole('region', { name: 'Tool options' })
const dateField = (page: Page) => panel(page).getByRole('textbox', { name: 'Reference date' })
const dateError = (page: Page) => panel(page).getByTestId('reference-date-error')
const unavailable = (page: Page) => panel(page).getByTestId('geo-unavailable')
const undoButton = (page: Page) => page.getByRole('banner', { name: 'Top bar' }).getByRole('button', { name: 'Undo', exact: true })
const announcer = (page: Page) => page.locator('div.sr-only[role="status"]')
const territories = (page: Page, count: number) => expect(canvas(page)).toHaveAttribute('data-territories', String(count))
/** The canonical keys of the drawn Territories, in draw order. */
const territoryKeys = (page: Page, ids: string[]) => expect(canvas(page)).toHaveAttribute('data-territory-keys', ids.map((id) => `cliopatria@0.2.0:${id}`).join(' '))

async function setDate(page: Page, text: string) {
  await dateField(page).fill(text)
  await dateField(page).press('Enter')
}

async function readyEditor(page: Page, baseURL: string, mode: Mode = 'data', french = false) {
  const geo = await mockGeo(page, mode)
  const problems = watchProblems(page, baseURL)
  await openEditor(page, french)
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
  await expect(canvas(page)).toHaveAttribute('data-showing', 'sea')
  return { geo, problems }
}

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

interface Camera {
  center: [number, number]
  zoom: number
}

const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))

/** The RGB pixels of a 24 × 24 px window of the page centred on (x, y). */
async function windowPixels(page: Page, x: number, y: number): Promise<number[][]> {
  const png = await page.screenshot({ clip: { x: Math.floor(x) - 12, y: Math.floor(y) - 12, width: 24, height: 24 } })
  const image = await loadImage(png)
  const surface = createCanvas(24, 24)
  const context = surface.getContext('2d')
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, 24, 24)
  return Array.from({ length: 576 }, (_, i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]])
}
const distance = (a: number[], b: number[]) => Math.max(...a.map((value, i) => Math.abs(value - b[i])))

/** Number of pixels in a 24 × 24 px window of the page at (x, y) that are not the sea colour. */
async function nonSeaPixels(page: Page, x: number, y: number): Promise<number> {
  const png = await page.screenshot({ clip: { x: Math.floor(x) - 12, y: Math.floor(y) - 12, width: 24, height: 24 } })
  const image = await loadImage(png)
  const surface = createCanvas(24, 24)
  const context = surface.getContext('2d')
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, 24, 24)
  const sea = [1, 3, 5].map((i) => Number.parseInt(SEA.slice(i, i + 2), 16))
  let count = 0
  for (let i = 0; i < data.length; i += 4) if ([0, 1, 2].some((c) => Math.abs(data[i + c] - sea[c]) > 8)) count += 1
  return count
}

/** Page position of the west edge of a fixture square at longitude `lon`, mid-height of latitude 0..10. */
async function westEdge(page: Page, lon: number) {
  const frameBox = (await page.getByTestId('output-frame').boundingBox())!
  const camera = JSON.parse((await canvas(page).getAttribute('data-camera'))!) as Camera
  const scale = Math.min(frameBox.width, frameBox.height) / 1080
  const world = 512 * 2 ** (camera.zoom + Math.log2(scale))
  const mercatorY = (degrees: number) => Math.log(Math.tan(Math.PI / 4 + (degrees * Math.PI) / 360)) / (2 * Math.PI)
  return {
    x: frameBox.x + frameBox.width / 2 + ((lon - camera.center[0]) / 360) * world,
    y: frameBox.y + frameBox.height / 2 - (mercatorY(5) - mercatorY(camera.center[1])) * world,
  }
}

test.describe('Reference Date and Territories', () => {
  test('a new Project shows 1900 and draws the outlines valid then, fetching and caching the data once', async ({ page, baseURL }) => {
    const { geo, problems } = await readyEditor(page, baseURL!)
    await expect(dateField(page)).toHaveValue('1900')
    await territories(page, 1) // `solo`, the only entity of 1900
    await expect(page.getByTestId('nearest-data-chip')).toHaveCount(0)
    await expect(unavailable(page)).toHaveCount(0)
    expect(geo.requests).toEqual(['/library/v1/geo/index.json', '/library/v1/geo/solo/1900.json'])
    // The datasets metadata (Story 1.13) is cached too.
    expect(await cacheKeys(page)).toEqual(['cliopatria@0.2.0/index', 'cliopatria@0.2.0/solo/1900', 'library/v1/datasets'])
    // The outline is drawn where the data says: the square of `solo` starts at longitude 28.
    await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
    const edge = await westEdge(page, 28)
    await expect.poll(() => nonSeaPixels(page, edge.x, edge.y)).toBeGreaterThan(0)
    // An outline, not a fill: the edge has a pixel close to the coast colour (a thin line, anti-aliased),
    // while the inside of the square is still the sea.
    const coast = channels('#7A8590')
    const closest = Math.min(...(await windowPixels(page, edge.x, edge.y)).map((pixel) => distance(pixel, coast)))
    expect(closest).toBeLessThanOrEqual(50)
    const inside = await westEdge(page, 33)
    expect((await windowPixels(page, inside.x, inside.y))[12 * 24 + 12]).toEqual(channels(SEA))
    expect(problems).toEqual([])
  })

  test.describe('typing a year', () => {
    for (const [typed, shown, count] of [
      ['1050', '1050', 2],
      ['1450', '1450', 2],
      ['-51', '52 BC', 2],
      ['52 av. J.-C.', '52 BC', 2],
      ['52 BC', '52 BC', 2],
      ['52 BCE', '52 BC', 2],
      ['1 BC', '1 BC', 2],
    ] as const) {
      test(`« ${typed} » is one SET_REFERENCE_DATE: the Map updates and Undo restores 1900`, async ({ page, baseURL }) => {
        const { problems } = await readyEditor(page, baseURL!)
        await territories(page, 1)
        await setDate(page, typed)
        await expect(dateField(page)).toHaveValue(shown)
        await expect(dateError(page)).toHaveCount(0)
        // A date with no data is followed by the nearest-data announcement, which replaces the first.
        await expect(announcer(page)).toHaveText(typed.length >= 4 && !typed.includes('B') && !typed.includes('J') && !typed.startsWith('-') ? `Reference date: ${shown}` : 'Nearest available data: 1000')
        await territories(page, count)
        await undoButton(page).click()
        await expect(dateField(page)).toHaveValue('1900')
        await territories(page, 1)
        await expect(undoButton(page)).toBeDisabled() // one entry only
        expect(problems).toEqual([])
      })
    }
  })

  test('Ctrl+Z after leaving the field undoes the date, Ctrl+Shift+Z redoes it', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await setDate(page, '1453')
    await expect(dateField(page)).toHaveValue('1453')
    await page.keyboard.press('Escape') // leaves the field
    await page.keyboard.press('Control+z')
    await expect(dateField(page)).toHaveValue('1900')
    await page.keyboard.press('Control+Shift+z')
    await expect(dateField(page)).toHaveValue('1453')
  })

  test('the field is operable from the keyboard alone, and leaving it commits', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await page.keyboard.press('Alt+5')
    await page.keyboard.press('Tab') // the project name
    await page.keyboard.press('Tab')
    await expect(dateField(page)).toBeFocused()
    await page.keyboard.type('1050')
    await page.keyboard.press('Tab') // blur commits
    await expect(dateField(page)).toHaveValue('1050')
    await territories(page, 2)
    await expect(announcer(page)).toHaveText('Reference date: 1050')
  })

  test('Escape restores the previous date without a Command', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('1453')
    await dateField(page).press('Escape')
    await expect(dateField(page)).toHaveValue('1900')
    await expect(undoButton(page)).toBeDisabled()
  })

  test('year 0 shows the message under the field and keeps the previous date, with no Command', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    await setDate(page, '0')
    await expect(dateError(page)).toHaveText('Year 0 does not exist. Enter 1 BC or 1.')
    await expect(dateError(page).locator('svg')).toBeVisible() // the danger icon
    // The typed text stays so the typo can be fixed; the Project date is unchanged.
    await expect(dateField(page)).toHaveValue('0')
    await expect(dateField(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(undoButton(page)).toBeDisabled()
    await territories(page, 1)
    // The message goes away as soon as the user types again.
    await dateField(page).fill('1')
    await expect(dateError(page)).toHaveCount(0)
    expect(problems).toEqual([])
  })

  for (const typed of ['abc', '', '   ', '99999', '14.5']) {
    test(`« ${typed} » is not a year: message under the field, previous date kept, no Command`, async ({ page, baseURL }) => {
      await readyEditor(page, baseURL!)
      await setDate(page, typed)
      await expect(dateError(page)).toHaveText('Enter a year, for example 1463 or 52 BC.')
      await expect(dateField(page)).toHaveValue(typed)
      await expect(undoButton(page)).toBeDisabled()
      await territories(page, 1)
      // Leaving the field goes back to the previous date and clears the message.
      await dateField(page).blur()
      await expect(dateField(page)).toHaveValue('1900')
      await expect(dateError(page)).toHaveCount(0)
      await expect(undoButton(page)).toBeDisabled()
    })
  }

  test('Escape after a refused entry restores the date and clears the message', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await setDate(page, 'abc')
    await expect(dateError(page)).toBeVisible()
    await dateField(page).press('Escape')
    await expect(dateField(page)).toHaveValue('1900')
    await expect(dateError(page)).toHaveCount(0)
  })

  test('Enter that confirms an IME composition does not commit', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('1453')
    await dateField(page).evaluate((input) => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })))
    await expect(undoButton(page)).toBeDisabled()
    await expect(dateError(page)).toHaveCount(0)
    await dateField(page).press('Enter')
    await expect(undoButton(page)).toBeEnabled()
  })

  test('Escape does not leave the field in a state that skips the next blur commit', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('1453')
    await dateField(page).press('Escape')
    await expect(dateField(page)).toHaveValue('1900')
    await dateField(page).focus()
    await dateField(page).fill('1050')
    await dateField(page).press('Tab')
    await expect(dateField(page)).toHaveValue('1050')
    await territories(page, 2)
  })

  test('Ctrl+S in the field commits a valid year and saves with the confirmation', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('1453')
    await dateField(page).press('Control+s')
    await expect(dateField(page)).toHaveValue('1453')
    await expect(undoButton(page)).toBeEnabled()
    await expect(page.getByText('Project saved', { exact: true })).toBeVisible()
  })

  test('Ctrl+S in the field with an unusable year shows the error, keeps the date and confirms nothing', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await dateField(page).fill('0')
    await dateField(page).press('Control+s')
    await expect(dateError(page)).toBeVisible()
    await expect(undoButton(page)).toBeDisabled()
    await expect(page.getByText('Project saved', { exact: true })).toHaveCount(0)
    await dateField(page).blur()
    await expect(dateField(page)).toHaveValue('1900')
  })

  test('while a new date loads the previous Territories stay, the chip waits, and a stale caption goes away', async ({ page, baseURL }) => {
    const { geo } = await readyEditor(page, baseURL!)
    await setDate(page, '1050')
    await territoryKeys(page, ['rome', 'gaul'])
    geo.setDelay(1500)
    await setDate(page, '1300') // no data: nearest is 1200 (rome and empire.group, not loaded yet)
    await expect(page.getByTestId('nearest-data-chip')).toHaveCount(0)
    await territoryKeys(page, ['rome', 'gaul'])
    await territoryKeys(page, ['rome', 'empire.group'])
    await expect(page.getByTestId('nearest-data-chip')).toHaveCount(2)
    await expect(announcer(page)).toHaveText('Nearest available data: 1200')
    // A failed load, then a slow good one: the caption leaves as soon as the new load starts.
    geo.setDelay(0)
    geo.setMode('not-found')
    await setDate(page, '1450')
    await expect(unavailable(page)).toBeVisible()
    geo.setMode('data')
    geo.setDelay(1500)
    await setDate(page, '1500')
    await expect(unavailable(page)).toHaveCount(0)
    await territories(page, 0)
    await territories(page, 2)
  })

  test('a date with no data is not an error: the nearest year is drawn and the chip says which', async ({ page, baseURL }) => {
    const { problems } = await readyEditor(page, baseURL!)
    await territories(page, 1)
    // 2030: nothing after 1900 in the fixture, so 1900 is the nearest.
    await setDate(page, '2030')
    await expect(dateError(page)).toHaveCount(0)
    await expect(panel(page).getByTestId('nearest-data-chip')).toHaveText('Nearest available data: 1900')
    await expect(optionsBar(page).getByTestId('nearest-data-chip')).toHaveText('Nearest available data: 1900')
    await expect(page.getByTestId('nearest-data-chip')).toHaveCount(2)
    await territories(page, 1)
    // Before the first data: -3500 shows 1000.
    await setDate(page, '-3500')
    await expect(dateField(page)).toHaveValue('3501 BC')
    await expect(optionsBar(page).getByTestId('nearest-data-chip')).toHaveText('Nearest available data: 1000')
    await territories(page, 2)
    // An exact year hides the chip again.
    await setDate(page, '1900')
    await expect(page.getByTestId('nearest-data-chip')).toHaveCount(0)
    expect(problems).toEqual([])
  })

  test('the chip is announced once when the data stops being exact, and is not a live region itself', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await setDate(page, '2030')
    await expect(announcer(page)).toHaveText('Nearest available data: 1900')
    await expect(page.getByTestId('nearest-data-chip').first()).not.toHaveAttribute('role', /.+/)
  })

  test('the countries view: members of a valid group and relations are not drawn', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await setDate(page, '1450') // rome, gaul (member of empire.group), empire.group, a relation
    await territoryKeys(page, ['rome', 'empire.group'])
    await setDate(page, '1150') // rome, gaul, empire.group
    await territoryKeys(page, ['rome', 'empire.group'])
    await setDate(page, '1050') // rome, gaul: no group yet
    await territoryKeys(page, ['rome', 'gaul'])
    await setDate(page, '1900')
    await territoryKeys(page, ['solo'])
  })

  test('the field and the chip are written in the Map language, not the UI language', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await panel(page).getByRole('radiogroup', { name: 'Map language' }).getByRole('radio', { name: 'Français' }).click()
    await setDate(page, '-51')
    await expect(dateField(page)).toHaveValue('52 av. J.-C.')
    await expect(optionsBar(page).getByTestId('nearest-data-chip')).toHaveText('Nearest available data: 1000')
    await setDate(page, '2030')
    // The year of the chip follows the Map language; the sentence follows the UI language.
    await setDate(page, '-3500')
    await expect(dateField(page)).toHaveValue('3501 av. J.-C.')
    // Typing French and English forms is accepted in either Map language.
    await setDate(page, '52 BC')
    await expect(dateField(page)).toHaveValue('52 av. J.-C.')
    await panel(page).getByRole('radiogroup', { name: 'Map language' }).getByRole('radio', { name: 'English' }).click()
    await expect(dateField(page)).toHaveValue('52 BC')
  })
})

test.describe('French UI', () => {
  test.use({ locale: 'fr-FR' })

  test('labels, messages, announcement and chip in French', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!, 'data', true)
    const field = page.getByRole('complementary').getByRole('textbox', { name: 'Date de référence' })
    await expect(field).toHaveValue('1900')
    await field.fill('0')
    await field.press('Enter')
    await expect(page.getByRole('complementary').getByTestId('reference-date-error')).toHaveText("L'année 0 n'existe pas. Saisissez 1 av. J.-C. ou 1.")
    await field.fill('abc')
    await field.press('Enter')
    await expect(page.getByRole('complementary').getByTestId('reference-date-error')).toHaveText('Saisissez une année, par exemple 1463 ou 52 av. J.-C.')
    await field.fill('2030')
    await field.press('Enter')
    await expect(page.locator('div.sr-only[role="status"]')).toHaveText('Données les plus proches\u202f: 1900')
    await expect(page.getByRole('region', { name: "Options de l'outil" }).getByTestId('nearest-data-chip')).toHaveText('Données les plus proches : 1900')
  })
})

test.describe('Library cache (AD-27)', () => {
  test('a second visit with the network cut shows the same outlines and makes no request', async ({ page, baseURL }) => {
    const { geo } = await readyEditor(page, baseURL!)
    await setDate(page, '1050')
    await territories(page, 2)
    await setDate(page, '1900')
    await territories(page, 1)
    expect(geo.requests).toHaveLength(1 + 1 + 2) // index, solo, rome and gaul
    await expect.poll(() => cacheKeys(page)).toHaveLength(5) // index, solo, rome, gaul and the datasets metadata
    const url = page.url()
    // Wait for the autosave of the date, then cut the network for every data path.
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await page.unroute('**/library/v1/geo/**')
    const offline: string[] = []
    await page.route('**/library/v1/geo/**', (route) => {
      offline.push(route.request().url())
      return route.abort('internetdisconnected')
    })
    await page.route('**/library/v1/datasets.json', (route) => {
      offline.push(route.request().url())
      return route.abort('internetdisconnected')
    })
    await page.reload()
    await page.goto(url)
    await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
    await expect(dateField(page)).toHaveValue('1900')
    await territories(page, 1)
    await setDate(page, '1050')
    await territories(page, 2)
    await expect(unavailable(page)).toHaveCount(0)
    expect(offline).toEqual([])
    // The credit and « Sources and licences » come from the cached metadata, with the network cut.
    await expect(canvas(page)).toHaveAttribute('data-credit-state', 'drawn')
    await panel(page).getByRole('button', { name: /More options/ }).click()
    await expect(panel(page).getByTestId('credit-locked-text')).toHaveText('Historical borders: Cliopatria, Seshat Global History Databank, CC BY 4.0.')
    await expect(panel(page).getByTestId('sources-section').getByRole('listitem')).toHaveCount(3)
  })

  test('an entity data file is fetched once even when its date is revisited', async ({ page, baseURL }) => {
    const { geo } = await readyEditor(page, baseURL!)
    await setDate(page, '1050')
    await territories(page, 2)
    await setDate(page, '1900')
    await territories(page, 1)
    await setDate(page, '1050')
    await territories(page, 2)
    expect(geo.requests.filter((path) => path.includes('rome'))).toHaveLength(1)
  })
})

test.describe('data unavailable', () => {
  for (const mode of ['not-found', 'html', 'bad-json', 'other-version'] as const) {
    test(`${mode}: no Territory, the caption under the field, no toast, no console error, editing goes on`, async ({ page, baseURL }) => {
      const { problems } = await readyEditor(page, baseURL!, mode)
      await expect(unavailable(page)).toHaveText('Historical data unavailable.')
      await territories(page, 0)
      await expect(page.getByTestId('nearest-data-chip')).toHaveCount(0)
      await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')
      // Editing is never blocked: the date commits, the Basemap changes.
      await setDate(page, '1453')
      await expect(dateField(page)).toHaveValue('1453')
      await expect(unavailable(page)).toHaveText('Historical data unavailable.')
      await panel(page).getByRole('radio', { name: 'Dark' }).click()
      await expect(canvas(page)).toHaveAttribute('data-basemap', 'sombre')
      await expect(undoButton(page)).toBeEnabled()
      expect(problems).toEqual([])
    })
  }

  test('the caption goes away when the data comes back with the next date', async ({ page, baseURL }) => {
    const { geo } = await readyEditor(page, baseURL!, 'not-found')
    await expect(unavailable(page)).toBeVisible()
    geo.setMode('data')
    await setDate(page, '1050')
    await territories(page, 2)
    await expect(unavailable(page)).toHaveCount(0)
  })
})

test.describe('Projects and Output Format', () => {
  test('a stored v1 Project opens, is migrated with the geo pin, and shows its Territories', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await territories(page, 1)
    // Rewrite the saved row as a v1 document (no pin), as an older version of the app stored it.
    const url = page.url()
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
              const { pins: _pins, ...rest } = row.document
              store.put({ ...row, document: { ...rest, schemaVersion: 1 } })
            }
            transaction.oncomplete = () => {
              db.close()
              resolve()
            }
            transaction.onerror = () => reject(transaction.error)
          }
        }),
    )
    await page.goto('/')
    await page.goto(url)
    await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
    await expect(dateField(page)).toHaveValue('1900')
    await territories(page, 1)
    // The next save writes the migrated document.
    await setDate(page, '1050')
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<unknown>((resolve) => {
              const open = indexedDB.open('openmap')
              open.onsuccess = () => {
                const request = open.result.transaction('projects').objectStore('projects').getAll()
                request.onsuccess = () => {
                  open.result.close()
                  const [row] = request.result as { document: { schemaVersion: number; pins: unknown; referenceDate: unknown } }[]
                  resolve({ schemaVersion: row.document.schemaVersion, pins: row.document.pins, referenceDate: row.document.referenceDate })
                }
              }
            }),
        ),
      )
      .toEqual({ schemaVersion: 3, pins: { geo: { dataset: 'cliopatria', version: '0.2.0' } }, referenceDate: { year: 1050 } })
  })

  test('changing the Output Format redraws the outlines with the new frame scale', async ({ page, baseURL }) => {
    await readyEditor(page, baseURL!)
    await territories(page, 1)
    const scaled = async () => {
      const frameBox = (await page.getByTestId('output-frame').boundingBox())!
      const width = Number(await canvas(page).getAttribute('data-outline-width'))
      return { width, expected: (1.5 * Math.min(frameBox.width, frameBox.height)) / 1080 }
    }
    await expect.poll(async () => {
      const { width, expected } = await scaled()
      return Math.abs(width - expected) < 0.01
    }).toBe(true)
    const before = (await scaled()).width
    await page.getByRole('button', { name: /^Output format/ }).click()
    await page.getByRole('menuitemradio', { name: /9:16/ }).click()
    await expect.poll(async () => {
      const { width, expected } = await scaled()
      return Math.abs(width - expected) < 0.01 && Math.abs(width - before) > 0.01
    }).toBe(true)
    await territories(page, 1)
  })
})
