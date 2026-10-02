import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The minimum supported layout (NFR-8); narrower windows show a warning banner (UX-DR148).
        viewport: { width: 1366, height: 768 },
        // Lets a machine with a preinstalled Chromium skip `playwright install`.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: {
    // CI tests the built dist/ that gets deployed (built earlier in the job); locally, the dev server.
    command: `npm run ${isCI ? 'preview' : 'dev'} -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
})
