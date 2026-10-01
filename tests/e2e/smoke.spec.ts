import { expect, test } from '@playwright/test'

test('the app loads Home with self-hosted fonts only', async ({ page, baseURL }) => {
  const problems: string[] = []
  const foreignRequests: string[] = []
  const fontRequests: string[] = []
  const appOrigin = new URL(baseURL!).origin

  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    // AD-16: only the app origin (and later the data origin) may be contacted.
    if (url.protocol !== 'data:' && url.origin !== appOrigin) foreignRequests.push(request.url())
    if (request.resourceType() === 'font') fontRequests.push(request.url())
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveTitle('OPENMAP')
  await expect(page.getByRole('banner').getByText('OPENMAP')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('radiogroup')).toHaveCount(2)

  // UX-DR16: Libre Baskerville and Source Sans 3 are served by the app origin.
  await page.evaluate(() => document.fonts.ready)
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replaceAll('"', '')),
  )
  expect(loaded).toEqual(expect.arrayContaining(['Libre Baskerville Variable', 'Source Sans 3 Variable']))
  expect(fontRequests.length).toBeGreaterThan(0)
  for (const url of fontRequests) expect(new URL(url).origin).toBe(appOrigin)

  expect(problems).toEqual([])
  expect(foreignRequests).toEqual([])
})
