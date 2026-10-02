import { devices, expect, test, type Page } from '@playwright/test'

// Story 1.6: the Settings dialog (UX-DR134, UX-DR67), banners (UX-DR66, UX-DR148) and the browser
// gate (AD-19, NFR-4, UX-DR135).

test.use({ locale: 'en-US' })

const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0'

const menuButton = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Menu' })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Settings' })
const tab = (page: Page, name: string) => dialog(page).getByRole('tab', { name })
const firefoxBanner = (page: Page) => page.getByRole('status').filter({ hasText: 'OPENMAP is designed for Chrome and Edge.' })
const smallBanner = (page: Page) => page.getByRole('status').filter({ hasText: 'OPENMAP is designed for a screen of at least 1366 × 768.' })

async function gotoHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
}

/** Opens Settings from the « ⋯ » menu with the keyboard. */
async function openSettingsByKeyboard(page: Page) {
  await menuButton(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toBeVisible()
}

/** Expects the keyboard focus ring (UX-DR27) on the focused element. */
async function expectFocusRing(page: Page, label: string) {
  const ring = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement
    return { visible: element.matches(':focus-visible'), shadow: getComputedStyle(element).boxShadow }
  })
  expect(ring.visible, `focus-visible on ${label}`).toBe(true)
  expect(ring.shadow, `focus ring on ${label}`).not.toBe('none')
}

test.describe('Settings dialog (UX-DR134, UX-DR67)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`opens from Home with the keyboard; tabs, focus trap, Escape and focus return (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await gotoHome(page)
      // No temporary Settings button is left on Home.
      await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0)
      await openSettingsByKeyboard(page)

      await expect(dialog(page)).toHaveAttribute('aria-modal', 'true')
      await expect(dialog(page)).toHaveCSS('width', '560px')
      await expect(page.getByTestId('dialog-scrim')).toHaveCSS('background-color', /^(rgba\(17, 22, 28, 0\.62\)|color\(srgb 0\.0666667 0\.0862745 0\.109804 \/ 0\.62\))$/)
      await expect(dialog(page).getByRole('tablist').getByRole('tab')).toHaveText(['Appearance', 'Language', 'Storage'])
      await expect(tab(page, 'Appearance')).toBeFocused()
      await expect(tab(page, 'Appearance')).toHaveAttribute('aria-selected', 'true')
      await expectFocusRing(page, 'Appearance tab')

      // Arrows move between tabs (wrapping) and show their panel.
      await page.keyboard.press('ArrowRight')
      await expect(tab(page, 'Language')).toBeFocused()
      await expect(dialog(page).getByRole('tabpanel')).toContainText('Français')
      await page.keyboard.press('ArrowRight')
      await expect(tab(page, 'Storage')).toBeFocused()
      await expect(dialog(page).getByRole('tabpanel')).toContainText('Space used')
      await page.keyboard.press('ArrowRight')
      await expect(tab(page, 'Appearance')).toBeFocused()
      await page.keyboard.press('End')
      await expect(tab(page, 'Storage')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(tab(page, 'Appearance')).toBeFocused()
      // ArrowLeft wraps from the first tab to the last, then goes back.
      await page.keyboard.press('ArrowLeft')
      await expect(tab(page, 'Storage')).toBeFocused()
      await expect(tab(page, 'Storage')).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('ArrowLeft')
      await expect(tab(page, 'Language')).toBeFocused()
      await expect(tab(page, 'Language')).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('Home')
      await expect(tab(page, 'Appearance')).toBeFocused()

      // Tab cycles inside the dialog: tab list → segmented control → close button → tab list.
      await page.keyboard.press('Tab')
      await expect(dialog(page).getByRole('radio', { checked: true })).toBeFocused()
      await expectFocusRing(page, 'Appearance radio')
      await page.keyboard.press('Tab')
      await expect(dialog(page).getByRole('button', { name: 'Close' })).toBeFocused()
      await expectFocusRing(page, 'close button')
      await page.keyboard.press('Tab')
      await expect(tab(page, 'Appearance')).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(dialog(page).getByRole('button', { name: 'Close' })).toBeFocused()

      // A setting applies at once.
      await tab(page, 'Appearance').focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('End')
      await expect(dialog(page).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)

      await page.keyboard.press('Escape')
      await expect(dialog(page)).toHaveCount(0)
      await expect(menuButton(page)).toBeFocused()
    })
  }

  test('the close button and a click on the scrim close it and give the focus back to the menu button', async ({ page }) => {
    await gotoHome(page)
    await menuButton(page).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(dialog(page)).toBeVisible()
    // The page behind is inert while the dialog is open.
    expect(await page.evaluate(() => document.getElementById('root')?.hasAttribute('inert'))).toBe(true)
    // The page behind does not scroll.
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
    await dialog(page).getByRole('button', { name: 'Close' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(menuButton(page)).toBeFocused()
    expect(await page.evaluate(() => document.getElementById('root')?.hasAttribute('inert'))).toBe(false)
    await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')

    await menuButton(page).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(dialog(page)).toBeVisible()
    await page.mouse.click(10, 700)
    await expect(dialog(page)).toHaveCount(0)
    await expect(menuButton(page)).toBeFocused()
  })

  test('opens from the Editor « ⋯ » menu; Ctrl+Z inside it does not reach the Editor', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
    const name = page.getByRole('complementary', { name: 'Properties' }).getByRole('textbox', { name: 'Project name' })
    await expect(name).toHaveValue('Untitled Project')
    await name.fill('Renamed')
    await name.press('Enter')
    const undo = page.getByRole('banner', { name: 'Top bar' }).getByRole('button', { name: 'Undo', exact: true })
    await expect(undo).not.toHaveAttribute('aria-disabled', 'true')

    await openSettingsByKeyboard(page)
    await page.keyboard.press('Control+z')
    // Ctrl+S never reaches the browser's Save page: the dialog prevents it. A body listener added
    // after React's delegated one sees the outcome.
    await page.evaluate(() => {
      const record = window as unknown as { savePrevented?: boolean }
      document.body.addEventListener('keydown', (event) => {
        if (event.key === 's') record.savePrevented = event.defaultPrevented
      })
    })
    await page.keyboard.press('Control+s')
    expect(await page.evaluate(() => (window as unknown as { savePrevented?: boolean }).savePrevented)).toBe(true)
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(menuButton(page)).toBeFocused()
    await expect(name).toHaveValue('Renamed')
  })

  test('Back closes Settings: it never stays over another screen', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
    await expect(page).toHaveURL(/#\/p\//)
    await openSettingsByKeyboard(page)
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0)
  })

  test('a toast raised while Settings is open stays usable above it', async ({ page, context }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
    await expect(page).toHaveURL(/#\/p\//)
    const id = new URL(page.url()).hash.slice('#/p/'.length)
    // A newer tab takes the Project, so this tab's next save fails with an error toast (AD-8).
    const second = await context.newPage()
    await second.goto(`/#/p/${id}`)
    await expect(second.getByRole('complementary', { name: 'Properties' }).getByRole('textbox', { name: 'Project name' })).toHaveValue('Untitled Project')
    await page.bringToFront()

    await page.getByRole('complementary', { name: 'Properties' }).getByRole('radio', { name: '9:16' }).click()
    await openSettingsByKeyboard(page)
    const toast = page.getByRole('alert').filter({ hasText: 'The latest changes to this Project were not saved on this device.' })
    await expect(toast).toBeVisible()
    await expect(dialog(page)).toBeVisible()
    expect(await toast.evaluate((element) => element.closest('[inert]') === null)).toBe(true)
    await toast.getByRole('button', { name: 'Close notification' }).click()
    await expect(toast).toHaveCount(0)
    await expect(dialog(page)).toBeVisible()
  })

  test('Storage shows the space used and that the storage is protected', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(StorageManager.prototype, 'estimate', { value: async () => ({ usage: 12_000_000, quota: 2_000_000_000 }) })
      Object.defineProperty(StorageManager.prototype, 'persisted', { value: async () => true })
    })
    await gotoHome(page)
    await openSettingsByKeyboard(page)
    await page.keyboard.press('End')
    await expect(tab(page, 'Storage')).toBeFocused()
    await expect(page.getByTestId('storage-space')).toHaveText('12 MB used of 2 GB')
    await expect(page.getByTestId('storage-protection')).toHaveText('Protected: the browser will not delete your Projects.')
    await expect(dialog(page)).toContainText('Export your Projects as Project files regularly so you never lose your work.')
    const exportButton = dialog(page).getByRole('button', { name: 'Export Project file' })
    await expect(exportButton).toHaveAttribute('aria-disabled', 'true')
    await expect(exportButton).toHaveAccessibleDescription('Coming soon')
    // Tab moves from the tab list into the Storage content, with the focus ring.
    await page.keyboard.press('Tab')
    await expect(exportButton).toBeFocused()
    await expectFocusRing(page, 'Export Project file')
  })

  test('Storage in French says when the storage is not protected', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR' })
    const page = await context.newPage()
    await page.addInitScript(() => {
      Object.defineProperty(StorageManager.prototype, 'estimate', { value: async () => ({ usage: 12_000_000, quota: 2_000_000_000 }) })
      Object.defineProperty(StorageManager.prototype, 'persisted', { value: async () => false })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Réglages' }).click()
    await page.getByRole('dialog', { name: 'Réglages' }).getByRole('tab', { name: 'Stockage' }).click()
    await expect(page.getByTestId('storage-space')).toHaveText('12 Mo utilisés sur 2 Go')
    await expect(page.getByTestId('storage-protection')).toHaveText('Non protégé : le navigateur peut supprimer vos Projets si l\'espace manque.')
    await context.close()
  })

  test('Storage without navigator.storage says the information is unavailable; the rest works', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'storage', { get: () => undefined }))
    await gotoHome(page)
    await openSettingsByKeyboard(page)
    await tab(page, 'Storage').click()
    await expect(page.getByTestId('storage-space')).toHaveText('Information unavailable in this browser.')
    await expect(page.getByTestId('storage-protection')).toHaveText('Information unavailable in this browser.')
    await tab(page, 'Language').click()
    await expect(dialog(page).getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('browser gate (AD-19, NFR-4, UX-DR135)', () => {
  test.describe('on a phone', () => {
    const { defaultBrowserType: _browser, ...pixel } = devices['Pixel 7']
    test.use({ ...pixel, locale: 'en-US' })

    test('shows the designed-for-computer page, with no way into the app', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await page.goto('/')
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      await expect(page.getByRole('heading', { level: 1, name: 'Designed for a computer' })).toBeVisible()
      await expect(page.getByText('OPENMAP is designed for a computer. Open this link on your PC with Chrome or Edge.')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Projects' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0)
      const copyButton = page.getByRole('button', { name: 'Copy link' })
      await copyButton.click()
      await expect(page.getByText('Link copied.')).toBeVisible()
      await expect(copyButton).toHaveAccessibleDescription('Link copied.')
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
      // Each click reports afresh: a later failure replaces the success.
      await page.evaluate(() => Object.defineProperty(Clipboard.prototype, 'writeText', { value: () => Promise.reject(new Error('denied')) }))
      await copyButton.click()
      await expect(page.getByText('The link could not be copied. Copy it below.')).toBeVisible()
      await expect(page.getByText('Link copied.')).toHaveCount(0)
      await expect(copyButton).toHaveAccessibleDescription(/^The link could not be copied\. Copy it below\./)
      // No continue-anyway: an Editor address is gated too.
      await page.goto('/#/p/someProject0000000001')
      await expect(page.getByRole('heading', { level: 1, name: 'Designed for a computer' })).toBeVisible()
    })

    for (const scheme of ['light', 'dark'] as const) {
      test(`the designed-for-computer page is keyboard-operable with a visible focus ring (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/')
        await expect(page.getByRole('heading', { level: 1, name: 'Designed for a computer' })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
        await page.keyboard.press('Tab')
        await expect(page.getByRole('button', { name: 'Copy link' })).toBeFocused()
        await expectFocusRing(page, 'Copy link')
      })
    }

    test('a failed copy shows the link instead of crashing', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(() => {
        Object.defineProperty(Clipboard.prototype, 'writeText', { value: () => Promise.reject(new Error('denied')) })
      })
      await page.goto('/')
      await page.getByRole('button', { name: 'Copy link' }).click()
      await expect(page.getByText('The link could not be copied. Copy it below.')).toBeVisible()
      await expect(page.getByTestId('gate-link')).toHaveText(page.url())
      expect(errors).toEqual([])
    })
  })

  test.describe('with a coarse pointer on a wide screen', () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 1366, height: 768 } })

    test('opens the app', async ({ page }) => {
      await gotoHome(page)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    })
  })

  const missing: { name: string; script: () => void; listed: string }[] = [
    { name: 'IndexedDB', script: () => Object.defineProperty(window, 'indexedDB', { value: undefined }), listed: 'IndexedDB' },
    { name: 'Web Locks', script: () => Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined }), listed: 'Web Locks' },
    {
      name: 'WebGL2',
      script: () => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
          return type === 'webgl2' ? null : (original as (...args: unknown[]) => unknown).call(this, type, ...rest)
        } as typeof original
      },
      listed: 'WebGL2',
    },
  ]
  for (const { name, script, listed } of missing) {
    test(`without ${name} shows the unsupported-browser page`, async ({ page }) => {
      await page.addInitScript(script)
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Unsupported browser' })).toBeVisible()
      await expect(page.getByText('This browser cannot run OPENMAP. Open this link with an up-to-date Chrome or Edge on your computer.')).toBeVisible()
      await expect(page.getByText(`Missing features: ${listed}`)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Projects' })).toHaveCount(0)
    })
  }

  for (const scheme of ['light', 'dark'] as const) {
    test(`the unsupported-browser page is keyboard-operable with a visible focus ring (${scheme}), in French`, async ({ browser }) => {
      const context = await browser.newContext({ locale: 'fr-FR', colorScheme: scheme })
      const page = await context.newPage()
      await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined }))
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Navigateur non pris en charge' })).toBeVisible()
      await expect(page.getByText('Ce navigateur ne peut pas faire fonctionner OPENMAP. Ouvrez ce lien avec Chrome ou Edge à jour sur votre ordinateur.')).toBeVisible()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Copier le lien' })).toBeFocused()
      await expectFocusRing(page, 'Copier le lien')
      await context.close()
    })
  }
})

test.describe('banners (UX-DR66, UX-DR148)', () => {
  test.describe('in Firefox', () => {
    test.use({ userAgent: FIREFOX_UA })

    test('the Editor never shows the Firefox warning, even undismissed', async ({ page }) => {
      await gotoHome(page)
      await expect(firefoxBanner(page)).toBeVisible()
      await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
      await expect(page.getByRole('complementary', { name: 'Properties' })).toBeVisible()
      await expect(firefoxBanner(page)).toHaveCount(0)
      await page.getByRole('link', { name: 'Projects' }).click()
      await expect(firefoxBanner(page)).toBeVisible()
    })

    test('Home shows the Firefox warning; dismissed, it stays hidden for the session', async ({ page, context }) => {
      await gotoHome(page)
      await expect(firefoxBanner(page)).toHaveText('OPENMAP is designed for Chrome and Edge. Video export may not work here.')
      await expect(firefoxBanner(page)).toHaveAttribute('data-tone', 'warning')
      await firefoxBanner(page).getByRole('button', { name: 'Dismiss this banner' }).click()
      await expect(firefoxBanner(page)).toHaveCount(0)

      // Still hidden after visiting the Editor (which never shows it).
      await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
      await expect(page).toHaveURL(/#\/p\//)
      await expect(firefoxBanner(page)).toHaveCount(0)
      await page.getByRole('link', { name: 'Projects' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
      await expect(firefoxBanner(page)).toHaveCount(0)

      // A reload keeps it hidden (sessionStorage, never localStorage: AD-8); a new tab is a new session.
      expect(await page.evaluate(() => localStorage.length)).toBe(0)
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
      await expect(firefoxBanner(page)).toHaveCount(0)
      const other = await context.newPage()
      await gotoHome(other)
      await expect(firefoxBanner(other)).toBeVisible()
    })
  })

  test('Chrome shows no Firefox banner', async ({ page }) => {
    await gotoHome(page)
    await expect(firefoxBanner(page)).toHaveCount(0)
    await expect(smallBanner(page)).toHaveCount(0)
  })

  test('a window under 1366 px wide shows the small-window warning on Home and in the Editor, until dismissed', async ({ page }) => {
    await gotoHome(page)
    await expect(smallBanner(page)).toHaveCount(0)
    await page.setViewportSize({ width: 1280, height: 768 })
    await expect(smallBanner(page)).toBeVisible()
    // It sits between the top bar and the Projects header.
    const bannerBox = (await smallBanner(page).boundingBox())!
    expect(bannerBox.y).toBe(48)
    expect(bannerBox.width).toBe(1280)

    await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
    await expect(page).toHaveURL(/#\/p\//)
    await expect(smallBanner(page)).toBeVisible()
    // From the last top-bar control, Tab reaches the banner's dismiss button.
    await menuButton(page).focus()
    await page.keyboard.press('Tab')
    await expect(smallBanner(page).getByRole('button', { name: 'Dismiss this banner' })).toBeFocused()
    await expectFocusRing(page, 'dismiss button')
    await page.keyboard.press('Enter')
    await expect(smallBanner(page)).toHaveCount(0)

    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await expect(smallBanner(page)).toHaveCount(0)
  })

  test('a window lower than the 1366 × 768 screen viewport shows the warning even when wide', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 600 })
    await gotoHome(page)
    await expect(smallBanner(page)).toBeVisible()
    await page.setViewportSize({ width: 1920, height: 648 })
    await expect(smallBanner(page)).toHaveCount(0)
  })

  test('the read-only banner of a newer Project uses the shared info banner, with no dismiss', async ({ page }) => {
    await gotoHome(page)
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('openmap')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const db = open.result
            const transaction = db.transaction('projects', 'readwrite')
            transaction.objectStore('projects').put({ id: 'newerProject000000001', document: { schemaVersion: 99, name: 'From the future' }, name: 'From the future', outputFormat: '16:9', updatedAt: Date.now(), lockEpoch: 0 })
            transaction.oncomplete = () => {
              db.close()
              resolve()
            }
            transaction.onerror = () => reject(transaction.error)
          }
        }),
    )
    await page.goto('/#/p/newerProject000000001')
    const banner = page.getByRole('status').filter({ hasText: 'newer version of OPENMAP' })
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute('data-tone', 'info')
    await expect(banner.getByRole('button')).toHaveCount(0)
  })
})
