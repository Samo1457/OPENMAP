import { expect, test, type Page } from '@playwright/test'

/** Reads one row of the Dexie `preferences` table straight from IndexedDB. */
function storedPreference(page: Page, key: string) {
  return page.evaluate(
    (key) =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open('openmap')
        open.onerror = () => resolve(undefined)
        open.onsuccess = () => {
          const db = open.result
          const done = (value: unknown) => {
            db.close()
            resolve(value)
          }
          if (!db.objectStoreNames.contains('preferences')) return done(undefined)
          const get = db.transaction('preferences').objectStore('preferences').get(key)
          get.onsuccess = () => done((get.result as { value?: unknown } | undefined)?.value)
          get.onerror = () => done(undefined)
        }
      }),
    key,
  )
}

/** Opens the Settings dialog from the « ⋯ » top-bar menu (Story 1.6), optionally on a tab. */
async function openSettings(page: Page, name = 'Settings', tab?: string) {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name }).click()
  const dialog = page.getByRole('dialog', { name })
  await expect(dialog).toBeVisible()
  if (tab) await dialog.getByRole('tab', { name: tab }).click()
}

const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('dark'))
const cssVar = (page: Page, name: string) =>
  page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), name)

test.describe('theme (UX-DR28, AD-8)', () => {
  test.use({ locale: 'en-US' })

  test('first launch follows a dark OS before the app renders', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await openSettings(page)
    await expect(page.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
    expect(await isDark(page)).toBe(true)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 22, 28)')
  })

  test('the boot script applies the OS theme and language before any app script runs', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'script' && !route.request().url().endsWith('/theme-boot.js')
        ? route.abort()
        : route.continue(),
    )
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    expect(await isDark(page)).toBe(true)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('without IndexedDB the unsupported-browser page renders in the system theme and default language', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Unsupported browser' })).toBeVisible()
    expect(await isDark(page)).toBe(true)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(errors).toEqual([])
  })

  test('System follows OS changes without reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    expect(await isDark(page)).toBe(false)
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => isDark(page)).toBe(true)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => isDark(page)).toBe(false)
  })

  test('Light applies at once, is stored in IndexedDB and survives a reload with a dark OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await openSettings(page)
    await page.getByRole('radio', { name: 'Light' }).click()
    expect(await isDark(page)).toBe(false)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 239, 228)')
    await expect.poll(() => storedPreference(page, 'theme')).toBe('light')
    expect(await page.evaluate(() => localStorage.length)).toBe(0)

    await page.reload()
    await openSettings(page)
    await expect(page.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(await isDark(page)).toBe(false)
  })

  test('mono-mode tokens are identical in both themes; chrome tokens swap (UX-DR1, UX-DR2)', async ({ page }) => {
    await page.goto('/')
    await openSettings(page)
    const mono = ['--om-scrim', '--om-canvas-ink', '--om-canvas-halo', '--om-canvas-mask']
    await page.getByRole('radio', { name: 'Light' }).click()
    const light = await Promise.all([...mono, '--om-accent'].map((name) => cssVar(page, name)))
    await page.getByRole('radio', { name: 'Dark' }).click()
    const dark = await Promise.all([...mono, '--om-accent'].map((name) => cssVar(page, name)))
    expect(dark.slice(0, mono.length)).toEqual(light.slice(0, mono.length))
    expect(light.at(-1)?.toUpperCase()).toBe('#1D4163')
    expect(dark.at(-1)?.toUpperCase()).toBe('#8EB6D8')
  })
})

test.describe('language (UX-DR150, AD-20)', () => {
  test.use({ locale: 'fr-FR' })

  test('the boot script sets lang="fr" for a French browser before any app script runs', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'script' && !route.request().url().endsWith('/theme-boot.js')
        ? route.abort()
        : route.continue(),
    )
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })

  test('language names carry their own lang (WCAG 3.1.2)', async ({ page }) => {
    await page.goto('/')
    await openSettings(page, 'Réglages', 'Langue')
    await expect(page.getByRole('radio', { name: 'Français' })).toHaveAttribute('lang', 'fr')
    await expect(page.getByRole('radio', { name: 'English' })).toHaveAttribute('lang', 'en')
  })

  test('first launch in French; switching to English changes every string without reload and persists', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await openSettings(page, 'Réglages')
    const dialog = page.getByRole('dialog', { name: 'Réglages' })
    await expect(dialog.getByRole('tab', { name: 'Apparence' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Système' })).toBeVisible()

    await page.evaluate(() => ((window as unknown as { marker: boolean }).marker = true))
    await dialog.getByRole('tab', { name: 'Langue' }).click()
    await page.getByRole('radio', { name: 'English' }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const english = page.getByRole('dialog', { name: 'Settings' })
    for (const name of ['Appearance', 'Language', 'Storage']) await expect(english.getByRole('tab', { name })).toBeVisible()
    await expect(english.getByRole('tab', { name: 'Language' })).toHaveAttribute('aria-selected', 'true')
    await english.getByRole('tab', { name: 'Appearance' }).click()
    for (const name of ['System', 'Light', 'Dark']) await expect(page.getByRole('radio', { name })).toBeVisible()
    await expect(page.getByText(/Apparence|Langue|Système|Clair|Sombre|Réglages|Projets|Stockage/)).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(true)
    await expect.poll(() => storedPreference(page, 'language')).toBe('en')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await openSettings(page)
    await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('tab', { name: 'Appearance' })).toBeVisible()
  })
})

test.describe('focus ring (UX-DR27)', () => {
  test.use({ locale: 'en-US' })

  test('shows on keyboard focus only', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await openSettings(page)
    const system = page.getByRole('radio', { name: 'System' })
    const light = page.getByRole('radio', { name: 'Light' })

    await light.click()
    await expect(light).toBeFocused()
    expect(await light.evaluate((el) => el.matches(':focus-visible'))).toBe(false)
    await expect(light).toHaveCSS('box-shadow', 'none')

    await page.keyboard.press('ArrowLeft')
    await expect(system).toBeFocused()
    await expect(system).toHaveAttribute('aria-checked', 'true')
    expect(await system.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    // 2px surface gap (#FBF8F1) then 2px focus-ring (#2C6391).
    await expect(system).toHaveCSS(
      'box-shadow',
      'rgb(251, 248, 241) 0px 0px 0px 2px, rgb(44, 99, 145) 0px 0px 0px 4px',
    )
  })

  test('arrow keys wrap around; Home and End jump to the ends', async ({ page }) => {
    await page.goto('/')
    await openSettings(page)
    const radio = (name: string) => page.getByRole('radio', { name })
    await radio('System').focus()

    await page.keyboard.press('ArrowLeft')
    await expect(radio('Dark')).toBeFocused()
    await expect(radio('Dark')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(radio('System')).toBeFocused()
    await expect(radio('System')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('End')
    await expect(radio('Dark')).toBeFocused()
    await expect(radio('Dark')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Home')
    await expect(radio('System')).toBeFocused()
    await expect(radio('System')).toHaveAttribute('aria-checked', 'true')
  })
})
