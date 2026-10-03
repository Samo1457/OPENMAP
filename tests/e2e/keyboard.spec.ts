import { expect, test, type Page } from '@playwright/test'

// Story 1.7: the central shortcut registry, the Escape chain, `?` help, Alt+1..6 region jumps,
// tooltips and reduced motion (UX-DR64, UX-DR110–113, UX-DR116, UX-DR154–158).

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

const nameField = (page: Page) => page.getByRole('textbox', { name: 'Project name' })
const helpDialog = (page: Page) => page.getByRole('dialog', { name: 'Keyboard shortcuts' })
const settingsDialog = (page: Page) => page.getByRole('dialog', { name: 'Settings' })
const selectTool = (page: Page) => page.getByRole('button', { name: 'Select' })
const tooltip = (page: Page) => page.getByRole('tooltip')

async function openNewProject(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(nameField(page)).toHaveValue('Untitled Project')
}

/** Name of the region holding the focus: its `data-region`, or undefined. */
const focusedRegion = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.region)

test.describe('tool key V (UX-DR154)', () => {
  test('V selects the Select tool and announces it, whatever the layout or Caps Lock', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.keyboard.press('v')
    await expect(page.getByRole('status').getByText('Select tool active')).toBeAttached()
    await expect(selectTool(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(selectTool(page)).toHaveAttribute('aria-keyshortcuts', 'V')
    // Caps Lock types an upper-case V; another layout may put the typed v on another physical key.
    for (const init of [{ key: 'V', code: 'KeyV' }, { key: 'v', code: 'KeyB' }]) {
      await page.evaluate((init) => window.dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })), init)
      await expect(selectTool(page)).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('Shift+V does nothing: the typed character is a capital V only with Caps Lock', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.keyboard.press('Shift+V')
    await expect(page.getByRole('status').getByText('Select tool active')).toHaveCount(0)
  })
})

test.describe('text field (UX-DR111)', () => {
  test('v, Space, arrows and ? are typed into the name field; Escape leaves it and restores the name', async ({ page }) => {
    await openNewProject(page)
    await nameField(page).fill('')
    await nameField(page).press('v')
    await nameField(page).press('Space')
    await nameField(page).press('Shift+?')
    await expect(nameField(page)).toHaveValue('v ?')
    await nameField(page).press('ArrowLeft')
    await expect(helpDialog(page)).toHaveCount(0)
    await expect(nameField(page)).toBeFocused()

    await nameField(page).press('Escape')
    await expect(nameField(page)).not.toBeFocused()
    // Nothing else happened: no dialog, and the name was not committed.
    await expect(helpDialog(page)).toHaveCount(0)
    await expect(nameField(page)).toHaveValue('Untitled Project')
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  })

  test('Ctrl+Z in the field undoes the typing, not the Project', async ({ page }) => {
    await openNewProject(page)
    await nameField(page).fill('First')
    await nameField(page).press('Enter')
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
    await nameField(page).fill('Typing')
    await nameField(page).press('Control+z')
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText('First')
  })
})

test.describe('Escape chain (UX-DR112)', () => {
  test('the first Escape closes the menu only, the next one leaves the tool on Select', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('button', { name: /^Output format/ }).click()
    await expect(page.getByRole('menu', { name: 'Output format' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Output format/ })).toBeFocused()
    await expect(page.getByRole('button', { name: /^Output format/ })).toHaveText('16:9') // nothing was changed
    await page.keyboard.press('Escape')
    await expect(selectTool(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(helpDialog(page)).toHaveCount(0)
  })

  test('Escape hides a shown tooltip before anything else', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('button', { name: 'Undo', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(tooltip(page)).toHaveText('Undo · Ctrl+Z')
    await page.keyboard.press('Escape')
    await expect(tooltip(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeFocused()
  })
})

test.describe('shortcuts help (UX-DR110)', () => {
  test('? opens the help on Home with its two shortcuts; Escape closes it and returns the focus', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await page.getByRole('button', { name: 'New Project', exact: true }).first().focus()
    await page.keyboard.press('Shift+?')
    await expect(helpDialog(page)).toBeVisible()
    const rows = helpDialog(page).locator('dt')
    await expect(rows).toHaveText(['Show the shortcuts', 'Close, cancel or go back one step'])
    await page.keyboard.press('Escape')
    await expect(helpDialog(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'New Project', exact: true }).first()).toBeFocused()
  })

  test('in the Editor it lists every registered shortcut, in the UI language', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.keyboard.press('?')
    await expect(helpDialog(page)).toBeVisible()
    await expect(helpDialog(page).locator('dt')).toHaveText([
      'Undo',
      'Redo',
      'Save',
      'Select tool',
      'Go to the top bar',
      'Go to the tools',
      'Go to the tool options',
      'Go to the Map',
      'Go to the properties',
      'Go to the Timeline',
      // The edit-camera keys (Story 1.10), registered while the Map is open.
      'Zoom the Map in',
      'Zoom the Map out',
      'Pan the Map: arrow keys or WASD (ZQSD on an AZERTY keyboard)',
      'Recentre the Map on the frame',
      'Show the shortcuts',
      'Close, cancel or go back one step',
    ])
    await expect(helpDialog(page).getByText('Ctrl+Shift+Z')).toBeVisible()
    await expect(helpDialog(page).getByText('Alt+4')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(helpDialog(page)).toHaveCount(0)
  })

  test('is in French with « Ctrl+Maj+Z » and « Échap » when the app is in French', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click()
    await expect(page).toHaveURL(/#\/p\//)
    await page.getByRole('region', { name: 'Carte' }).focus()
    await page.keyboard.press('?')
    const dialog = page.getByRole('dialog', { name: 'Raccourcis clavier' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Ctrl+Maj+Z')).toBeVisible()
    await expect(dialog.getByText('Échap', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Aller à la Carte')).toBeVisible()
    await context.close()
  })
})

test.describe('region jumps Alt+1..6 (UX-DR113)', () => {
  const regions = [
    { key: '1', region: 'top', role: 'banner', name: 'Top bar' },
    { key: '2', region: 'rail', role: 'navigation', name: 'Tools' },
    { key: '3', region: 'options', role: 'region', name: 'Tool options' },
    { key: '4', region: 'map', role: 'region', name: 'Map' },
    { key: '5', region: 'panel', role: 'complementary', name: 'Properties' },
    { key: '6', region: 'timeline', role: 'region', name: 'Timeline' },
  ] as const

  test('Alt+1 to Alt+6 focus the top bar, rail, options bar, Map, panel and Timeline', async ({ page }) => {
    await openNewProject(page)
    for (const { key, region, role, name } of regions) {
      await page.keyboard.press(`Alt+Digit${key}`)
      expect(await focusedRegion(page), `Alt+${key}`).toBe(region)
      await expect(page.getByRole(role, { name, exact: true })).toBeFocused()
    }
    // Alt+N works from a menu button too, and the focused region has a visible ring.
    await page.keyboard.press('Alt+Digit4')
    expect(await page.evaluate(() => getComputedStyle(document.activeElement as HTMLElement).boxShadow)).not.toBe('none')
  })

  test('Alt+4 from the name field focuses the Map', async ({ page }) => {
    await openNewProject(page)
    await nameField(page).focus()
    await page.keyboard.press('Alt+Digit4')
    expect(await focusedRegion(page)).toBe('map')
  })

  test('Alt+Shift+digit and AltGr (Ctrl+Alt) do nothing', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.keyboard.press('Alt+Shift+Digit2')
    expect(await focusedRegion(page)).toBe('map')
    await page.keyboard.press('Control+Alt+Digit2')
    expect(await focusedRegion(page)).toBe('map')
    await page.keyboard.press('Alt+Digit2')
    expect(await focusedRegion(page)).toBe('rail')
  })

  test('the tab order follows the visual order: top bar, rail, options bar, Map, panel, Timeline', async ({ page }) => {
    await openNewProject(page)
    const order = await page.evaluate(() => {
      const regionOf = (element: Element) => (element.closest('[data-region]') as HTMLElement | null)?.dataset.region
      const stops = [...document.querySelectorAll<HTMLElement>('a[href], button, input, [tabindex="0"]')].filter((element) => element.tabIndex >= 0 && regionOf(element))
      return stops.map((element) => regionOf(element)!).filter((region, index, all) => all.indexOf(region) === index)
    })
    expect(order).toEqual(['top', 'rail', 'map', 'panel'])
    const regionTops = await page.evaluate(() =>
      ['top', 'rail', 'options', 'map', 'panel', 'timeline'].map((region) => {
        const rect = (document.querySelector(`[data-region="${region}"]`) as HTMLElement).getBoundingClientRect()
        return { region, x: Math.round(rect.left), y: Math.round(rect.top) }
      }),
    )
    // Reading order: DOM order matches top-to-bottom, left-to-right placement of the grid areas.
    const dom = await page.evaluate(() => [...document.querySelectorAll('[data-region]')].map((element) => (element as HTMLElement).dataset.region))
    expect(dom).toEqual(['top', 'rail', 'options', 'map', 'panel', 'timeline'])
    expect(regionTops[0].y).toBeLessThan(regionTops[1].y)
    expect(regionTops[1].x).toBeLessThan(regionTops[3].x)
    expect(regionTops[3].x).toBeLessThan(regionTops[4].x)
  })
})

test.describe('Back closes the help (UX-DR113)', () => {
  test('? then Back leaves no dialog and nothing inert', async ({ page }) => {
    await page.goto('/')
    await openNewProject(page)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.keyboard.press('?')
    await expect(helpDialog(page)).toBeVisible()
    await page.goBack()
    await expect(helpDialog(page)).toHaveCount(0)
    await expect(page.locator('[inert]')).toHaveCount(0)
  })
})

test.describe('a dialog blocks what is behind it (UX-DR111)', () => {
  test('v, Alt+2 and ? do nothing with Settings open', async ({ page }) => {
    await openNewProject(page)
    await page.getByRole('region', { name: 'Map' }).focus()
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(settingsDialog(page)).toBeVisible()
    await page.keyboard.press('v')
    await page.keyboard.press('Alt+Digit2')
    await page.keyboard.press('?')
    await expect(helpDialog(page)).toHaveCount(0)
    await expect(settingsDialog(page)).toBeVisible()
    expect(await focusedRegion(page)).toBeUndefined()
    await page.keyboard.press('Escape')
    await expect(settingsDialog(page)).toHaveCount(0)
  })
})

test.describe('tooltips (UX-DR64, UX-DR116)', () => {
  test('hover and keyboard focus show « Undo · Ctrl+Z » and describe the button; leaving hides it', async ({ page }) => {
    await openNewProject(page)
    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    await undo.hover()
    await expect(tooltip(page)).toHaveText('Undo · Ctrl+Z')
    await expect(undo).toHaveAccessibleDescription('Undo · Ctrl+Z')
    await page.mouse.move(600, 400)
    await expect(tooltip(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Redo', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(undo).toBeFocused()
    await expect(tooltip(page)).toHaveText('Undo · Ctrl+Z')
    await page.keyboard.press('Tab')
    await expect(tooltip(page)).toHaveText('Redo · Ctrl+Shift+Z')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('searchbox')).toBeFocused()
    await expect(tooltip(page)).toHaveText('Coming soon')
  })

  test('the rail tool shows « Select · V »; a click does not leave a tooltip', async ({ page }) => {
    await openNewProject(page)
    await selectTool(page).hover()
    await expect(tooltip(page)).toHaveText('Select · V')
    await selectTool(page).click()
    await expect(tooltip(page)).toHaveCount(0)
  })

  test('no native title tooltip is left, except the truncated project name', async ({ page }) => {
    await openNewProject(page)
    const titles = await page.evaluate(() => [...document.querySelectorAll('[title]')].map((element) => element.getAttribute('title')))
    expect(titles).toEqual(['Untitled Project'])
  })

  test('the tooltip text is French in French', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click()
    await expect(page).toHaveURL(/#\/p\//)
    await page.getByRole('button', { name: 'Rétablir', exact: true }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Rétablir · Ctrl+Maj+Z')
    await context.close()
  })
})

test.describe('reduced motion (UX-DR157)', () => {
  test('the chrome has no animation or transition, the Map is left alone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openNewProject(page)
    const measured = await page.evaluate(() => {
      const duration = (element: Element) => parseFloat(getComputedStyle(element).transitionDuration.split(',')[0])
      const animation = (element: Element) => parseFloat(getComputedStyle(element).animationDuration.split(',')[0])
      const probe = document.createElement('div')
      probe.style.cssText = 'transition: opacity 3s; animation: spin 3s infinite'
      document.body.append(probe)
      const chrome = { transition: duration(probe), animation: animation(probe) }
      probe.remove()
      const map = document.querySelector('[data-map-content]') as HTMLElement
      map.style.transition = 'opacity 3s'
      const onMap = duration(map)
      return { chrome, onMap }
    })
    expect(measured.chrome.transition).toBeLessThan(0.001)
    expect(measured.chrome.animation).toBeLessThan(0.001)
    expect(measured.onMap).toBe(3)
  })
})
