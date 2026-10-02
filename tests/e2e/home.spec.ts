import { expect, test, type Page } from '@playwright/test'

// Story 1.4: Home, Projects saved locally, autosave, delete with undo, newer and unreadable documents.

test.use({ locale: 'en-US' })

interface Row {
  id: string
  document: Record<string, unknown>
  name: string
  outputFormat: string
  updatedAt: number
  deletedAt?: number
  lockEpoch: number
}

/** Every row of the Dexie `projects` table, read straight from IndexedDB. */
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

/** Writes a row as another app version (or a corrupted store) would. */
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

const heading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Projects' })
const cards = (page: Page) => page.getByRole('list', { name: 'Projects' }).getByRole('listitem')
/** Card names in display order; use with retrying assertions (`toHaveText([...])`). */
const cardNames = (page: Page) => cards(page).locator('.type-body-strong')
const card = (page: Page, name: string) => cards(page).filter({ has: page.getByText(name, { exact: true }) })

async function gotoHome(page: Page) {
  await page.goto('/')
  await expect(heading(page)).toBeVisible()
}

/** Creates a blank Project from Home and waits for the Editor. */
async function createProject(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expect(editorName(page, 'Untitled Project')).toBeVisible()
  return new URL(page.url()).hash.slice('#/p/'.length)
}

async function backHome(page: Page) {
  await page.getByRole('link', { name: 'Projects' }).click()
  await expect(heading(page)).toBeVisible()
}

/** The Project name in the Editor breadcrumb. */
const editorName = (page: Page, name: string) => page.getByRole('navigation', { name: 'Breadcrumb' }).getByText(name, { exact: true })

/** Renames the open Project from the Project settings panel (Story 1.5). */
async function renameInEditor(page: Page, from: string, to: string) {
  await expect(editorName(page, from)).toBeVisible()
  const field = page.getByRole('textbox', { name: 'Project name' })
  await field.fill(to)
  await field.press('Enter')
  await expect(editorName(page, to)).toBeVisible()
}

async function openCardMenu(page: Page, name: string) {
  await card(page, name).hover()
  await page.getByRole('button', { name: `Actions for Project ${name}`, exact: true }).click()
  await expect(page.getByRole('menu')).toBeVisible()
}

test.describe('Home (UX-DR118–120, UX-DR136, FR-1, FR-52)', () => {
  test('first visit shows the empty state with one New Project button', async ({ page }) => {
    await gotoHome(page)
    await expect(page.getByRole('heading', { name: 'No Projects yet.' })).toBeVisible()
    await expect(page.getByText('Create your first Project to start an animated map.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Project', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toHaveCount(0)
  })

  test('New Project saves a blank Project, opens it, survives a reload and asks for persistent storage once', async ({ page, baseURL }) => {
    const foreign: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.protocol !== 'data:' && url.origin !== new URL(baseURL!).origin) foreign.push(request.url())
    })
    page.on('dialog', (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`)
    })
    await page.addInitScript(() => {
      const calls = { count: 0 }
      ;(window as unknown as { persistCalls: typeof calls }).persistCalls = calls
      Object.defineProperty(navigator.storage, 'persist', {
        value: async () => {
          calls.count += 1
          return false
        },
      })
    })
    await gotoHome(page)
    const id = await createProject(page)
    const [row] = await readRows(page)
    expect(row).toMatchObject({ id, name: 'Untitled Project', outputFormat: '16:9' })
    expect(row.document).toMatchObject({ id, schemaVersion: 1, revision: 0, mapLocale: 'en' })
    await expect.poll(() => page.evaluate(() => (window as unknown as { persistCalls: { count: number } }).persistCalls.count)).toBe(1)

    await page.reload()
    await expect(editorName(page, 'Untitled Project')).toBeVisible()
    await backHome(page)
    await expect(cards(page)).toHaveCount(1)
    await expect(card(page, 'Untitled Project')).toContainText('Modified just now · 16:9')

    await createProject(page)
    expect(await page.evaluate(() => (window as unknown as { persistCalls: { count: number } }).persistCalls.count)).toBe(0)
    expect(foreign).toEqual([])
  })

  test('cards are sorted from most to least recently modified; click and Enter open them', async ({ page }) => {
    await gotoHome(page)
    await createProject(page)
    await renameInEditor(page, 'Untitled Project', 'Alpha')
    await backHome(page)
    await createProject(page)
    await renameInEditor(page, 'Untitled Project', 'Beta')
    await backHome(page)
    await expect(cardNames(page)).toHaveText(['Beta', 'Alpha'])

    await card(page, 'Alpha').getByRole('button', { name: 'Alpha', exact: true }).click()
    await renameInEditor(page, 'Alpha', 'Alpha 2')
    await backHome(page)
    await expect(cardNames(page)).toHaveText(['Alpha 2', 'Beta'])

    await card(page, 'Beta').getByRole('button', { name: 'Beta', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/p\//)
    await expect(editorName(page, 'Beta')).toHaveAttribute('aria-current', 'page')
  })

  test('rename in place: Enter saves, Escape cancels, an empty name keeps the previous one', async ({ page }) => {
    await gotoHome(page)
    await createProject(page)
    await backHome(page)

    await openCardMenu(page, 'Untitled Project')
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    const field = page.getByRole('textbox', { name: 'Project name' })
    await expect(field).toBeFocused()
    await field.fill('Siege of Mariupol')
    await field.press('Enter')
    await expect(card(page, 'Siege of Mariupol')).toBeVisible()
    await expect.poll(async () => (await readRows(page))[0].name).toBe('Siege of Mariupol')
    await expect(card(page, 'Siege of Mariupol').getByRole('button', { name: 'Siege of Mariupol', exact: true })).toBeFocused()

    await openCardMenu(page, 'Siege of Mariupol')
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await field.fill('Discarded')
    await field.press('Escape')
    await expect(card(page, 'Siege of Mariupol')).toBeVisible()

    await openCardMenu(page, 'Siege of Mariupol')
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await field.fill('   ')
    await field.blur()
    await expect(card(page, 'Siege of Mariupol')).toBeVisible()
    const [row] = await readRows(page)
    expect(row.name).toBe('Siege of Mariupol')
    expect(row.document).toMatchObject({ name: 'Siege of Mariupol', revision: 1 })
  })

  test('duplicate creates a copy with a new id and the same seed, listed first', async ({ page }) => {
    await gotoHome(page)
    await createProject(page)
    await renameInEditor(page, 'Untitled Project', 'Normandy')
    await backHome(page)

    await openCardMenu(page, 'Normandy')
    await page.getByRole('menuitem', { name: 'Duplicate' }).click()
    await expect(cards(page)).toHaveCount(2)
    await expect(cardNames(page)).toHaveText(['Normandy (copy)', 'Normandy'])
    const rows = await readRows(page)
    const original = rows.find((row) => row.name === 'Normandy')!
    const copy = rows.find((row) => row.name === 'Normandy (copy)')!
    expect(copy.id).not.toBe(original.id)
    expect(copy.document.seed).toBe(original.document.seed)
  })

  test('delete hides the Project at once; Undo restores it', async ({ page }) => {
    await gotoHome(page)
    await createProject(page)
    await backHome(page)

    await openCardMenu(page, 'Untitled Project')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(cards(page)).toHaveCount(0)
    const toast = page.getByRole('status').filter({ hasText: 'Project deleted' })
    await expect(toast).toBeVisible()
    expect((await readRows(page))[0].deletedAt).toEqual(expect.any(Number))

    await toast.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(card(page, 'Untitled Project')).toBeVisible()
    await expect(toast).toHaveCount(0)
    // Focus goes to the restored card, not to the page.
    await expect(card(page, 'Untitled Project').getByRole('button', { name: 'Untitled Project', exact: true })).toBeFocused()
    const [row] = await readRows(page)
    expect(row.deletedAt).toBeUndefined()
  })

  test('delete is purged for good when the toast expires after 8 s', async ({ page }) => {
    await page.clock.install()
    await gotoHome(page)
    await createProject(page)
    await backHome(page)

    await openCardMenu(page, 'Untitled Project')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Project deleted' })).toBeVisible()
    await page.mouse.move(0, 0)
    await page.clock.runFor(7_000)
    expect(await readRows(page)).toHaveLength(1)
    await page.clock.runFor(1_500)
    await expect(page.getByRole('status').filter({ hasText: 'Project deleted' })).toHaveCount(0)
    await expect.poll(() => readRows(page)).toEqual([])
    await expect(page.getByRole('heading', { name: 'No Projects yet.' })).toBeVisible()
  })

  for (const pause of ['hover', 'focus'] as const) {
    test(`the delete toast does not expire while it has the ${pause}`, async ({ page }) => {
      await page.clock.install()
      await gotoHome(page)
      await createProject(page)
      await backHome(page)
      await openCardMenu(page, 'Untitled Project')
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      const toast = page.getByRole('status').filter({ hasText: 'Project deleted' })
      await expect(toast).toBeVisible()
      if (pause === 'hover') {
        await toast.getByText('Project deleted').hover()
      } else {
        await page.mouse.move(0, 0)
        await toast.getByRole('button', { name: 'Undo', exact: true }).focus()
      }
      await page.clock.runFor(9_000)
      await expect(toast).toBeVisible()
      const rows = await readRows(page)
      expect(rows).toHaveLength(1)
      expect(rows[0].deletedAt).toEqual(expect.any(Number))
    })
  }

  test('two quick deletes both stay hidden; closing the toast moves focus back to the grid', async ({ page }) => {
    await gotoHome(page)
    for (const name of ['One', 'Two', 'Three']) {
      await createProject(page)
      await renameInEditor(page, 'Untitled Project', name)
      await backHome(page)
    }
    await expect(cardNames(page)).toHaveText(['Three', 'Two', 'One'])
    await openCardMenu(page, 'Three')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await openCardMenu(page, 'Two')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(cardNames(page)).toHaveText(['One'])
    await expect.poll(async () => (await readRows(page)).filter((row) => row.deletedAt !== undefined).length).toBe(2)

    const toast = page.getByRole('status').filter({ hasText: 'Project deleted' })
    await toast.getByRole('button', { name: 'Close notification' }).click()
    await expect(card(page, 'One').getByRole('button', { name: 'One', exact: true })).toBeFocused()
    await expect(cardNames(page)).toHaveText(['One'])
  })

  test('a tab closed before the toast expired leaves a hidden tombstone, purged at the next start', async ({ page }) => {
    await gotoHome(page)
    await createProject(page)
    await backHome(page)
    await openCardMenu(page, 'Untitled Project')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(cards(page)).toHaveCount(0)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'No Projects yet.' })).toBeVisible()
    const [row] = await readRows(page)
    expect(row.deletedAt).toEqual(expect.any(Number))

    // The undo window has passed: the next start purges it.
    await putRow(page, { ...row, deletedAt: Date.now() - 11 * 60_000 })
    await page.reload()
    await expect(heading(page)).toBeVisible()
    await expect.poll(() => readRows(page)).toEqual([])
  })

  test('a load failure shows a message and Retry', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }))
    await gotoHome(page)
    const message = page.getByRole('alert').filter({ hasText: 'Your Projects could not be loaded.' })
    await expect(message).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(message).toBeVisible()
  })
})

test.describe('autosave (NFR-5, FR-53, AD-8)', () => {
  test('a change is saved within 5 s without leaving the Editor', async ({ page }) => {
    await gotoHome(page)
    await createProject(page)
    await renameInEditor(page, 'Untitled Project', 'Saved by autosave')
    await expect.poll(async () => (await readRows(page))[0].name, { timeout: 5_000 }).toBe('Saved by autosave')
  })

  test('closing or reloading right after a change keeps it, with no recovery dialog', async ({ page }) => {
    page.on('dialog', (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`)
    })
    await gotoHome(page)
    await createProject(page)
    await renameInEditor(page, 'Untitled Project', 'Flushed on pagehide')
    await page.reload()
    await expect(editorName(page, 'Flushed on pagehide')).toBeVisible()
    const [row] = await readRows(page)
    expect(row.document).toMatchObject({ name: 'Flushed on pagehide', revision: 1 })
  })

  test('a newer epoch makes an older tab unable to overwrite the Project', async ({ page, context }) => {
    await gotoHome(page)
    const id = await createProject(page)
    const second = await context.newPage()
    await second.goto(`/#/p/${id}`)
    await expect(editorName(second, 'Untitled Project')).toBeVisible()

    await renameInEditor(page, 'Untitled Project', 'From the older tab')
    await expect(page.getByRole('alert').filter({ hasText: 'The latest changes to this Project were not saved on this device.' })).toBeVisible()
    expect((await readRows(page))[0].name).toBe('Untitled Project')
    await renameInEditor(second, 'Untitled Project', 'From the newer tab')
    await expect.poll(async () => (await readRows(page))[0].name).toBe('From the newer tab')
  })
})

test.describe('stored documents this app cannot edit (AD-9)', () => {
  test('a newer document opens read-only with a message and is never written', async ({ page }) => {
    await gotoHome(page)
    const document = { schemaVersion: 2, id: 'newerDocument00000001', name: 'From the future' }
    await putRow(page, { id: 'newerDocument00000001', document, name: 'From the future', outputFormat: '9:16', updatedAt: Date.now(), lockEpoch: 0 })
    await page.reload()
    await expect(card(page, 'From the future')).toContainText('· 9:16')

    await openCardMenu(page, 'From the future')
    await expect(page.getByRole('menuitem')).toHaveText(['Delete'])
    await page.keyboard.press('Escape')

    await card(page, 'From the future').getByRole('button', { name: 'From the future', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'newer version' })).toHaveText(
      'This Project was made with a newer version of OPENMAP. Update the app to edit it.',
    )
    await expect(page.getByText('From the future')).toBeVisible()
    await expect(page.getByRole('button', { name: 'From the future', exact: true })).toHaveCount(0)
    const [row] = await readRows(page)
    expect(row.document).toEqual(document)
    expect(row.lockEpoch).toBe(0)
  })

  test('an unreadable document is marked and offers only Delete', async ({ page }) => {
    await gotoHome(page)
    await putRow(page, { id: 'brokenDocument0000001', document: { schemaVersion: 1, name: 42 }, name: 'Broken', outputFormat: '16:9', updatedAt: Date.now(), lockEpoch: 0 })
    await page.reload()
    const broken = card(page, 'Broken')
    await expect(broken).toContainText('Unreadable Project')
    await expect(broken.getByRole('button', { name: 'Broken', exact: true })).toHaveCount(0)
    await openCardMenu(page, 'Broken')
    await expect(page.getByRole('menuitem')).toHaveText(['Delete'])
  })
})

test.describe('keyboard and focus (UX-DR119, UX-DR27)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`card menu by button, Shift+F10 and right-click, with a visible focus ring (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await gotoHome(page)
      await createProject(page)
      await backHome(page)
      const open = card(page, 'Untitled Project').getByRole('button', { name: 'Untitled Project', exact: true })
      const menuButton = page.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true })

      await page.getByRole('button', { name: 'New Project', exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(open).toBeFocused()
      expect(await open.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none')

      await page.keyboard.press('Shift+F10')
      await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toHaveCount(0)
      await expect(open).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(menuButton).toBeFocused()
      await expect(menuButton).toHaveCSS('opacity', '1')
      expect(await menuButton.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none')
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(menuButton).toBeFocused()

      await card(page, 'Untitled Project').click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.keyboard.press('Escape')

      // The Editor: the back link is the first stop; its keyboard tour lives in editor.spec.ts.
      await open.focus()
      await page.keyboard.press('Enter')
      await expect(editorName(page, 'Untitled Project')).toHaveAttribute('aria-current', 'page')
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Projects' })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(heading(page)).toBeVisible()
    })
  }
})
