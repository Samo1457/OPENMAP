import AxeBuilder from '@axe-core/playwright'
import { devices, type Page } from '@playwright/test'
import { CLIOPATRIA_META } from '../../src/core/testing/geo-fixtures'
import { expect, test } from './fixtures'

// Story 1.7: automated axe check (WCAG 2.2 AA, UX-DR157) on Home, the Editor, Settings, the
// shortcuts help and the gate pages, in light and dark. Every later screen adds itself here.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const summary = results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)
  expect(summary, `axe violations on ${label}`).toEqual([])
}

async function openEditor(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\//)
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Untitled Project')
}

/** One entity at 1900 with the full dataset block, so the Map draws a Territory and the credit (Story 1.13). */
async function mockCreditData(page: Page) {
  await page.route('**/library/v1/styles/*.json', (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } }] } }),
  )
  const square = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
  await page.route('**/library/v1/geo/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/index.json')) {
      return route.fulfill({
        json: {
          schemaVersion: 1,
          dataset: { ...CLIOPATRIA_META, version: '0.2.0' },
          entities: [{ id: 'a', name: 'A', kind: 'polity', memberOf: [], states: [[1900, 1900]] }],
        },
      })
    }
    return route.fulfill({ json: { type: 'Feature', id: 'cliopatria@0.2.0:a', properties: { fromYear: 1900, toYear: 1900, area: 1 }, geometry: square } })
  })
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe, ${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
    })

    test('Home, empty and with a Project', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
      await expect(page.getByText('No Projects yet.')).toBeVisible()
      await expectNoViolations(page, 'Home (empty)')
      await openEditor(page)
      await page.getByRole('link', { name: 'Projects' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
      await expect(page.getByText('Untitled Project').first()).toBeVisible()
      await expectNoViolations(page, 'Home (with a Project)')
    })

    test('the Editor, with a tooltip and the Output Format menu open', async ({ page }) => {
      await openEditor(page)
      await expectNoViolations(page, 'Editor')
      await page.getByRole('button', { name: 'Undo', exact: true }).focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(page.getByRole('tooltip')).toBeVisible()
      await expectNoViolations(page, 'Editor with a tooltip')
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: /^Output format/ }).click()
      await expect(page.getByRole('menu', { name: 'Output format' })).toBeVisible()
      await expectNoViolations(page, 'Editor with a menu')
    })

    test('the Editor place search: the open list with an active option, the empty message and the unavailable one', async ({ page }) => {
      // The search index is the small fixture of `fixtures.ts`: no dependency on `pipeline/out-search`.
      await openEditor(page)
      const field = page.getByRole('combobox', { name: 'Search for a place' })
      await field.click()
      await field.fill('lo')
      await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible()
      await page.keyboard.press('ArrowDown')
      await expect(field).toHaveAttribute('aria-activedescendant', /.+/)
      await expectNoViolations(page, 'the place search list')
      await field.fill('Marioupl')
      await expect(page.getByTestId('place-search-message')).toBeVisible()
      await expectNoViolations(page, 'the place search empty message')
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await expectNoViolations(page, 'the Editor after the place search')
    })

    test('the Editor Map, its zoom buttons and the Basemap picker and sliders', async ({ page }) => {
      // The data origin is mocked: the check does not depend on `pipeline/out`.
      await page.route('**/library/v1/styles/*.json', (route) =>
        route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } }] } }),
      )
      await openEditor(page)
      const map = page.getByRole('region', { name: 'Map' })
      await expect(map.getByRole('group', { name: 'Map view' }).getByRole('button')).toHaveCount(3)
      await expect(page.getByTestId('map-canvas')).toHaveAttribute('data-ready', 'true')
      await expectNoViolations(page, 'Editor Map')
      await page.keyboard.press('Alt+4')
      await page.keyboard.press('Tab') // the Map region, then its first button: a keyboard focus shows the tooltip
      await expect(map.getByRole('button', { name: 'Zoom in' })).toBeFocused()
      await expect(page.getByRole('tooltip')).toBeVisible()
      await expectNoViolations(page, 'Editor Map with a tooltip on a zoom button')
      await page.keyboard.press('Escape')
      const panel = page.getByRole('complementary', { name: 'Properties' })
      await panel.getByRole('radio', { name: 'Dark' }).click()
      await panel.getByRole('slider', { name: 'Brightness' }).focus()
      await page.keyboard.press('Shift+ArrowRight')
      await expect(panel.getByRole('slider', { name: 'Brightness' })).toHaveValue('10')
      await expectNoViolations(page, 'Editor Basemap settings (Dark, brightness 10)')
    })

    test('the Reference Date field with its error, the nearest-data chip and the unavailable caption', async ({ page }) => {
      await page.route('**/library/v1/styles/*.json', (route) =>
        route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } }] } }),
      )
      const square = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
      await page.route('**/library/v1/geo/**', (route) => {
        const path = new URL(route.request().url()).pathname
        if (path.endsWith('/index.json')) {
          return route.fulfill({
            json: { schemaVersion: 1, dataset: { ...CLIOPATRIA_META, version: '0.2.0' }, entities: [{ id: 'a', name: 'A', kind: 'polity', memberOf: [], states: [[1900, 1900]] }] },
          })
        }
        return route.fulfill({ json: { type: 'Feature', id: 'cliopatria@0.2.0:a', properties: { fromYear: 1900, toYear: 1900, area: 1 }, geometry: square } })
      })
      await openEditor(page)
      const field = page.getByRole('textbox', { name: 'Reference date' })
      await expect(field).toHaveValue('1900')
      await field.fill('2030')
      await field.press('Enter')
      await expect(page.getByTestId('nearest-data-chip')).toHaveCount(2)
      await field.fill('0')
      await field.press('Enter')
      await expect(page.getByTestId('reference-date-error')).toBeVisible()
      await expectNoViolations(page, 'Reference Date field with an error and the nearest-data chip')
      // Without data (and an empty Library cache): the caption under the field.
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('openmap')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const transaction = open.result.transaction('libraryCache', 'readwrite')
              transaction.objectStore('libraryCache').clear()
              transaction.oncomplete = () => {
                open.result.close()
                resolve()
              }
            }
          }),
      )
      await page.unroute('**/library/v1/geo/**')
      await page.route('**/library/v1/geo/**', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Data not built' }))
      await page.reload()
      await expect(page.getByTestId('geo-unavailable')).toBeVisible()
      await expectNoViolations(page, 'Reference Date field with the unavailable caption')
    })

    test('the credit and « Sources and licences » section of Project settings, locked credit and each state of its controls', async ({ page }) => {
      await mockCreditData(page)
      await openEditor(page)
      const panel = page.getByRole('complementary', { name: 'Properties' })
      await panel.getByRole('button', { name: /More options/ }).click()
      await expect(page.getByTestId('map-canvas')).toHaveAttribute('data-credit-state', 'drawn')
      await expect(panel.getByTestId('credit-locked-text')).toBeVisible()
      await expect(panel.getByTestId('sources-section').getByRole('listitem')).toHaveCount(3)
      await expectNoViolations(page, 'the credit and Sources section (Cliopatria credit locked)')
      await panel.getByRole('combobox', { name: 'Position' }).selectOption({ label: 'Top right' })
      await panel.getByRole('radiogroup', { name: 'Discretion' }).getByRole('radio', { name: 'Legible' }).click()
      await expectNoViolations(page, 'the credit section after a change (Top right, Legible)')
      await panel.getByRole('combobox', { name: 'Position' }).focus()
      await expectNoViolations(page, 'the credit section with the Position field focused')
    })

    test('the credit section with no required source (plain sentence, no padlock) and with an empty Sources list', async ({ page }) => {
      await page.route('**/library/v1/styles/*.json', (route) =>
        route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#FF00FF' } }] } }),
      )
      // No Territories data: nothing on the Map requires a credit, but the Basemap sources are listed.
      await page.route('**/library/v1/geo/**', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Data not built' }))
      await openEditor(page)
      const panel = page.getByRole('complementary', { name: 'Properties' })
      await panel.getByRole('button', { name: /More options/ }).click()
      await expect(panel).toContainText('No source drawn on the map requires a credit at the moment.')
      await expect(panel.getByTestId('credit-locked-text')).toHaveCount(0)
      await expect(panel.getByTestId('sources-section').getByRole('listitem')).toHaveCount(2)
      await expectNoViolations(page, 'the credit section without a required source')
      // And with no metadata at all: the empty Sources sentence.
      await page.route('**/library/v1/datasets.json', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Data not built' }))
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('openmap')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const transaction = open.result.transaction('libraryCache', 'readwrite')
              transaction.objectStore('libraryCache').clear()
              transaction.oncomplete = () => {
                open.result.close()
                resolve()
              }
            }
          }),
      )
      await page.reload()
      await panel.getByRole('button', { name: /More options/ }).click()
      await expect(panel.getByTestId('sources-section')).toContainText('No source is loaded at the moment.')
      await expectNoViolations(page, 'the Sources section with no source loaded')
    })

    test('Settings (each tab) and the shortcuts help', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Menu' }).click()
      await page.getByRole('menuitem', { name: 'Settings' }).click()
      const dialog = page.getByRole('dialog', { name: 'Settings' })
      await expect(dialog).toBeVisible()
      for (const tab of ['Appearance', 'Language', 'Storage']) {
        await dialog.getByRole('tab', { name: tab }).click()
        await expectNoViolations(page, `Settings, ${tab}`)
      }
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)

      await page.keyboard.press('?')
      await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
      await expectNoViolations(page, 'Shortcuts help')
    })
  })
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe, French credit section, ${scheme} theme`, () => {
    test.use({ locale: 'fr-FR' })

    test('the credit and « Sources et licences » section in French', async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await mockCreditData(page)
      await page.goto('/')
      await page.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click()
      await expect(page.getByRole('textbox', { name: 'Nom du Projet' })).toHaveValue('Projet sans titre')
      const panel = page.getByRole('complementary', { name: 'Propriétés' })
      await panel.getByRole('button', { name: /Plus d'options/ }).click()
      await expect(page.getByTestId('map-canvas')).toHaveAttribute('data-credit-state', 'drawn')
      await expect(panel.getByTestId('credit-locked-text')).toBeVisible()
      await expectNoViolations(page, 'the credit and Sources section (French)')
    })
  })
}

test.describe('gate pages', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`the unsupported-browser page (${scheme})`, async ({ browser }) => {
      const context = await browser.newContext({ locale: 'en-US', colorScheme: scheme })
      const page = await context.newPage()
      await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined }))
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Unsupported browser' })).toBeVisible()
      await expectNoViolations(page, 'unsupported-browser gate')
      await context.close()
    })

    test(`the designed-for-a-computer page (${scheme})`, async ({ browser }) => {
      const { defaultBrowserType: _browser, ...pixel } = devices['Pixel 7']
      const context = await browser.newContext({ ...pixel, locale: 'en-US', colorScheme: scheme })
      const page = await context.newPage()
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Designed for a computer' })).toBeVisible()
      await expectNoViolations(page, 'desktop-only gate')
      await context.close()
    })
  }
})
