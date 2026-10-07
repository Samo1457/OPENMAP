import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Story 1.14: one editing tab per Project (AD-15, AD-3, AD-8, UX-DR139). Two or three pages of one
// browser context share IndexedDB, Web Locks and BroadcastChannel, so they behave like tabs. Every
// wait is on a visible state (banner, field, card), never a sleep.

test.use({ locale: 'en-US', viewport: { width: 1366, height: 768 } })

interface Row {
  id: string
  document: Record<string, unknown>
  name: string
  outputFormat: string
  updatedAt: number
  deletedAt?: number
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

const TEXT = {
  otherTab: 'This project is open in another tab. You are viewing it read-only.',
  takenOver: 'This project is now being edited in another tab.',
  holderClosed: 'The other tab was closed. You are still viewing this project read-only.',
  taking: 'Taking over…',
  editing: 'You are now editing this project.',
  refused: 'Cannot take over: the other tab could not save.',
  unresponsive: 'The other tab is not responding.',
  openElsewhere: 'Open in another tab',
}

const topBar = (page: Page) => page.getByRole('banner', { name: 'Top bar' })
const panel = (page: Page) => page.getByRole('complementary', { name: 'Properties' })
const nameField = (page: Page) => panel(page).getByRole('textbox', { name: 'Project name' })
const formatGroup = (page: Page) => panel(page).getByRole('radiogroup', { name: 'Output format' })
const undoButton = (page: Page) => topBar(page).getByRole('button', { name: 'Undo', exact: true })
const saveStatus = (page: Page) => topBar(page).locator('[data-save-status]')
const breadcrumbName = (page: Page) => page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')
/** The lock banners are info banners with one action; their text is announced through the live region, not their own. */
const lockBanner = (page: Page, text: string | RegExp) => page.locator('[data-tone="info"]').filter({ hasText: text })
const takeOver = (page: Page) => page.getByRole('button', { name: 'Take over here' })
const announced = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text })
const card = (page: Page, name: string) => page.getByRole('list', { name: 'Projects' }).getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })

/** Creates a blank Project from Home and waits for the Editor, which then holds the lock. */
async function createProject(page: Page): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/p\/[A-Za-z0-9_-]{21}$/)
  await expectEditing(page)
  return new URL(page.url()).hash.slice('#/p/'.length)
}

/** Opens `id` in a new page of the same browser, as a second tab would. */
async function openTab(page: Page, id: string) {
  await page.goto(`/#/p/${id}`)
}

/** The Editor of this tab edits: the name field is editable and no lock banner shows. */
async function expectEditing(page: Page) {
  await expect(nameField(page)).toBeEditable()
  await expect(takeOver(page)).toHaveCount(0)
}

/** The Editor of this tab shows the Project read-only under the given banner, with « Reprendre ici ». */
async function expectReadOnly(page: Page, banner: string) {
  await expect(lockBanner(page, banner)).toBeVisible()
  await expect(takeOver(page)).toBeVisible()
  await expect(nameField(page)).not.toBeEditable()
}

/** Renames from the panel and waits until the new name is stored. */
async function renameAndSave(page: Page, name: string) {
  await nameField(page).fill(name)
  await nameField(page).press('Enter')
  await expect(breadcrumbName(page)).toHaveText(name)
  await expect(saveStatus(page)).toHaveText('Saved')
}

async function backHome(page: Page) {
  await page.getByRole('link', { name: 'Projects' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
}

test.describe('a second tab (AD-15)', () => {
  test('opens read-only with no editable flash, disabled tools, the banner and a rejected change', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    // Records whether an editable Project field ever existed in this tab, however briefly.
    await second.addInitScript(() => {
      ;(window as unknown as { editableFlash: boolean }).editableFlash = false
      new MutationObserver(() => {
        if (document.querySelector('[aria-label="Properties"] input[type="text"]:not([readonly]):not([disabled])')) (window as unknown as { editableFlash: boolean }).editableFlash = true
      }).observe(document, { childList: true, subtree: true, attributes: true })
    })
    await openTab(second, id)

    await expectReadOnly(second, TEXT.otherTab)
    await expect(announced(second, TEXT.otherTab)).toHaveCount(1)
    await expect(breadcrumbName(second)).toHaveText('Untitled Project')
    expect(await second.evaluate(() => (window as unknown as { editableFlash: boolean }).editableFlash)).toBe(false)
    // The holder is untouched and the read-only tab took no epoch.
    await expectEditing(page)
    expect((await readRows(second))[0].lockEpoch).toBe(1)

    // Tools and panel fields are disabled; viewing stays possible.
    await expect(formatGroup(second)).toHaveAttribute('aria-disabled', 'true')
    await expect(undoButton(second)).toBeDisabled()
    await expect(saveStatus(second)).toHaveCount(0)
    await expect(second.getByTestId('map-canvas')).toBeVisible()
    await expect(topBar(second).getByRole('combobox', { name: 'Search for a place' })).toBeEnabled()

    // A change forced through the disabled controls is rejected: nothing is written.
    const before = (await readRows(second))[0]
    await formatGroup(second).getByRole('radio', { name: '1:1' }).click({ force: true })
    await second.keyboard.press('Control+z')
    await second.keyboard.press('Control+s')
    await expect(formatGroup(second).getByRole('radio', { checked: true })).toHaveText('16:9')
    const after = (await readRows(second))[0]
    expect(after.document).toEqual(before.document)
    expect(after.updatedAt).toBe(before.updatedAt)
    await expect(second.getByRole('region', { name: 'Notifications' })).toHaveText('')
  })

  test('« Take over here » is keyboard-operable and moves editing to the second tab without losing the last save or the focus', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    // The last change of tab A is still pending when B takes over: the handshake writes it first.
    await nameField(page).fill('Edited in A')
    await nameField(page).press('Enter')
    await expect(breadcrumbName(page)).toHaveText('Edited in A')
    await formatGroup(page).getByRole('radio', { name: '9:16' }).click()
    await nameField(page).focus()

    await takeOver(second).focus()
    await second.keyboard.press('Enter')

    // B: the editor, with A's last save, an empty undo stack, the next epoch, announced.
    await expect(nameField(second)).toHaveValue('Edited in A')
    await expectEditing(second)
    await expect(formatGroup(second).getByRole('radio', { checked: true })).toHaveText('9:16')
    await expect(undoButton(second)).toBeDisabled()
    await expect(announced(second, TEXT.editing)).toHaveCount(1)
    // The banner and its focused button are gone: the focus went to the Editor, not to the page.
    await expect.poll(() => second.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
    // A: read-only under « now edited in another tab », announced, focus not moved.
    await expectReadOnly(page, TEXT.takenOver)
    await expect(announced(page, TEXT.takenOver)).toHaveCount(1)
    await expect(undoButton(page)).toBeDisabled()
    await expect(nameField(page)).toBeFocused()
    const [row] = await readRows(page)
    expect(row).toMatchObject({ name: 'Edited in A', lockEpoch: 2 })
    expect(row.document).toMatchObject({ outputFormat: '9:16' })

    // B now saves, and A (read-only) refreshes to it; and A can take it back.
    await renameAndSave(second, 'Edited in B')
    await expect(breadcrumbName(page)).toHaveText('Edited in B')
    await takeOver(page).click()
    await expectEditing(page)
    await expect(nameField(page)).toHaveValue('Edited in B')
    await expectReadOnly(second, TEXT.takenOver)
    expect((await readRows(page))[0].lockEpoch).toBe(3)
  })

  test('a holder that cannot save keeps the lock: the requesting tab stays read-only with an error and keeps its action', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    // The Project is deleted behind A's back, so A's next save is refused (the holder's epoch stays the real one).
    const [stored] = await readRows(page)
    await putRow(page, { ...stored, deletedAt: Date.now() })
    await formatGroup(page).getByRole('radio', { name: '9:16' }).click()
    await expect(saveStatus(page)).toHaveText('Not saved')

    await takeOver(second).click()
    await expect(second.getByRole('alert').filter({ hasText: TEXT.refused })).toBeVisible()
    await expectReadOnly(second, TEXT.otherTab)
    // A keeps the lock, its change and its editor.
    await expectEditing(page)
    await expect(formatGroup(page).getByRole('radio', { checked: true })).toHaveText('9:16')
    expect((await readRows(page))[0].lockEpoch).toBe(stored.lockEpoch)
  })

  test('with no answer in 5 s the requesting tab stays read-only and keeps its action; nothing is taken later', async ({ page, context }) => {
    const id = await createProject(page)
    await backHome(page)
    // A holder that never answers: it holds the lock without running an Editor.
    await page.evaluate(
      (name) =>
        new Promise<void>((resolve) => {
          void navigator.locks.request(name, () => {
            resolve()
            return new Promise<void>(() => undefined)
          })
        }),
      `openmap:project:${id}`,
    )
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    await takeOver(second).click()
    await expect(second.getByRole('alert').filter({ hasText: TEXT.unresponsive })).toBeVisible({ timeout: 15_000 })
    await expectReadOnly(second, TEXT.otherTab)

    // When the silent holder goes away the banner says so, and still nothing is taken by itself.
    await page.close({ runBeforeUnload: false })
    await expectReadOnly(second, TEXT.holderClosed)
    expect((await readRows(second))[0].lockEpoch).toBe(1)
  })

  test('the holder\'s saves refresh the read-only tab to the saved revision', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    await renameAndSave(page, 'Saved by A')
    await expect(breadcrumbName(second)).toHaveText('Saved by A')
    await expect(nameField(second)).toHaveValue('Saved by A')
    await formatGroup(page).getByRole('radio', { name: '1:1' }).click()
    await expect(formatGroup(second).getByRole('radio', { checked: true })).toHaveText('1:1')
    await expectReadOnly(second, TEXT.otherTab)
    expect((await readRows(second))[0].lockEpoch).toBe(1)
  })
})

test.describe('the holder goes away (AD-15)', () => {
  test('a crashed or closed holder: the banner says so, keeps the action, takes nothing automatically; the action takes over directly', async ({ page, context }) => {
    const id = await createProject(page)
    await renameAndSave(page, 'Before the crash')
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    await page.close({ runBeforeUnload: false })
    await expectReadOnly(second, TEXT.holderClosed)
    await expect(announced(second, TEXT.holderClosed)).toHaveCount(1)
    await expect(breadcrumbName(second)).toHaveText('Before the crash')
    expect((await readRows(second))[0].lockEpoch).toBe(1)

    await takeOver(second).click()
    await expectEditing(second)
    await expect(announced(second, TEXT.editing)).toHaveCount(1)
    expect((await readRows(second))[0].lockEpoch).toBe(2)
  })

  test('a Project deleted while a read-only tab shows it: « Take over here » reports it was not found, without a crash', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    const errors: string[] = []
    second.on('pageerror', (error) => errors.push(error.message))
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)
    await page.close()
    await expectReadOnly(second, TEXT.holderClosed)

    const home = await context.newPage()
    await home.goto('/')
    await card(home, 'Untitled Project').hover()
    await home.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true }).click()
    await home.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(home.getByRole('status').filter({ hasText: 'Project deleted' })).toBeVisible()
    await expect.poll(async () => (await readRows(home)).filter((row) => row.id === id && row.deletedAt === undefined).length).toBe(0)

    await takeOver(second).click()
    await expect(second.getByRole('alert').filter({ hasText: 'This Project could not be found on this device.' })).toBeVisible()
    expect(errors).toEqual([])
    expect(await second.evaluate(async () => (await navigator.locks.query()).held?.length ?? 0)).toBe(0)
  })

  test('a third tab: both read-only tabs can ask, one wins and the other gives way', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    const third = await context.newPage()
    await openTab(second, id)
    await openTab(third, id)
    await expectReadOnly(second, TEXT.otherTab)
    await expectReadOnly(third, TEXT.otherTab)

    await Promise.all([takeOver(second).click(), takeOver(third).click()])

    // Whichever order the two requests were served in (one may even be served by the tab that just won), the
    // settled state is one editor and two read-only tabs that say the Project is edited elsewhere (a request that
    // reached nobody in time says « open in another tab » instead of « now edited »).
    const elsewhere = /now being edited in another tab|open in another tab/
    const editable = (tab: Page) => nameField(tab).isEditable()
    let winner = second
    let loser = third
    await expect(async () => {
      expect([await editable(second), await editable(third)].filter(Boolean)).toHaveLength(1)
      ;[winner, loser] = (await editable(second)) ? [second, third] : [third, second]
      await expectEditing(winner)
      for (const tab of [loser, page]) {
        await expect(lockBanner(tab, elsewhere)).toBeVisible()
        await expect(takeOver(tab)).toBeVisible()
        await expect(nameField(tab)).not.toBeEditable()
      }
    }).toPass()
    expect((await readRows(page))[0].lockEpoch).toBeGreaterThanOrEqual(2)
    // The loser did not queue a hidden takeover: with the winner gone it only says so.
    await winner.close({ runBeforeUnload: false })
    await expectReadOnly(loser, TEXT.holderClosed)
    await expectReadOnly(page, TEXT.holderClosed)
  })
})

test.describe('a newer document (AD-9)', () => {
  test('takes no lock: every tab shows the newer-version banner and Home does not mark the card', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    const id = 'newerDocument00000001'
    await putRow(page, { id, document: { schemaVersion: 4, id, name: 'From the future' }, name: 'From the future', outputFormat: '9:16', updatedAt: Date.now(), lockEpoch: 0 })
    await openTab(page, id)
    const second = await context.newPage()
    await openTab(second, id)

    for (const tab of [page, second]) {
      await expect(tab.locator('[data-tone="info"]').filter({ hasText: 'newer version' })).toBeVisible()
      await expect(takeOver(tab)).toHaveCount(0)
    }
    expect(await second.evaluate(async () => (await navigator.locks.query()).held?.length ?? 0)).toBe(0)
    const home = await context.newPage()
    await home.goto('/')
    await expect(card(home, 'From the future')).toContainText('· 9:16')
    await expect(card(home, 'From the future')).not.toContainText(TEXT.openElsewhere)
    expect((await readRows(home))[0]).toMatchObject({ lockEpoch: 0 })
  })
})

test.describe('Home (AD-15)', () => {
  test('marks a Project held elsewhere live, disables and refuses rename, duplicate and delete, opens it read-only, and follows the release', async ({ page, context }) => {
    const id = await createProject(page)
    const home = await context.newPage()
    await home.goto('/')
    const locked = card(home, 'Untitled Project')
    await expect(locked).toContainText(TEXT.openElsewhere)
    await expect(locked).not.toContainText('Modified')

    // Rename, duplicate and delete are unavailable, with the reason; nothing is written.
    await locked.hover()
    await home.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true }).click()
    for (const name of ['Rename', 'Duplicate', 'Delete']) {
      const item = home.getByRole('menuitem', { name })
      await expect(item).toHaveAttribute('aria-disabled', 'true')
      await expect(item).toHaveAttribute('aria-description', TEXT.openElsewhere)
      await item.click({ force: true })
      await expect(home.getByRole('menu')).toBeVisible()
    }
    await home.keyboard.press('Escape')
    expect((await readRows(home)).map((row) => ({ name: row.name, deletedAt: row.deletedAt }))).toEqual([{ name: 'Untitled Project', deletedAt: undefined }])

    // Opening a locked card opens it read-only.
    await locked.getByRole('button', { name: 'Untitled Project', exact: true }).click()
    await expectReadOnly(home, TEXT.otherTab)
    await home.getByRole('link', { name: 'Projects' }).click()
    await expect(card(home, 'Untitled Project')).toContainText(TEXT.openElsewhere)

    // The holder leaves for Home: the lock is released and the card returns to normal, live.
    await backHome(page)
    await expect(card(home, 'Untitled Project')).toContainText('Modified')
    await expect(card(home, 'Untitled Project')).not.toContainText(TEXT.openElsewhere)
    await card(home, 'Untitled Project').hover()
    await home.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true }).click()
    await expect(home.getByRole('menuitem', { name: 'Rename' })).not.toHaveAttribute('aria-disabled', 'true')
    await home.keyboard.press('Escape')

    // And the Project opens as the editor again, in this tab or another.
    await card(home, 'Untitled Project').getByRole('button', { name: 'Untitled Project', exact: true }).click()
    await expectEditing(home)
    expect(id).toBeTruthy()
  })

  test('follows a holder that crashes: no message is sent, the card still returns to normal', async ({ page, context }) => {
    await createProject(page)
    const home = await context.newPage()
    await home.goto('/')
    await expect(card(home, 'Untitled Project')).toContainText(TEXT.openElsewhere)
    await page.close({ runBeforeUnload: false })
    await expect(card(home, 'Untitled Project')).toContainText('Modified')
    await expect(card(home, 'Untitled Project')).not.toContainText(TEXT.openElsewhere)
  })

  test('refuses rename, duplicate and delete at call time even when the card shows nothing (stale state)', async ({ page, context }) => {
    await createProject(page)
    const home = await context.newPage()
    // This tab never learns of locks: no broadcast reaches it and the lock query reports nothing.
    await home.addInitScript(() => {
      navigator.locks.query = () => Promise.resolve({ held: [], pending: [] })
      const Native = window.BroadcastChannel
      window.BroadcastChannel = class extends Native {
        constructor(name: string) {
          super(name === 'openmap:locks' ? 'openmap:locks-muted' : name)
        }
      }
    })
    await home.goto('/')
    const target = card(home, 'Untitled Project')
    await expect(target).toContainText('Modified')
    const refused = home.getByRole('alert').filter({ hasText: 'This Project is open in another tab.' })

    await target.hover()
    await home.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true }).click()
    await home.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(refused).toBeVisible()
    await refused.getByRole('button', { name: 'Close notification' }).click()
    await expect(refused).toHaveCount(0)
    await expect(card(home, 'Untitled Project')).toBeVisible()

    await target.hover()
    await home.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true }).click()
    await home.getByRole('menuitem', { name: 'Duplicate' }).click()
    await expect(refused).toBeVisible()
    await refused.getByRole('button', { name: 'Close notification' }).click()
    await expect(refused).toHaveCount(0)

    await target.hover()
    await home.getByRole('button', { name: 'Actions for Project Untitled Project', exact: true }).click()
    await home.getByRole('menuitem', { name: 'Rename' }).click()
    await home.getByRole('textbox', { name: 'Project name' }).fill('Renamed behind the lock')
    await home.getByRole('textbox', { name: 'Project name' }).press('Enter')
    await expect(refused).toBeVisible()

    const rows = await readRows(home)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Untitled Project')
    expect(rows[0].deletedAt).toBeUndefined()
  })

  test('editor to Home in the same tab releases the lock: the card is normal and the Project opens editable in another tab', async ({ page, context }) => {
    const id = await createProject(page)
    await backHome(page)
    await expect(card(page, 'Untitled Project')).toContainText('Modified')
    await expect(card(page, 'Untitled Project')).not.toContainText(TEXT.openElsewhere)
    const second = await context.newPage()
    await openTab(second, id)
    await expectEditing(second)
  })
})

test.describe('typed but not committed (AD-15)', () => {
  test('a name still being typed in the holder is committed before it gives way and reaches the taker', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)
    // No Enter, no blur: the draft only lives in the field.
    await nameField(page).fill('Typed, never committed')
    await takeOver(second).click()
    await expectEditing(second)
    await expect(nameField(second)).toHaveValue('Typed, never committed')
    await expectReadOnly(page, TEXT.takenOver)
    await expect(nameField(page)).toHaveValue('Typed, never committed')
    expect((await readRows(second))[0].name).toBe('Typed, never committed')
  })
})

test.describe('reloading and navigating (AD-15)', () => {
  test('reloading the editing tab, or leaving and coming back, always lands editable and never « open in another tab »', async ({ page }) => {
    // Twelve loads of the Editor: slow under four workers, not a sign of a stuck lock.
    test.setTimeout(150_000)
    const id = await createProject(page)
    for (let reload = 0; reload < 10; reload += 1) {
      await page.reload()
      await expectEditing(page)
    }
    // A full navigation away (the fragment is dropped) and back.
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
    await page.goto(`/#/p/${id}`)
    await expectEditing(page)
    await page.goto('about:blank')
    await page.goto(`/#/p/${id}`)
    await expectEditing(page)
    expect((await readRows(page))[0].lockEpoch).toBe(13)
  })
})

test.describe('what a read-only tab can and cannot do (AD-3, AD-15)', () => {
  test('every editing control is disabled, nothing is written, and viewing, search, Settings and the camera stay available', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    // The banner: info, one action and no close button, right after the top bar in the document.
    await expect(lockBanner(second, TEXT.otherTab).getByRole('button')).toHaveCount(1)
    expect(
      await second.evaluate(() => {
        const top = document.querySelector('[aria-label="Top bar"]')
        const banner = document.querySelector('[data-tone="info"]')
        return Boolean(top && banner && top.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING)
      }),
    ).toBe(true)

    // Disabled: undo and redo, the format menu, the Map language, the date, the credit controls.
    await expect(undoButton(second)).toBeDisabled()
    await expect(topBar(second).getByRole('button', { name: 'Redo', exact: true })).toBeDisabled()
    await expect(topBar(second).getByRole('button', { name: /^Output format/ })).toHaveAttribute('aria-disabled', 'true')
    await topBar(second).getByRole('button', { name: /^Output format/ }).click({ force: true })
    await expect(second.getByRole('menu')).toHaveCount(0)
    await expect(panel(second).getByRole('radiogroup', { name: 'Map language' })).toHaveAttribute('aria-disabled', 'true')
    await expect(panel(second).getByRole('textbox', { name: 'Reference date' })).not.toBeEditable()
    await panel(second).getByRole('button', { name: /More options/ }).click()
    await expect(panel(second).locator('select')).toBeDisabled()

    // The place search works and picking a result changes nothing in the Project.
    const before = (await readRows(second))[0]
    const search = topBar(second).getByRole('combobox', { name: 'Search for a place' })
    await search.fill('Paris')
    await expect(second.getByRole('option').first()).toBeVisible()
    await search.press('Enter')
    await expect(second.getByTestId('map-canvas')).toBeVisible()

    // The camera moves: it is the tab's own state, and a saved refresh of the Project keeps it.
    const group = second.getByRole('group', { name: 'Map view' })
    const camera = () => second.getByTestId('map-canvas').getAttribute('data-camera')
    await group.getByRole('button', { name: 'Zoom in' }).click()
    await group.getByRole('button', { name: 'Zoom in' }).click()
    const zoomed = await camera()
    expect(JSON.parse(zoomed ?? '{}').zoom).toBeGreaterThan(0)
    await renameAndSave(page, 'Saved while B looks')
    await expect(breadcrumbName(second)).toHaveText('Saved while B looks')
    expect(await camera()).toBe(zoomed)

    // Settings opens from the top bar menu.
    await topBar(second).getByRole('button', { name: 'Menu' }).click()
    await second.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(second.getByRole('dialog')).toBeVisible()
    await second.keyboard.press('Escape')
    await expect(second.getByRole('dialog')).toHaveCount(0)

    const after = (await readRows(second))[0]
    expect(after.document).toMatchObject({ outputFormat: before.document.outputFormat, mapLocale: before.document.mapLocale })
    expect(after.lockEpoch).toBe(1)
  })
})

test.describe('keyboard and announcements (UX-DR156, UX-DR157)', () => {
  test('Tab reaches « Take over here », Space presses it, and each state is announced exactly once', async ({ page, context }) => {
    const id = await createProject(page)
    const second = await context.newPage()
    // Counts every text the polite live region of the Editor takes, in order.
    await second.addInitScript(() => {
      const log: string[] = []
      ;(window as unknown as { announcements: string[] }).announcements = log
      const watch = () => {
        let last = ''
        new MutationObserver(() => {
          const region = document.querySelector('div.sr-only[role="status"]')
          const text = region?.textContent ?? ''
          if (text !== last) {
            last = text
            if (text) log.push(text)
          }
        }).observe(document, { childList: true, subtree: true, characterData: true })
      }
      watch()
    })
    await openTab(second, id)
    await expectReadOnly(second, TEXT.otherTab)

    let reached = false
    for (let presses = 0; presses < 40 && !reached; presses += 1) {
      await second.keyboard.press('Tab')
      reached = await takeOver(second).evaluate((button) => button === document.activeElement)
    }
    expect(reached).toBe(true)
    await second.keyboard.press('Space')
    await expectEditing(second)
    await expect(announced(second, TEXT.editing)).toHaveCount(1)
    expect(await second.evaluate(() => (window as unknown as { announcements: string[] }).announcements)).toEqual([TEXT.otherTab, TEXT.taking, TEXT.editing])
    await expect(second.getByRole('region', { name: 'Notifications' })).toHaveText('')
  })
})

test.describe('French strings (AD-20)', () => {
  test.use({ locale: 'fr-FR' })
  const FR = {
    otherTab: 'Ce Projet est ouvert dans un autre onglet. Vous le consultez en lecture seule.',
    takenOver: 'Ce Projet est maintenant modifié dans un autre onglet.',
    holderClosed: "L'autre onglet a été fermé. Vous consultez toujours ce Projet en lecture seule.",
    editing: 'Vous modifiez ce Projet.',
    refused: "Impossible de reprendre\u202f: l'autre onglet n'a pas pu enregistrer.",
    unresponsive: "L'autre onglet ne répond pas.",
  }
  const frPanel = (page: Page) => page.getByRole('complementary', { name: 'Propriétés' })
  const frName = (page: Page) => frPanel(page).getByRole('textbox', { name: 'Nom du Projet' })
  const frTakeOver = (page: Page) => page.getByRole('button', { name: 'Reprendre ici' })
  const frBanner = (page: Page, text: string) => page.locator('[data-tone="info"]').filter({ hasText: text })

  async function createFr(page: Page): Promise<string> {
    await page.goto('/')
    await page.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click()
    await expect(frName(page)).toBeEditable()
    return new URL(page.url()).hash.slice('#/p/'.length)
  }

  test('other tab, taken over, editing and holder closed', async ({ page, context }) => {
    const id = await createFr(page)
    const second = await context.newPage()
    await second.goto(`/#/p/${id}`)
    await expect(frBanner(second, FR.otherTab)).toBeVisible()
    await frTakeOver(second).click()
    await expect(frName(second)).toBeEditable()
    await expect(second.getByRole('status').filter({ hasText: FR.editing })).toHaveCount(1)
    await expect(frBanner(page, FR.takenOver)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: FR.takenOver })).toHaveCount(1)
    await second.close({ runBeforeUnload: false })
    await expect(frBanner(page, FR.holderClosed)).toBeVisible()
    await expect(frTakeOver(page)).toBeVisible()
  })

  test('refused: the holder cannot save', async ({ page, context }) => {
    const id = await createFr(page)
    const second = await context.newPage()
    await second.goto(`/#/p/${id}`)
    await expect(frBanner(second, FR.otherTab)).toBeVisible()
    const [stored] = await readRows(page)
    await putRow(page, { ...stored, deletedAt: Date.now() })
    await page.getByRole('complementary', { name: 'Propriétés' }).getByRole('radio', { name: '9:16' }).click()
    await expect(page.locator('[data-save-status]')).toHaveText('Non enregistré')
    await frTakeOver(second).click()
    await expect(second.getByRole('alert').filter({ hasText: FR.refused })).toBeVisible()
    await expect(frTakeOver(second)).toBeVisible()
  })

  test('unresponsive: nobody answers in 5 s', async ({ page, context }) => {
    const id = await createFr(page)
    await page.getByRole('link', { name: 'Projets' }).click()
    await page.evaluate(
      (name) =>
        new Promise<void>((resolve) => {
          void navigator.locks.request(name, () => {
            resolve()
            return new Promise<void>(() => undefined)
          })
        }),
      `openmap:project:${id}`,
    )
    const second = await context.newPage()
    await second.goto(`/#/p/${id}`)
    await expect(frBanner(second, FR.otherTab)).toBeVisible()
    await frTakeOver(second).click()
    await expect(second.getByRole('alert').filter({ hasText: FR.unresponsive })).toBeVisible({ timeout: 15_000 })
    await expect(frTakeOver(second)).toBeVisible()
  })
})
