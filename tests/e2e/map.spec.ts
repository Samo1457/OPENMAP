import { createCanvas, loadImage } from '@napi-rs/canvas'
import { expect, test, type Locator, type Page } from '@playwright/test'

// Story 1.10: the stylized Basemap, the output frame, the edit camera, the Basemap picker and sliders.
// The data origin is mocked: no test depends on `pipeline/out`, and no request leaves the app origin.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

const PARCHMENT = { sea: '#D0DBE0', land: '#EEE8D7' }
const SOMBRE = { sea: '#1B2733', land: '#2E3538' }

/**
 * A tiny style for every Basemap: wrong colours on purpose, so the test proves that the Scene's
 * colours repaint the layers by id. The "land" is a box of the world (lon ±60, lat -40..50).
 */
function fixtureStyle(land: unknown = LAND) {
  return {
    version: 8,
    sources: { land: { type: 'geojson', data: land } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#00FF00' } },
    ],
  }
}
const LAND = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [[[-60, -40], [60, -40], [60, 50], [-60, 50], [-60, -40]]] },
}

async function mockData(page: Page, mode: 'styled' | 'html' | 'not-found' = 'styled') {
  await page.route('**/library/v1/styles/*.json', (route) => {
    if (mode === 'styled') return route.fulfill({ json: fixtureStyle() })
    // What Cloudflare Pages and `vite preview` answer for an unknown path: the app shell, status 200.
    if (mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>OPENMAP</body></html>' })
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Basemap data not built' })
  })
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

async function openEditor(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Untitled Project')
}

const canvas = (page: Page) => page.getByTestId('map-canvas')
const mapRegion = (page: Page) => page.getByRole('region', { name: 'Map' })
const frame = (page: Page) => page.getByTestId('output-frame')
const panel = (page: Page) => page.getByRole('complementary', { name: 'Properties' })
const undoButton = (page: Page) => page.getByRole('banner', { name: 'Top bar' }).getByRole('button', { name: 'Undo', exact: true })
const redoButton = (page: Page) => page.getByRole('banner', { name: 'Top bar' }).getByRole('button', { name: 'Redo', exact: true })

/** Waits until the Map has drawn its style and the (mocked) data has arrived. */
async function expectShowing(page: Page, what: 'sea' | 'land') {
  await expect(canvas(page)).toHaveAttribute('data-showing', what)
}

async function readyMap(page: Page) {
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true')
  await expectShowing(page, 'sea')
  await expect(canvas(page)).toHaveAttribute('data-idle', 'true')
}

interface Camera {
  center: [number, number]
  zoom: number
  bearing: number
}
async function camera(page: Page): Promise<Camera> {
  return JSON.parse((await canvas(page).getAttribute('data-camera'))!) as Camera
}
async function sceneCamera(page: Page): Promise<string> {
  return (await mapRegion(page).getAttribute('data-scene-camera'))!
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}
async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox()
  if (!found) throw new Error('no bounding box')
  return found
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase()

/** The colour of the page pixel at (x, y), read from a screenshot. */
async function pixelAt(page: Page, x: number, y: number): Promise<string> {
  const png = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } })
  const image = await loadImage(png)
  const surface = createCanvas(1, 1)
  const context = surface.getContext('2d')
  context.drawImage(image, 0, 0)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return hex(r, g, b)
}

/** Whether two `#RRGGBB` colours are within `tolerance` per channel. */
function near(a: string, b: string, tolerance = 2): boolean {
  return [1, 3, 5].every((i) => Math.abs(Number.parseInt(a.slice(i, i + 2), 16) - Number.parseInt(b.slice(i, i + 2), 16)) <= tolerance)
}

/** Page position of (lon, lat) for the camera shown, in a frame of `frameBox` (Web Mercator, 512 px tiles). */
function project(lon: number, lat: number, shown: Camera, frameBox: Box) {
  const scale = Math.min(frameBox.width, frameBox.height) / 1080
  const world = 512 * 2 ** (shown.zoom + Math.log2(scale))
  const mercatorY = (degrees: number) => Math.log(Math.tan(Math.PI / 4 + (degrees * Math.PI) / 360)) / (2 * Math.PI)
  return {
    x: frameBox.x + frameBox.width / 2 + ((lon - shown.center[0]) / 360) * world,
    y: frameBox.y + frameBox.height / 2 - (mercatorY(lat) - mercatorY(shown.center[1])) * world,
  }
}

async function expectColourAt(page: Page, x: number, y: number, expected: string) {
  await expect.poll(async () => near(await pixelAt(page, x, y), expected), { message: `pixel (${x}, ${y}) ≈ ${expected}` }).toBe(true)
}

/** The colours drawn inside the frame: land at the world centre, sea well east of the land box. */
async function expectBasemapColours(page: Page, colours: { sea: string; land: string }) {
  const frameBox = await box(frame(page))
  const shown = await camera(page)
  const land = project(0, 0, shown, frameBox)
  const sea = project(110, 0, shown, frameBox)
  await expectColourAt(page, land.x, land.y, colours.land)
  await expectColourAt(page, sea.x, sea.y, colours.sea)
}

const radio = (page: Page, name: string) => panel(page).getByRole('radio', { name })

test.describe('Basemap and output frame', () => {
  test('the Scene colours repaint the style: each Basemap draws its palette, one undo returns to the previous one', async ({ page, baseURL }) => {
    const problems = watchProblems(page, baseURL!)
    await mockData(page)
    await openEditor(page)
    await readyMap(page)
    await expect(canvas(page)).toHaveAttribute('data-style', 'styled')
    await expectBasemapColours(page, PARCHMENT)

    const palettes = {
      Dark: { id: 'sombre', sea: '#1B2733', land: '#2E3538' },
      Light: { id: 'clair', sea: '#DCE9F2', land: '#F7F6F2' },
      Relief: { id: 'relief', sea: '#C9D8DF', land: '#E6E1CC' },
    }
    for (const [label, palette] of Object.entries(palettes)) {
      await radio(page, label).click()
      await expect(radio(page, label)).toBeChecked()
      await expect(canvas(page)).toHaveAttribute('data-basemap', palette.id)
      await expect(canvas(page)).toHaveAttribute('data-land', palette.land)
      await expectShowing(page, 'sea')
      await expectBasemapColours(page, palette)
    }
    // One SET_BASEMAP per pick: three undos walk back to Parchment, one at a time.
    await page.keyboard.press('Control+z')
    await expect(radio(page, 'Light')).toBeChecked()
    await expect(canvas(page)).toHaveAttribute('data-basemap', 'clair')
    await expectBasemapColours(page, { sea: '#DCE9F2', land: '#F7F6F2' })
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await expect(radio(page, 'Parchment')).toBeChecked()
    await expectBasemapColours(page, PARCHMENT)
    await expect(undoButton(page)).toBeDisabled()
    expect(problems).toEqual([])
  })

  test('without data (the app shell answers 200) the Map shows the plain land colour and the Editor stays usable, silently', async ({ page, baseURL }) => {
    const problems = watchProblems(page, baseURL!)
    await mockData(page, 'html')
    await openEditor(page)
    await expect(canvas(page)).toHaveAttribute('data-style', 'fallback')
    await expect(canvas(page)).toHaveAttribute('data-showing', 'land')
    const frameBox = await box(frame(page))
    await expectColourAt(page, frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, PARCHMENT.land)
    await expectColourAt(page, frameBox.x + 20, frameBox.y + 20, PARCHMENT.land)
    // Editing is never blocked: pick another Basemap, then rename.
    await radio(page, 'Dark').click()
    await expectColourAt(page, frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, SOMBRE.land)
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('') // no toast
    expect(problems).toEqual([])
  })

  test('a 404 or an unparsable style keeps the land colour too', async ({ page }) => {
    await mockData(page, 'not-found')
    await openEditor(page)
    await expect(canvas(page)).toHaveAttribute('data-style', 'fallback')
    const frameBox = await box(frame(page))
    await expectColourAt(page, frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, PARCHMENT.land)

    await page.route('**/library/v1/styles/*.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"version": 8,' }))
    await radio(page, 'Light').click()
    await expect(canvas(page)).toHaveAttribute('data-style', 'fallback')
    await expectColourAt(page, frameBox.x + 20, frameBox.y + 20, '#F7F6F2')
  })

  test('slow tiles: the land colour shows until the data arrives, and editing is never blocked', async ({ page }) => {
    let release: () => void = () => undefined
    const arrived = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/fixture-land.json', async (route) => {
      await arrived
      await route.fulfill({ json: LAND })
    })
    await page.route('**/library/v1/styles/*.json', (route) => route.fulfill({ json: fixtureStyle('/fixture-land.json') }))
    await openEditor(page)
    await expect(canvas(page)).toHaveAttribute('data-style', 'styled')
    await expect(canvas(page)).toHaveAttribute('data-showing', 'land')
    const frameBox = await box(frame(page))
    const shown = await camera(page)
    const sea = project(110, 0, shown, frameBox)
    await expectColourAt(page, sea.x, sea.y, PARCHMENT.land)
    await radio(page, 'Dark').click() // not blocked
    await expect(radio(page, 'Dark')).toBeChecked()
    release()
    await expectShowing(page, 'sea')
    await expectBasemapColours(page, SOMBRE)
  })

  test('the Map is pixel-identical in the light and dark UI themes', async ({ page }) => {
    await mockData(page)
    const shots: Buffer[] = []
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await openEditor(page)
      await readyMap(page)
      await expect(page.locator('html')).toHaveClass(scheme === 'dark' ? /dark/ : /^((?!dark).)*$/)
      const area = await box(mapRegion(page))
      // The zoom buttons are chrome and follow the theme: they sit in the 64 px under the frame.
      shots.push(await page.screenshot({ clip: { x: area.x, y: area.y, width: area.width, height: area.height - 64 } }))
      await page.goto('/')
    }
    expect(shots[0].equals(shots[1])).toBe(true)
  })

  for (const [format, ratio] of [['16:9', 16 / 9], ['9:16', 9 / 16], ['1:1', 1]] as const) {
    test(`the ${format} frame is centred at the exact ratio with a margin of at least 24 px, dimmed outside at 55 %, with no border`, async ({ page }) => {
      await mockData(page)
      await openEditor(page)
      await panel(page).getByRole('radio', { name: format, exact: true }).click()
      await readyMap(page)
      const area = await box(mapRegion(page))
      const frameBox = await box(frame(page))
      expect(frameBox.width / frameBox.height).toBeCloseTo(ratio, 2)
      expect(frameBox.x - area.x).toBeGreaterThanOrEqual(23.9)
      expect(frameBox.y - area.y).toBeGreaterThanOrEqual(23.9)
      expect(area.x + area.width - (frameBox.x + frameBox.width)).toBeGreaterThanOrEqual(23.9)
      expect(area.y + area.height - (frameBox.y + frameBox.height)).toBeGreaterThanOrEqual(63.9)
      // Centred in the free space (equal margins either side).
      expect(frameBox.x - area.x).toBeCloseTo(area.x + area.width - (frameBox.x + frameBox.width), 0)
      expect(frameBox.y - area.y - 24).toBeCloseTo(area.y + area.height - (frameBox.y + frameBox.height) - 64, 0)
      const style = await frame(page).evaluate((element) => {
        const computed = getComputedStyle(element)
        return { shadow: computed.boxShadow, border: computed.borderTopWidth, outline: computed.outlineStyle }
      })
      expect(style.shadow).toContain('rgba(17, 22, 28, 0.55)') // canvas-mask at 55 %
      expect(style.border).toBe('0px')
      expect(style.outline).toBe('none')
      // Outside the frame the Map is dimmed: 45 % of the Basemap plus 55 % of the mask; inside it is not.
      const inside = project(0, 0, await camera(page), frameBox)
      await expectColourAt(page, inside.x, inside.y, PARCHMENT.land)
      const dim = (colour: string) =>
        hex(...([1, 3, 5].map((i) => Math.round(0.45 * Number.parseInt(colour.slice(i, i + 2), 16) + 0.55 * [17, 22, 28][(i - 1) / 2])) as [number, number, number]))
      await expect
        .poll(async () => {
          const outside = await pixelAt(page, frameBox.x - 12, frameBox.y + frameBox.height / 2)
          return near(outside, dim(PARCHMENT.sea)) || near(outside, dim(PARCHMENT.land))
        })
        .toBe(true)
    })
  }

  test('the frame is the Map, not chrome: nothing covers it and the UI accent never appears on it', async ({ page }) => {
    await mockData(page)
    await openEditor(page)
    await readyMap(page)
    const frameBox = await box(frame(page))
    const covering = await page.evaluate(({ x, y, width, height }) => {
      const points = [[x + 5, y + 5], [x + width - 5, y + 5], [x + 5, y + height - 5], [x + width - 5, y + height - 5], [x + width / 2, y + height / 2]]
      return points.map(([px, py]) => document.elementFromPoint(px, py)?.closest('[data-region]')?.getAttribute('data-region') ?? 'none')
    }, frameBox)
    expect(covering).toEqual(['map', 'map', 'map', 'map', 'map'])
    expect(await page.evaluate(({ x, y, width, height }) => [...document.querySelectorAll('button')].some((button) => {
      const r = button.getBoundingClientRect()
      return r.width > 0 && r.right > x && r.left < x + width && r.bottom > y && r.top < y + height && button.closest('[data-region="map"]')
    }), frameBox)).toBe(false)
  })
})

test.describe('Basemap settings', () => {
  const brightness = (page: Page) => panel(page).getByRole('slider', { name: 'Brightness' })
  const saturation = (page: Page) => panel(page).getByRole('slider', { name: 'Saturation' })
  const tint = (page: Page) => panel(page).getByRole('slider', { name: 'Tint' })
  const resetButton = (page: Page) => panel(page).getByRole('button', { name: 'Reset Basemap settings' })

  async function openMocked(page: Page) {
    await mockData(page)
    await openEditor(page)
    await readyMap(page)
  }

  test('a drag previews live and is one undo entry on release', async ({ page }) => {
    await openMocked(page)
    const track = await box(brightness(page))
    const y = track.y + track.height / 2
    await page.mouse.move(track.x + track.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(track.x + track.width * 0.9, y, { steps: 6 })
    // Live: the Map and the value follow, but no Command yet.
    await expect.poll(async () => Number(await brightness(page).inputValue())).toBeGreaterThan(20)
    await expect(canvas(page)).not.toHaveAttribute('data-land', PARCHMENT.land)
    await expect(undoButton(page)).toBeDisabled()
    await page.mouse.move(track.x + track.width * 0.95, y, { steps: 3 })
    await page.mouse.up()
    await expect(undoButton(page)).toBeEnabled()
    const value = await brightness(page).inputValue()
    expect(Number(value)).toBeGreaterThan(30)
    // One drag, one entry: a single undo is back to the default.
    await page.keyboard.press('Control+z')
    await expect(brightness(page)).toHaveValue('0')
    await expect(canvas(page)).toHaveAttribute('data-land', PARCHMENT.land)
    await expect(undoButton(page)).toBeDisabled()
    await redoButton(page).click()
    await expect(brightness(page)).toHaveValue(value)
  })

  test('keys move one step, Shift ten, Home and End the bounds; a double-click restores the default', async ({ page }) => {
    await openMocked(page)
    const slider = brightness(page)
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue('1')
    await page.keyboard.press('Shift+ArrowRight')
    await expect(slider).toHaveValue('11')
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveValue('10')
    await page.keyboard.press('End')
    await expect(slider).toHaveValue('50')
    await page.keyboard.press('Home')
    await expect(slider).toHaveValue('-50')
    await expect(canvas(page)).not.toHaveAttribute('data-land', PARCHMENT.land)
    await slider.dblclick()
    await expect(slider).toHaveValue('0')
    await expect(canvas(page)).toHaveAttribute('data-land', PARCHMENT.land)
    // Saturation reaches -100 and tint intensity stops at 60.
    await saturation(page).focus()
    await page.keyboard.press('Home')
    await expect(saturation(page)).toHaveValue('-100')
    await tint(page).focus()
    await page.keyboard.press('End')
    await expect(tint(page)).toHaveValue('60')
  })

  test('the numeric field commits on Enter and keeps the previous value when the entry is invalid', async ({ page }) => {
    await openMocked(page)
    const field = panel(page).getByRole('textbox', { name: 'Brightness, value' })
    await field.fill('25')
    await field.press('Enter')
    await expect(brightness(page)).toHaveValue('25')
    await expect(undoButton(page)).toBeEnabled()
    await field.fill('abc')
    await field.press('Enter')
    await expect(field).toHaveValue('25')
    await expect(brightness(page)).toHaveValue('25')
    await field.fill('')
    await field.blur()
    await expect(field).toHaveValue('25')
    await field.fill('500')
    await field.press('Enter')
    await expect(brightness(page)).toHaveValue('50')
  })

  test('the tint colour: a hex field, an invalid entry keeps the previous colour, and the Map repaints', async ({ page }) => {
    await openMocked(page)
    const hexField = panel(page).getByRole('textbox', { name: 'Tint colour (hex)' })
    await expect(hexField).toHaveValue('#11161C')
    await tint(page).focus()
    await page.keyboard.press('End') // 60 % toward the tint
    await hexField.fill('#ff0000')
    await hexField.press('Enter')
    await expect(hexField).toHaveValue('#FF0000')
    const frameBox = await box(frame(page))
    const land = project(0, 0, await camera(page), frameBox)
    // 60 % of the way from #EEE8D7 to #FF0000.
    await expectColourAt(page, land.x, land.y, '#F85D56')
    await hexField.fill('nope')
    await hexField.press('Enter')
    await expect(hexField).toHaveValue('#FF0000')
  })

  test('the 3-digit hex shorthand is expanded, with or without the #', async ({ page }) => {
    await openMocked(page)
    const hexField = panel(page).getByRole('textbox', { name: 'Tint colour (hex)' })
    await hexField.fill('#f00')
    await hexField.press('Enter')
    await expect(hexField).toHaveValue('#FF0000')
    await hexField.fill('0af')
    await hexField.press('Enter')
    await expect(hexField).toHaveValue('#00AAFF')
    await hexField.fill('#ff')
    await hexField.press('Enter')
    await expect(hexField).toHaveValue('#00AAFF')
  })

  test('the native colour input previews and commits one entry: one Ctrl+Z restores the previous colour', async ({ page }) => {
    await openMocked(page)
    await tint(page).focus()
    await page.keyboard.press('End') // 60 %, towards map-tint
    const frameBox = await box(frame(page))
    const land = project(0, 0, await camera(page), frameBox)
    await expectColourAt(page, land.x, land.y, '#696A67') // 60 % of the way from #EEE8D7 to #11161C
    await page.keyboard.press('Control+z') // keep the history to the pick alone
    await page.keyboard.press('Control+Shift+z')
    const picker = panel(page).getByLabel('Tint colour picker')
    await picker.fill('#0000ff') // sets the value, fires input then change
    await expect(panel(page).getByRole('textbox', { name: 'Tint colour (hex)' })).toHaveValue('#0000FF')
    await expectColourAt(page, land.x, land.y, '#5F5DEF') // 60 % of the way to blue
    await expect(undoButton(page)).toBeEnabled()
    await page.keyboard.press('Control+z')
    await expect(panel(page).getByRole('textbox', { name: 'Tint colour (hex)' })).toHaveValue('#11161C')
    await expectColourAt(page, land.x, land.y, '#696A67')
    await expect(tint(page)).toHaveValue('60') // only the colour went back
  })

  test('a cancelled drag drops its preview: nothing is committed', async ({ page }) => {
    await openMocked(page)
    const track = await box(brightness(page))
    const y = track.y + track.height / 2
    await page.mouse.move(track.x + track.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(track.x + track.width * 0.9, y, { steps: 4 })
    await expect(canvas(page)).not.toHaveAttribute('data-land', PARCHMENT.land)
    await brightness(page).dispatchEvent('pointercancel')
    await page.mouse.up()
    await expect(brightness(page)).toHaveValue('0')
    await expect(canvas(page)).toHaveAttribute('data-land', PARCHMENT.land)
    await expect(undoButton(page)).toBeDisabled()
  })

  test('adjustments touch the Basemap only and survive a change of Basemap; reset is one undo entry', async ({ page }) => {
    await openMocked(page)
    await expect(resetButton(page)).toHaveAttribute('aria-disabled', 'true')
    await brightness(page).focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await expect(brightness(page)).toHaveValue('20')
    await expect(resetButton(page)).not.toHaveAttribute('aria-disabled')
    await radio(page, 'Dark').click()
    await expect(brightness(page)).toHaveValue('20') // kept (DESIGN.md)
    await expect(canvas(page)).toHaveAttribute('data-land', '#585D60') // #2E3538 brightened by 20 %
    await resetButton(page).click()
    await expect(brightness(page)).toHaveValue('0')
    await expect(canvas(page)).toHaveAttribute('data-land', SOMBRE.land)
    await expect(resetButton(page)).toHaveAttribute('aria-disabled', 'true')
    // The reset is one entry: undo restores the 20 %, and the Basemap stays Dark.
    await page.keyboard.press('Control+z')
    await expect(brightness(page)).toHaveValue('20')
    await expect(radio(page, 'Dark')).toBeChecked()
    // Resetting an unchanged Basemap does nothing: no new entry.
    await page.keyboard.press('Control+Shift+z')
    await expect(resetButton(page)).toHaveAttribute('aria-disabled', 'true')
    await resetButton(page).click({ force: true })
    await expect(redoButton(page)).toBeDisabled() // a no-op would have cleared a redo; none exists, and undo stays one deep
    await expect(brightness(page)).toHaveValue('0')
  })

  test('the picker is a radio group with arrow keys and one tab stop', async ({ page }) => {
    await openMocked(page)
    const group = panel(page).getByRole('radiogroup', { name: 'Basemap' })
    await expect(group.getByRole('radio')).toHaveText(['Parchment', 'Dark', 'Light', 'Relief'])
    await radio(page, 'Parchment').focus()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 'Dark')).toBeChecked()
    await expect(radio(page, 'Dark')).toBeFocused()
    await page.keyboard.press('End')
    await expect(radio(page, 'Relief')).toBeChecked()
    await expect(group.getByRole('radio')).toHaveCount(4)
    expect(await group.getByRole('radio').evaluateAll((items) => items.filter((item) => item.tabIndex === 0).length)).toBe(1)
    await expect(page.getByRole('status').filter({ hasText: 'Basemap: Relief' })).toHaveCount(1)
  })
})

test.describe('Edit camera', () => {
  async function ready(page: Page) {
    await mockData(page)
    await openEditor(page)
    await readyMap(page)
  }

  /** The Project did not change: no Command was dispatched. */
  async function expectProjectUntouched(page: Page, scene: string) {
    await expect(undoButton(page)).toBeDisabled()
    expect(await sceneCamera(page)).toBe(scene)
  }

  test('wheel zooms, Shift + wheel rotates, Space + drag and the middle button pan, Shift+1 recentres; Project and Scene camera never change', async ({ page }) => {
    await ready(page)
    const scene = await sceneCamera(page)
    const start = await camera(page)
    await mapRegion(page).focus()
    const area = await box(mapRegion(page))
    const centre = { x: area.x + area.width / 2, y: area.y + area.height / 2 }

    await page.mouse.move(centre.x, centre.y)
    await page.mouse.wheel(0, -400)
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(start.zoom + 0.1)
    await page.mouse.wheel(0, 400)
    await expect.poll(async () => Math.abs((await camera(page)).zoom - start.zoom)).toBeLessThan(0.3)

    await page.keyboard.down('Shift')
    await page.mouse.wheel(0, 300)
    await page.keyboard.up('Shift')
    await expect.poll(async () => Math.abs((await camera(page)).bearing)).toBeGreaterThan(5)

    await page.keyboard.press('Shift+1')
    await expect.poll(async () => (await camera(page)).bearing).toBe(0)
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom, 3)

    // Middle button: drag left by 120 px moves the centre east.
    const before = await camera(page)
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(centre.x - 120, centre.y + 30, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    const middle = await camera(page)
    expect(middle.center[0]).toBeGreaterThan(before.center[0] + 5)

    // Space + left drag.
    await mapRegion(page).focus()
    await page.keyboard.down('Space')
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    await page.mouse.move(centre.x + 100, centre.y, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Space')
    const spaced = await camera(page)
    expect(spaced.center[0]).toBeLessThan(middle.center[0] - 3)

    // A plain left drag does nothing yet (reserved for tools).
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    await page.mouse.move(centre.x + 100, centre.y, { steps: 5 })
    await page.mouse.up()
    expect((await camera(page)).center).toEqual(spaced.center)

    await expectProjectUntouched(page, scene)
    await page.keyboard.press('Shift+1')
    await expect.poll(async () => (await camera(page)).center[0]).toBeCloseTo(start.center[0], 3)
    await expectProjectUntouched(page, scene)
  })

  /** A key event with the given `key` and physical `code`, sent to the focused element (what another layout would send). */
  async function sendKey(page: Page, type: 'keydown' | 'keyup', code: string, key: string) {
    await page.evaluate(([eventType, eventCode, eventKey]) => {
      document.activeElement?.dispatchEvent(new KeyboardEvent(eventType, { code: eventCode, key: eventKey, bubbles: true, cancelable: true }))
    }, [type, code, key] as const)
  }

  /** Zooms in once so the camera has room to move in every direction. */
  async function zoomedIn(page: Page) {
    await page.keyboard.press('Alt+4')
    await expect(mapRegion(page)).toBeFocused()
    await page.keyboard.press('+')
    await page.keyboard.press('+')
    return camera(page)
  }

  test('with the Map focused, + and - zoom (- stops at the default view) and Shift+1 recentres', async ({ page }) => {
    await ready(page)
    const scene = await sceneCamera(page)
    const start = await camera(page)
    await page.keyboard.press('Alt+4')
    await expect(mapRegion(page)).toBeFocused()

    await page.keyboard.press('-') // already at the lowest zoom
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom, 6)
    await expect(page.getByRole('status').filter({ hasText: 'Lowest zoom reached' })).toHaveCount(1)
    await expect(mapRegion(page).getByRole('button', { name: 'Zoom out' })).toHaveAccessibleDescription('Lowest zoom reached')
    await page.keyboard.press('+')
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom + 0.5, 3)
    await page.keyboard.press('+')
    await page.keyboard.press('-')
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom + 0.5, 3)
    await page.keyboard.press('Shift+1')
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom, 3)
    await expectProjectUntouched(page, scene)
  })

  test('the arrows pan while held: the camera keeps moving, and stops on release', async ({ page }) => {
    await ready(page)
    const scene = await sceneCamera(page)
    const start = await zoomedIn(page)
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await camera(page)).center[0]).toBeGreaterThan(start.center[0] + 0.5)
    const first = (await camera(page)).center[0]
    await page.waitForTimeout(250)
    const second = (await camera(page)).center[0]
    expect(second).toBeGreaterThan(first) // still moving while held
    await page.keyboard.up('ArrowRight')
    await page.waitForTimeout(100)
    const stopped = (await camera(page)).center[0]
    await page.waitForTimeout(300)
    expect((await camera(page)).center[0]).toBe(stopped) // and still once released

    // Up, down and left; diagonals combine; Shift is faster.
    const beforeUp = (await camera(page)).center[1]
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(300)
    await page.keyboard.up('ArrowUp')
    expect((await camera(page)).center[1]).toBeGreaterThan(beforeUp)
    const beforeDown = (await camera(page)).center[1]
    await page.keyboard.down('ArrowDown')
    await page.waitForTimeout(300)
    await page.keyboard.up('ArrowDown')
    expect((await camera(page)).center[1]).toBeLessThan(beforeDown)

    const slow = await camera(page)
    await page.keyboard.down('ArrowLeft')
    await page.waitForTimeout(400)
    await page.keyboard.up('ArrowLeft')
    const slowMove = slow.center[0] - (await camera(page)).center[0]
    const fastStart = (await camera(page)).center[0]
    await page.keyboard.down('Shift')
    await page.keyboard.down('ArrowLeft')
    await page.waitForTimeout(400)
    await page.keyboard.up('ArrowLeft')
    await page.keyboard.up('Shift')
    expect(fastStart - (await camera(page)).center[0]).toBeGreaterThan(slowMove * 1.5)

    const diagonalStart = await camera(page)
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(300)
    await page.keyboard.up('ArrowUp')
    await page.keyboard.up('ArrowRight')
    const diagonal = await camera(page)
    expect(diagonal.center[0]).toBeGreaterThan(diagonalStart.center[0])
    expect(diagonal.center[1]).toBeGreaterThan(diagonalStart.center[1])
    await expectProjectUntouched(page, scene)
  })

  test('Z/Q/S/D pan by physical key (KeyW/KeyA/KeyS/KeyD), whatever character the layout types', async ({ page }) => {
    await ready(page)
    const start = await zoomedIn(page)
    const hold = async (code: string, key: string) => {
      const before = await camera(page)
      await sendKey(page, 'keydown', code, key)
      await page.waitForTimeout(300)
      await sendKey(page, 'keyup', code, key)
      return { before, after: await camera(page) }
    }
    let moved = await hold('KeyD', 'd') // QWERTY
    expect(moved.after.center[0]).toBeGreaterThan(moved.before.center[0])
    moved = await hold('KeyA', 'q') // AZERTY: Q is where A is
    expect(moved.after.center[0]).toBeLessThan(moved.before.center[0])
    moved = await hold('KeyW', 'z') // AZERTY: Z is where W is
    expect(moved.after.center[1]).toBeGreaterThan(moved.before.center[1])
    moved = await hold('KeyS', 's')
    expect(moved.after.center[1]).toBeLessThan(moved.before.center[1])
    moved = await hold('KeyD', 'e') // Dvorak types E on that key: still the physical D position
    expect(moved.after.center[0]).toBeGreaterThan(moved.before.center[0])
    // The typed letters alone, on other physical keys, do nothing.
    const before = await camera(page)
    await sendKey(page, 'keydown', 'KeyZ', 'w')
    await page.waitForTimeout(250)
    await sendKey(page, 'keyup', 'KeyZ', 'w')
    expect(await camera(page)).toEqual(before)
    // The pan keys moved the camera: east, west, north, south and east again net out to a different centre.
    expect(before.center).not.toEqual(start.center)
  })

  test('Ctrl+arrows no longer pan; the keys do nothing from a text field or with Ctrl, and stop when the Map loses the focus', async ({ page }) => {
    await ready(page)
    const scene = await sceneCamera(page)
    await zoomedIn(page)
    const before = await camera(page)
    await page.keyboard.down('Control')
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(300)
    await page.keyboard.up('ArrowRight')
    await page.keyboard.up('Control')
    expect(await camera(page)).toEqual(before)

    // A text field types its own keys.
    const name = page.getByRole('textbox', { name: 'Project name' })
    await name.focus()
    await page.keyboard.down('ArrowRight')
    await page.keyboard.press('d')
    await page.waitForTimeout(250)
    await page.keyboard.up('ArrowRight')
    await page.keyboard.press('+')
    expect(await camera(page)).toEqual(before)

    // A held key stops when the focus leaves the Map.
    await mapRegion(page).focus()
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await camera(page)).center[0]).toBeGreaterThan(before.center[0])
    await name.focus()
    await page.waitForTimeout(100)
    const left = (await camera(page)).center[0]
    await page.waitForTimeout(300)
    expect((await camera(page)).center[0]).toBe(left)
    await page.keyboard.up('ArrowRight')
    expect(await sceneCamera(page)).toBe(scene) // the name was typed, the Scene camera is untouched
  })

  test('the pan keys do nothing while a dialog is open', async ({ page }) => {
    await ready(page)
    await zoomedIn(page)
    const before = await camera(page)
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(250)
    await page.keyboard.up('ArrowRight')
    expect(await camera(page)).toEqual(before)
  })

  test('the Earth never shows twice: zooming out stops at the default view, in every Output Format', async ({ page }) => {
    await ready(page)
    for (const format of ['16:9', '9:16', '1:1']) {
      await panel(page).getByRole('radio', { name: format, exact: true }).click()
      await page.keyboard.press('Alt+4')
      await page.keyboard.press('Shift+1')
      const lowest = (await camera(page)).zoom
      await page.keyboard.press('+')
      await page.keyboard.press('+')
      for (let i = 0; i < 6; i++) await page.keyboard.press('-')
      expect((await camera(page)).zoom, format).toBeCloseTo(lowest, 3)
      // The wheel cannot go further either.
      const area = await box(mapRegion(page))
      await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
      await page.mouse.wheel(0, 3000)
      await page.waitForTimeout(600)
      expect((await camera(page)).zoom, format).toBeCloseTo(lowest, 3)
      await expect(mapRegion(page).getByRole('button', { name: 'Zoom out' })).toHaveAttribute('aria-disabled', 'true')
      // One Earth in the frame: the world is at least as large as the frame on both axes.
      const frameBox = await box(frame(page))
      const worldPx = 512 * 2 ** ((await camera(page)).zoom + Math.log2(Math.min(frameBox.width, frameBox.height) / 1080))
      expect(worldPx, format).toBeGreaterThanOrEqual(Math.max(frameBox.width, frameBox.height) - 0.5)
      // And the pixels agree: the same coast at the left and the right edge of the frame is not drawn twice,
      // i.e. land at (0, 0) is land and the frame corners are inside the world (sea or land, never the page).
      const centre = project(0, 0, await camera(page), frameBox)
      await expectColourAt(page, centre.x, centre.y, PARCHMENT.land)
    }
  })

  test('a change of Output Format re-clamps the zoom to the new lowest, without Shift+1', async ({ page }) => {
    await ready(page)
    const radioFor = (format: string) => panel(page).getByRole('radio', { name: format, exact: true })
    const zoomOut = mapRegion(page).getByRole('button', { name: 'Zoom out' })
    // 1:1 has the lowest default zoom; zoom out to it, then go to formats whose lowest zoom is higher.
    await radioFor('1:1').click()
    await page.keyboard.press('Alt+4')
    await page.keyboard.press('Shift+1')
    const square = (await camera(page)).zoom
    await page.keyboard.press('+')
    await page.keyboard.press('-')
    expect((await camera(page)).zoom).toBeCloseTo(square, 6)
    for (const format of ['16:9', '9:16']) {
      await radioFor(format).click()
      const lowest = JSON.parse((await mapRegion(page).getAttribute('data-scene-camera'))!).zoom as number
      expect(lowest).toBeGreaterThan(square)
      await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(lowest, 3)
      await expect(zoomOut).toHaveAttribute('aria-disabled', 'true')
    }
    await radioFor('1:1').click() // and back to the lowest of 1:1: the zoom-out button is still disabled at that view
    await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThanOrEqual(square - 1e-6)
  })

  test('the frame cannot leave the world vertically; horizontally the map wraps across the antimeridian', async ({ page }) => {
    await ready(page)
    const start = await zoomedIn(page)
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(2500)
    await page.keyboard.up('ArrowUp')
    const top = (await camera(page)).center[1]
    expect(top).toBeGreaterThan(start.center[1])
    expect(top).toBeLessThan(85.06)
    // The frame's top edge is at (or below) the north edge of the world: the centre stops short of the pole.
    const frameBox = await box(frame(page))
    const north = project(0, 85.0511, await camera(page), frameBox)
    expect(north.y).toBeLessThanOrEqual(frameBox.y + 1.5)
    const stopped = top
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(400)
    await page.keyboard.up('ArrowUp')
    expect((await camera(page)).center[1]).toBeCloseTo(stopped, 6)

    // East for a long while: the centre crosses ±180° and keeps going (the world wraps).
    await page.keyboard.down('Shift')
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => Math.abs((await camera(page)).center[0]), { timeout: 20000 }).toBeGreaterThan(179)
    await page.keyboard.up('ArrowRight')
    await page.keyboard.up('Shift')
  })

  test('dragging with the middle button or Space + left moves the map 1:1 with the pointer, at any zoom and bearing, with no inertia', async ({ page }) => {
    await ready(page)
    await mapRegion(page).focus()
    const frameBox = await box(frame(page))
    const area = await box(mapRegion(page))
    const centre = { x: area.x + area.width / 2, y: area.y + area.height / 2 }
    const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)
    /** How far the centre moved, in screen px (the map content moves the other way). */
    const moved = (a: Camera, b: Camera) => {
      const world = 512 * 2 ** (b.zoom + Math.log2(Math.min(frameBox.width, frameBox.height) / 1080))
      return Math.hypot(((b.center[0] - a.center[0]) / 360) * world, (mercatorY(b.center[1]) - mercatorY(a.center[1])) * world)
    }
    async function drag(how: 'middle' | 'space', steps: number) {
      const before = await camera(page)
      if (how === 'space') await page.keyboard.down('Space')
      await page.mouse.move(centre.x, centre.y)
      await page.mouse.down({ button: how === 'middle' ? 'middle' : 'left' })
      for (let i = 1; i <= steps; i++) await page.mouse.move(centre.x - (100 * i) / steps, centre.y)
      await page.mouse.up({ button: how === 'middle' ? 'middle' : 'left' })
      if (how === 'space') await page.keyboard.up('Space')
      const after = await camera(page)
      await page.waitForTimeout(400)
      expect(await camera(page)).toEqual(after) // no momentum after the release
      expect(after.zoom).toBeCloseTo(before.zoom, 6) // and the press did not zoom
      return moved(before, after)
    }
    for (const zoomSteps of [0, 4, 8]) {
      await page.keyboard.press('Shift+1')
      for (let i = 0; i < zoomSteps; i++) await page.keyboard.press('+')
      for (const [how, steps] of [['middle', 10], ['middle', 3], ['space', 10]] as const) {
        expect(await drag(how, steps), `${how}, ${steps} steps, zoom +${zoomSteps / 2}`).toBeCloseTo(100, 0)
      }
    }
    // Rotated: the same distance, in the rotated direction.
    await page.keyboard.press('Shift+1')
    for (let i = 0; i < 4; i++) await page.keyboard.press('+')
    await page.mouse.move(centre.x, centre.y)
    await page.keyboard.down('Shift')
    await page.mouse.wheel(0, 400)
    await page.keyboard.up('Shift')
    await expect.poll(async () => Math.abs((await camera(page)).bearing)).toBeGreaterThan(10)
    expect(await drag('middle', 10)).toBeCloseTo(100, 0)
  })

  test('the buttons at the bottom left of the Map do the same with the pointer', async ({ page }) => {
    await ready(page)
    const scene = await sceneCamera(page)
    const start = await camera(page)
    const group = mapRegion(page).getByRole('group', { name: 'Map view' })
    const zoomIn = group.getByRole('button', { name: 'Zoom in' })
    const frameBox = await box(frame(page))
    const buttonBox = await box(zoomIn)
    // Bottom left of the Map area, below the frame (never over it).
    expect(buttonBox.y).toBeGreaterThan(frameBox.y + frameBox.height)

    const zoomOut = group.getByRole('button', { name: 'Zoom out' })
    await expect(zoomOut).toHaveAttribute('aria-disabled', 'true') // the default view is the lowest zoom
    await zoomIn.click()
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom + 0.5, 3)
    await expect(zoomOut).not.toHaveAttribute('aria-disabled')
    await zoomOut.click()
    await zoomOut.click({ force: true }) // disabled at the default view: nothing happens
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom, 6)
    await group.getByRole('button', { name: 'Recentre on the frame' }).click()
    expect((await camera(page)).zoom).toBeCloseTo(start.zoom, 3)
    await zoomIn.hover()
    await expect(page.getByRole('tooltip')).toContainText('Zoom in')
    await expect(page.getByRole('tooltip')).toContainText('+')
    await expectProjectUntouched(page, scene)
  })

  test('the user zoom survives a change of Output Format and a frame resize, in reference size', async ({ page }) => {
    await ready(page)
    await page.keyboard.press('Alt+4')
    await page.keyboard.press('+')
    const zoomed = await camera(page)
    await panel(page).getByRole('radio', { name: '9:16', exact: true }).click()
    await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(zoomed.zoom, 3)
    await page.setViewportSize({ width: 1500, height: 800 })
    await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(zoomed.zoom, 3)
  })

  test('the Map region shows a focus ring above the canvas when the keyboard reaches it', async ({ page }) => {
    await ready(page)
    await page.keyboard.press('Alt+4')
    const ring = mapRegion(page).locator('.om-map-focus-ring')
    await expect(ring).toBeVisible()
    expect(await ring.evaluate((element) => getComputedStyle(element).boxShadow)).toContain('inset')
  })

  test('the keys are listed in the ? help', async ({ page }) => {
    await ready(page)
    await page.keyboard.press('?')
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
    for (const name of ['Zoom the Map in', 'Zoom the Map out', 'Recentre the Map on the frame', 'Pan the Map: arrow keys or WASD (ZQSD on an AZERTY keyboard)']) {
      await expect(help.getByText(name)).toBeVisible()
    }
    await expect(help.getByText('Shift+1')).toBeVisible()
  })
})

test.describe('French', () => {
  test.use({ locale: 'fr-FR' })

  test('the Basemap section and the Map controls are in French', async ({ page }) => {
    await mockData(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click()
    const properties = page.getByRole('complementary', { name: 'Propriétés' })
    await expect(properties.getByRole('radiogroup', { name: 'Fond de carte' })).toBeVisible()
    await expect(properties.getByRole('radio')).toContainText(['Parchemin', 'Sombre', 'Clair', 'Relief'].map((name) => name), { useInnerText: true })
    for (const name of ['Luminosité', 'Saturation', 'Teinte']) await expect(properties.getByRole('slider', { name })).toBeVisible()
    await expect(properties.getByRole('button', { name: 'Rétablir les réglages du Fond' })).toBeVisible()
    const group = page.getByRole('region', { name: 'Carte' }).getByRole('group', { name: 'Vue de la carte' })
    await expect(group.getByRole('button', { name: 'Zoom avant' })).toBeVisible()
    await expect(group.getByRole('button', { name: 'Recentrer sur le cadre' })).toBeVisible()
  })
})
