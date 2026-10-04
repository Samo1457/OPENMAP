import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Story 1.5: the Editor shell, Project settings through Commands, undo/redo, save status, Ctrl+S.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 648 } })

interface Row {
  id: string
  document: Record<string, unknown>
  name: string
  outputFormat: string
  updatedAt: number
  lockEpoch: number
}

function readRows(page: Page): Promise<Row[]> {
  return page.evaluate(
    () =>
      new Promise<Row[]>((resolve, reject) => {
        const open = indexedDB.open('openmap')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const request = db.transaction('projects').objectStore('projects').getAll()
          request.onsuccess = () => {
            db.close()
            resolve(request.result as Row[])
          }
          request.onerror = () => reject(request.error)
        }
      }),
  )
}

function putRow(page: Page, row: Row): Promise<void> {
  return page.evaluate(
    (row) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('openmap')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const transaction = db.transaction('projects', 'readwrite')
          transaction.objectStore('projects').put(row)
          transaction.oncomplete = () => {
            db.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }
      }),
    row,
  )
}

const topBar = (page: Page) => page.getByRole('banner', { name: 'Top bar' })
const panel = (page: Page) => page.getByRole('complementary', { name: 'Properties' })
const undoButton = (page: Page) => topBar(page).getByRole('button', { name: 'Undo', exact: true })
const redoButton = (page: Page) => topBar(page).getByRole('button', { name: 'Redo', exact: true })
const nameField = (page: Page) => panel(page).getByRole('textbox', { name: 'Project name' })
const breadcrumbName = (page: Page) => page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')
const formatGroup = (page: Page) => panel(page).getByRole('radiogroup', { name: 'Output format' })
const localeGroup = (page: Page) => panel(page).getByRole('radiogroup', { name: 'Map language' })
const formatMenuButton = (page: Page) => topBar(page).getByRole('button', { name: /^Output format/ })
const frameSize = (page: Page) => page.getByRole('region', { name: 'Tool options' }).getByTestId('frame-size')
const saveStatus = (page: Page) => topBar(page).locator('[data-save-status]')

/** Creates a blank Project from Home and waits for the Editor to be ready. */
async function openNewProject(page: Page): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(nameField(page)).toHaveValue('Untitled Project')
  return new URL(page.url()).hash.slice('#/p/'.length)
}

/** Expects the Output Format shown by the top-bar menu, the panel and the options bar. */
async function expectFormat(page: Page, format: string, size: string) {
  await expect(formatMenuButton(page)).toHaveText(format)
  await expect(formatGroup(page).getByRole('radio', { checked: true })).toHaveText(format)
  await expect(frameSize(page)).toHaveText(`${format} · ${size}`)
}

test.describe('layout (UX-DR30–33, UX-DR127, UX-DR159, NFR-8)', () => {
  for (const [width, panelWidth, scheme] of [
    [1366, 300, 'light'],
    [1279, 260, 'dark'],
  ] as const) {
    test(`at ${width}×648 (${scheme}) every region is visible with no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 648 })
      await page.emulateMedia({ colorScheme: scheme })
      await openNewProject(page)
      // Under 1366 px a dismissable banner says the window is too small (UX-DR148); dismiss it to
      // measure the regions.
      const narrowBanner = page.getByRole('status').filter({ hasText: 'designed for a screen of at least 1366 × 768' })
      if (width < 1366) {
        await expect(narrowBanner).toBeVisible()
        await narrowBanner.getByRole('button', { name: 'Dismiss this banner' }).click()
      }
      await expect(narrowBanner).toHaveCount(0)

      const box = async (name: string, role: Parameters<Page['getByRole']>[0]) => {
        const element = page.getByRole(role, { name })
        await expect(element).toBeVisible()
        return (await element.boundingBox())!
      }
      const top = await box('Top bar', 'banner')
      const rail = await box('Tools', 'navigation')
      const options = await box('Tool options', 'region')
      const map = await box('Map', 'region')
      const properties = await box('Properties', 'complementary')
      const timeline = await box('Timeline', 'region')

      expect(top).toMatchObject({ x: 0, y: 0, width, height: 48 })
      expect(rail).toMatchObject({ x: 0, y: 48, width: 76, height: 600 })
      expect(properties).toMatchObject({ x: width - panelWidth, y: 48, width: panelWidth, height: 600 })
      expect(options).toMatchObject({ x: 76, y: 48, width: width - 76 - panelWidth, height: 36 })
      // The options bar sits above the Map, never over it.
      expect(map).toMatchObject({ x: 76, y: 84, width: width - 76 - panelWidth })
      expect(timeline).toMatchObject({ x: 76, y: 648 - 44, height: 44 })
      expect(map.y + map.height).toBe(timeline.y)

      const scroll = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }))
      expect(scroll).toEqual({ scrollWidth: width, scrollHeight: 648 })

      // Top bar: every slot is present and inside the viewport.
      for (const control of [
        page.getByRole('link', { name: 'Projects' }),
        breadcrumbName(page),
        saveStatus(page),
        formatMenuButton(page),
        undoButton(page),
        redoButton(page),
        topBar(page).getByRole('combobox', { name: 'Search for a place' }),
        topBar(page).getByRole('button', { name: 'Presentation' }),
        topBar(page).getByRole('button', { name: 'Export' }),
        topBar(page).getByRole('button', { name: 'Menu' }),
      ]) {
        await expect(control).toBeVisible()
        const { x, width: w } = (await control.boundingBox())!
        expect(x + w).toBeLessThanOrEqual(width)
      }
      await expect(topBar(page).getByRole('button', { name: 'Presentation' })).toBeDisabled()
      await expect(topBar(page).getByRole('button', { name: 'Export' })).toBeDisabled()
      for (const slot of [
        topBar(page).getByRole('button', { name: 'Presentation' }),
        topBar(page).getByRole('button', { name: 'Export' }),
      ]) {
        await expect(slot).toHaveAccessibleDescription('Coming soon')
      }

      await expect(page.getByRole('navigation', { name: 'Tools' }).getByRole('button')).toHaveText(['Select'])
      await expect(page.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('region', { name: 'Timeline' })).toHaveText('Timeline')
      await expect(panel(page).getByRole('heading', { name: 'Project settings' })).toBeVisible()
      // No advanced Project setting yet, so no « More options » row.
      await expect(panel(page).getByRole('button', { name: /More options/ })).toHaveCount(0)
      await expectFormat(page, '16:9', '1920 × 1080')
    })
  }

  test('while the Project opens, the Editor shows skeletons and « Opening… »', async ({ page, context }) => {
    const id = await openNewProject(page)
    // Another page holds a write transaction on the projects table, so opening waits for it.
    const blocker = await context.newPage()
    await blocker.goto('/')
    await blocker.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const open = indexedDB.open('openmap')
          open.onsuccess = () => {
            const store = open.result.transaction('projects', 'readwrite').objectStore('projects')
            const flags = window as unknown as { release?: boolean }
            const spin = () => {
              if (!flags.release) store.count().onsuccess = spin
            }
            spin()
            resolve()
          }
        }),
    )
    expect(new URL(page.url()).hash).toBe(`#/p/${id}`)
    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Opening…')
    await expect(page.locator('.om-skeleton').first()).toBeVisible()
    await expect(nameField(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Select' })).toBeDisabled()
    await blocker.evaluate(() => {
      ;(window as unknown as { release?: boolean }).release = true
    })
    await expect(nameField(page)).toHaveValue('Untitled Project')
    await expect(page.locator('.om-skeleton')).toHaveCount(0)
  })
})

test.describe('Project settings through Commands, undo and redo (AD-3, FR-55, UX-DR114)', () => {
  test('rename, Output Format and Map language undo and redo by buttons and keys', async ({ page }) => {
    await openNewProject(page)
    await expect(undoButton(page)).toBeDisabled()
    await expect(redoButton(page)).toBeDisabled()

    // Typing a name is one gesture: one undo entry on Enter.
    await nameField(page).fill('Balkans')
    await nameField(page).press('Enter')
    await expect(breadcrumbName(page)).toHaveText('Balkans')

    // Output Format from the top-bar menu, then from the panel; both agree with the options bar.
    await formatMenuButton(page).click()
    await expect(page.getByRole('menuitemradio', { name: '16:9' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('menuitemradio', { name: '16:9' })).toBeFocused()
    await page.getByRole('menuitemradio', { name: '9:16' }).click()
    await expectFormat(page, '9:16', '1080 × 1920')
    await formatGroup(page).getByRole('radio', { name: '1:1' }).click()
    await expectFormat(page, '1:1', '1080 × 1080')

    // The blank Project's Map language is the UI language (English here).
    await localeGroup(page).getByRole('radio', { name: 'Français' }).click()
    await expect(localeGroup(page).getByRole('radio', { checked: true })).toHaveText('Français')

    // Undo by keys: the focus is on a radio, not a text field.
    await page.keyboard.press('Control+z')
    await expect(localeGroup(page).getByRole('radio', { checked: true })).toHaveText('English')
    await expect(page.getByRole('status').filter({ hasText: 'Undone' })).toHaveText('Undone')
    await page.keyboard.press('Control+z')
    await expectFormat(page, '9:16', '1080 × 1920')
    // Undo by button.
    await undoButton(page).click()
    await expectFormat(page, '16:9', '1920 × 1080')
    await undoButton(page).click()
    await expect(breadcrumbName(page)).toHaveText('Untitled Project')
    await expect(nameField(page)).toHaveValue('Untitled Project')
    await expect(undoButton(page)).toBeDisabled()
    await expect(undoButton(page)).toBeFocused()

    // Redo by Ctrl+Shift+Z, Ctrl+Y and the button.
    await page.keyboard.press('Control+Shift+Z')
    await expect(breadcrumbName(page)).toHaveText('Balkans')
    await page.keyboard.press('Control+y')
    await expectFormat(page, '9:16', '1080 × 1920')
    await redoButton(page).click()
    await page.keyboard.press('Control+y')
    await expect(localeGroup(page).getByRole('radio', { checked: true })).toHaveText('Français')
    await expect(redoButton(page)).toBeDisabled()
    await expect(page.getByRole('status').filter({ hasText: 'Redone' })).toHaveText('Redone')

    // Each change was autosaved.
    await expect.poll(async () => (await readRows(page))[0].document).toMatchObject({ name: 'Balkans', outputFormat: '1:1', mapLocale: 'fr', revision: 12 })
    // No toast for undo and redo.
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')
  })

  test('Ctrl+Z inside the name field undoes the typing, not the Project', async ({ page }) => {
    await openNewProject(page)
    await formatGroup(page).getByRole('radio', { name: '9:16' }).click()
    await nameField(page).click()
    await nameField(page).press('End')
    await page.keyboard.type(' X')
    await expect(nameField(page)).toHaveValue('Untitled Project X')
    await page.keyboard.press('Control+z')
    await expect(nameField(page)).toHaveValue('Untitled Project')
    await expectFormat(page, '9:16', '1080 × 1920')
  })

  test('an empty name keeps the previous one and says so; Escape restores the name', async ({ page }) => {
    await openNewProject(page)
    await nameField(page).fill('   ')
    await nameField(page).press('Enter')
    await expect(panel(page).getByRole('alert')).toHaveText('This name cannot be used. The Project keeps its previous name.')
    await expect(nameField(page)).toHaveValue('Untitled Project')
    await expect(nameField(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(undoButton(page)).toBeDisabled()

    await nameField(page).fill('Draft')
    await expect(panel(page).getByRole('alert')).toHaveCount(0)
    await nameField(page).press('Escape')
    await expect(nameField(page)).toHaveValue('Untitled Project')
    await nameField(page).blur()
    await expect(undoButton(page)).toBeDisabled()

    // Leaving the field commits, as one entry.
    await nameField(page).fill('Committed on blur')
    await formatGroup(page).getByRole('radio', { name: '16:9' }).focus()
    await expect(breadcrumbName(page)).toHaveText('Committed on blur')
    await undoButton(page).click()
    await expect(breadcrumbName(page)).toHaveText('Untitled Project')
    await expect(undoButton(page)).toBeDisabled()
  })

  test('a reload keeps the Project but not the history', async ({ page }) => {
    await openNewProject(page)
    await formatGroup(page).getByRole('radio', { name: '1:1' }).click()
    await expect(undoButton(page)).toBeEnabled()
    await page.reload()
    await expectFormat(page, '1:1', '1080 × 1080')
    await expect(undoButton(page)).toBeDisabled()
    await expect(redoButton(page)).toBeDisabled()
  })
})

test.describe('save status and Ctrl+S (UX-DR137, UX-DR115, AD-8)', () => {
  test('« Saving… » then « Saved », with no toast for a routine save; Ctrl+S confirms', async ({ page, baseURL }) => {
    const foreign: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.protocol !== 'data:' && url.origin !== new URL(baseURL!).origin) foreign.push(request.url())
    })
    page.on('dialog', (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`)
    })
    await openNewProject(page)
    await expect(saveStatus(page)).toHaveText('Saved')

    await formatGroup(page).getByRole('radio', { name: '9:16' }).click()
    await expect(saveStatus(page)).toHaveText('Saving…')
    await expect(saveStatus(page)).toHaveText('Saved')
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')

    // Ctrl+S flushes at once (no 1 s debounce) and confirms; the browser's Save page never opens.
    await formatGroup(page).getByRole('radio', { name: '1:1' }).click()
    await page.keyboard.press('Control+s')
    const toast = page.getByRole('status').filter({ hasText: 'Project saved' })
    await expect(toast).toContainText('On this device · just now')
    expect((await readRows(page))[0].document).toMatchObject({ outputFormat: '1:1' })
    await expect(saveStatus(page)).toHaveText('Saved')

    await toast.getByRole('button', { name: 'Close notification' }).click()
    await expect(toast).toHaveCount(0)

    // Ctrl+S from the name field commits the typed name, then flushes before confirming.
    await nameField(page).fill('Saved with Ctrl+S')
    await nameField(page).press('Control+s')
    await expect(toast).toContainText('On this device · just now')
    expect((await readRows(page))[0].name).toBe('Saved with Ctrl+S')
    await toast.getByRole('button', { name: 'Close notification' }).click()
    await expect(toast).toHaveCount(0)

    // A refused name: the error shows and Ctrl+S confirms nothing.
    await nameField(page).fill('   ')
    await nameField(page).press('Control+s')
    await expect(panel(page).getByRole('alert')).toHaveText('This name cannot be used. The Project keeps its previous name.')
    await expect(toast).toHaveCount(0)
    expect(foreign).toEqual([])
  })

  test('a failed save shows « Not saved » and an error toast; Ctrl+S then confirms nothing', async ({ page, context }) => {
    const id = await openNewProject(page)
    // A newer tab takes the Project: this tab's writes are refused (AD-8).
    const second = await context.newPage()
    await second.goto(`/#/p/${id}`)
    await expect(nameField(second)).toHaveValue('Untitled Project')

    await formatGroup(page).getByRole('radio', { name: '9:16' }).click()
    await expect(saveStatus(page)).toHaveText('Not saved')
    await expect(saveStatus(page).locator('svg')).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'The latest changes to this Project were not saved on this device.' })).toBeVisible()

    await page.getByRole('radiogroup', { name: 'Output format' }).getByRole('radio', { name: '1:1' }).click()
    await page.keyboard.press('Control+s')
    // The error stays (status and one toast per failure) and no success is claimed.
    await expect(saveStatus(page)).toHaveText('Not saved')
    await expect(page.getByRole('alert').filter({ hasText: 'not saved' })).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Notifications' }).getByText('Project saved')).toHaveCount(0)
    expect((await readRows(page))[0].outputFormat).toBe('16:9')
  })
})

test.describe('read-only document (AD-9)', () => {
  test('a newer document opens the shell read-only with the banner, every editing control disabled', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    const document = { schemaVersion: 3, id: 'newerDocument00000001', name: 'From the future', mapLocale: 'fr' }
    await putRow(page, { id: 'newerDocument00000001', document, name: 'From the future', outputFormat: '9:16', updatedAt: Date.now(), lockEpoch: 0 })
    await page.goto('/#/p/newerDocument00000001')

    await expect(page.getByRole('status').filter({ hasText: 'newer version' })).toBeVisible()
    await expect(breadcrumbName(page)).toHaveText('From the future')
    await expect(nameField(page)).toHaveValue('From the future')
    await expect(nameField(page)).not.toBeEditable()
    await expect(formatGroup(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(localeGroup(page).getByRole('radio', { checked: true })).toHaveText('Français')
    await expect(frameSize(page)).toHaveText('9:16 · 1080 × 1920')
    await expect(formatMenuButton(page)).toBeDisabled()
    await expect(undoButton(page)).toBeDisabled()
    await expect(redoButton(page)).toBeDisabled()
    await expect(saveStatus(page)).toHaveCount(0)

    // Disabled controls ignore clicks and keys; the document is never written.
    await formatGroup(page).getByRole('radio', { name: '1:1' }).click({ force: true })
    await formatGroup(page).getByRole('radio', { name: '9:16' }).focus()
    await page.keyboard.press('ArrowRight')
    await formatMenuButton(page).click({ force: true })
    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.keyboard.press('Control+s')
    await expect(formatGroup(page).getByRole('radio', { checked: true })).toHaveText('9:16')
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveText('')
    const [row] = await readRows(page)
    expect(row.document).toEqual(document)
    expect(row.lockEpoch).toBe(0)
  })
})

test.describe('keyboard and focus (UX-DR27, UX-DR8)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`every control is reachable with Tab and shows the focus ring (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openNewProject(page)
      // Reach the first stop with the keyboard, so the focus ring shows (:focus-visible).
      await formatMenuButton(page).focus()
      await page.keyboard.press('Shift+Tab')

      const expected = [
        page.getByRole('link', { name: 'Projects' }),
        formatMenuButton(page),
        undoButton(page),
        redoButton(page),
        topBar(page).getByRole('combobox', { name: 'Search for a place' }),
        topBar(page).getByRole('button', { name: 'Presentation' }),
        topBar(page).getByRole('button', { name: 'Export' }),
        topBar(page).getByRole('button', { name: 'Menu' }),
        page.getByRole('button', { name: 'Select' }),
        // The Map is a tab stop (Story 1.7), between the tool rail and the panel.
        page.getByRole('region', { name: 'Map' }),
        // Then the zoom buttons at its bottom left (Story 1.10).
        page.getByRole('button', { name: 'Zoom in' }),
        page.getByRole('button', { name: 'Zoom out' }),
        page.getByRole('button', { name: 'Recentre on the frame' }),
        nameField(page),
        // The Reference Date field follows the name (Story 1.11).
        panel(page).getByRole('textbox', { name: 'Reference date' }),
        formatGroup(page).getByRole('radio', { name: '16:9' }),
        localeGroup(page).getByRole('radio', { name: 'English' }),
      ]
      for (const [index, control] of expected.entries()) {
        if (index > 0) await page.keyboard.press('Tab')
        await expect(control).toBeFocused()
        expect(await control.evaluate((element) => getComputedStyle(element).boxShadow), `focus ring ${index}`).not.toBe('none')
      }

      // UX-DR8: a disabled control keeps its slot at 55 % opacity with a not-allowed cursor; its
      // text-secondary foreground then reads as text-disabled.
      await expect(undoButton(page)).toBeDisabled()
      await expect(undoButton(page)).toHaveCSS('opacity', '0.55')
      await expect(undoButton(page)).toHaveCSS('cursor', 'not-allowed')
      const secondary = await page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--om-text-secondary)'
        document.body.append(probe)
        const color = getComputedStyle(probe).color
        probe.remove()
        return color
      })
      await expect(undoButton(page)).toHaveCSS('color', secondary)
    })
  }

  test('the « ⋯ » menu opens Settings; Escape returns to it', async ({ page }) => {
    await openNewProject(page)
    const menuButton = topBar(page).getByRole('button', { name: 'Menu' })
    await menuButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused()
    await page.keyboard.press('Enter')
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await expect(settings).toBeVisible()
    await expect(settings.getByRole('tab', { name: 'Appearance' })).toBeFocused()
    await expect(settings.getByRole('radiogroup')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(settings).toHaveCount(0)
    await expect(menuButton).toBeFocused()
  })
})

test.describe('a typed name is not lost (AD-8)', () => {
  test('leaving the Editor by the Projects link commits the typed name', async ({ page }) => {
    await openNewProject(page)
    await nameField(page).fill('Typed then left')
    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Projects' }).getByText('Typed then left', { exact: true })).toBeVisible()
  })

  test('a reload (pagehide) commits the typed name', async ({ page }) => {
    await openNewProject(page)
    await nameField(page).fill('Typed then reloaded')
    await page.reload()
    await expect(nameField(page)).toHaveValue('Typed then reloaded')
    await expect(breadcrumbName(page)).toHaveText('Typed then reloaded')
  })
})

test.describe('toast placement (UX-DR105, UX-DR115)', () => {
  for (const [width, panelWidth] of [
    [1366, 300],
    [1279, 260],
  ] as const) {
    test(`at ${width} px the Ctrl+S toast sits in the scene, left of the panel and above the Timeline`, async ({ page }) => {
      await page.setViewportSize({ width, height: 648 })
      await openNewProject(page)
      await page.getByRole('button', { name: 'Select' }).focus()
      await page.keyboard.press('Control+s')
      const toast = page.getByRole('status').filter({ hasText: 'Project saved' })
      await expect(toast).toBeVisible()
      const box = (await toast.boundingBox())!
      expect(box.x + box.width).toBeLessThanOrEqual(width - panelWidth)
      expect(box.y + box.height).toBeLessThanOrEqual(648 - 44)
      expect(box.x).toBeGreaterThanOrEqual(76)
    })
  }
})

test.describe('Projects the Editor cannot open', () => {
  test('a missing Project shows the message and only the way back', async ({ page }) => {
    await page.goto('/#/p/missingProject0000001')
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('This Project could not be found on this device.')
    await expect(page.locator('.om-skeleton')).toHaveCount(0)
    await expect(page.getByText('Opening…')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current]')).toHaveCount(0)
    await expect(topBar(page).getByRole('button')).toHaveCount(0)
    await expect(topBar(page).getByRole('combobox')).toHaveCount(0)
    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
  })

  test('an unreadable Project says so', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await putRow(page, { id: 'brokenDocument0000001', document: { schemaVersion: 1, name: 42 }, name: 'Broken', outputFormat: '16:9', updatedAt: Date.now(), lockEpoch: 0 })
    await page.goto('/#/p/brokenDocument0000001')
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('This Project could not be read.')
    await expect(page.locator('.om-skeleton')).toHaveCount(0)
    await expect(topBar(page).getByRole('button')).toHaveCount(0)
  })
})
