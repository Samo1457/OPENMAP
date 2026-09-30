import { expect, test } from '@playwright/test'

test('the app loads a blank page titled OPENMAP', async ({ page, baseURL }) => {
  const problems: string[] = []
  const foreignRequests: string[] = []
  const appOrigin = new URL(baseURL!).origin

  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    // AD-16: only the app origin (and later the data origin) may be contacted.
    if (url.protocol !== 'data:' && url.origin !== appOrigin) foreignRequests.push(request.url())
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveTitle('OPENMAP')
  await expect(page.locator('#root')).toBeAttached()
  expect(await page.locator('body').innerText()).toBe('')
  expect(problems).toEqual([])
  expect(foreignRequests).toEqual([])
})
